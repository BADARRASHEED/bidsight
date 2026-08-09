from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import delete
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, func, select

from app.api_helpers import quotation_to_read
from app.config import get_settings
from app.database import get_session
from app.models import Evaluation, Quotation, VendorResult
from app.schemas import QuotationExtractionUpdate, QuotationRead
from app.services.gemini_service import (
    GeminiConfigurationError,
    GeminiRequestError,
    GeminiResponseError,
    extract_quotation,
)
from app.services.pdf_service import (
    CorruptedPDFError,
    EmptyPDFError,
    InvalidPDFError,
    PDFServiceError,
    extract_pdf_text,
    resolve_saved_pdf,
    save_pdf,
)


router = APIRouter(tags=["quotations"])


def _evaluation_or_404(session: Session, evaluation_id: str) -> Evaluation:
    evaluation = session.get(Evaluation, evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found.")
    return evaluation


def _quotation_or_404(session: Session, quotation_id: str) -> Quotation:
    quotation = session.get(Quotation, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")
    return quotation


@router.post(
    "/api/evaluations/{evaluation_id}/quotations",
    response_model=QuotationRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_quotation(
    evaluation_id: str,
    file: UploadFile = File(...),
    vendor_name: str | None = Form(default=None),
    session: Session = Depends(get_session),
) -> QuotationRead:
    evaluation = _evaluation_or_404(session, evaluation_id)
    count = session.exec(
        select(func.count()).select_from(Quotation).where(Quotation.evaluation_id == evaluation_id)
    ).one()
    if count >= 3:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An evaluation can contain a maximum of 3 quotations.",
        )

    settings = get_settings()
    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
    try:
        content = await file.read(max_size_bytes + 1)
    finally:
        await file.close()

    try:
        saved = save_pdf(
            content,
            file.filename,
            file.content_type,
            evaluation_id=evaluation_id,
            upload_root=settings.upload_path,
            max_size_bytes=max_size_bytes,
        )
    except PDFServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    quotation = Quotation(
        evaluation_id=evaluation_id,
        vendor_name=(vendor_name or "").strip()[:200] or "Pending extraction",
        filename=saved.original_filename,
        stored_filename=saved.stored_filename,
        file_size=saved.size,
    )
    evaluation.status = "QUOTATIONS_UPLOADED"
    evaluation.recommended_vendor = None
    evaluation.recommendation = None
    evaluation.updated_at = datetime.now(timezone.utc)
    try:
        session.add(quotation)
        session.add(evaluation)
        session.commit()
        session.refresh(quotation)
    except SQLAlchemyError as exc:
        session.rollback()
        try:
            saved.path.unlink(missing_ok=True)
        except OSError:
            pass
        raise HTTPException(status_code=500, detail="The quotation could not be saved.") from exc
    return quotation_to_read(quotation)


@router.get(
    "/api/evaluations/{evaluation_id}/quotations",
    response_model=list[QuotationRead],
)
def list_quotations(
    evaluation_id: str,
    session: Session = Depends(get_session),
) -> list[QuotationRead]:
    _evaluation_or_404(session, evaluation_id)
    quotations = session.exec(
        select(Quotation)
        .where(Quotation.evaluation_id == evaluation_id)
        .order_by(Quotation.created_at)
    ).all()
    return [quotation_to_read(item) for item in quotations]


@router.delete(
    "/api/quotations/{quotation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_quotation(
    quotation_id: str,
    session: Session = Depends(get_session),
) -> Response:
    quotation = _quotation_or_404(session, quotation_id)
    evaluation = _evaluation_or_404(session, quotation.evaluation_id)
    settings = get_settings()
    try:
        pdf_path = resolve_saved_pdf(
            settings.upload_path,
            quotation.evaluation_id,
            quotation.stored_filename,
        )
    except PDFServiceError:
        pdf_path = None

    remaining = session.exec(
        select(Quotation.id).where(
            Quotation.evaluation_id == evaluation.id,
            Quotation.id != quotation.id,
        )
    ).all()
    session.exec(delete(VendorResult).where(VendorResult.quotation_id == quotation.id))
    session.delete(quotation)
    evaluation.status = "QUOTATIONS_UPLOADED" if remaining else "REQUIREMENTS_READY"
    evaluation.recommended_vendor = None
    evaluation.recommendation = None
    evaluation.updated_at = datetime.now(timezone.utc)
    try:
        session.add(evaluation)
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="The quotation could not be removed.") from exc

    if pdf_path is not None:
        try:
            pdf_path.unlink(missing_ok=True)
        except OSError:
            # The database action succeeded; a locked orphan can be cleaned up manually.
            pass
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/api/quotations/{quotation_id}/process",
    response_model=QuotationRead,
)
def process_quotation(
    quotation_id: str,
    session: Session = Depends(get_session),
) -> QuotationRead:
    quotation = _quotation_or_404(session, quotation_id)
    evaluation = _evaluation_or_404(session, quotation.evaluation_id)
    settings = get_settings()
    evaluation_id = quotation.evaluation_id
    stored_filename = quotation.stored_filename

    quotation.processing_status = "PROCESSING"
    quotation.processing_error = None
    quotation.updated_at = datetime.now(timezone.utc)
    session.add(quotation)
    session.commit()

    try:
        pdf_path = resolve_saved_pdf(settings.upload_path, evaluation_id, stored_filename)
        extracted_text = extract_pdf_text(pdf_path)
        extraction = extract_quotation(extracted_text, settings=settings)
    except (InvalidPDFError, EmptyPDFError, CorruptedPDFError, PDFServiceError) as exc:
        quotation.processing_status = "ERROR"
        quotation.processing_error = str(exc)
        quotation.updated_at = datetime.now(timezone.utc)
        session.add(quotation)
        session.commit()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GeminiConfigurationError as exc:
        quotation.processing_status = "ERROR"
        quotation.processing_error = str(exc)
        quotation.updated_at = datetime.now(timezone.utc)
        session.add(quotation)
        session.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (GeminiRequestError, GeminiResponseError) as exc:
        quotation.processing_status = "ERROR"
        quotation.processing_error = str(exc)
        quotation.updated_at = datetime.now(timezone.utc)
        session.add(quotation)
        session.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    quotation.vendor_name = extraction.vendor_name or quotation.vendor_name
    quotation.product_name = extraction.product_name
    quotation.product_model = extraction.product_model
    quotation.quantity = extraction.quantity
    quotation.unit_price = extraction.unit_price
    quotation.subtotal = extraction.subtotal
    quotation.total_price = extraction.total_price
    quotation.tax = extraction.tax
    quotation.currency = extraction.currency or evaluation.currency
    quotation.delivery_days = extraction.delivery_days
    quotation.warranty_months = extraction.warranty_months
    quotation.payment_terms = extraction.payment_terms
    quotation.support_details = extraction.support_details
    quotation.quotation_validity_days = extraction.quotation_validity_days
    quotation.specifications = extraction.specifications
    quotation.source_pages = extraction.source_pages
    quotation.missing_information = extraction.missing_information
    quotation.extracted_text = extracted_text
    quotation.processing_status = "READY"
    quotation.review_status = "PENDING"
    quotation.processing_error = None
    quotation.updated_at = datetime.now(timezone.utc)
    evaluation.status = "REVIEW_REQUIRED"
    evaluation.updated_at = datetime.now(timezone.utc)
    try:
        session.add(quotation)
        session.add(evaluation)
        session.commit()
        session.refresh(quotation)
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Extracted quotation data could not be saved.",
        ) from exc
    return quotation_to_read(quotation)


@router.patch("/api/quotations/{quotation_id}", response_model=QuotationRead)
@router.patch("/api/quotations/{quotation_id}/extraction", response_model=QuotationRead)
def update_quotation(
    quotation_id: str,
    payload: QuotationExtractionUpdate,
    session: Session = Depends(get_session),
) -> QuotationRead:
    quotation = _quotation_or_404(session, quotation_id)
    evaluation = _evaluation_or_404(session, quotation.evaluation_id)
    supplied = payload.model_fields_set
    mapping = {
        "product_name": "product_name",
        "product_model": "product_model",
        "quantity": "quantity",
        "unit_price": "unit_price",
        "currency": "currency",
        "subtotal": "subtotal",
        "tax_amount": "tax",
        "total_price": "total_price",
        "delivery_days": "delivery_days",
        "warranty_months": "warranty_months",
        "payment_terms": "payment_terms",
        "support_details": "support_details",
        "quotation_validity_days": "quotation_validity_days",
        "specifications": "specifications",
        "source_pages": "source_pages",
        "extraction_notes": "missing_information",
    }
    if "vendor_name" in supplied:
        quotation.vendor_name = payload.vendor_name or "Unknown vendor"
    for source, target in mapping.items():
        if source in supplied:
            setattr(quotation, target, getattr(payload, source))

    quotation.processing_status = "READY"
    quotation.review_status = "REVIEWED" if payload.reviewed else "PENDING"
    quotation.processing_error = None
    quotation.updated_at = datetime.now(timezone.utc)

    session.exec(delete(VendorResult).where(VendorResult.evaluation_id == evaluation.id))
    evaluation.recommended_vendor = None
    evaluation.recommendation = None
    all_quotations = session.exec(
        select(Quotation).where(Quotation.evaluation_id == evaluation.id)
    ).all()
    all_reviewed = all(
        item.id == quotation.id or (
            item.processing_status == "READY" and item.review_status == "REVIEWED"
        )
        for item in all_quotations
    ) and payload.reviewed
    evaluation.status = "READY_FOR_SCORING" if all_reviewed else "REVIEW_REQUIRED"
    evaluation.updated_at = datetime.now(timezone.utc)
    try:
        session.add(quotation)
        session.add(evaluation)
        session.commit()
        session.refresh(quotation)
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="The quotation could not be updated.") from exc
    return quotation_to_read(quotation)

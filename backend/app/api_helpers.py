from __future__ import annotations

from sqlmodel import Session, select

from app.models import Evaluation, Quotation, Requirement
from app.schemas import (
    EvaluationRead,
    EvaluationStatus,
    ProcessingStatus,
    QuotationExtractionRead,
    QuotationRead,
    RequirementRead,
    RequirementType,
)


def requirement_to_read(requirement: Requirement) -> RequirementRead:
    return RequirementRead(
        id=requirement.id,
        name=requirement.name,
        expected_value=requirement.value,
        unit=requirement.unit,
        requirement_type=RequirementType(requirement.requirement_type.upper()),
        operator=requirement.operator,
    )


def evaluation_to_read(evaluation: Evaluation, session: Session) -> EvaluationRead:
    requirements = session.exec(
        select(Requirement)
        .where(Requirement.evaluation_id == evaluation.id)
        .order_by(Requirement.id)
    ).all()
    quotation_count = len(
        session.exec(
            select(Quotation.id).where(Quotation.evaluation_id == evaluation.id)
        ).all()
    )
    return EvaluationRead(
        id=evaluation.id,
        title=evaluation.title,
        category=evaluation.category,
        quantity=evaluation.quantity,
        budget=evaluation.budget,
        currency=evaluation.currency,
        required_delivery_days=evaluation.delivery_requirement_days,
        notes=evaluation.notes,
        requirements=[requirement_to_read(item) for item in requirements],
        status=EvaluationStatus(evaluation.status),
        quotations_count=quotation_count,
        recommended_vendor=evaluation.recommended_vendor,
        created_at=evaluation.created_at,
        updated_at=evaluation.updated_at,
    )


def quotation_to_read(quotation: Quotation) -> QuotationRead:
    has_extraction = quotation.processing_status == "READY" or any(
        value is not None
        for value in (
            quotation.product_name,
            quotation.product_model,
            quotation.quantity,
            quotation.unit_price,
            quotation.total_price,
            quotation.delivery_days,
            quotation.warranty_months,
        )
    )
    extraction = None
    if has_extraction:
        extraction = QuotationExtractionRead(
            vendor_name=(
                quotation.vendor_name
                if quotation.vendor_name != "Pending extraction"
                else None
            ),
            product_name=quotation.product_name,
            product_model=quotation.product_model,
            quantity=quotation.quantity,
            unit_price=quotation.unit_price,
            currency=quotation.currency,
            subtotal=quotation.subtotal,
            tax_amount=quotation.tax,
            total_price=quotation.total_price,
            delivery_days=quotation.delivery_days,
            warranty_months=quotation.warranty_months,
            payment_terms=quotation.payment_terms,
            support_details=quotation.support_details,
            quotation_validity_days=quotation.quotation_validity_days,
            specifications=quotation.specifications,
            extraction_notes=quotation.missing_information,
            source_pages=quotation.source_pages,
            reviewed=quotation.review_status == "REVIEWED",
        )
    return QuotationRead(
        id=quotation.id,
        evaluation_id=quotation.evaluation_id,
        vendor_name=quotation.vendor_name,
        file_name=quotation.filename,
        file_size=quotation.file_size,
        processing_status=ProcessingStatus(quotation.processing_status),
        reviewed=quotation.review_status == "REVIEWED",
        error_message=quotation.processing_error,
        extraction=extraction,
    )

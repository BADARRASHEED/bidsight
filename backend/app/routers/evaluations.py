from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.api_helpers import evaluation_to_read, requirement_to_read
from app.database import get_session
from app.models import Evaluation, Quotation, Requirement, VendorResult
from app.schemas import (
    ComparisonResponse,
    ComplianceStatus,
    EvaluationCreate,
    EvaluationRead,
    EvaluationUpdate,
    RecommendationRead,
    RequirementCheckRead,
    RequirementCreate,
    RequirementRead,
    VendorComparisonRead,
)
from app.services.gemini_service import (
    GeminiConfigurationError,
    GeminiRequestError,
    GeminiResponseError,
    generate_recommendation,
)
from app.services.scoring_service import (
    COMPLIANT,
    PARTIALLY_COMPLIANT,
    NoQuotationsError,
    QuotationInput,
    RequirementInput,
    VendorScore,
    check_requirement,
    evaluate_vendors,
)


router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


def _evaluation_or_404(session: Session, evaluation_id: str) -> Evaluation:
    evaluation = session.get(Evaluation, evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found.")
    return evaluation


def _requirements(session: Session, evaluation_id: str) -> list[Requirement]:
    return list(
        session.exec(
            select(Requirement)
            .where(Requirement.evaluation_id == evaluation_id)
            .order_by(Requirement.id)
        ).all()
    )


def _scoring_requirements(
    evaluation: Evaluation,
    requirements: list[Requirement],
) -> list[RequirementInput]:
    values = [
        RequirementInput(
            name=item.name,
            value=item.value,
            unit=item.unit,
            requirement_type=item.requirement_type,
            operator=item.operator,
        )
        for item in requirements
    ]
    names = [item.name.lower() for item in requirements]
    if not any("quantity" in name for name in names):
        values.append(
            RequirementInput(
                name="Quantity",
                value=str(evaluation.quantity),
                requirement_type="MANDATORY",
                operator="eq",
            )
        )
    if not any("delivery" in name for name in names):
        values.append(
            RequirementInput(
                name="Delivery",
                value=str(evaluation.delivery_requirement_days),
                unit="days",
                requirement_type="MANDATORY",
                operator="lte",
            )
        )
    return values


def _quotation_input(quotation: Quotation, evaluation: Evaluation) -> QuotationInput:
    return QuotationInput(
        id=quotation.id,
        vendor_name=quotation.vendor_name,
        total_price=quotation.total_price,
        currency=quotation.currency or evaluation.currency,
        product_name=quotation.product_name,
        product_model=quotation.product_model,
        quantity=quotation.quantity,
        delivery_days=quotation.delivery_days,
        warranty_months=quotation.warranty_months,
        payment_terms=quotation.payment_terms,
        support_details=quotation.support_details,
        specifications=quotation.specifications,
        missing_information=quotation.missing_information,
    )


def _recommendation_from_evaluation(evaluation: Evaluation) -> RecommendationRead | None:
    if not evaluation.recommendation:
        return None
    try:
        return RecommendationRead.model_validate(evaluation.recommendation)
    except (ValueError, TypeError):
        return None


def _comparison_response(
    session: Session,
    evaluation: Evaluation,
) -> ComparisonResponse:
    results = session.exec(
        select(VendorResult)
        .where(VendorResult.evaluation_id == evaluation.id)
        .order_by(VendorResult.rank)
    ).all()
    if not results:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scoring has not been run for this evaluation.",
        )

    quotations = session.exec(
        select(Quotation).where(Quotation.evaluation_id == evaluation.id)
    ).all()
    quotation_by_id = {item.id: item for item in quotations}
    scoring_requirements = _scoring_requirements(
        evaluation,
        _requirements(session, evaluation.id),
    )
    vendors: list[VendorComparisonRead] = []
    for result in results:
        quotation = quotation_by_id.get(result.quotation_id)
        if quotation is None:
            continue
        quotation_input = _quotation_input(quotation, evaluation)
        checks = [check_requirement(item, quotation_input) for item in scoring_requirements]
        vendors.append(
            VendorComparisonRead(
                id=result.quotation_id,
                vendor_name=quotation.vendor_name,
                total_price=float(quotation.total_price) if quotation.total_price is not None else None,
                currency=quotation.currency or evaluation.currency,
                compliance_percentage=result.compliance_percentage,
                delivery_days=quotation.delivery_days,
                warranty_months=quotation.warranty_months,
                price_score=result.price_score,
                technical_score=result.technical_score,
                delivery_score=result.delivery_score,
                warranty_score=result.warranty_score,
                payment_score=result.payment_score,
                support_score=result.support_score,
                overall_score=result.overall_score,
                status=ComplianceStatus(result.status),
                rank=result.rank,
                is_recommended=(
                    bool(evaluation.recommended_vendor)
                    and quotation.vendor_name.casefold() == evaluation.recommended_vendor.casefold()
                ),
                failed_requirement=(
                    result.mandatory_failures[0] if result.mandatory_failures else None
                ),
                requirement_checks=[
                    RequirementCheckRead(
                        requirement_name=check.requirement_name,
                        expected_value=check.expected_value,
                        actual_value=check.actual_value,
                        outcome=check.outcome,
                        reason=check.reason,
                    )
                    for check in checks
                ],
                risks=result.risks,
                missing_information=result.missing_information,
            )
        )
    return ComparisonResponse(
        evaluation_id=evaluation.id,
        vendors=vendors,
        recommendation=_recommendation_from_evaluation(evaluation),
    )


@router.post("", response_model=EvaluationRead, status_code=status.HTTP_201_CREATED)
def create_evaluation(
    payload: EvaluationCreate,
    session: Session = Depends(get_session),
) -> EvaluationRead:
    evaluation = Evaluation(
        title=payload.title,
        category=payload.category,
        quantity=payload.quantity,
        budget=payload.budget,
        currency=payload.currency,
        delivery_requirement_days=payload.required_delivery_days,
        notes=payload.notes,
        status="REQUIREMENTS_READY" if payload.requirements else "DRAFT",
    )
    session.add(evaluation)
    for item in payload.requirements:
        session.add(
            Requirement(
                evaluation_id=evaluation.id,
                name=item.name,
                value=item.expected_value,
                unit=item.unit,
                requirement_type=item.requirement_type.value,
                operator=item.operator,
            )
        )
    try:
        session.commit()
        session.refresh(evaluation)
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="The evaluation could not be created.") from exc
    return evaluation_to_read(evaluation, session)


@router.get("", response_model=list[EvaluationRead])
def list_evaluations(session: Session = Depends(get_session)) -> list[EvaluationRead]:
    evaluations = session.exec(select(Evaluation).order_by(Evaluation.created_at.desc())).all()
    return [evaluation_to_read(item, session) for item in evaluations]


@router.get("/{evaluation_id}", response_model=EvaluationRead)
def get_evaluation(
    evaluation_id: str,
    session: Session = Depends(get_session),
) -> EvaluationRead:
    return evaluation_to_read(_evaluation_or_404(session, evaluation_id), session)


@router.patch("/{evaluation_id}", response_model=EvaluationRead)
def update_evaluation(
    evaluation_id: str,
    payload: EvaluationUpdate,
    session: Session = Depends(get_session),
) -> EvaluationRead:
    evaluation = _evaluation_or_404(session, evaluation_id)
    mapping = {
        "title": "title",
        "category": "category",
        "quantity": "quantity",
        "budget": "budget",
        "currency": "currency",
        "required_delivery_days": "delivery_requirement_days",
        "notes": "notes",
        "status": "status",
    }
    for source, target in mapping.items():
        if source not in payload.model_fields_set:
            continue
        value = getattr(payload, source)
        if source == "status" and value is not None:
            value = value.value
        setattr(evaluation, target, value)

    session.exec(delete(VendorResult).where(VendorResult.evaluation_id == evaluation.id))
    evaluation.recommended_vendor = None
    evaluation.recommendation = None
    evaluation.updated_at = datetime.now(timezone.utc)
    try:
        session.add(evaluation)
        session.commit()
        session.refresh(evaluation)
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="The evaluation could not be updated.") from exc
    return evaluation_to_read(evaluation, session)


@router.post(
    "/{evaluation_id}/requirements",
    response_model=list[RequirementRead],
    status_code=status.HTTP_201_CREATED,
)
def add_requirements(
    evaluation_id: str,
    payload: RequirementCreate | list[RequirementCreate],
    session: Session = Depends(get_session),
) -> list[RequirementRead]:
    evaluation = _evaluation_or_404(session, evaluation_id)
    items = payload if isinstance(payload, list) else [payload]
    if not items:
        raise HTTPException(status_code=422, detail="At least one requirement is required.")
    for item in items:
        session.add(
            Requirement(
                evaluation_id=evaluation.id,
                name=item.name,
                value=item.expected_value,
                unit=item.unit,
                requirement_type=item.requirement_type.value,
                operator=item.operator,
            )
        )
    session.exec(delete(VendorResult).where(VendorResult.evaluation_id == evaluation.id))
    evaluation.status = "REQUIREMENTS_READY"
    evaluation.recommended_vendor = None
    evaluation.recommendation = None
    evaluation.updated_at = datetime.now(timezone.utc)
    try:
        session.add(evaluation)
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="Requirements could not be saved.") from exc
    return [requirement_to_read(item) for item in _requirements(session, evaluation.id)]


@router.get("/{evaluation_id}/requirements", response_model=list[RequirementRead])
def list_requirements(
    evaluation_id: str,
    session: Session = Depends(get_session),
) -> list[RequirementRead]:
    _evaluation_or_404(session, evaluation_id)
    return [requirement_to_read(item) for item in _requirements(session, evaluation_id)]


def _save_scores(
    session: Session,
    evaluation: Evaluation,
    scores: list[VendorScore],
) -> None:
    session.exec(delete(VendorResult).where(VendorResult.evaluation_id == evaluation.id))
    for item in scores:
        session.add(
            VendorResult(
                evaluation_id=evaluation.id,
                quotation_id=item.quotation_id,
                compliance_percentage=item.compliance_percentage,
                price_score=item.price_score,
                technical_score=item.technical_score,
                delivery_score=item.delivery_score,
                warranty_score=item.warranty_score,
                payment_score=item.payment_score,
                support_score=item.support_score,
                overall_score=item.overall_score,
                status=item.status,
                mandatory_failures=item.mandatory_failures,
                risks=item.risks,
                missing_information=item.missing_information,
                rank=item.rank,
            )
        )


@router.post("/{evaluation_id}/evaluate", response_model=ComparisonResponse)
@router.post("/{evaluation_id}/score", response_model=ComparisonResponse)
def evaluate(
    evaluation_id: str,
    session: Session = Depends(get_session),
) -> ComparisonResponse:
    evaluation = _evaluation_or_404(session, evaluation_id)
    quotations = session.exec(
        select(Quotation)
        .where(Quotation.evaluation_id == evaluation.id)
        .order_by(Quotation.created_at)
    ).all()
    if not quotations:
        raise HTTPException(status_code=409, detail="No quotations are available for this evaluation.")
    unreviewed = [
        item.filename
        for item in quotations
        if item.processing_status != "READY" or item.review_status != "REVIEWED"
    ]
    if unreviewed:
        raise HTTPException(
            status_code=409,
            detail="All quotation extractions must be processed and reviewed before scoring.",
        )

    requirements = _scoring_requirements(evaluation, _requirements(session, evaluation.id))
    try:
        scores = evaluate_vendors(
            [_quotation_input(item, evaluation) for item in quotations],
            requirements,
            required_delivery_days=evaluation.delivery_requirement_days,
            budget=evaluation.budget,
        )
    except NoQuotationsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (ValueError, ArithmeticError) as exc:
        raise HTTPException(status_code=422, detail="Quotation values could not be scored.") from exc

    _save_scores(session, evaluation, scores)
    evaluation.status = "SCORED"
    evaluation.recommended_vendor = None
    evaluation.recommendation = None
    evaluation.updated_at = datetime.now(timezone.utc)
    try:
        session.add(evaluation)
        session.commit()
        session.refresh(evaluation)
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="Evaluation scores could not be saved.") from exc
    return _comparison_response(session, evaluation)


@router.get("/{evaluation_id}/comparison", response_model=ComparisonResponse)
def get_comparison(
    evaluation_id: str,
    session: Session = Depends(get_session),
) -> ComparisonResponse:
    return _comparison_response(session, _evaluation_or_404(session, evaluation_id))


@router.post("/{evaluation_id}/recommendation", response_model=RecommendationRead)
@router.post("/{evaluation_id}/recommend", response_model=RecommendationRead)
def recommend(
    evaluation_id: str,
    session: Session = Depends(get_session),
) -> RecommendationRead:
    evaluation = _evaluation_or_404(session, evaluation_id)
    comparison = _comparison_response(session, evaluation)
    eligible_vendors = [
        item
        for item in comparison.vendors
        if item.status.value in {COMPLIANT, PARTIALLY_COMPLIANT}
    ]
    if not eligible_vendors:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No eligible vendor is available for recommendation. "
                "Resolve mandatory failures or missing information first."
            ),
        )
    requirements = _requirements(session, evaluation.id)
    quotations = session.exec(
        select(Quotation).where(Quotation.evaluation_id == evaluation.id)
    ).all()
    quotation_by_id = {item.id: item for item in quotations}
    evidence = {
        "evaluation": {
            "title": evaluation.title,
            "category": evaluation.category,
            "quantity": evaluation.quantity,
            "budget": str(evaluation.budget),
            "currency": evaluation.currency,
            "required_delivery_days": evaluation.delivery_requirement_days,
            "notes": evaluation.notes,
        },
        "requirements": [
            {
                "name": item.name,
                "value": item.value,
                "unit": item.unit,
                "type": item.requirement_type,
                "operator": item.operator,
            }
            for item in requirements
        ],
        "vendors": [],
    }
    for vendor in comparison.vendors:
        quotation = quotation_by_id[vendor.id]
        evidence["vendors"].append(
            {
                "vendor_name": vendor.vendor_name,
                "verified_quotation": {
                    "product_name": quotation.product_name,
                    "product_model": quotation.product_model,
                    "quantity": quotation.quantity,
                    "unit_price": str(quotation.unit_price) if quotation.unit_price is not None else None,
                    "total_price": str(quotation.total_price) if quotation.total_price is not None else None,
                    "currency": quotation.currency or evaluation.currency,
                    "delivery_days": quotation.delivery_days,
                    "warranty_months": quotation.warranty_months,
                    "payment_terms": quotation.payment_terms,
                    "support_details": quotation.support_details,
                    "specifications": quotation.specifications,
                },
                "python_results": vendor.model_dump(mode="json", by_alias=False),
            }
        )

    try:
        generated = generate_recommendation(evidence)
    except GeminiConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GeminiRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except GeminiResponseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    vendor_by_name = {item.vendor_name.casefold(): item for item in comparison.vendors}
    selected = vendor_by_name.get(generated.recommended_vendor.casefold())
    if selected is None:
        raise HTTPException(
            status_code=502,
            detail="Gemini recommended a vendor that is not part of this evaluation.",
        )
    if selected.status.value not in {COMPLIANT, PARTIALLY_COMPLIANT}:
        raise HTTPException(
            status_code=502,
            detail="Gemini recommended an ineligible vendor despite eligible alternatives.",
        )

    recommendation = RecommendationRead(
        recommended_vendor=selected.vendor_name,
        summary=generated.concise_reasoning,
        strengths=generated.strengths,
        risks=generated.risks,
        missing_information=generated.missing_information,
        cheaper_vendor_reason=generated.tradeoff_explanation,
        generated_at=datetime.now(timezone.utc),
    )
    evaluation.recommended_vendor = selected.vendor_name
    evaluation.recommendation = recommendation.model_dump(mode="json", by_alias=False)
    evaluation.status = "RECOMMENDATION_READY"
    evaluation.updated_at = datetime.now(timezone.utc)
    try:
        session.add(evaluation)
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="The recommendation could not be saved.") from exc
    return recommendation

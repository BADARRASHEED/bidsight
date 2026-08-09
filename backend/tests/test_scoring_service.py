from decimal import Decimal

import pytest

from app.services.scoring_service import (
    COMPLIANT,
    MISSING_INFORMATION,
    NON_COMPLIANT,
    NoQuotationsError,
    QuotationInput,
    RequirementInput,
    calculate_price_score,
    calculate_weighted_score,
    evaluate_vendors,
)


def standard_requirements() -> list[RequirementInput]:
    return [
        RequirementInput("Minimum RAM", "16", "GB", "MANDATORY", "gte"),
        RequirementInput("Delivery", "14", "days", "MANDATORY", "lte"),
        RequirementInput("Warranty", "24", "months", "MANDATORY", "gte"),
    ]


def quotation(
    quotation_id: str,
    vendor: str,
    *,
    price: int = 1_000,
    ram: str | None = "16 GB",
    delivery: int | None = 10,
    warranty: int | None = 24,
) -> QuotationInput:
    specifications = {"RAM": ram} if ram is not None else {}
    return QuotationInput(
        id=quotation_id,
        vendor_name=vendor,
        total_price=Decimal(price),
        currency="PKR",
        quantity=25,
        delivery_days=delivery,
        warranty_months=warranty,
        payment_terms="Payment on delivery",
        support_details="Business-hours technical support",
        specifications=specifications,
    )


def score_one(item: QuotationInput):
    return evaluate_vendors(
        [item],
        standard_requirements(),
        required_delivery_days=14,
        budget=Decimal("2000"),
    )[0]


def test_fully_compliant_vendor() -> None:
    result = score_one(quotation("q1", "TechCore"))
    assert result.status == COMPLIANT
    assert result.compliance_percentage == 100
    assert result.technical_score == 100
    assert result.mandatory_failures == []


def test_mandatory_requirement_failure() -> None:
    result = score_one(quotation("q1", "Low Memory", ram="8 GB"))
    assert result.status == NON_COMPLIANT
    assert any("ram" in failure.lower() for failure in result.mandatory_failures)


def test_delivery_requirement_failure() -> None:
    result = score_one(quotation("q1", "Slow Vendor", delivery=18))
    assert result.status == NON_COMPLIANT
    assert result.technical_score == 100
    assert result.delivery_score < 100
    assert any("delivery" in failure.lower() for failure in result.mandatory_failures)


def test_warranty_requirement_failure() -> None:
    result = score_one(quotation("q1", "Short Warranty", warranty=12))
    assert result.status == NON_COMPLIANT
    assert result.warranty_score == 50
    assert any("warranty" in failure.lower() for failure in result.mandatory_failures)


def test_price_score_calculation() -> None:
    assert calculate_price_score(Decimal("800"), Decimal("1000")) == 80
    assert calculate_price_score(None, Decimal("1000")) == 0
    assert calculate_price_score(Decimal("800"), Decimal("0")) == 0


def test_weighted_score_calculation() -> None:
    result = calculate_weighted_score(
        price_score=80,
        technical_score=90,
        delivery_score=70,
        warranty_score=60,
        payment_score=50,
        support_score=40,
    )
    assert result == 76


def test_missing_quotation_values_are_unknown() -> None:
    result = score_one(
        QuotationInput(
            id="q1",
            vendor_name="Incomplete Vendor",
            total_price=None,
            currency="PKR",
        )
    )
    assert result.status == MISSING_INFORMATION
    assert result.compliance_percentage == 0
    assert result.price_score == 0
    assert result.missing_information


def test_zero_total_price_is_not_eligible() -> None:
    result = score_one(quotation("q1", "Invalid Price", price=0))
    assert result.status == MISSING_INFORMATION
    assert result.price_score == 0
    assert any("greater than zero" in item for item in result.missing_information)


def test_comparison_of_three_vendors() -> None:
    results = evaluate_vendors(
        [
            quotation("q1", "Alpha", price=1_000),
            quotation("q2", "Beta", price=900, delivery=18),
            quotation("q3", "Gamma", price=850, warranty=12),
        ],
        standard_requirements(),
        required_delivery_days=14,
        budget=Decimal("2000"),
    )
    assert len(results) == 3
    assert results[0].vendor_name == "Alpha"
    assert [item.rank for item in results] == [1, 2, 3]
    assert {item.vendor_name for item in results} == {"Alpha", "Beta", "Gamma"}


def test_non_compliant_cheapest_vendor_does_not_set_eligible_price_baseline() -> None:
    results = evaluate_vendors(
        [
            quotation("q1", "Eligible Low", price=1_000),
            quotation("q2", "Eligible High", price=1_200),
            quotation("q3", "Cheap Failure", price=500, ram="8 GB"),
        ],
        standard_requirements(),
        required_delivery_days=14,
        budget=Decimal("2000"),
    )
    by_vendor = {item.vendor_name: item for item in results}
    assert by_vendor["Eligible Low"].price_score == 100
    assert by_vendor["Eligible High"].price_score == pytest.approx(83.33)
    assert by_vendor["Cheap Failure"].status == NON_COMPLIANT
    assert by_vendor["Cheap Failure"].rank == 3


def test_no_quotation_available() -> None:
    with pytest.raises(NoQuotationsError, match="No quotations"):
        evaluate_vendors(
            [],
            standard_requirements(),
            required_delivery_days=14,
            budget=Decimal("2000"),
        )


def test_or_equivalent_requirement_accepts_explicit_baseline_match() -> None:
    result = evaluate_vendors(
        [
            QuotationInput(
                id="q1",
                vendor_name="Processor Match",
                total_price=Decimal("1000"),
                currency="PKR",
                specifications={"Processor": "Intel Core i5-1335U"},
            )
        ],
        [
            RequirementInput(
                "Processor",
                "Intel Core i5 or equivalent",
                requirement_type="MANDATORY",
            )
        ],
        required_delivery_days=None,
        budget=Decimal("2000"),
    )[0]
    assert result.status == COMPLIANT
    assert result.compliance_percentage == 100

import json
from decimal import Decimal
from pathlib import Path

from app.services.pdf_service import extract_pdf_text
from app.services.scoring_service import (
    COMPLIANT,
    NON_COMPLIANT,
    QuotationInput,
    RequirementInput,
    evaluate_vendors,
)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SAMPLE_DIR = REPOSITORY_ROOT / "simple-data"


def test_sample_pdfs_and_expected_results_are_consistent() -> None:
    expected = json.loads(
        (SAMPLE_DIR / "expected-results.json").read_text(encoding="utf-8")
    )
    evaluation = expected["evaluation"]
    mandatory = evaluation["mandatory_requirements"]
    requirements = [
        RequirementInput(
            "Processor", mandatory["processor"], requirement_type="MANDATORY"
        ),
        RequirementInput(
            "Minimum RAM", str(mandatory["ram_gb_minimum"]), "GB", "MANDATORY", "gte"
        ),
        RequirementInput(
            "Minimum storage",
            str(mandatory["storage_gb_minimum"]),
            "GB",
            "MANDATORY",
            "gte",
        ),
        RequirementInput(
            "Minimum warranty",
            str(mandatory["warranty_months_minimum"]),
            "months",
            "MANDATORY",
            "gte",
        ),
        RequirementInput(
            "Delivery",
            str(mandatory["delivery_days_maximum"]),
            "days",
            "MANDATORY",
            "lte",
        ),
        RequirementInput(
            "Quantity",
            str(evaluation["quantity"]),
            requirement_type="MANDATORY",
            operator="eq",
        ),
    ]

    quotations = []
    for vendor in expected["vendors"]:
        pdf_text = extract_pdf_text(SAMPLE_DIR / vendor["filename"])
        for required_text in (
            vendor["vendor_name"],
            vendor["product_model"],
            str(vendor["total_price"]),
        ):
            assert required_text.replace(",", "") in pdf_text.replace(",", "")
        assert (
            vendor["quantity"] * vendor["unit_price"] + vendor["tax"]
            == vendor["total_price"]
        )
        quotations.append(
            QuotationInput(
                id=vendor["filename"],
                vendor_name=vendor["vendor_name"],
                total_price=Decimal(vendor["total_price"]),
                currency=vendor["currency"],
                product_name=vendor["product_name"],
                product_model=vendor["product_model"],
                quantity=vendor["quantity"],
                delivery_days=vendor["delivery_days"],
                warranty_months=vendor["warranty_months"],
                payment_terms=vendor["payment_terms"],
                support_details=vendor["support_details"],
                specifications=vendor["specifications"],
            )
        )

    results = evaluate_vendors(
        quotations,
        requirements,
        required_delivery_days=evaluation["delivery_requirement_days"],
        budget=Decimal(evaluation["budget"]),
    )
    by_vendor = {result.vendor_name: result for result in results}
    assert by_vendor["TechCore Solutions"].status == COMPLIANT
    assert by_vendor["Digital Systems"].status == NON_COMPLIANT
    assert by_vendor["Future Computers"].status == NON_COMPLIANT
    assert results[0].vendor_name == expected["expected_recommended_vendor"]

from collections.abc import Generator
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.config import Settings
from app.database import get_session
from app.main import app
from app.schemas import FoundryQuotationExtraction, FoundryRecommendation


def test_frontend_compatible_three_vendor_flow(monkeypatch, tmp_path: Path) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def session_override() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    test_settings = Settings(
        foundry_endpoint="https://example-resource.services.ai.azure.com",
        foundry_api_key="test-key",
        upload_dir=str(tmp_path / "uploads"),
    )
    monkeypatch.setattr("app.routers.quotations.get_settings", lambda: test_settings)
    monkeypatch.setattr("app.routers.evaluations.get_settings", lambda: test_settings)
    monkeypatch.setattr(
        "app.routers.quotations.extract_pdf_text",
        lambda _path: "verified quotation fixture text",
    )

    extractions = iter(
        [
            FoundryQuotationExtraction(
                vendor_name="TechCore Solutions",
                product_model="Dell Latitude 5550",
                quantity=25,
                unit_price=145000,
                total_price=3625000,
                tax=0,
                currency="PKR",
                delivery_days=10,
                warranty_months=36,
                payment_terms="30% advance; 70% on delivery",
                support_details="Onsite business-hours technical support",
                specifications={
                    "Processor": "Intel Core i5-1335U",
                    "RAM": "16 GB",
                    "Storage": "512 GB SSD",
                },
            ),
            FoundryQuotationExtraction(
                vendor_name="Digital Systems",
                product_model="HP ProBook 440 G10",
                quantity=25,
                unit_price=138000,
                total_price=3450000,
                tax=0,
                currency="PKR",
                delivery_days=18,
                warranty_months=24,
                payment_terms="20% advance; 80% after delivery",
                support_details="Remote business-hours technical support",
                specifications={
                    "Processor": "Intel Core i5-1335U",
                    "RAM": "16 GB",
                    "Storage": "512 GB SSD",
                },
            ),
            FoundryQuotationExtraction(
                vendor_name="Future Computers",
                product_model="Lenovo ThinkBook 15 G4 IAP",
                quantity=25,
                unit_price=132000,
                total_price=3300000,
                tax=0,
                currency="PKR",
                delivery_days=7,
                warranty_months=12,
                payment_terms="50% advance; 50% before dispatch",
                support_details="Telephone and return-to-base support",
                specifications={
                    "Processor": "Intel Core i5-1235U",
                    "RAM": "8 GB",
                    "Storage": "512 GB SSD",
                },
            ),
        ]
    )
    monkeypatch.setattr(
        "app.routers.quotations.extract_quotation",
        lambda _text, settings: next(extractions),
    )
    monkeypatch.setattr(
        "app.routers.evaluations.generate_recommendation",
        lambda _evidence: FoundryRecommendation(
            recommended_vendor="TechCore Solutions",
            concise_reasoning="Only TechCore satisfies every mandatory requirement.",
            strengths=["Meets all mandatory requirements"],
            risks=["Not the lowest-priced quotation"],
            missing_information=[],
            tradeoff_explanation=(
                "The cheaper vendors fail mandatory delivery, RAM, or warranty requirements."
            ),
        ),
    )

    app.dependency_overrides[get_session] = session_override
    client = TestClient(app)
    try:
        created = client.post(
            "/api/evaluations",
            json={
                "title": "Computer Lab Laptop Procurement",
                "category": "IT Equipment",
                "quantity": 25,
                "budget": "4000000",
                "currency": "PKR",
                "requiredDeliveryDays": 14,
                "requirements": [
                    {
                        "name": "Processor",
                        "expectedValue": "Intel Core i5 or equivalent",
                        "type": "MANDATORY",
                    },
                    {
                        "name": "Minimum RAM",
                        "expectedValue": "16",
                        "unit": "GB",
                        "type": "MANDATORY",
                        "operator": "gte",
                    },
                    {
                        "name": "Minimum storage",
                        "expectedValue": "512",
                        "unit": "GB",
                        "type": "MANDATORY",
                        "operator": "gte",
                    },
                    {
                        "name": "Minimum warranty",
                        "expectedValue": "24",
                        "unit": "months",
                        "type": "MANDATORY",
                        "operator": "gte",
                    },
                    {
                        "name": "Delivery",
                        "expectedValue": "14",
                        "unit": "days",
                        "type": "MANDATORY",
                        "operator": "lte",
                    },
                ],
            },
        )
        assert created.status_code == 201
        evaluation_id = created.json()["id"]

        quotation_ids = []
        for filename in (
            "techcore-solutions-quotation.pdf",
            "digital-systems-quotation.pdf",
            "future-computers-quotation.pdf",
        ):
            uploaded = client.post(
                f"/api/evaluations/{evaluation_id}/quotations",
                files={"file": (filename, b"%PDF-1.7\nfixture", "application/pdf")},
            )
            assert uploaded.status_code == 201
            quotation_id = uploaded.json()["id"]
            quotation_ids.append(quotation_id)

            processed = client.post(f"/api/quotations/{quotation_id}/process")
            assert processed.status_code == 200
            reviewed_payload = processed.json()["extraction"]
            reviewed_payload["reviewed"] = True
            reviewed = client.patch(
                f"/api/quotations/{quotation_id}/extraction",
                json=reviewed_payload,
            )
            assert reviewed.status_code == 200
            assert reviewed.json()["reviewed"] is True

        too_many = client.post(
            f"/api/evaluations/{evaluation_id}/quotations",
            files={"file": ("fourth.pdf", b"%PDF-1.7\nfixture", "application/pdf")},
        )
        assert too_many.status_code == 409

        scored = client.post(f"/api/evaluations/{evaluation_id}/evaluate")
        assert scored.status_code == 200
        vendors = {item["vendorName"]: item for item in scored.json()["vendors"]}
        assert vendors["TechCore Solutions"]["status"] == "COMPLIANT"
        assert vendors["Digital Systems"]["status"] == "NON_COMPLIANT"
        assert vendors["Future Computers"]["status"] == "NON_COMPLIANT"

        recommended = client.post(f"/api/evaluations/{evaluation_id}/recommendation")
        assert recommended.status_code == 200
        assert recommended.json()["recommendedVendor"] == "TechCore Solutions"

        comparison = client.get(f"/api/evaluations/{evaluation_id}/comparison")
        assert comparison.status_code == 200
        recommended_rows = [
            item for item in comparison.json()["vendors"] if item["isRecommended"]
        ]
        assert [item["vendorName"] for item in recommended_rows] == [
            "TechCore Solutions"
        ]
        assert (
            comparison.json()["recommendation"]["recommendedVendor"]
            == "TechCore Solutions"
        )

        deleted = client.delete(f"/api/quotations/{quotation_ids[1]}")
        assert deleted.status_code == 204

        updated_evaluation = client.get(f"/api/evaluations/{evaluation_id}")
        assert updated_evaluation.status_code == 200
        assert updated_evaluation.json()["quotationsCount"] == 2
        assert updated_evaluation.json()["recommendedVendor"] is None

        stale_comparison = client.get(f"/api/evaluations/{evaluation_id}/comparison")
        assert stale_comparison.status_code == 409

        deleted_evaluation = client.delete(f"/api/evaluations/{evaluation_id}")
        assert deleted_evaluation.status_code == 204
        assert client.get(f"/api/evaluations/{evaluation_id}").status_code == 404
        assert all(
            item["id"] != evaluation_id
            for item in client.get("/api/evaluations").json()
        )
        assert not (test_settings.upload_path / evaluation_id).exists()
    finally:
        app.dependency_overrides.clear()
        client.close()

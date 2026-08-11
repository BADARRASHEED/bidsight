from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Annotated

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
)


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
        str_strip_whitespace=True,
    )


NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class EvaluationStatus(str, Enum):
    DRAFT = "DRAFT"
    REQUIREMENTS_READY = "REQUIREMENTS_READY"
    QUOTATIONS_UPLOADED = "QUOTATIONS_UPLOADED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    READY_FOR_SCORING = "READY_FOR_SCORING"
    SCORED = "SCORED"
    RECOMMENDATION_READY = "RECOMMENDATION_READY"


class RequirementType(str, Enum):
    MANDATORY = "MANDATORY"
    PREFERRED = "PREFERRED"


class ComplianceStatus(str, Enum):
    COMPLIANT = "COMPLIANT"
    PARTIALLY_COMPLIANT = "PARTIALLY_COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"
    MISSING_INFORMATION = "MISSING_INFORMATION"


class ProcessingStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    ERROR = "ERROR"


class RequirementCreate(APIModel):
    name: NonEmptyText = Field(max_length=200)
    expected_value: NonEmptyText = Field(
        max_length=300,
        validation_alias=AliasChoices("expected_value", "expectedValue", "value"),
        serialization_alias="expectedValue",
    )
    unit: str | None = Field(default=None, max_length=60)
    requirement_type: RequirementType = Field(
        default=RequirementType.MANDATORY,
        validation_alias=AliasChoices("requirement_type", "requirementType", "type"),
        serialization_alias="type",
    )
    operator: str | None = Field(default=None, max_length=20)

    @field_validator("requirement_type", mode="before")
    @classmethod
    def uppercase_requirement_type(cls, value: object) -> object:
        return value.upper() if isinstance(value, str) else value


class RequirementRead(RequirementCreate):
    id: str


class EvaluationCreate(APIModel):
    title: NonEmptyText = Field(max_length=200)
    category: NonEmptyText = Field(max_length=120)
    quantity: int = Field(gt=0, le=1_000_000)
    budget: Decimal = Field(gt=0, max_digits=16, decimal_places=2)
    currency: str = Field(default="PKR", min_length=3, max_length=3)
    required_delivery_days: int = Field(
        gt=0,
        le=3650,
        validation_alias=AliasChoices(
            "required_delivery_days",
            "requiredDeliveryDays",
            "delivery_requirement_days",
            "deliveryRequirementDays",
        ),
    )
    notes: str | None = Field(default=None, max_length=5000)
    requirements: list[RequirementCreate] = Field(default_factory=list, max_length=100)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()


class EvaluationUpdate(APIModel):
    title: NonEmptyText | None = Field(default=None, max_length=200)
    category: NonEmptyText | None = Field(default=None, max_length=120)
    quantity: int | None = Field(default=None, gt=0, le=1_000_000)
    budget: Decimal | None = Field(default=None, gt=0, max_digits=16, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    required_delivery_days: int | None = Field(
        default=None,
        gt=0,
        le=3650,
        validation_alias=AliasChoices(
            "required_delivery_days",
            "requiredDeliveryDays",
            "delivery_requirement_days",
            "deliveryRequirementDays",
        ),
    )
    notes: str | None = Field(default=None, max_length=5000)
    status: EvaluationStatus | None = None

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class EvaluationRead(APIModel):
    id: str
    title: str
    category: str
    quantity: int
    budget: Decimal
    currency: str
    required_delivery_days: int
    notes: str | None = None
    requirements: list[RequirementRead] = Field(default_factory=list)
    status: EvaluationStatus
    quotations_count: int = 0
    recommended_vendor: str | None = None
    created_at: datetime
    updated_at: datetime


class FoundryQuotationExtractionBase(BaseModel):
    """Scalar quotation fields shared by provider and application schemas."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    vendor_name: str | None = Field(default=None, max_length=200)
    product_name: str | None = Field(default=None, max_length=250)
    product_model: str | None = Field(default=None, max_length=250)
    quantity: int | None = Field(default=None, ge=0)
    unit_price: float | None = Field(default=None, ge=0)
    subtotal: float | None = Field(default=None, ge=0)
    total_price: float | None = Field(default=None, ge=0)
    tax: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    delivery_days: int | None = Field(default=None, ge=0)
    warranty_months: int | None = Field(default=None, ge=0)
    payment_terms: str | None = Field(default=None, max_length=1000)
    support_details: str | None = Field(default=None, max_length=2000)
    quotation_validity_days: int | None = Field(default=None, ge=0)
    missing_information: list[str] = Field(default_factory=list)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class FoundryQuotationExtraction(FoundryQuotationExtractionBase):
    """Validated quotation data returned to the BidSight application."""

    specifications: dict[str, str | int | float] = Field(default_factory=dict)
    source_pages: dict[str, int] = Field(default_factory=dict)


class FoundrySpecificationItem(BaseModel):
    """Foundry-compatible representation of one technical specification."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: NonEmptyText = Field(max_length=200)
    value: str | int | float


class FoundrySourcePageItem(BaseModel):
    """Foundry-compatible representation of one field-to-page reference."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    field_name: NonEmptyText = Field(max_length=200)
    page_number: int = Field(ge=1)


class FoundryQuotationExtractionResponse(FoundryQuotationExtractionBase):
    """Strict provider schema without free-form object properties."""

    specifications: list[FoundrySpecificationItem] = Field(default_factory=list)
    source_pages: list[FoundrySourcePageItem] = Field(default_factory=list)

    def to_application_model(self) -> FoundryQuotationExtraction:
        scalar_values = self.model_dump(exclude={"specifications", "source_pages"})
        return FoundryQuotationExtraction(
            **scalar_values,
            specifications={item.name: item.value for item in self.specifications},
            source_pages={
                item.field_name: item.page_number for item in self.source_pages
            },
        )


class QuotationExtractionUpdate(APIModel):
    vendor_name: str | None = Field(default=None, max_length=200)
    product_name: str | None = Field(default=None, max_length=250)
    product_model: str | None = Field(default=None, max_length=250)
    quantity: int | None = Field(default=None, ge=0)
    unit_price: Decimal | None = Field(
        default=None, ge=0, max_digits=16, decimal_places=2
    )
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    subtotal: Decimal | None = Field(
        default=None, ge=0, max_digits=16, decimal_places=2
    )
    tax_amount: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=16,
        decimal_places=2,
        validation_alias=AliasChoices("tax_amount", "taxAmount", "tax"),
        serialization_alias="taxAmount",
    )
    total_price: Decimal | None = Field(
        default=None, ge=0, max_digits=16, decimal_places=2
    )
    delivery_days: int | None = Field(default=None, ge=0)
    warranty_months: int | None = Field(default=None, ge=0)
    payment_terms: str | None = Field(default=None, max_length=1000)
    support_details: str | None = Field(default=None, max_length=2000)
    quotation_validity_days: int | None = Field(default=None, ge=0)
    specifications: dict[str, str | int | float] | None = None
    extraction_notes: list[str] | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "extraction_notes", "extractionNotes", "missing_information"
        ),
    )
    source_pages: dict[str, int] | None = None
    reviewed: bool = True

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class QuotationExtractionRead(APIModel):
    vendor_name: str | None = None
    product_name: str | None = None
    product_model: str | None = None
    quantity: int | None = None
    unit_price: Decimal | None = None
    currency: str | None = None
    subtotal: Decimal | None = None
    tax_amount: Decimal | None = None
    total_price: Decimal | None = None
    delivery_days: int | None = None
    warranty_months: int | None = None
    payment_terms: str | None = None
    support_details: str | None = None
    quotation_validity_days: int | None = None
    specifications: dict[str, str | int | float] = Field(default_factory=dict)
    extraction_notes: list[str] = Field(default_factory=list)
    source_pages: dict[str, int] = Field(default_factory=dict)
    reviewed: bool = False


class QuotationRead(APIModel):
    id: str
    evaluation_id: str
    vendor_name: str
    file_name: str
    file_size: int | None = None
    processing_status: ProcessingStatus
    reviewed: bool
    error_message: str | None = None
    extraction: QuotationExtractionRead | None = None


class RequirementCheckRead(APIModel):
    requirement_name: str
    expected_value: str
    actual_value: str | None = None
    outcome: str
    reason: str


class VendorComparisonRead(APIModel):
    id: str
    vendor_name: str
    total_price: float | None
    currency: str
    compliance_percentage: float
    delivery_days: int | None
    warranty_months: int | None
    price_score: float
    technical_score: float
    delivery_score: float
    warranty_score: float
    payment_score: float
    support_score: float
    overall_score: float
    status: ComplianceStatus
    rank: int | None
    is_recommended: bool = False
    failed_requirement: str | None = None
    requirement_checks: list[RequirementCheckRead] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)


class FoundryRecommendation(BaseModel):
    """Strict recommendation format returned by Microsoft Foundry."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    recommended_vendor: NonEmptyText
    concise_reasoning: NonEmptyText
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    tradeoff_explanation: NonEmptyText


class RecommendationRead(APIModel):
    recommended_vendor: str
    summary: str
    strengths: list[str]
    risks: list[str]
    missing_information: list[str]
    cheaper_vendor_reason: str
    generated_at: datetime


class ComparisonResponse(APIModel):
    evaluation_id: str
    vendors: list[VendorComparisonRead]
    recommendation: RecommendationRead | None = None


class HealthResponse(APIModel):
    status: str

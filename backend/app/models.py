from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy import JSON, Column, DateTime, Numeric, Text, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Evaluation(SQLModel, table=True):
    __tablename__ = "evaluations"

    id: str = Field(default_factory=new_id, primary_key=True, max_length=36)
    title: str = Field(index=True, max_length=200)
    category: str = Field(index=True, max_length=120)
    quantity: int = Field(gt=0)
    budget: Decimal = Field(sa_column=Column(Numeric(16, 2), nullable=False))
    currency: str = Field(default="PKR", max_length=3)
    delivery_requirement_days: int = Field(gt=0)
    notes: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    status: str = Field(default="DRAFT", index=True, max_length=40)
    recommended_vendor: str | None = Field(default=None, max_length=200)
    recommendation: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    requirements: list["Requirement"] = Relationship(back_populates="evaluation")
    quotations: list["Quotation"] = Relationship(back_populates="evaluation")
    vendor_results: list["VendorResult"] = Relationship(back_populates="evaluation")


class Requirement(SQLModel, table=True):
    __tablename__ = "requirements"

    id: str = Field(default_factory=new_id, primary_key=True, max_length=36)
    evaluation_id: str = Field(foreign_key="evaluations.id", index=True, max_length=36)
    name: str = Field(max_length=200)
    value: str = Field(max_length=300)
    unit: str | None = Field(default=None, max_length=60)
    requirement_type: str = Field(default="MANDATORY", max_length=20)
    operator: str | None = Field(default=None, max_length=20)

    evaluation: Evaluation | None = Relationship(back_populates="requirements")


class Quotation(SQLModel, table=True):
    __tablename__ = "quotations"

    id: str = Field(default_factory=new_id, primary_key=True, max_length=36)
    evaluation_id: str = Field(foreign_key="evaluations.id", index=True, max_length=36)
    vendor_name: str = Field(default="Pending extraction", max_length=200)
    filename: str = Field(max_length=255)
    stored_filename: str = Field(max_length=255)
    file_size: int | None = Field(default=None, ge=0)
    product_name: str | None = Field(default=None, max_length=250)
    product_model: str | None = Field(default=None, max_length=250)
    quantity: int | None = Field(default=None, ge=0)
    unit_price: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(16, 2), nullable=True),
    )
    subtotal: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(16, 2), nullable=True),
    )
    total_price: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(16, 2), nullable=True),
    )
    tax: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(16, 2), nullable=True),
    )
    currency: str | None = Field(default=None, max_length=3)
    delivery_days: int | None = Field(default=None, ge=0)
    warranty_months: int | None = Field(default=None, ge=0)
    payment_terms: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    support_details: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    quotation_validity_days: int | None = Field(default=None, ge=0)
    specifications: dict[str, str | int | float] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    source_pages: dict[str, int] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    extracted_text: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    missing_information: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    processing_status: str = Field(default="UPLOADED", index=True, max_length=20)
    review_status: str = Field(default="PENDING", index=True, max_length=20)
    processing_error: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    evaluation: Evaluation | None = Relationship(back_populates="quotations")
    result: Optional["VendorResult"] = Relationship(back_populates="quotation")


class VendorResult(SQLModel, table=True):
    __tablename__ = "vendor_results"
    __table_args__ = (UniqueConstraint("quotation_id", name="uq_vendor_result_quotation"),)

    id: str = Field(default_factory=new_id, primary_key=True, max_length=36)
    evaluation_id: str = Field(foreign_key="evaluations.id", index=True, max_length=36)
    quotation_id: str = Field(foreign_key="quotations.id", index=True, max_length=36)
    compliance_percentage: float = Field(default=0, ge=0, le=100)
    price_score: float = Field(default=0, ge=0, le=100)
    technical_score: float = Field(default=0, ge=0, le=100)
    delivery_score: float = Field(default=0, ge=0, le=100)
    warranty_score: float = Field(default=0, ge=0, le=100)
    payment_score: float = Field(default=0, ge=0, le=100)
    support_score: float = Field(default=0, ge=0, le=100)
    overall_score: float = Field(default=0, ge=0, le=100)
    status: str = Field(default="MISSING_INFORMATION", index=True, max_length=30)
    mandatory_failures: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    risks: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    missing_information: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    rank: int | None = Field(default=None, ge=1)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    evaluation: Evaluation | None = Relationship(back_populates="vendor_results")
    quotation: Quotation | None = Relationship(back_populates="result")

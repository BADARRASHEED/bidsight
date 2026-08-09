from __future__ import annotations

import re
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Any


PRICE_WEIGHT = Decimal("0.35")
TECHNICAL_WEIGHT = Decimal("0.30")
DELIVERY_WEIGHT = Decimal("0.15")
WARRANTY_WEIGHT = Decimal("0.10")
PAYMENT_WEIGHT = Decimal("0.05")
SUPPORT_WEIGHT = Decimal("0.05")

WEIGHTS = {
    "price": PRICE_WEIGHT,
    "technical": TECHNICAL_WEIGHT,
    "delivery": DELIVERY_WEIGHT,
    "warranty": WARRANTY_WEIGHT,
    "payment": PAYMENT_WEIGHT,
    "support": SUPPORT_WEIGHT,
}

COMPLIANT = "COMPLIANT"
PARTIALLY_COMPLIANT = "PARTIALLY_COMPLIANT"
NON_COMPLIANT = "NON_COMPLIANT"
MISSING_INFORMATION = "MISSING_INFORMATION"


class NoQuotationsError(ValueError):
    pass


@dataclass(slots=True)
class RequirementInput:
    name: str
    value: str
    unit: str | None = None
    requirement_type: str = "MANDATORY"
    operator: str | None = None


@dataclass(slots=True)
class QuotationInput:
    id: str
    vendor_name: str
    total_price: Decimal | float | int | str | None = None
    currency: str | None = None
    product_name: str | None = None
    product_model: str | None = None
    quantity: int | None = None
    delivery_days: int | None = None
    warranty_months: int | None = None
    payment_terms: str | None = None
    support_details: str | None = None
    specifications: dict[str, str | int | float] = field(default_factory=dict)
    missing_information: list[str] = field(default_factory=list)


@dataclass(slots=True)
class RequirementCheck:
    requirement_name: str
    expected_value: str
    actual_value: str | None
    outcome: str
    reason: str
    mandatory: bool


@dataclass(slots=True)
class VendorScore:
    quotation_id: str
    vendor_name: str
    total_price: float | None
    currency: str
    compliance_percentage: float
    price_score: float
    technical_score: float
    delivery_score: float
    warranty_score: float
    payment_score: float
    support_score: float
    overall_score: float
    status: str
    rank: int | None
    mandatory_failures: list[str]
    risks: list[str]
    missing_information: list[str]
    requirement_checks: list[RequirementCheck]


@dataclass(frozen=True, slots=True)
class Measurement:
    value: Decimal
    dimension: str | None


NUMBER_PATTERN = re.compile(r"-?\d[\d,]*(?:\.\d+)?")
UNIT_PATTERN = re.compile(
    r"(tb|gb|mb|kb|years?|yrs?|months?|mos?|weeks?|days?|hours?|hrs?)\b",
    re.IGNORECASE,
)


def _safe_decimal(value: Decimal | float | int | str | None) -> Decimal | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        result = Decimal(str(value).replace(",", ""))
    except (InvalidOperation, ValueError):
        return None
    if not result.is_finite():
        return None
    return result


def _parse_measurement(value: Any, declared_unit: str | None = None) -> Measurement | None:
    if value is None or isinstance(value, bool):
        return None

    if isinstance(value, (int, float, Decimal)):
        number = _safe_decimal(value)
        unit = declared_unit
    else:
        text = str(value)
        match = NUMBER_PATTERN.search(text)
        if not match:
            return None
        number = _safe_decimal(match.group(0))
        unit_match = UNIT_PATTERN.search(text)
        unit = declared_unit or (unit_match.group(0) if unit_match else None)

    if number is None:
        return None

    normalized_unit = (unit or "").strip().lower()
    if normalized_unit in {"tb"}:
        return Measurement(number * 1024, "memory_gb")
    if normalized_unit in {"gb"}:
        return Measurement(number, "memory_gb")
    if normalized_unit in {"mb"}:
        return Measurement(number / 1024, "memory_gb")
    if normalized_unit in {"kb"}:
        return Measurement(number / (1024 * 1024), "memory_gb")
    if normalized_unit in {"year", "years", "yr", "yrs"}:
        return Measurement(number * 12, "duration_months")
    if normalized_unit in {"month", "months", "mo", "mos"}:
        return Measurement(number, "duration_months")
    if normalized_unit in {"week", "weeks"}:
        return Measurement(number * 7, "duration_days")
    if normalized_unit in {"day", "days"}:
        return Measurement(number, "duration_days")
    if normalized_unit in {"hour", "hours", "hr", "hrs"}:
        return Measurement(number / 24, "duration_days")
    return Measurement(number, None)


def _normalize_key(value: str) -> str:
    words_to_remove = {
        "minimum",
        "maximum",
        "required",
        "requirement",
        "min",
        "max",
        "at",
        "least",
    }
    tokens = re.findall(r"[a-z0-9]+", value.lower())
    return " ".join(token for token in tokens if token not in words_to_remove)


def _find_specification(
    requirement_name: str,
    specifications: dict[str, str | int | float],
) -> str | int | float | None:
    target = _normalize_key(requirement_name)
    normalized = {_normalize_key(key): value for key, value in specifications.items()}
    if target in normalized:
        return normalized[target]

    for key, value in normalized.items():
        if target and key and (target in key or key in target):
            return value
    return None


def _actual_requirement_value(
    requirement: RequirementInput,
    quotation: QuotationInput,
) -> tuple[Any | None, str | None]:
    name = requirement.name.lower()
    if "delivery" in name:
        return quotation.delivery_days, "days"
    if "warranty" in name:
        return quotation.warranty_months, "months"
    if "quantity" in name:
        return quotation.quantity, None
    if "unit price" in name:
        return None, None
    if "budget" in name or "total price" in name:
        return quotation.total_price, None
    if "product" in name and "model" not in name:
        return quotation.product_name, None
    if "model" in name:
        return quotation.product_model, None
    return _find_specification(requirement.name, quotation.specifications), requirement.unit


def _comparison_operator(requirement: RequirementInput) -> str:
    explicit = (requirement.operator or "").strip().lower().replace(" ", "_")
    if explicit in {"<=", "lt", "lte", "max", "maximum", "at_most"}:
        return "lte"
    if explicit in {">=", "gt", "gte", "min", "minimum", "at_least"}:
        return "gte"
    if explicit in {"=", "==", "eq", "exact", "equals"}:
        return "eq"

    combined = f"{requirement.name} {requirement.value}".lower()
    if any(token in combined for token in ("maximum", "max ", "at most", "delivery", "budget")):
        return "lte"
    if any(token in combined for token in ("minimum", "min ", "at least", "warranty")):
        return "gte"
    return "gte"


def _display_actual(value: Any, unit: str | None) -> str | None:
    if value is None:
        return None
    suffix = f" {unit}" if unit else ""
    return f"{value}{suffix}"


def _uses_numeric_comparison(requirement: RequirementInput) -> bool:
    if requirement.unit or requirement.operator:
        return True
    name = requirement.name.lower()
    numeric_topics = (
        "delivery",
        "warranty",
        "quantity",
        "price",
        "budget",
        "ram",
        "memory",
        "storage",
        "capacity",
        "core count",
        "speed",
    )
    return any(topic in name for topic in numeric_topics)


def _is_technical_requirement(requirement: RequirementInput) -> bool:
    """Separate technical compliance from independently weighted commercial criteria."""
    name = requirement.name.lower()
    non_technical_topics = (
        "delivery",
        "warranty",
        "payment",
        "support",
        "price",
        "budget",
        "quantity",
    )
    return not any(topic in name for topic in non_technical_topics)


def check_requirement(
    requirement: RequirementInput,
    quotation: QuotationInput,
) -> RequirementCheck:
    mandatory = requirement.requirement_type.upper() == "MANDATORY"
    actual, actual_unit = _actual_requirement_value(requirement, quotation)
    expected_label = f"{requirement.value}{f' {requirement.unit}' if requirement.unit else ''}"

    if actual is None or (isinstance(actual, str) and not actual.strip()):
        return RequirementCheck(
            requirement_name=requirement.name,
            expected_value=expected_label,
            actual_value=None,
            outcome="UNKNOWN",
            reason=f"{requirement.name} is not available in the reviewed quotation.",
            mandatory=mandatory,
        )

    expected_measurement = _parse_measurement(requirement.value, requirement.unit)
    actual_measurement = _parse_measurement(actual, actual_unit)
    if expected_measurement and actual_measurement and _uses_numeric_comparison(requirement):
        if (
            expected_measurement.dimension
            and actual_measurement.dimension
            and expected_measurement.dimension != actual_measurement.dimension
        ):
            return RequirementCheck(
                requirement_name=requirement.name,
                expected_value=expected_label,
                actual_value=_display_actual(actual, actual_unit),
                outcome="UNKNOWN",
                reason=f"{requirement.name} uses incompatible units and cannot be compared safely.",
                mandatory=mandatory,
            )

        operator = _comparison_operator(requirement)
        if operator == "lte":
            passed = actual_measurement.value <= expected_measurement.value
            symbol = "at most"
        elif operator == "eq":
            passed = actual_measurement.value == expected_measurement.value
            symbol = "exactly"
        else:
            passed = actual_measurement.value >= expected_measurement.value
            symbol = "at least"

        outcome = "PASS" if passed else "FAIL"
        reason = (
            f"Quoted {requirement.name.lower()} is {_display_actual(actual, actual_unit)}; "
            f"the requirement is {symbol} {expected_label}."
        )
        return RequirementCheck(
            requirement_name=requirement.name,
            expected_value=expected_label,
            actual_value=_display_actual(actual, actual_unit),
            outcome=outcome,
            reason=reason,
            mandatory=mandatory,
        )

    expected_text = str(requirement.value).strip().casefold()
    actual_text = str(actual).strip().casefold()
    acceptable_texts = [expected_text]
    if " or equivalent" in expected_text:
        explicit_baseline = expected_text.split(" or equivalent", 1)[0].strip()
        if explicit_baseline:
            acceptable_texts.append(explicit_baseline)
    passed = any(
        acceptable == actual_text or acceptable in actual_text
        for acceptable in acceptable_texts
    )
    return RequirementCheck(
        requirement_name=requirement.name,
        expected_value=expected_label,
        actual_value=_display_actual(actual, actual_unit),
        outcome="PASS" if passed else "FAIL",
        reason=(
            f"Quoted {requirement.name.lower()} {'matches' if passed else 'does not match'} "
            "the required value."
        ),
        mandatory=mandatory,
    )


def calculate_price_score(
    lowest_eligible_price: Decimal | float | int | str | None,
    current_vendor_price: Decimal | float | int | str | None,
) -> float:
    lowest = _safe_decimal(lowest_eligible_price)
    current = _safe_decimal(current_vendor_price)
    if lowest is None or current is None or lowest <= 0 or current <= 0:
        return 0.0
    return round(float(min(Decimal("100"), lowest / current * 100)), 2)


def calculate_weighted_score(
    *,
    price_score: float,
    technical_score: float,
    delivery_score: float,
    warranty_score: float,
    payment_score: float,
    support_score: float,
) -> float:
    components = {
        "price": price_score,
        "technical": technical_score,
        "delivery": delivery_score,
        "warranty": warranty_score,
        "payment": payment_score,
        "support": support_score,
    }
    total = sum(Decimal(str(components[name])) * weight for name, weight in WEIGHTS.items())
    return round(float(total), 2)


def _delivery_score(quotation: QuotationInput, required_days: int | None) -> float:
    if quotation.delivery_days is None:
        return 0.0
    if not required_days or required_days <= 0:
        return 100.0
    if quotation.delivery_days <= required_days:
        return 100.0
    return round(max(0.0, required_days / quotation.delivery_days * 100), 2)


def _warranty_score(quotation: QuotationInput, required_months: Decimal | None) -> float:
    if quotation.warranty_months is None:
        return 0.0
    if required_months is None or required_months <= 0:
        return 100.0
    return round(min(100.0, quotation.warranty_months / float(required_months) * 100), 2)


def _payment_score(payment_terms: str | None) -> float:
    if not payment_terms:
        return 0.0
    terms = payment_terms.lower()
    if "100%" in terms and "advance" in terms:
        return 40.0
    if "advance" in terms:
        return 60.0
    if "on delivery" in terms or "net " in terms or "after delivery" in terms:
        return 100.0
    return 75.0


def _support_score(support_details: str | None) -> float:
    if not support_details:
        return 0.0
    support = support_details.lower()
    if "24/7" in support or "on-site" in support or "onsite" in support:
        return 100.0
    if "technical" in support or "remote" in support or "business" in support:
        return 80.0
    return 65.0


def _required_warranty_months(requirements: list[RequirementInput]) -> Decimal | None:
    for requirement in requirements:
        if "warranty" not in requirement.name.lower():
            continue
        measurement = _parse_measurement(requirement.value, requirement.unit)
        if measurement:
            return measurement.value
    return None


def _initial_vendor_score(
    quotation: QuotationInput,
    requirements: list[RequirementInput],
    required_delivery_days: int | None,
    budget: Decimal | float | int | str | None,
) -> VendorScore:
    checks = [check_requirement(requirement, quotation) for requirement in requirements]
    mandatory_checks = [check for check in checks if check.mandatory]
    mandatory_failures = [check.reason for check in mandatory_checks if check.outcome == "FAIL"]
    mandatory_unknown = [check.reason for check in mandatory_checks if check.outcome == "UNKNOWN"]
    preferred_failures = [
        check.reason for check in checks if not check.mandatory and check.outcome == "FAIL"
    ]

    if mandatory_checks:
        mandatory_passed = sum(check.outcome == "PASS" for check in mandatory_checks)
        compliance_percentage = mandatory_passed / len(mandatory_checks) * 100
    else:
        compliance_percentage = 100.0

    technical_checks = [
        check
        for check, requirement in zip(checks, requirements, strict=True)
        if _is_technical_requirement(requirement)
    ]
    technical_score = (
        sum(check.outcome == "PASS" for check in technical_checks)
        / len(technical_checks)
        * 100
        if technical_checks
        else 100.0
    )

    if mandatory_failures:
        status = NON_COMPLIANT
    elif mandatory_unknown:
        status = MISSING_INFORMATION
    elif preferred_failures or any(check.outcome == "UNKNOWN" for check in checks):
        status = PARTIALLY_COMPLIANT
    else:
        status = COMPLIANT

    missing = list(dict.fromkeys([*quotation.missing_information, *mandatory_unknown]))
    if quotation.total_price is None:
        missing.append("Total price is not available.")
    if quotation.delivery_days is None:
        missing.append("Delivery time is not available.")
    if quotation.warranty_months is None:
        missing.append("Warranty duration is not available.")
    if not quotation.payment_terms:
        missing.append("Payment terms are not available.")
    if not quotation.support_details:
        missing.append("Support information is not available.")
    missing = list(dict.fromkeys(missing))

    risks = list(mandatory_failures)
    if preferred_failures:
        risks.extend(preferred_failures)
    price = _safe_decimal(quotation.total_price)
    invalid_price = price is None or price <= 0
    if invalid_price:
        missing.append("A valid total price greater than zero is required for scoring.")
        if status != NON_COMPLIANT:
            status = MISSING_INFORMATION
    budget_decimal = _safe_decimal(budget)
    if price is not None and budget_decimal is not None and price > budget_decimal:
        risks.append("Quoted total price exceeds the evaluation budget.")
    if quotation.payment_terms and "advance" in quotation.payment_terms.lower():
        risks.append("Quotation requires an advance payment.")

    return VendorScore(
        quotation_id=quotation.id,
        vendor_name=quotation.vendor_name,
        total_price=float(price) if price is not None else None,
        currency=quotation.currency or "PKR",
        compliance_percentage=round(compliance_percentage, 2),
        price_score=0.0,
        technical_score=round(technical_score, 2),
        delivery_score=_delivery_score(quotation, required_delivery_days),
        warranty_score=_warranty_score(quotation, _required_warranty_months(requirements)),
        payment_score=_payment_score(quotation.payment_terms),
        support_score=_support_score(quotation.support_details),
        overall_score=0.0,
        status=status,
        rank=None,
        mandatory_failures=mandatory_failures,
        risks=list(dict.fromkeys(risks)),
        missing_information=missing,
        requirement_checks=checks,
    )


def evaluate_vendors(
    quotations: list[QuotationInput],
    requirements: list[RequirementInput],
    *,
    required_delivery_days: int | None,
    budget: Decimal | float | int | str | None,
) -> list[VendorScore]:
    if not quotations:
        raise NoQuotationsError("No quotations are available for this evaluation.")

    scores = [
        _initial_vendor_score(quotation, requirements, required_delivery_days, budget)
        for quotation in quotations
    ]
    eligible_prices = [
        Decimal(str(score.total_price))
        for score in scores
        if score.status in {COMPLIANT, PARTIALLY_COMPLIANT}
        and score.total_price is not None
        and score.total_price > 0
    ]
    lowest_eligible_price = min(eligible_prices) if eligible_prices else None

    for score in scores:
        score.price_score = calculate_price_score(lowest_eligible_price, score.total_price)
        score.overall_score = calculate_weighted_score(
            price_score=score.price_score,
            technical_score=score.technical_score,
            delivery_score=score.delivery_score,
            warranty_score=score.warranty_score,
            payment_score=score.payment_score,
            support_score=score.support_score,
        )

    status_priority = {
        COMPLIANT: 0,
        PARTIALLY_COMPLIANT: 1,
        MISSING_INFORMATION: 2,
        NON_COMPLIANT: 3,
    }
    ranked = sorted(
        scores,
        key=lambda item: (
            status_priority[item.status],
            -item.overall_score,
            item.total_price if item.total_price is not None else float("inf"),
            item.vendor_name.casefold(),
        ),
    )
    for index, score in enumerate(ranked, start=1):
        score.rank = index
    return ranked

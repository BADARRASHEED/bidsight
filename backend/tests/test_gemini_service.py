import pytest

from app.config import Settings
from app.schemas import GeminiQuotationExtraction
from app.services.gemini_service import (
    GeminiConfigurationError,
    GeminiResponseError,
    _validated_response,
    extract_quotation,
)


def test_missing_gemini_key_fails_without_sdk_or_network() -> None:
    settings = Settings(gemini_api_key=None)
    with pytest.raises(GeminiConfigurationError, match="Gemini API key is not configured"):
        extract_quotation("Vendor quotation text", settings=settings)


def test_malformed_gemini_response_becomes_useful_error() -> None:
    class MalformedResponse:
        text = "not valid JSON"

    with pytest.raises(GeminiResponseError, match="malformed structured data"):
        _validated_response(MalformedResponse(), GeminiQuotationExtraction)


def test_empty_gemini_response_becomes_useful_error() -> None:
    with pytest.raises(GeminiResponseError, match="empty response"):
        _validated_response(object(), GeminiQuotationExtraction)

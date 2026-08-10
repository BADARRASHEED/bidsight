import sys
from types import SimpleNamespace

import pytest

from app.config import Settings
from app.schemas import (
    FoundryQuotationExtraction,
    FoundryQuotationExtractionResponse,
    FoundrySourcePageItem,
    FoundrySpecificationItem,
)
from app.services.foundry_service import (
    FoundryConfigurationError,
    FoundryResponseError,
    _openai_base_url,
    _validated_response,
    extract_quotation,
)


def test_missing_foundry_endpoint_fails_without_sdk_or_network() -> None:
    settings = Settings(foundry_endpoint=None, foundry_api_key="test-key")
    with pytest.raises(FoundryConfigurationError, match="endpoint is not configured"):
        extract_quotation("Vendor quotation text", settings=settings)


def test_missing_foundry_key_fails_without_sdk_or_network() -> None:
    settings = Settings(
        foundry_endpoint="https://example-resource.services.ai.azure.com",
        foundry_api_key=None,
    )
    with pytest.raises(FoundryConfigurationError, match="API key is not configured"):
        extract_quotation("Vendor quotation text", settings=settings)


@pytest.mark.parametrize(
    ("endpoint", "expected"),
    [
        (
            "https://example-resource.services.ai.azure.com",
            "https://example-resource.services.ai.azure.com/openai/v1/",
        ),
        (
            "https://example-resource.openai.azure.com/openai/v1/",
            "https://example-resource.openai.azure.com/openai/v1/",
        ),
    ],
)
def test_foundry_endpoint_is_normalized(endpoint: str, expected: str) -> None:
    assert _openai_base_url(endpoint) == expected


def test_malformed_foundry_response_becomes_useful_error() -> None:
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(parsed=None, content="not valid JSON"))]
    )
    with pytest.raises(FoundryResponseError, match="malformed structured data"):
        _validated_response(response, FoundryQuotationExtraction)


def test_empty_foundry_response_becomes_useful_error() -> None:
    with pytest.raises(FoundryResponseError, match="empty response"):
        _validated_response(SimpleNamespace(choices=[]), FoundryQuotationExtraction)


def test_valid_parsed_foundry_response_is_returned() -> None:
    expected = FoundryQuotationExtraction(vendor_name="TechCore Solutions")
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(parsed=expected, refusal=None))]
    )
    assert _validated_response(response, FoundryQuotationExtraction) is expected


def test_extraction_uses_configured_foundry_deployment(monkeypatch) -> None:
    calls: dict[str, object] = {}
    provider_response = FoundryQuotationExtractionResponse(
        vendor_name="TechCore Solutions",
        specifications=[FoundrySpecificationItem(name="RAM", value="16 GB")],
        source_pages=[FoundrySourcePageItem(field_name="vendor_name", page_number=1)],
    )

    class FakeCompletions:
        def parse(self, **kwargs):
            calls.update(kwargs)
            return SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(parsed=provider_response, refusal=None)
                    )
                ]
            )

    class FakeClient:
        def __init__(self, **kwargs):
            calls["client"] = kwargs
            self.beta = SimpleNamespace(
                chat=SimpleNamespace(completions=FakeCompletions())
            )

        def close(self) -> None:
            calls["closed"] = True

    monkeypatch.setitem(sys.modules, "openai", SimpleNamespace(OpenAI=FakeClient))
    settings = Settings(
        foundry_endpoint="https://example-resource.services.ai.azure.com",
        foundry_api_key="test-key",
        foundry_model_deployment="gpt-sol",
    )

    result = extract_quotation("Vendor quotation text", settings=settings)

    assert result.vendor_name == "TechCore Solutions"
    assert result.specifications == {"RAM": "16 GB"}
    assert result.source_pages == {"vendor_name": 1}
    assert calls["model"] == "gpt-sol"
    assert calls["response_format"] is FoundryQuotationExtractionResponse
    assert calls["client"] == {
        "base_url": "https://example-resource.services.ai.azure.com/openai/v1/",
        "api_key": "test-key",
        "timeout": 90.0,
    }
    assert calls["closed"] is True

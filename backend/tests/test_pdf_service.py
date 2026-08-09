from pathlib import Path

import pytest

from app.services.pdf_service import (
    EmptyPDFError,
    InvalidPDFError,
    resolve_saved_pdf,
    save_pdf,
    validate_pdf,
)


def test_rejects_non_pdf_extension() -> None:
    with pytest.raises(InvalidPDFError, match="Only PDF"):
        validate_pdf(
            b"%PDF-1.7\n",
            "quotation.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            max_size_bytes=1024,
        )


def test_rejects_empty_pdf() -> None:
    with pytest.raises(EmptyPDFError, match="empty"):
        validate_pdf(b"", "quotation.pdf", "application/pdf", max_size_bytes=1024)


def test_saved_pdf_uses_safe_server_filename(tmp_path: Path) -> None:
    saved = save_pdf(
        b"%PDF-1.7\nminimal test bytes",
        "../../Vendor Quote.pdf",
        "application/pdf",
        evaluation_id="evaluation-1",
        upload_root=tmp_path,
        max_size_bytes=1024,
    )
    assert saved.original_filename == "Vendor Quote.pdf"
    assert saved.path.parent == (tmp_path / "evaluation-1").resolve()
    assert saved.path.suffix == ".pdf"
    assert "Vendor Quote" not in saved.stored_filename


def test_rejects_file_over_size_limit() -> None:
    with pytest.raises(InvalidPDFError, match="upload limit"):
        validate_pdf(
            b"%PDF-" + b"x" * 100,
            "quotation.pdf",
            "application/pdf",
            max_size_bytes=20,
        )


def test_resolve_saved_pdf_rejects_path_traversal(tmp_path: Path) -> None:
    with pytest.raises(InvalidPDFError, match="identifier"):
        resolve_saved_pdf(tmp_path, "../outside", "12345678-1234-1234-1234-123456789abc.pdf")

    with pytest.raises(InvalidPDFError, match="name"):
        resolve_saved_pdf(tmp_path, "evaluation-1", "../quotation.pdf")

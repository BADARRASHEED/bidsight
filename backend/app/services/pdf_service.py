from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from uuid import uuid4


class PDFServiceError(ValueError):
    pass


class InvalidPDFError(PDFServiceError):
    pass


class EmptyPDFError(PDFServiceError):
    pass


class CorruptedPDFError(PDFServiceError):
    pass


@dataclass(frozen=True, slots=True)
class SavedPDF:
    original_filename: str
    stored_filename: str
    path: Path
    size: int


def safe_display_filename(filename: str | None) -> str:
    if not filename:
        raise InvalidPDFError("A PDF file name is required.")
    basename = PurePosixPath(filename.replace("\\", "/")).name
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", basename).strip(" .")
    if not cleaned:
        raise InvalidPDFError("The PDF file name is invalid.")
    return cleaned[:255]


def validate_pdf(
    content: bytes,
    filename: str | None,
    content_type: str | None,
    *,
    max_size_bytes: int,
) -> str:
    safe_name = safe_display_filename(filename)
    if Path(safe_name).suffix.lower() != ".pdf":
        raise InvalidPDFError("Only PDF files are supported.")
    if content_type and content_type.lower() not in {
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
    }:
        raise InvalidPDFError("The uploaded file type is not a PDF.")
    if not content:
        raise EmptyPDFError("The uploaded PDF is empty.")
    if len(content) > max_size_bytes:
        size_mb = max_size_bytes // (1024 * 1024)
        raise InvalidPDFError(f"The PDF exceeds the {size_mb} MB upload limit.")
    if not content.lstrip().startswith(b"%PDF-"):
        raise InvalidPDFError("The uploaded file does not contain a valid PDF header.")
    return safe_name


def save_pdf(
    content: bytes,
    filename: str | None,
    content_type: str | None,
    *,
    evaluation_id: str,
    upload_root: Path,
    max_size_bytes: int,
) -> SavedPDF:
    original_filename = validate_pdf(
        content,
        filename,
        content_type,
        max_size_bytes=max_size_bytes,
    )
    safe_evaluation_id = re.sub(r"[^A-Za-z0-9_-]", "", evaluation_id)
    if not safe_evaluation_id or safe_evaluation_id != evaluation_id:
        raise InvalidPDFError("The evaluation identifier is invalid.")

    upload_root = upload_root.resolve()
    target_directory = (upload_root / safe_evaluation_id).resolve()
    if upload_root not in target_directory.parents:
        raise InvalidPDFError("The upload destination is invalid.")
    target_directory.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{uuid4()}.pdf"
    target_path = (target_directory / stored_filename).resolve()
    if target_directory not in target_path.parents:
        raise InvalidPDFError("The upload destination is invalid.")
    target_path.write_bytes(content)
    return SavedPDF(
        original_filename=original_filename,
        stored_filename=stored_filename,
        path=target_path,
        size=len(content),
    )


def resolve_saved_pdf(
    upload_root: Path, evaluation_id: str, stored_filename: str
) -> Path:
    upload_root = upload_root.resolve()
    safe_evaluation_id = re.sub(r"[^A-Za-z0-9_-]", "", evaluation_id)
    if not safe_evaluation_id or safe_evaluation_id != evaluation_id:
        raise InvalidPDFError("The evaluation identifier is invalid.")
    if PurePosixPath(
        stored_filename.replace("\\", "/")
    ).name != stored_filename or not re.fullmatch(
        r"[0-9a-fA-F-]{36}\.pdf", stored_filename
    ):
        raise InvalidPDFError("The stored PDF name is invalid.")

    expected_directory = (upload_root / evaluation_id).resolve()
    if upload_root not in expected_directory.parents:
        raise InvalidPDFError("The stored PDF path is invalid.")
    candidate = (expected_directory / stored_filename).resolve()
    if (
        expected_directory not in candidate.parents
        or candidate.suffix.lower() != ".pdf"
    ):
        raise InvalidPDFError("The stored PDF path is invalid.")
    if not candidate.is_file():
        raise InvalidPDFError("The uploaded PDF could not be found.")
    return candidate


def _clean_page_text(text: str) -> str:
    lines = []
    for line in text.replace("\u00a0", " ").splitlines():
        cleaned = " ".join(line.split())
        if cleaned:
            lines.append(cleaned)
    return "\n".join(lines)


def extract_pdf_text(pdf_path: Path) -> str:
    try:
        import pymupdf
    except ImportError as exc:
        raise PDFServiceError("PyMuPDF is not installed.") from exc

    try:
        document = pymupdf.open(pdf_path)
    except Exception as exc:
        raise CorruptedPDFError("The PDF is corrupted or cannot be opened.") from exc

    try:
        if document.page_count == 0:
            raise EmptyPDFError("The PDF does not contain any pages.")
        pages: list[str] = []
        for page_number, page in enumerate(document, start=1):
            cleaned = _clean_page_text(page.get_text("text"))
            if cleaned:
                pages.append(f"[Page {page_number}]\n{cleaned}")
        if not pages:
            raise EmptyPDFError(
                "No readable text was found in the PDF. OCR is not supported in this MVP."
            )
        return "\n\n".join(pages)
    except PDFServiceError:
        raise
    except Exception as exc:
        raise CorruptedPDFError("Text could not be extracted from the PDF.") from exc
    finally:
        document.close()

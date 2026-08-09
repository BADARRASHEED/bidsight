# BidSight Backend

FastAPI backend for creating procurement evaluations, extracting structured data
from quotation PDFs with Gemini, running deterministic Python scoring, and generating
evidence-based recommendations.

## Local setup

The project is configured for `uv`, but dependencies are intentionally not vendored.
From this `backend` directory, create or update the environment with:

```powershell
uv sync --group dev
```

Copy the root `.env.example` to `.env`, add your Gemini API key, then run:

```powershell
uv run pytest
uv run uvicorn app.main:app --reload
```

The API documentation is available at `http://localhost:8000/docs` while the server
is running. SQLite tables and the upload directory are created at application startup.

## Flow

1. Create an evaluation and its requirements.
2. Upload one to three text-readable PDF quotations.
3. Process each PDF, which extracts page text and asks Gemini for a typed response.
4. Review and patch the extracted quotation fields.
5. Run deterministic compliance, price, and weighted scoring in Python.
6. Ask Gemini to explain a recommendation from verified structured evidence.

Gemini never calculates or alters procurement scores. BidSight provides decision
support; the final purchasing decision remains with the user.

## API routes

- `POST /api/evaluations`
- `GET /api/evaluations`
- `GET /api/evaluations/{evaluation_id}`
- `PATCH /api/evaluations/{evaluation_id}`
- `POST /api/evaluations/{evaluation_id}/requirements`
- `GET /api/evaluations/{evaluation_id}/requirements`
- `POST /api/evaluations/{evaluation_id}/quotations`
- `GET /api/evaluations/{evaluation_id}/quotations`
- `DELETE /api/quotations/{quotation_id}`
- `PATCH /api/quotations/{quotation_id}`
- `POST /api/quotations/{quotation_id}/process`
- `POST /api/evaluations/{evaluation_id}/evaluate`
- `GET /api/evaluations/{evaluation_id}/comparison`
- `POST /api/evaluations/{evaluation_id}/recommendation`

Frontend compatibility aliases are also provided at `/score`, `/recommend`, and
`/api/quotations/{quotation_id}/extraction`.

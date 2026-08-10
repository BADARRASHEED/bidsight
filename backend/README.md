# BidSight Backend

This folder contains the FastAPI service behind BidSight. I built it to own the
parts of the product that must be trustworthy: procurement data, uploaded files,
validated AI output, deterministic scoring, and recommendation evidence.

## How I Thought About the Backend

The most important backend decision was separating language understanding from
calculation.

Microsoft Foundry is useful for reading the varied language and layouts found in
quotation documents. It is not the right place to calculate procurement scores.
For that reason, Foundry calls are isolated in `foundry_service.py`, while all
compliance and scoring rules live in `scoring_service.py`.

This gives the backend a clear trust boundary:

- Foundry extracts and explains.
- Pydantic validates model responses.
- The user confirms extracted evidence.
- Python calculates and ranks.
- FastAPI protects the workflow between those stages.

I arrived at this structure after first proving the product flow in the frontend.
Once real quotation data replaced the early sample states, I needed the backend
to do more than return fields: it had to preserve the sequence in which evidence
becomes trustworthy. That is why upload, extraction, human review, scoring, and
recommendation are separate actions instead of one opaque AI request.

## A Request's Journey Through the Service

When a quotation reaches the backend, this is what happens:

1. FastAPI checks that the evaluation exists and has fewer than three quotations.
2. The PDF service validates the filename, file type, size, and PDF header.
3. The file is stored under an evaluation-specific upload directory.
4. PyMuPDF extracts readable text page by page.
5. Foundry returns a typed quotation extraction.
6. Pydantic validates the response before it reaches the database.
7. The frontend sends back the user's reviewed version.
8. Python checks requirements and calculates vendor scores.
9. Foundry receives verified evidence and writes the recommendation explanation.

If extraction fails, the uploaded PDF remains available so the user can correct
the configuration and retry.

## What the Backend Owns

- Evaluation and requirement persistence
- PDF validation, safe storage, and text extraction
- Foundry quotation extraction and recommendation calls
- Human-reviewed quotation updates
- Mandatory requirement validation
- Price and weighted score calculation
- Vendor status, eligibility, and ranking
- Comparison and recommendation responses
- Quotation and evaluation deletion with linked-file cleanup
- CORS and human-readable API errors

## Data Model

I kept the SQLite model deliberately small:

| Model | What I use it for |
| --- | --- |
| `Evaluation` | The purchasing baseline, workflow status, and saved recommendation |
| `Requirement` | Mandatory or preferred procurement conditions |
| `Quotation` | PDF metadata, extracted text, and reviewed vendor data |
| `VendorResult` | Compliance, component scores, risks, rank, and status |

SQLite tables are created at startup with `SQLModel.metadata.create_all`. This is
appropriate for the current project size and keeps the local demonstration easy
to run.

## Scoring Design

The scoring engine uses named weights instead of model-generated numbers:

| Component | Weight |
| --- | ---: |
| Price | 35% |
| Technical compliance | 30% |
| Delivery | 15% |
| Warranty | 10% |
| Payment terms | 5% |
| Support | 5% |

The price score is:

```text
lowest eligible vendor price / current vendor price × 100
```

A mandatory failure makes a vendor non-compliant. A missing value is marked
unknown instead of being treated as a pass. I keep failed vendors in the result
so the frontend can explain why a cheaper quotation was not selected.

## Code Layout

```text
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── routers/
│   │   ├── evaluations.py
│   │   └── quotations.py
│   └── services/
│       ├── pdf_service.py
│       ├── scoring_service.py
│       └── foundry_service.py
├── tests/
├── uploads/
├── pyproject.toml
├── requirements.txt
└── uv.lock
```

## Local Configuration

The service reads either the root `.env` or `backend/.env`. My local configuration
follows this shape:

```dotenv
DATABASE_URL=sqlite:///./bidsight.db
FOUNDRY_ENDPOINT=https://YOUR-RESOURCE-NAME.services.ai.azure.com
FOUNDRY_API_KEY=
FOUNDRY_MODEL_DEPLOYMENT=gpt-5.6-sol
FOUNDRY_REQUEST_TIMEOUT_SECONDS=90
UPLOAD_DIR=uploads
FRONTEND_URL=http://localhost:3000
MAX_UPLOAD_SIZE_MB=10
```

The endpoint is the Foundry resource inference endpoint, optionally ending in
`/openai/v1/`. The deployment value must match its name in Foundry exactly. I do
not place provider credentials in frontend files or commit them to Git.

## How I Run It

From the repository root:

```powershell
cd backend
uv sync --group dev
uv run uvicorn app.main:app --reload
```

Once running, I use:

- `http://localhost:8000` for the API status;
- `http://localhost:8000/api/health` for the health check; and
- `http://localhost:8000/docs` for Swagger UI.

## API Surface

The evaluation endpoints create, list, update, and delete evaluations and their
requirements:

```text
POST    /api/evaluations
GET     /api/evaluations
GET     /api/evaluations/{evaluation_id}
PATCH   /api/evaluations/{evaluation_id}
DELETE  /api/evaluations/{evaluation_id}
POST    /api/evaluations/{evaluation_id}/requirements
GET     /api/evaluations/{evaluation_id}/requirements
```

Quotation endpoints own upload, processing, review, and removal:

```text
POST    /api/evaluations/{evaluation_id}/quotations
GET     /api/evaluations/{evaluation_id}/quotations
POST    /api/quotations/{quotation_id}/process
PATCH   /api/quotations/{quotation_id}
PATCH   /api/quotations/{quotation_id}/extraction
DELETE  /api/quotations/{quotation_id}
```

The remaining endpoints expose deterministic results and the final explanation:

```text
POST    /api/evaluations/{evaluation_id}/evaluate
POST    /api/evaluations/{evaluation_id}/score
GET     /api/evaluations/{evaluation_id}/comparison
POST    /api/evaluations/{evaluation_id}/recommendation
POST    /api/evaluations/{evaluation_id}/recommend
```

`/score`, `/recommend`, and the `/extraction` patch route are compatibility
aliases used by the frontend.

## Deletion and Consistency

I treat deletion as a data-consistency operation rather than a visual frontend
action.

Deleting a quotation removes its PDF and invalidates the evaluation's complete
score set because the eligible lowest price may have changed. Deleting an
evaluation removes its requirements, quotations, uploaded files, extracted data,
scores, and saved recommendation. This keeps dashboard, vendor, and recent
activity views consistent with the database.

## Testing the Backend

The test suite uses temporary SQLite databases, temporary upload folders, and
mocked Foundry responses, so it does not need an API key or consume model quota.

```powershell
cd backend
uv run pytest
```

The current suite contains 27 passing tests covering scoring rules, missing data,
the three-vendor workflow, upload limits, review gates, recommendation safety,
quotation deletion, evaluation deletion, and stale-result invalidation.

## Frontend Connection

The frontend points to this service with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

That value belongs in `frontend/.env.local`. The frontend journey is documented
in [frontend/README.md](../frontend/README.md).

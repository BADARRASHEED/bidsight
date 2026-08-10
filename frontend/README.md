# BidSight Frontend

This folder contains the Next.js interface I built for BidSight. My goal was to
make AI-assisted procurement feel like a serious business workflow rather than a
chatbot wrapped around a PDF uploader.

## The Experience I Wanted to Create

Procurement work is structured: a user defines what they need, collects vendor
offers, verifies the evidence, and then compares the available options. I used
that same mental model for the interface.

The product moves through four visible stages:

1. **Details** — define the purchase, budget, delivery target, and requirements.
2. **Quotations** — upload one to three PDFs and follow their processing state.
3. **Review** — inspect and correct every AI-extracted field.
4. **Comparison** — understand compliance, scores, trade-offs, and recommendation.

I kept the visual language deliberately restrained: deep navy for the workspace,
teal for primary actions, neutral surfaces for data, and clear green, amber, and
red states for procurement outcomes.

I started this part of the project with realistic sample states so I could design
the complete journey before the backend was ready. Once the API took shape, I
replaced those assumptions with typed FastAPI calls and made the surrounding
behaviour real as well: retries, deletion, refreshed dashboard totals, vendor
cleanup, exports, empty states, and failure feedback. That progression helped me
keep the interface product-led instead of letting API details dictate the user
experience.

## What I Built

- A responsive application shell with desktop and mobile navigation
- Dashboard totals, recent evaluations, activity, and review notifications
- Evaluation creation with a reusable requirements builder
- Drag-and-drop PDF uploads with validation, retry, progress, and removal states
- Editable quotation extraction review
- Vendor comparison with compliance and score breakdowns
- Evidence-based recommendation presentation
- Evaluation and vendor management with confirmation dialogs
- Search and status filtering
- CSV exports for evaluations, vendors, and comparisons
- A print-ready comparison report
- API connection testing and saved local currency preference
- Empty, loading, validation, error, and success states
- A favicon that reuses the BidSight ShieldCheck identity

## Screens and Routes

| Route | Role in the product |
| --- | --- |
| `/` | Gives the user a procurement workspace overview |
| `/evaluations` | Searches, filters, opens, exports, and deletes evaluations |
| `/evaluations/new` | Captures the purchasing baseline and requirements |
| `/evaluations/{id}` | Summarises an evaluation and its workflow progress |
| `/evaluations/{id}/upload` | Manages vendor PDF quotations |
| `/evaluations/{id}/review` | Confirms structured quotation evidence |
| `/evaluations/{id}/comparison` | Presents scores, compliance, and recommendation |
| `/vendors` | Manages suppliers discovered through quotations |
| `/settings` | Shows API health, scoring policy, and local preferences |

## How I Structured the Frontend

```text
frontend/
├── app/                    # Routes, application layout, styles, favicon
├── components/             # Product and workflow components
│   └── ui/                 # Shared Radix/shadcn-style primitives
├── lib/
│   ├── api.ts              # Typed FastAPI requests
│   ├── types.ts            # Shared frontend domain types
│   ├── export.ts           # CSV download helpers
│   └── utils.ts            # Formatting and class utilities
├── package.json
├── pnpm-lock.yaml
└── .env.example
```

I kept page files small and moved reusable behaviour into components such as
`EvaluationForm`, `QuotationUploader`, `ExtractionReview`,
`VendorComparisonTable`, `RecommendationPanel`, and the management workspaces.

## Backend Integration

The UI does not contain a mock server or fake AI logic. `lib/api.ts` is the only
place that knows how to call FastAPI. It exposes typed functions for evaluation
management, quotation processing, extraction review, scoring, comparison, and
recommendation generation.

That separation also makes errors easier to handle consistently. Connection
failures and API responses become typed `ApiError` instances, which the product
turns into clear retry or error states.

Deleting an evaluation calls the backend's cascading delete endpoint. After the
request succeeds, the interface refreshes its evaluation list, dashboard totals,
recent activity, notifications, and vendor data so removed records do not remain
visible in another screen.

## Running My Frontend Locally

The frontend needs Node.js, `pnpm`, and the BidSight backend running on port 8000.

I create `frontend/.env.local` with one public configuration value:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Then I run:

```powershell
cd frontend
pnpm install
pnpm dev
```

The application opens at `http://localhost:3000`.

I use `pnpm` consistently and keep `pnpm-lock.yaml` as the only frontend package
lock file. Foundry credentials never belong in this folder; they remain in the
backend environment.

## Frontend Quality Checks

These are the checks I run before delivery:

```powershell
cd frontend
pnpm typecheck
pnpm lint
pnpm build
```

The available package scripts are:

| Command | What it checks or runs |
| --- | --- |
| `pnpm dev` | Local development server |
| `pnpm typecheck` | TypeScript correctness |
| `pnpm lint` | ESLint with zero warnings allowed |
| `pnpm build` | Production compilation and route generation |
| `pnpm start` | An existing production build |

The current frontend passes TypeScript, ESLint, and the Next.js production build.

## Related Project Notes

- [Main BidSight journey](../README.md)
- [Backend design](../backend/README.md)
- [Run and Demo Guide](../docs/BidSight_Run_and_Demo_Guide.pdf)

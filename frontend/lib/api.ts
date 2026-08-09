import type {
  ComparisonResponse,
  Evaluation,
  EvaluationInput,
  HealthResponse,
  Quotation,
  QuotationExtraction,
  Recommendation,
} from "@/lib/types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiError(
      "BidSight could not connect to the API. Make sure FastAPI is running.",
      0,
      error,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "detail" in body
        ? String(body.detail)
        : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export function createEvaluation(payload: EvaluationInput) {
  return request<Evaluation>("/api/evaluations", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      category: payload.category,
      quantity: payload.quantity,
      budget: payload.budget,
      currency: payload.currency,
      required_delivery_days: payload.requiredDeliveryDays,
      notes: payload.notes,
      requirements: payload.requirements.map((requirement) => ({
        name: requirement.name,
        expected_value: requirement.expectedValue,
        unit: requirement.unit || null,
        requirement_type: requirement.type,
        operator: requirement.operator || null,
      })),
    }),
  });
}

export function getEvaluations() {
  return request<Evaluation[]>("/api/evaluations");
}

export function getEvaluation(id: string) {
  return request<Evaluation>(`/api/evaluations/${id}`);
}

export function getHealth() {
  return request<HealthResponse>("/api/health");
}

export function uploadQuotation(
  evaluationId: string,
  file: File,
  vendorName?: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  if (vendorName) formData.append("vendor_name", vendorName);

  return request<Quotation>(`/api/evaluations/${evaluationId}/quotations`, {
    method: "POST",
    body: formData,
  });
}

export function getQuotations(evaluationId: string) {
  return request<Quotation[]>(`/api/evaluations/${evaluationId}/quotations`);
}

export function processQuotation(quotationId: string) {
  return request<Quotation>(`/api/quotations/${quotationId}/process`, {
    method: "POST",
  });
}

export function deleteQuotation(quotationId: string) {
  return request<void>(`/api/quotations/${quotationId}`, {
    method: "DELETE",
  });
}

export function updateQuotation(
  quotationId: string,
  extraction: QuotationExtraction,
) {
  return request<Quotation>(`/api/quotations/${quotationId}/extraction`, {
    method: "PATCH",
    body: JSON.stringify({ ...extraction, reviewed: true }),
  });
}

export function runEvaluation(evaluationId: string) {
  return request<ComparisonResponse>(`/api/evaluations/${evaluationId}/score`, {
    method: "POST",
  });
}

export function getComparison(evaluationId: string) {
  return request<ComparisonResponse>(
    `/api/evaluations/${evaluationId}/comparison`,
  );
}

export function generateRecommendation(evaluationId: string) {
  return request<Recommendation>(
    `/api/evaluations/${evaluationId}/recommend`,
    { method: "POST" },
  );
}

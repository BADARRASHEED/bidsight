import { Badge } from "@/components/ui/badge";
import type { EvaluationStatus } from "@/lib/types";

const statusMap: Record<
  EvaluationStatus,
  { label: string; variant: "muted" | "info" | "warning" | "teal" | "success" }
> = {
  DRAFT: { label: "Draft", variant: "muted" },
  REQUIREMENTS_READY: { label: "Requirements ready", variant: "info" },
  QUOTATIONS_UPLOADED: { label: "Quotations uploaded", variant: "info" },
  REVIEW_REQUIRED: { label: "Review required", variant: "warning" },
  READY_FOR_SCORING: { label: "Ready for scoring", variant: "teal" },
  SCORED: { label: "Scored", variant: "teal" },
  RECOMMENDATION_READY: { label: "Completed", variant: "success" },
};

export function StatusBadge({ status }: { status: EvaluationStatus }) {
  const config = statusMap[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

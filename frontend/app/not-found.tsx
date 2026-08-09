import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Evaluation not found"
      description="The evaluation may have been removed or the link is no longer valid."
      actionLabel="Return to evaluations"
      actionHref="/evaluations"
    />
  );
}

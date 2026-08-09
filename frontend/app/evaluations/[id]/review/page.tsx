import { ExtractionReview } from "@/components/ExtractionReview";
import { PageIntro } from "@/components/PageIntro";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { ApiError, getEvaluation } from "@/lib/api";
import { notFound } from "next/navigation";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let evaluation;
  try {
    evaluation = await getEvaluation(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <div className="mx-auto max-w-6xl">
      <PageIntro
        eyebrow={evaluation.title}
        title="Review extracted quotation data"
        description="Check every AI-extracted value against its source before compliance scoring begins."
      />
      <WorkflowStepper evaluationId={id} current="review" />
      <ExtractionReview evaluationId={id} />
    </div>
  );
}

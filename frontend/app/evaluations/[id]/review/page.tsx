import { ExtractionReview } from "@/components/ExtractionReview";
import { PageIntro } from "@/components/PageIntro";
import { WorkflowStepper } from "@/components/WorkflowStepper";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <PageIntro
        eyebrow="Computer Lab Laptop Procurement"
        title="Review extracted quotation data"
        description="Check every AI-extracted value against its source before compliance scoring begins."
      />
      <WorkflowStepper evaluationId={id} current="review" />
      <ExtractionReview evaluationId={id} />
    </div>
  );
}

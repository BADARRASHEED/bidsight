import { EvaluationOverview } from "@/components/EvaluationOverview";
import { PageIntro } from "@/components/PageIntro";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { mockEvaluations } from "@/lib/mock-data";

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evaluation = mockEvaluations.find((item) => item.id === id) ?? {
    ...mockEvaluations[0],
    id,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageIntro
        eyebrow="Evaluation overview"
        title={evaluation.title}
        description="Review the procurement baseline and continue through quotation evaluation."
      />
      <WorkflowStepper evaluationId={id} current="details" />
      <EvaluationOverview evaluation={evaluation} />
    </div>
  );
}

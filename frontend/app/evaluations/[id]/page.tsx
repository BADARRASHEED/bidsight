import { EvaluationOverview } from "@/components/EvaluationOverview";
import { PageIntro } from "@/components/PageIntro";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { ApiError, getEvaluation } from "@/lib/api";
import { notFound } from "next/navigation";

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
        eyebrow="Evaluation overview"
        title={evaluation.title}
        description="Review the procurement baseline and continue through quotation evaluation."
      />
      <WorkflowStepper evaluationId={id} current="details" />
      <EvaluationOverview evaluation={evaluation} />
    </div>
  );
}

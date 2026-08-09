import { ComparisonWorkspace } from "@/components/ComparisonWorkspace";
import { PageIntro } from "@/components/PageIntro";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { ApiError, getEvaluation } from "@/lib/api";
import { notFound } from "next/navigation";

export default async function ComparisonPage({
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
    <div>
      <PageIntro
        eyebrow={evaluation.title}
        title="Vendor comparison & recommendation"
        description="Compare verified commercial terms, mandatory compliance, and weighted performance scores."
      />
      <WorkflowStepper evaluationId={id} current="comparison" />
      <ComparisonWorkspace evaluationId={id} />
    </div>
  );
}

import { PageIntro } from "@/components/PageIntro";
import { QuotationUploader } from "@/components/QuotationUploader";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { ApiError, getEvaluation } from "@/lib/api";
import { notFound } from "next/navigation";

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let evaluation;
  try {
    evaluation = await getEvaluation(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <div className="mx-auto max-w-5xl">
      <PageIntro
        eyebrow={evaluation.title}
        title="Upload vendor quotations"
        description="Add two or three PDF quotations. BidSight will send each document to FastAPI for structured extraction."
      />
      <WorkflowStepper evaluationId={id} current="quotations" />
      <QuotationUploader evaluationId={id} />
    </div>
  );
}

import { PageIntro } from "@/components/PageIntro";
import { QuotationUploader } from "@/components/QuotationUploader";
import { WorkflowStepper } from "@/components/WorkflowStepper";

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl">
      <PageIntro
        eyebrow="Computer Lab Laptop Procurement"
        title="Upload vendor quotations"
        description="Add two or three PDF quotations. BidSight will send each document to FastAPI for structured extraction."
      />
      <WorkflowStepper evaluationId={id} current="quotations" />
      <QuotationUploader evaluationId={id} />
    </div>
  );
}

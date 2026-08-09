import { EvaluationForm } from "@/components/EvaluationForm";
import { PageIntro } from "@/components/PageIntro";
import { WorkflowStepper } from "@/components/WorkflowStepper";

export default function NewEvaluationPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageIntro
        eyebrow="Create evaluation"
        title="Define what you need to purchase"
        description="Set the commercial baseline and compliance requirements BidSight will use to evaluate vendor quotations."
      />
      <WorkflowStepper current="details" />
      <EvaluationForm />
    </div>
  );
}

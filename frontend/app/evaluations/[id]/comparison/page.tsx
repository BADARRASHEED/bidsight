import { ComparisonActions } from "@/components/ComparisonActions";
import { PageIntro } from "@/components/PageIntro";
import { RecommendationPanel } from "@/components/RecommendationPanel";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { VendorComparisonTable } from "@/components/VendorComparisonTable";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { mockComparison, mockRecommendation } from "@/lib/mock-data";

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <PageIntro
        eyebrow="Computer Lab Laptop Procurement"
        title="Vendor comparison & recommendation"
        description="Compare verified commercial terms, mandatory compliance, and weighted performance scores."
        actions={<ComparisonActions evaluationId={id} />}
      />
      <WorkflowStepper evaluationId={id} current="comparison" />
      <div className="space-y-6">
        <VendorComparisonTable vendors={mockComparison} />
        <ScoreBreakdown vendors={mockComparison} />
        <RecommendationPanel recommendation={mockRecommendation} />
      </div>
    </div>
  );
}

import { PageIntro } from "@/components/PageIntro";
import {
  VendorWorkspace,
  type VendorDirectoryItem,
} from "@/components/VendorDirectory";
import { getEvaluations, getQuotations } from "@/lib/api";

export default async function VendorsPage() {
  const evaluations = await getEvaluations().catch(() => []);
  const quotationGroups = await Promise.all(
    evaluations.map((evaluation) =>
      getQuotations(evaluation.id).catch(() => []),
    ),
  );
  const vendorsByName = new Map<string, VendorDirectoryItem>();
  quotationGroups.forEach((quotations, index) => {
    const evaluation = evaluations[index];
    quotations.forEach((quotation) => {
      const key = quotation.vendorName.trim().toLocaleLowerCase();
      const current = vendorsByName.get(key);
      const selected =
        evaluation.recommendedVendor?.toLocaleLowerCase() === key ? 1 : 0;
      vendorsByName.set(key, {
        name: quotation.vendorName,
        category: current?.category ?? evaluation.category,
        quotations: (current?.quotations ?? 0) + 1,
        selections: (current?.selections ?? 0) + selected,
        lastAnalysed:
          !current || new Date(evaluation.updatedAt) > new Date(current.lastAnalysed)
            ? evaluation.updatedAt
            : current.lastAnalysed,
        reviewed: (current?.reviewed ?? true) && quotation.reviewed,
        sources: [
          ...(current?.sources ?? []),
          {
            quotationId: quotation.id,
            evaluationId: evaluation.id,
            evaluationTitle: evaluation.title,
          },
        ],
      });
    });
  });
  const vendors = Array.from(vendorsByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div>
      <PageIntro
        title="Vendors"
        description="Search, export, and manage suppliers collected from quotation evaluations."
      />
      <VendorWorkspace vendors={vendors} />
    </div>
  );
}

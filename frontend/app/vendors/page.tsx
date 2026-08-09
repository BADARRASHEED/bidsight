import { Download, Search } from "lucide-react";

import { PageIntro } from "@/components/PageIntro";
import {
  VendorDirectory,
  VendorSummaryCards,
  type VendorDirectoryItem,
} from "@/components/VendorDirectory";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        description="A read-only view of suppliers discovered across quotation evaluations."
        actions={<Button variant="outline"><Download /> Export vendors</Button>}
      />
      <VendorSummaryCards vendors={vendors} />
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search vendors by name, category, or city" className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10" aria-label="Search vendors" />
          </div>
        </CardContent>
      </Card>
      <VendorDirectory vendors={vendors} />
    </div>
  );
}

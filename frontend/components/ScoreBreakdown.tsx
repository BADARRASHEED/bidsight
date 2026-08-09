import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { VendorComparison } from "@/lib/types";

const scoreCriteria = [
  { key: "priceScore", label: "Price", weight: "35%" },
  { key: "technicalScore", label: "Technical", weight: "30%" },
  { key: "deliveryScore", label: "Delivery", weight: "15%" },
  { key: "warrantyScore", label: "Warranty", weight: "10%" },
] as const;

export function ScoreBreakdown({ vendors }: { vendors: VendorComparison[] }) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-base font-semibold text-navy-950">Score breakdown</h3>
          <p className="mt-1 text-sm text-slate-500">
            Deterministic component scores used in the final ranking.
          </p>
        </div>
        <p className="hidden text-xs text-slate-400 sm:block">Payment 5% · Support 5%</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <Card key={vendor.id} className={vendor.isRecommended ? "border-teal-200" : undefined}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  {vendor.isRecommended ? "Top ranked" : vendor.rank ? `Rank #${vendor.rank}` : "Not eligible"}
                </p>
                <CardTitle className="mt-1">{vendor.vendorName}</CardTitle>
              </div>
              <span className="text-xl font-bold tabular-nums text-navy-950">
                {vendor.overallScore.toFixed(1)}
              </span>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {scoreCriteria.map((criterion) => {
                const value = vendor[criterion.key];
                return (
                  <div key={criterion.key}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">
                        {criterion.label} <span className="text-slate-400">({criterion.weight})</span>
                      </span>
                      <span className="font-semibold tabular-nums text-slate-700">{value.toFixed(0)}</span>
                    </div>
                    <Progress value={value} className="h-1.5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

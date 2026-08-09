import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Info,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Recommendation } from "@/lib/types";

export function RecommendationPanel({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Card className="overflow-hidden border-teal-200">
      <div className="border-b border-teal-100 bg-teal-50/70 px-5 py-5 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-600 text-white shadow-sm">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-teal-700">
                  AI recommendation
                </p>
                <Badge variant="success">Grounded in verified data</Badge>
              </div>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-navy-950">
                Recommend {recommendation.recommendedVendor}
              </h3>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-slate-500">Overall score</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-teal-700">95.6<span className="text-sm">/100</span></p>
          </div>
        </div>
      </div>

      <CardContent className="p-5 sm:p-6">
        <p className="max-w-5xl text-[15px] leading-7 text-slate-700">
          {recommendation.summary}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <RecommendationList
            title="Main strengths"
            icon={CheckCircle2}
            items={recommendation.strengths}
            tone="success"
          />
          <RecommendationList
            title="Risks to consider"
            icon={AlertTriangle}
            items={recommendation.risks}
            tone="warning"
          />
          <RecommendationList
            title="Missing information"
            icon={Info}
            items={recommendation.missingInformation}
            tone="neutral"
          />
        </div>

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h4 className="text-sm font-semibold text-amber-950">
                Why the cheaper vendor was not selected
              </h4>
              <p className="mt-1.5 text-sm leading-6 text-amber-900/80">
                {recommendation.cheaperVendorReason}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <strong className="font-semibold text-slate-600">
            BidSight provides decision support. The final purchasing decision remains with the user.
          </strong>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationList({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: typeof CheckCircle2;
  items: string[];
  tone: "success" | "warning" | "neutral";
}) {
  const styles = {
    success: "border-emerald-100 bg-emerald-50/50 text-emerald-700",
    warning: "border-amber-100 bg-amber-50/50 text-amber-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${styles}`}>
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em]">
        <Icon className="h-4 w-4" /> {title}
      </h4>
      <ul className="mt-3 space-y-2.5 text-sm leading-5 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, FileSearch, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Evaluation } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function DashboardActivity({ evaluations }: { evaluations: Evaluation[] }) {
  const activities = evaluations.slice(0, 3).map((evaluation) => {
    if (evaluation.status === "RECOMMENDATION_READY") {
      return {
        icon: CheckCircle2,
        title: "Recommendation generated",
        tone: "bg-emerald-50 text-emerald-700",
        evaluation,
      };
    }
    if (evaluation.status === "SCORED") {
      return {
        icon: ShieldCheck,
        title: "Compliance scoring completed",
        tone: "bg-teal-50 text-teal-700",
        evaluation,
      };
    }
    return {
      icon: FileSearch,
      title: `${evaluation.quotationsCount} ${evaluation.quotationsCount === 1 ? "quotation" : "quotations"} uploaded`,
      tone: "bg-sky-50 text-sky-700",
      evaluation,
    };
  });
  const reviewCount = evaluations.filter(
    (evaluation) => evaluation.status === "REVIEW_REQUIRED",
  ).length;
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Clock3 className="h-4 w-4 text-slate-400" />
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="relative space-y-5 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-slate-200">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.evaluation.id} className="relative flex gap-3">
                <span className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white ${activity.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{activity.evaluation.title}</p>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">{formatDate(activity.evaluation.updatedAt)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {activities.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            Activity will appear after you create an evaluation.
          </p>
        )}

        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-700">Review queue</p>
              <p className="mt-1 text-sm text-slate-500">
                {reviewCount} {reviewCount === 1 ? "evaluation needs" : "evaluations need"} attention
              </p>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
              {reviewCount}
            </span>
          </div>
          <Link href="/evaluations" className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">
            Open review queue <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

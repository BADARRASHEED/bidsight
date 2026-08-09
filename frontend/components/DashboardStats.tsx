import { Activity, BarChart3, CheckCircle2, Users } from "lucide-react";

import { Card } from "@/components/ui/card";

const icons = [BarChart3, Activity, CheckCircle2, Users];
const tones = [
  "bg-sky-50 text-sky-700",
  "bg-amber-50 text-amber-700",
  "bg-emerald-50 text-emerald-700",
  "bg-teal-50 text-teal-700",
];

export function DashboardStats({
  stats,
}: {
  stats: Array<{ label: string; value: string; change: string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = icons[index];
        return (
          <Card key={stat.label} className="group p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-navy-950">
                  {stat.value}
                </p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-md ${tones[index]}`}>
                <Icon className="h-[19px] w-[19px]" />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">{stat.change}</p>
          </Card>
        );
      })}
    </div>
  );
}

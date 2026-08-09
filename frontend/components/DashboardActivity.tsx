import { ArrowUpRight, CheckCircle2, Clock3, FileSearch, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const activities = [
  {
    icon: CheckCircle2,
    title: "Recommendation generated",
    detail: "Computer Lab Laptop Procurement",
    time: "12 minutes ago",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: FileSearch,
    title: "3 quotations extracted",
    detail: "Regional Office Network Upgrade",
    time: "Yesterday",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    icon: ShieldCheck,
    title: "Compliance scoring completed",
    detail: "Finance Team Workstations",
    time: "2 days ago",
    tone: "bg-teal-50 text-teal-700",
  },
];

export function DashboardActivity() {
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
              <div key={activity.title} className="relative flex gap-3">
                <span className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white ${activity.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{activity.detail}</p>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-700">Review queue</p>
              <p className="mt-1 text-sm text-slate-500">2 evaluations need attention</p>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
              2
            </span>
          </div>
          <button className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">
            Open review queue <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import { ArrowRight, Plus, ShieldCheck, Sparkles } from "lucide-react";

import { DashboardActivity } from "@/components/DashboardActivity";
import { DashboardStats } from "@/components/DashboardStats";
import { PageIntro } from "@/components/PageIntro";
import { RecentEvaluations } from "@/components/RecentEvaluations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dashboardStats, mockEvaluations } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Sunday, 09 August"
        title="Good afternoon, Badar"
        description="Here is what needs attention across your procurement evaluations today."
        actions={
          <Button asChild variant="teal" size="lg">
            <Link href="/evaluations/new">
              <Plus /> New Evaluation
            </Link>
          </Button>
        }
      />

      <DashboardStats stats={dashboardStats} />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <RecentEvaluations evaluations={mockEvaluations.slice(0, 4)} />
        <DashboardActivity />
      </div>

      <Card className="mt-5 overflow-hidden border-navy-800 bg-navy-950 text-white">
        <div className="relative flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center lg:px-8">
          <div className="absolute inset-0 opacity-20 subtle-grid" />
          <div className="relative flex max-w-2xl items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-500 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Transparent evaluation by design</h3>
                <ShieldCheck className="h-4 w-4 text-teal-300" />
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                AI structures vendor quotations, while compliance gates and weighted scores remain deterministic and fully reviewable.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="relative border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/15">
            <Link href="/evaluations/EV-2026-024/comparison">
              View example comparison <ArrowRight />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

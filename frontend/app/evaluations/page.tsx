import Link from "next/link";
import { ClipboardList, Download, Filter, Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { PageIntro } from "@/components/PageIntro";
import { RecentEvaluations } from "@/components/RecentEvaluations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvaluations } from "@/lib/api";

export default async function EvaluationsPage() {
  const evaluations = await getEvaluations().catch(() => []);
  return (
    <div>
      <PageIntro
        title="Evaluations"
        description="Create, monitor, and reopen vendor quotation evaluations from one workspace."
        actions={
          <Button asChild variant="teal">
            <Link href="/evaluations/new">
              <Plus /> New Evaluation
            </Link>
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by evaluation title, ID, or category"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
              aria-label="Search evaluations"
            />
          </div>
          <Button variant="outline">
            <Filter /> Status: All
          </Button>
          <Button variant="outline">
            <Download /> Export list
          </Button>
        </CardContent>
      </Card>

      {evaluations.length ? (
        <RecentEvaluations
          evaluations={evaluations}
          title="All evaluations"
          description={`${evaluations.length} ${evaluations.length === 1 ? "record" : "records"} · Sorted by most recently updated`}
          showViewAll={false}
        />
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No evaluations yet"
          description="Create your first procurement evaluation to start reviewing vendor quotations."
          actionLabel="New Evaluation"
          actionHref="/evaluations/new"
        />
      )}
    </div>
  );
}

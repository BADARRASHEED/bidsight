import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { EvaluationsWorkspace } from "@/components/EvaluationsWorkspace";
import { PageIntro } from "@/components/PageIntro";
import { Button } from "@/components/ui/button";
import { getEvaluations } from "@/lib/api";

export default async function EvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[] }>;
}) {
  const evaluations = await getEvaluations().catch(() => []);
  const params = await searchParams;
  const initialQuery = Array.isArray(params.search) ? params.search[0] : params.search;

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

      {evaluations.length ? (
        <EvaluationsWorkspace evaluations={evaluations} initialQuery={initialQuery ?? ""} />
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

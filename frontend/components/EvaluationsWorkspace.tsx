"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, Loader2, Search, Trash2, X } from "lucide-react";

import { RecentEvaluations } from "@/components/RecentEvaluations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, deleteEvaluation } from "@/lib/api";
import { downloadCsv, exportDateStamp } from "@/lib/export";
import type { Evaluation } from "@/lib/types";

type EvaluationFilter = "all" | "active" | "review" | "completed";

function matchesFilter(evaluation: Evaluation, filter: EvaluationFilter) {
  if (filter === "review") return evaluation.status === "REVIEW_REQUIRED";
  if (filter === "completed") {
    return evaluation.status === "SCORED" || evaluation.status === "RECOMMENDATION_READY";
  }
  if (filter === "active") {
    return evaluation.status !== "SCORED" && evaluation.status !== "RECOMMENDATION_READY";
  }
  return true;
}

function statusLabel(status: Evaluation["status"]) {
  return status
    .toLocaleLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

export function EvaluationsWorkspace({
  evaluations,
  initialQuery = "",
}: {
  evaluations: Evaluation[];
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<EvaluationFilter>("all");
  const [exportMessage, setExportMessage] = useState("");
  const [deletedEvaluationIds, setDeletedEvaluationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const visibleEvaluations = useMemo(
    () => evaluations.filter((evaluation) => !deletedEvaluationIds.has(evaluation.id)),
    [deletedEvaluationIds, evaluations],
  );

  const filteredEvaluations = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return visibleEvaluations.filter((evaluation) => {
      const matchesQuery =
        !term ||
        [evaluation.title, evaluation.id, evaluation.category, evaluation.recommendedVendor ?? ""]
          .join(" ")
          .toLocaleLowerCase()
          .includes(term);
      return matchesQuery && matchesFilter(evaluation, filter);
    });
  }, [filter, query, visibleEvaluations]);

  function exportEvaluations() {
    downloadCsv(
      `bidsight-evaluations-${exportDateStamp()}.csv`,
      [
        "Evaluation ID",
        "Title",
        "Category",
        "Status",
        "Quantity",
        "Budget",
        "Currency",
        "Quotations",
        "Recommended vendor",
        "Created",
        "Updated",
      ],
      filteredEvaluations.map((evaluation) => [
        evaluation.id,
        evaluation.title,
        evaluation.category,
        statusLabel(evaluation.status),
        evaluation.quantity,
        evaluation.budget,
        evaluation.currency,
        evaluation.quotationsCount,
        evaluation.recommendedVendor,
        evaluation.createdAt,
        evaluation.updatedAt,
      ]),
    );
    setExportMessage(
      `${filteredEvaluations.length} evaluation ${filteredEvaluations.length === 1 ? "record" : "records"} exported.`,
    );
  }

  async function removeEvaluation() {
    if (!selectedEvaluation) return;
    setIsDeleting(true);
    setDeleteNotice(null);
    try {
      await deleteEvaluation(selectedEvaluation.id);
      setDeletedEvaluationIds((current) => {
        const next = new Set(current);
        next.add(selectedEvaluation.id);
        return next;
      });
      setDeleteNotice({
        tone: "success",
        message: `${selectedEvaluation.title} was deleted from the workspace.`,
      });
      setSelectedEvaluation(null);
      window.dispatchEvent(new Event("bidsight:evaluations-changed"));
      router.refresh();
    } catch (error) {
      setDeleteNotice({
        tone: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "The evaluation could not be deleted. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const hasFilters = Boolean(query.trim()) || filter !== "all";

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, ID, category, or vendor"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
              aria-label="Search evaluations"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Clear evaluation search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as EvaluationFilter)}>
            <SelectTrigger className="w-full lg:w-[180px]" aria-label="Filter evaluations by status">
              <Filter className="h-4 w-4 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">In progress</SelectItem>
              <SelectItem value="review">Needs review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportEvaluations} disabled={filteredEvaluations.length === 0}>
            <Download /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {exportMessage && (
        <p role="status" className="text-right text-xs font-medium text-emerald-700">
          {exportMessage}
        </p>
      )}

      {deleteNotice && (
        <div
          role="status"
          className={
            deleteNotice.tone === "success"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          }
        >
          {deleteNotice.message}
        </div>
      )}

      {filteredEvaluations.length ? (
        <RecentEvaluations
          evaluations={filteredEvaluations}
          title="All evaluations"
          description={`${filteredEvaluations.length} ${filteredEvaluations.length === 1 ? "record" : "records"} · Sorted by most recently updated`}
          showViewAll={false}
          onDelete={setSelectedEvaluation}
        />
      ) : (
        <Card>
          <CardContent className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
            <Search className="h-8 w-8 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-navy-950">
              {visibleEvaluations.length === 0 ? "No evaluations yet" : "No matching evaluations"}
            </h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              {visibleEvaluations.length === 0
                ? "Create a procurement evaluation to start comparing vendor quotations."
                : "Adjust the search or status filter to see more procurement records."}
            </p>
            {visibleEvaluations.length === 0 ? (
              <Button variant="teal" size="sm" className="mt-4" onClick={() => router.push("/evaluations/new")}>
                New Evaluation
              </Button>
            ) : hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={selectedEvaluation !== null}
        onOpenChange={(open) => !open && !isDeleting && setSelectedEvaluation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedEvaluation?.title}?</DialogTitle>
            <DialogDescription>
              This permanently removes the evaluation, its requirements,
              {` ${selectedEvaluation?.quotationsCount ?? 0} linked quotation${(selectedEvaluation?.quotationsCount ?? 0) === 1 ? "" : "s"}`},
              uploaded PDFs, extracted data, scores, and recommendation.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-red-100 bg-red-50/70 px-4 py-3 text-xs leading-5 text-red-700">
            The record will also disappear from Dashboard totals, Recent evaluations, Recent activity, and Vendors.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvaluation(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void removeEvaluation()} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete evaluation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

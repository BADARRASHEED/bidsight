import Link from "next/link";
import { ArrowRight, Crown, FileSearch, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Evaluation } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function evaluationHref(evaluation: Evaluation) {
  if (
    evaluation.status === "RECOMMENDATION_READY" ||
    evaluation.status === "SCORED"
  ) {
    return `/evaluations/${evaluation.id}/comparison`;
  }
  if (evaluation.status === "REVIEW_REQUIRED") {
    return `/evaluations/${evaluation.id}/review`;
  }
  if (evaluation.status === "QUOTATIONS_UPLOADED") {
    return `/evaluations/${evaluation.id}/upload`;
  }
  return `/evaluations/${evaluation.id}`;
}

export function RecentEvaluations({
  evaluations,
  title = "Recent evaluations",
  description = "Track current work and reopen completed vendor decisions.",
  showViewAll = true,
  onDelete,
}: {
  evaluations: Evaluation[];
  title?: string;
  description?: string;
  showViewAll?: boolean;
  onDelete?: (evaluation: Evaluation) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        </div>
        {showViewAll && (
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/evaluations">
              View all <ArrowRight />
            </Link>
          </Button>
        )}
      </CardHeader>

      <CardContent className="hidden p-0 md:block">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Evaluation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quotations</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Recommended vendor</TableHead>
              <TableHead className="pr-6 text-right">Updated</TableHead>
              {onDelete && <TableHead className="w-[72px] pr-6 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations.length === 0 && (
              <TableRow>
                <TableCell colSpan={onDelete ? 7 : 6} className="h-32 text-center text-sm text-slate-500">
                  No evaluations yet. Create one to start comparing quotations.
                </TableCell>
              </TableRow>
            )}
            {evaluations.map((evaluation) => (
              <TableRow key={evaluation.id}>
                <TableCell className="pl-6">
                  <Link
                    href={evaluationHref(evaluation)}
                    className="group block min-w-[220px]"
                  >
                    <p className="font-semibold text-navy-950 transition group-hover:text-teal-700">
                      {evaluation.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {evaluation.id} · {evaluation.category}
                    </p>
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={evaluation.status} />
                </TableCell>
                <TableCell>
                  <span className="font-semibold tabular-nums text-slate-700">
                    {evaluation.quotationsCount}
                  </span>
                  <span className="text-slate-400"> / 3</span>
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium tabular-nums text-slate-700">
                  {formatCurrency(Number(evaluation.budget), evaluation.currency, true)}
                </TableCell>
                <TableCell>
                  {evaluation.recommendedVendor ? (
                    <span className="flex min-w-[170px] items-center gap-1.5 text-sm font-semibold text-emerald-700">
                      <Crown className="h-3.5 w-3.5" />
                      {evaluation.recommendedVendor}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">Not available</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap pr-6 text-right text-xs text-slate-500">
                  {formatDate(evaluation.updatedAt)}
                </TableCell>
                {onDelete && (
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onDelete(evaluation)}
                      aria-label={`Delete evaluation ${evaluation.title}`}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <CardContent className="divide-y divide-slate-100 p-0 md:hidden">
        {evaluations.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            No evaluations yet. Create one to get started.
          </p>
        )}
        {evaluations.map((evaluation) =>
          onDelete ? (
            <div key={evaluation.id} className="p-5 transition hover:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <Link href={evaluationHref(evaluation)} className="min-w-0 group">
                  <p className="font-semibold leading-5 text-navy-950 transition group-hover:text-teal-700">
                    {evaluation.title}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">{evaluation.id}</p>
                </Link>
                <StatusBadge status={evaluation.status} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FileSearch className="h-3.5 w-3.5" />
                  {evaluation.quotationsCount} quotations
                </span>
                <div className="flex items-center gap-2">
                  <span>{formatDate(evaluation.updatedAt)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-700"
                    onClick={() => onDelete(evaluation)}
                    aria-label={`Delete evaluation ${evaluation.title}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={evaluation.id}
              href={evaluationHref(evaluation)}
              className="block p-5 transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold leading-5 text-navy-950">{evaluation.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{evaluation.id}</p>
                </div>
                <StatusBadge status={evaluation.status} />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FileSearch className="h-3.5 w-3.5" />
                  {evaluation.quotationsCount} quotations
                </span>
                <span>{formatDate(evaluation.updatedAt)}</span>
              </div>
            </Link>
          ),
        )}
      </CardContent>
    </Card>
  );
}

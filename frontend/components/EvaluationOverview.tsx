import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Box,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Layers3,
} from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Evaluation } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function EvaluationOverview({ evaluation }: { evaluation: Evaluation }) {
  const facts = [
    { icon: Box, label: "Quantity", value: `${evaluation.quantity} units` },
    {
      icon: Banknote,
      label: "Maximum budget",
      value: formatCurrency(Number(evaluation.budget), evaluation.currency),
    },
    {
      icon: CalendarClock,
      label: "Required delivery",
      value: `${evaluation.requiredDeliveryDays} days`,
    },
    { icon: Layers3, label: "Category", value: evaluation.category },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                  {evaluation.id}
                </span>
                <StatusBadge status={evaluation.status} />
              </div>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-navy-950">
                {evaluation.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Created {formatDate(evaluation.createdAt)} · Last updated {formatDate(evaluation.updatedAt)}
              </p>
            </div>
            <Button asChild variant="teal">
              <Link href={`/evaluations/${evaluation.id}/upload`}>
                Continue evaluation <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <CardContent className="grid gap-px bg-slate-200 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => {
            const Icon = fact.icon;
            return (
              <div key={fact.label} className="flex items-start gap-3 bg-white p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-500">{fact.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{fact.value}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Evaluation requirements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {[
              ["Minimum RAM", "16 GB", "Mandatory"],
              ["Minimum warranty", "24 months", "Mandatory"],
              ["Delivery", "Maximum 14 days", "Mandatory"],
              ["Onsite support", "Business hours", "Preferred"],
            ].map(([name, value, type]) => (
              <div key={name} className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 sm:px-6">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{value}</p>
                </div>
                <Badge variant={type === "Mandatory" ? "teal" : "muted"}>{type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            <WorkflowLink
              icon={ClipboardCheck}
              title="Evaluation details"
              description="Purchasing baseline complete"
              href={`/evaluations/${evaluation.id}`}
              complete
            />
            <WorkflowLink
              icon={FileText}
              title="Vendor quotations"
              description={`${evaluation.quotationsCount} of 3 uploaded`}
              href={`/evaluations/${evaluation.id}/upload`}
              complete={evaluation.quotationsCount >= 2}
            />
            <WorkflowLink
              icon={ClipboardCheck}
              title="Extraction review"
              description="Confirm structured quotation data"
              href={`/evaluations/${evaluation.id}/review`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WorkflowLink({
  icon: Icon,
  title,
  description,
  href,
  complete = false,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  description: string;
  href: string;
  complete?: boolean;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-md border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-teal-50/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-teal-700">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="block truncate text-xs text-slate-500">{description}</span>
      </span>
      {complete && <Badge variant="success">Complete</Badge>}
      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

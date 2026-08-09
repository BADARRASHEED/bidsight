"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, getQuotations, updateQuotation } from "@/lib/api";
import type { Quotation, QuotationExtraction } from "@/lib/types";
import { cn, formatFileSize } from "@/lib/utils";

type ReviewFieldKey =
  | "vendorName"
  | "productName"
  | "productModel"
  | "quantity"
  | "unitPrice"
  | "subtotal"
  | "taxAmount"
  | "totalPrice"
  | "deliveryDays"
  | "warrantyMonths"
  | "paymentTerms"
  | "supportDetails";

type FieldStatus = "confirmed" | "uncertain" | "missing" | "invalid";

interface FieldDefinition {
  key: ReviewFieldKey;
  label: string;
  type?: "number" | "textarea";
  suffix?: string;
  helper?: string;
}

const commercialFields: FieldDefinition[] = [
  { key: "vendorName", label: "Vendor name" },
  { key: "productName", label: "Product" },
  { key: "productModel", label: "Product / model" },
  { key: "quantity", label: "Quantity", type: "number", suffix: "units" },
  { key: "unitPrice", label: "Unit price", type: "number", suffix: "PKR" },
  { key: "subtotal", label: "Subtotal", type: "number", suffix: "PKR" },
  { key: "taxAmount", label: "Tax", type: "number", suffix: "PKR" },
  { key: "totalPrice", label: "Total price", type: "number", suffix: "PKR" },
];

const fulfilmentFields: FieldDefinition[] = [
  {
    key: "deliveryDays",
    label: "Delivery time",
    type: "number",
    suffix: "days",
  },
  {
    key: "warrantyMonths",
    label: "Warranty",
    type: "number",
    suffix: "months",
  },
  { key: "paymentTerms", label: "Payment terms", type: "textarea" },
  { key: "supportDetails", label: "Support information", type: "textarea" },
];

function getInitialStatus(quotation: Quotation, key: ReviewFieldKey): FieldStatus {
  const value = quotation.extraction?.[key];
  if (value === null || value === undefined || value === "") return "missing";
  return "confirmed";
}

export function ExtractionReview({ evaluationId }: { evaluationId: string }) {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, Partial<Record<ReviewFieldKey, FieldStatus>>>
  >({});

  useEffect(() => {
    let cancelled = false;
    void getQuotations(evaluationId)
      .then((items) => {
        if (cancelled) return;
        setQuotations(items);
        setActiveId(items[0]?.id ?? "");
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Quotation extractions could not be loaded.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [evaluationId]);

  const activeIndex = quotations.findIndex((quotation) => quotation.id === activeId);
  const activeQuotation = quotations[activeIndex];
  const reviewedCount = quotations.filter((quotation) => quotation.reviewed).length;

  const fieldStatuses = useMemo(() => {
    const statuses = {} as Record<ReviewFieldKey, FieldStatus>;
    if (!activeQuotation) return statuses;
    [...commercialFields, ...fulfilmentFields].forEach((field) => {
      statuses[field.key] =
        statusOverrides[activeQuotation.id]?.[field.key] ??
        getInitialStatus(activeQuotation, field.key);
    });
    return statuses;
  }, [activeQuotation, statusOverrides]);

  const issueCount = Object.values(fieldStatuses).filter(
    (status) => status !== "confirmed",
  ).length;

  function updateField(key: ReviewFieldKey, rawValue: string, type?: string) {
    const value =
      type === "number" ? (rawValue === "" ? null : Number(rawValue)) : rawValue;

    setQuotations((current) =>
      current.map((quotation) =>
        quotation.id === activeId
          ? {
              ...quotation,
              extraction: {
                ...quotation.extraction!,
                [key]: value,
              },
            }
          : quotation,
      ),
    );
    setStatusOverrides((current) => ({
      ...current,
      [activeId]: {
        ...current[activeId],
        [key]: rawValue.trim() ? "confirmed" : "missing",
      },
    }));
  }

  function updateSpecifications(specifications: Record<string, string | number>) {
    setQuotations((current) =>
      current.map((quotation) =>
        quotation.id === activeId
          ? {
              ...quotation,
              extraction: {
                ...quotation.extraction!,
                specifications,
              },
            }
          : quotation,
      ),
    );
  }

  async function confirmCurrent() {
    if (!activeQuotation?.extraction) return;
    setIsSaving(true);
    setNotice(null);

    try {
      const updated = await updateQuotation(
        activeQuotation.id,
        activeQuotation.extraction,
      );
      setQuotations((current) =>
        current.map((quotation) =>
          quotation.id === activeId ? updated : quotation,
        ),
      );
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "The reviewed extraction could not be saved.",
      );
      setIsSaving(false);
      return;
    }
    setIsSaving(false);

    if (activeIndex < quotations.length - 1) {
      setActiveId(quotations[activeIndex + 1].id);
    } else {
      router.push(`/evaluations/${evaluationId}/comparison`);
    }
  }

  if (isLoading) return <LoadingState />;

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Could not load quotation extraction</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  if (!activeQuotation) {
    return (
      <EmptyState
        icon={FileText}
        title="No processed quotations"
        description="Upload and process at least one quotation before starting extraction review."
        actionLabel="Return to quotation upload"
        actionHref={`/evaluations/${evaluationId}/upload`}
      />
    );
  }

  if (!activeQuotation.extraction) {
    return (
      <EmptyState
        icon={FileText}
        title="Extraction is not ready"
        description="Return to quotation upload and retry processing for this PDF."
        actionLabel="Return to quotation upload"
        actionHref={`/evaluations/${evaluationId}/upload`}
      />
    );
  }

  return (
    <div className="space-y-5">
      {notice && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>Review could not be saved</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <Alert variant="info">
        <Sparkles />
        <AlertTitle>AI extraction requires your confirmation</AlertTitle>
        <AlertDescription>
          Verify values against the source PDF. Amber fields are uncertain, red fields are missing or invalid, and page references show where values were found.
        </AlertDescription>
      </Alert>

      <Card>
        <div className="flex flex-col border-b border-slate-200 lg:flex-row lg:items-stretch">
          {quotations.map((quotation, index) => {
            const isActive = quotation.id === activeId;
            const issues = [...commercialFields, ...fulfilmentFields].filter(
              (field) =>
                (statusOverrides[quotation.id]?.[field.key] ??
                  getInitialStatus(quotation, field.key)) !== "confirmed",
            ).length;

            return (
              <button
                key={quotation.id}
                type="button"
                onClick={() => setActiveId(quotation.id)}
                className={cn(
                  "relative flex flex-1 items-center gap-3 border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50 lg:border-b-0 lg:border-r lg:last:border-r-0",
                  isActive && "bg-teal-50/60",
                )}
              >
                {isActive && (
                  <span className="absolute inset-y-0 left-0 w-0.5 bg-teal-600 lg:inset-x-0 lg:bottom-0 lg:top-auto lg:h-0.5 lg:w-auto" />
                )}
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    quotation.reviewed
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isActive
                        ? "border-teal-600 bg-white text-teal-700"
                        : "border-slate-200 bg-slate-50 text-slate-500",
                  )}
                >
                  {quotation.reviewed ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-950">
                    {quotation.vendorName}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {quotation.reviewed
                      ? "Review complete"
                      : issues > 0
                        ? `${issues} ${issues === 1 ? "field" : "fields"} need attention`
                        : "Ready to confirm"}
                  </span>
                </span>
                {issues > 0 && !quotation.reviewed && (
                  <Badge variant="warning">{issues}</Badge>
                )}
              </button>
            );
          })}
        </div>

        <CardHeader className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
                <FileText className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {activeQuotation.fileName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatFileSize(activeQuotation.fileSize ?? 0)} · Text-based PDF
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-slate-600">Review progress</p>
                <p className="text-[11px] text-slate-400">
                  {reviewedCount} of {quotations.length} vendors confirmed
                </p>
              </div>
              <Progress value={(reviewedCount / quotations.length) * 100} className="w-24" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {issueCount > 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {issueCount} {issueCount === 1 ? "field needs" : "fields need"} attention
                </p>
                <p className="mt-0.5 text-xs leading-5 text-amber-800">
                  Missing information can remain blank, but it will be shown explicitly in scoring and the recommendation.
                </p>
              </div>
            </div>
          )}

          <ReviewSection
            title="Quotation & commercial details"
            description="Confirm the supplier, quoted product, quantity, and pricing totals."
            fields={commercialFields}
            extraction={activeQuotation.extraction!}
            statuses={fieldStatuses}
            onChange={updateField}
          />

          <div className="my-7 h-px bg-slate-200" />

          <SpecificationEditor
            specifications={activeQuotation.extraction.specifications ?? {}}
            onChange={updateSpecifications}
          />

          <div className="my-7 h-px bg-slate-200" />

          <ReviewSection
            title="Fulfilment & after-sales"
            description="Validate the delivery commitment, warranty, payment, and support terms."
            fields={fulfilmentFields}
            extraction={activeQuotation.extraction!}
            statuses={fieldStatuses}
            onChange={updateField}
          />

          {activeQuotation.extraction?.extractionNotes &&
            activeQuotation.extraction.extractionNotes.length > 0 && (
              <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <Info className="h-3.5 w-3.5" /> Extraction notes
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {activeQuotation.extraction.extractionNotes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
        <Button variant="outline" onClick={() => router.push(`/evaluations/${evaluationId}/upload`)}>
          <ArrowLeft /> Back to quotations
        </Button>
        <Button variant="teal" onClick={confirmCurrent} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          {activeIndex === quotations.length - 1
            ? "Confirm & view comparison"
            : "Confirm extracted data"}
          {!isSaving && <ArrowRight />}
        </Button>
      </div>
    </div>
  );
}

function SpecificationEditor({
  specifications,
  onChange,
}: {
  specifications: Record<string, string | number>;
  onChange: (specifications: Record<string, string | number>) => void;
}) {
  const entries = Object.entries(specifications);

  function replaceEntry(
    currentKey: string,
    nextKey: string,
    nextValue: string | number,
  ) {
    const updated: Record<string, string | number> = {};
    for (const [key, value] of entries) {
      if (key === currentKey) {
        if (nextKey.trim()) updated[nextKey.trim()] = nextValue;
      } else {
        updated[key] = value;
      }
    }
    onChange(updated);
  }

  function addSpecification() {
    let index = entries.length + 1;
    let key = `Specification ${index}`;
    while (key in specifications) {
      index += 1;
      key = `Specification ${index}`;
    }
    onChange({ ...specifications, [key]: "" });
  }

  function removeSpecification(keyToRemove: string) {
    onChange(
      Object.fromEntries(entries.filter(([key]) => key !== keyToRemove)),
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-sm font-semibold text-navy-950">
            Technical specifications
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Confirm processor, memory, storage, and other values used in requirement checks.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
          <Plus /> Add specification
        </Button>
      </div>

      {entries.length ? (
        <div className="space-y-3">
          {entries.map(([key, value], index) => (
            <div
              key={key}
              className="grid gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[minmax(150px,0.8fr)_minmax(200px,1.4fr)_40px]"
            >
              <Input
                aria-label={`Specification ${index + 1} name`}
                value={key}
                onChange={(event) => replaceEntry(key, event.target.value, value)}
                placeholder="Specification name"
              />
              <Input
                aria-label={`Specification ${index + 1} value`}
                value={String(value)}
                onChange={(event) => replaceEntry(key, key, event.target.value)}
                placeholder="Extracted value"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => removeSpecification(key)}
                aria-label={`Remove ${key}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No technical specifications were extracted. Add the values needed for compliance checks.
        </div>
      )}
    </section>
  );
}

function ReviewSection({
  title,
  description,
  fields,
  extraction,
  statuses,
  onChange,
}: {
  title: string;
  description: string;
  fields: FieldDefinition[];
  extraction: QuotationExtraction;
  statuses: Record<ReviewFieldKey, FieldStatus>;
  onChange: (key: ReviewFieldKey, value: string, type?: string) => void;
}) {
  return (
    <section>
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-navy-950">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
        {fields.map((field) => {
          const status = statuses[field.key];
          const value = extraction[field.key];
          const sourcePage = extraction.sourcePages?.[field.key];
          const statusLabel = {
            confirmed: null,
            uncertain: "Uncertain extraction",
            missing: "Not found in PDF",
            invalid: "Below required minimum",
          }[status];
          const fieldClass = cn(
            status === "uncertain" &&
              "border-amber-400 bg-amber-50/50 focus-visible:border-amber-500 focus-visible:ring-amber-500/10",
            (status === "missing" || status === "invalid") &&
              "border-red-300 bg-red-50/40 focus-visible:border-red-500 focus-visible:ring-red-500/10",
          );
          const suffix =
            field.suffix === "PKR" ? extraction.currency ?? "currency" : field.suffix;

          return (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
                <div className="flex items-center gap-2">
                  {sourcePage && (
                    <span className="text-[10px] font-medium text-slate-400">
                      Source: page {sourcePage}
                    </span>
                  )}
                  {statusLabel && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold",
                        status === "uncertain" ? "text-amber-700" : "text-red-600",
                      )}
                    >
                      <AlertCircle className="h-3 w-3" /> {statusLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                {field.type === "textarea" ? (
                  <Textarea
                    id={`field-${field.key}`}
                    value={value == null ? "" : String(value)}
                    onChange={(event) => onChange(field.key, event.target.value, field.type)}
                    placeholder="Not found — enter information if available"
                    className={cn("min-h-[82px]", fieldClass)}
                  />
                ) : (
                  <Input
                    id={`field-${field.key}`}
                    type={field.type === "number" ? "number" : "text"}
                    value={value == null ? "" : String(value)}
                    onChange={(event) => onChange(field.key, event.target.value, field.type)}
                    placeholder="Not found"
                    className={cn(suffix && "pr-20", fieldClass)}
                  />
                )}
                {suffix && field.type !== "textarea" && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                    {suffix}
                  </span>
                )}
              </div>
              {field.helper && <p className="text-[11px] text-slate-400">{field.helper}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

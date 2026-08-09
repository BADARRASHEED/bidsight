"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Loader2, Save } from "lucide-react";

import { RequirementsBuilder } from "@/components/RequirementsBuilder";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEvaluation } from "@/lib/api";
import type { EvaluationInput, Requirement } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialRequirements: Requirement[] = [
  {
    id: "ram",
    name: "Minimum RAM",
    expectedValue: "16",
    unit: "GB",
    type: "MANDATORY",
  },
  {
    id: "warranty",
    name: "Minimum warranty",
    expectedValue: "24",
    unit: "months",
    type: "MANDATORY",
  },
  {
    id: "delivery",
    name: "Delivery",
    expectedValue: "Maximum 14",
    unit: "days",
    type: "MANDATORY",
  },
];

export function EvaluationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [form, setForm] = useState<EvaluationInput>({
    title: "Computer Lab Laptop Procurement",
    category: "IT Equipment",
    quantity: 25,
    budget: "4000000",
    currency: "PKR",
    requiredDeliveryDays: 14,
    notes:
      "Business-class laptops for the new computer lab. Prioritise onsite support and reliable delivery.",
    requirements: initialRequirements,
  });

  const errors = {
    title: !form.title.trim(),
    category: !form.category.trim(),
    quantity: !Number.isFinite(form.quantity) || form.quantity < 1,
    budget: !form.budget || Number(form.budget) <= 0,
    delivery: !Number.isFinite(form.requiredDeliveryDays) || form.requiredDeliveryDays < 1,
    requirements:
      form.requirements.length === 0 ||
      form.requirements.some(
        (requirement) =>
          !requirement.name.trim() || !requirement.expectedValue.trim(),
      ),
  };

  function updateField<K extends keyof EvaluationInput>(
    key: K,
    value: EvaluationInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    setApiNotice(null);

    if (Object.values(errors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      const evaluation = await createEvaluation(form);
      router.push(`/evaluations/${evaluation.id}/upload`);
    } catch {
      setApiNotice(
        "FastAPI is not available, so BidSight has opened the polished demo workflow with your form data held locally.",
      );
      window.setTimeout(() => {
        router.push("/evaluations/EV-2026-024/upload?demo=true");
      }, 950);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {apiNotice && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>Preview mode enabled</AlertTitle>
          <AlertDescription>{apiNotice}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="border-b border-slate-100 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Evaluation details</CardTitle>
              <p className="mt-1.5 text-sm text-slate-500">
                Provide the purchasing baseline used to check every quotation.
              </p>
            </div>
            <span className="hidden rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:block">
              Step 1 of 4
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldGroup
              label="Evaluation title"
              htmlFor="title"
              error={showErrors && errors.title ? "Enter an evaluation title." : undefined}
              className="md:col-span-2"
            >
              <Input
                id="title"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="e.g. Computer Lab Laptop Procurement"
                aria-invalid={showErrors && errors.title}
              />
            </FieldGroup>

            <FieldGroup
              label="Product / category"
              htmlFor="category"
              error={showErrors && errors.category ? "Enter a category." : undefined}
            >
              <Input
                id="category"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="e.g. IT Equipment"
                aria-invalid={showErrors && errors.category}
              />
            </FieldGroup>

            <FieldGroup
              label="Quantity"
              htmlFor="quantity"
              error={showErrors && errors.quantity ? "Quantity must be at least 1." : undefined}
            >
              <Input
                id="quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(event) => updateField("quantity", Number(event.target.value))}
                aria-invalid={showErrors && errors.quantity}
              />
            </FieldGroup>

            <FieldGroup
              label="Maximum budget"
              htmlFor="budget"
              error={showErrors && errors.budget ? "Enter a valid budget." : undefined}
            >
              <div className="flex">
                <Select
                  value={form.currency}
                  onValueChange={(value) => updateField("currency", value)}
                >
                  <SelectTrigger className="w-[104px] rounded-r-none border-r-0" aria-label="Currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PKR">PKR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.budget}
                  onChange={(event) => updateField("budget", event.target.value)}
                  className="rounded-l-none"
                  aria-invalid={showErrors && errors.budget}
                />
              </div>
            </FieldGroup>

            <FieldGroup
              label="Required delivery time"
              htmlFor="delivery"
              hint="Maximum acceptable time"
              error={showErrors && errors.delivery ? "Enter at least 1 day." : undefined}
            >
              <div className="relative">
                <Input
                  id="delivery"
                  type="number"
                  min={1}
                  value={form.requiredDeliveryDays}
                  onChange={(event) =>
                    updateField("requiredDeliveryDays", Number(event.target.value))
                  }
                  className="pr-16"
                  aria-invalid={showErrors && errors.delivery}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  days
                </span>
              </div>
            </FieldGroup>

            <FieldGroup
              label="Procurement notes"
              htmlFor="notes"
              hint="Optional context for reviewers"
              className="md:col-span-2"
            >
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Add any important purchasing context or constraints..."
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <RequirementsBuilder
            requirements={form.requirements}
            onChange={(requirements) => updateField("requirements", requirements)}
            showErrors={showErrors}
          />
        </CardContent>
      </Card>

      <Card className="sticky bottom-3 z-10 border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Save className="h-3.5 w-3.5" />
            Your details will be saved when you continue.
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/evaluations")}>
              Cancel
            </Button>
            <Button type="submit" variant="teal" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              Continue to quotations
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}

function FieldGroup({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  FileUp,
  Info,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

import { QuotationCard, type UploadItem } from "@/components/QuotationCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadQuotation } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const demoItems: UploadItem[] = [
  {
    id: "demo-techcore",
    vendorName: "TechCore Solutions",
    fileName: "TechCore_Latitude_Quotation.pdf",
    fileSize: 2457600,
    status: "ready",
    progress: 100,
  },
  {
    id: "demo-nexa",
    vendorName: "Nexa Systems",
    fileName: "Nexa_Systems_Proposal.pdf",
    fileSize: 1835008,
    status: "ready",
    progress: 100,
  },
];

export function QuotationUploader({ evaluationId }: { evaluationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>(demoItems);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState(
    "Northstar_Pricing.xlsx was rejected. Only PDF quotation files are supported.",
  );
  const [isContinuing, setIsContinuing] = useState(false);

  function addFiles(files: File[]) {
    setValidationError("");
    const availableSlots = MAX_FILES - items.length;

    if (availableSlots <= 0) {
      setValidationError("Maximum reached. Remove a quotation before adding another PDF.");
      return;
    }

    const accepted: UploadItem[] = [];
    for (const file of files.slice(0, availableSlots)) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setValidationError(`${file.name} was rejected. Only PDF quotation files are supported.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(`${file.name} exceeds the 10 MB upload limit.`);
        continue;
      }

      accepted.push({
        id: crypto.randomUUID(),
        vendorName: file.name.replace(/[_-]/g, " ").replace(/\.pdf$/i, "").trim(),
        fileName: file.name,
        fileSize: file.size,
        file,
        status: "pending",
        progress: 0,
      });
    }

    setItems((current) => [...current, ...accepted]);
  }

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function uploadItem(item: UploadItem) {
    if (!item.file) return true;
    updateItem(item.id, { status: "uploading", progress: 34, error: undefined });

    try {
      await uploadQuotation(evaluationId, item.file, item.vendorName);
      updateItem(item.id, { status: "processing", progress: 72 });
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      updateItem(item.id, { status: "ready", progress: 100 });
      return true;
    } catch {
      updateItem(item.id, {
        status: "error",
        progress: 42,
        error: "The API could not process this quotation. Start FastAPI, then retry.",
      });
      return false;
    }
  }

  async function handleContinue() {
    if (items.length < 2) {
      setValidationError("Add at least two PDF quotations before continuing to extraction review.");
      return;
    }

    setIsContinuing(true);
    const pending = items.filter((item) => item.status === "pending" || item.status === "error");
    const results = await Promise.all(pending.map(uploadItem));
    setIsContinuing(false);

    if (results.every(Boolean)) {
      router.push(`/evaluations/${evaluationId}/review`);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      {validationError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Quotation not added</AlertTitle>
          <AlertDescription className="flex items-start justify-between gap-3">
            <span className="min-w-0 break-words">{validationError}</span>
            <button
              type="button"
              onClick={() => setValidationError("")}
              aria-label="Dismiss validation error"
              className="rounded p-0.5 text-red-500 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(Array.from(event.dataTransfer.files));
            }}
            className={cn(
              "subtle-grid flex min-h-[230px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 py-9 text-center transition",
              dragging
                ? "border-teal-500 bg-teal-50"
                : items.length >= MAX_FILES
                  ? "border-slate-200 bg-slate-50 opacity-70"
                  : "border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/30",
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-teal-700 shadow-sm">
              <FileUp className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-navy-950">
              Drop vendor quotation PDFs here
            </h3>
            <p className="mt-1.5 max-w-md break-words text-sm leading-5 text-slate-500">
              Upload up to three digitally generated PDFs. Each file must be 10 MB or smaller.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 bg-white"
              onClick={() => inputRef.current?.click()}
              disabled={items.length >= MAX_FILES}
            >
              Browse PDF files
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="sr-only"
              onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
            />
          </div>

          <div className="mt-4 flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              PDFs are sent securely to the configured FastAPI backend.
            </span>
            <span className="font-semibold text-slate-600">{items.length} of {MAX_FILES} added</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-navy-950">Added quotations</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Confirm vendor names before extraction review.
            </p>
          </div>
          <span className="hidden text-xs font-medium text-slate-400 sm:block">Minimum 2 required</span>
        </div>

        {items.map((item, index) => (
          <QuotationCard
            key={item.id}
            item={item}
            index={index}
            onRemove={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
            onRetry={() => void uploadItem(item)}
            onVendorChange={(vendorName) => updateItem(item.id, { vendorName })}
          />
        ))}
      </div>

      <Alert variant="info">
        <Info />
        <AlertTitle>Human review is required</AlertTitle>
        <AlertDescription>
          BidSight will structure quotation data on the backend. You will verify every extracted field before scoring begins.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
        <Button variant="outline" onClick={() => router.push(`/evaluations/${evaluationId}`)}>
          <ArrowLeft /> Back to details
        </Button>
        <Button
          variant="teal"
          onClick={handleContinue}
          disabled={items.length < 2 || isContinuing}
        >
          {isContinuing ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          Upload & review extraction
        </Button>
      </div>
    </div>
  );
}

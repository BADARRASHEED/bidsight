"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  ApiError,
  deleteQuotation,
  getQuotations,
  processQuotation,
  uploadQuotation,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function QuotationUploader({ evaluationId }: { evaluationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getQuotations(evaluationId)
      .then((quotations) => {
        if (cancelled) return;
        const savedItems: UploadItem[] = quotations.map((quotation) => ({
          id: quotation.id,
          quotationId: quotation.id,
          vendorName: quotation.vendorName,
          fileName: quotation.fileName,
          fileSize: quotation.fileSize ?? 0,
          status:
            quotation.processingStatus === "READY"
              ? "ready"
              : quotation.processingStatus === "ERROR"
                ? "error"
                : "pending",
          progress: quotation.processingStatus === "READY" ? 100 : 0,
          error: quotation.errorMessage ?? undefined,
        }));
        setItems((current) => (current.length ? current : savedItems));
      })
      .catch(() => {
        // Upload actions below provide the relevant API error inline.
      });
    return () => {
      cancelled = true;
    };
  }, [evaluationId]);

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
    if (!item.file && !item.quotationId) return false;
    updateItem(item.id, {
      status: item.quotationId ? "processing" : "uploading",
      progress: item.quotationId ? 62 : 34,
      error: undefined,
    });

    try {
      let quotationId = item.quotationId;
      if (!quotationId && item.file) {
        const quotation = await uploadQuotation(
          evaluationId,
          item.file,
          item.vendorName,
        );
        quotationId = quotation.id;
        updateItem(item.id, {
          quotationId,
          status: "processing",
          progress: 62,
        });
      }
      if (!quotationId) throw new Error("Quotation upload did not return an ID.");
      await processQuotation(quotationId);
      updateItem(item.id, { status: "ready", progress: 100 });
      return true;
    } catch (error) {
      updateItem(item.id, {
        status: "error",
        progress: 42,
        error:
          error instanceof ApiError
            ? error.message
            : "The API could not process this quotation. Please retry.",
      });
      return false;
    }
  }

  async function removeItem(item: UploadItem) {
    if (item.quotationId) {
      try {
        await deleteQuotation(item.quotationId);
      } catch (error) {
        setValidationError(
          error instanceof ApiError ? error.message : "The quotation could not be removed.",
        );
        return;
      }
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  async function handleContinue() {
    if (items.length < 1) {
      setValidationError("Add at least one PDF quotation before continuing to extraction review.");
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
          <span className="hidden text-xs font-medium text-slate-400 sm:block">1 to 3 PDFs</span>
        </div>

        {items.map((item, index) => (
          <QuotationCard
            key={item.id}
            item={item}
            index={index}
            onRemove={() => void removeItem(item)}
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
          disabled={items.length < 1 || isContinuing}
        >
          {isContinuing ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          Upload & review extraction
        </Button>
      </div>
    </div>
  );
}

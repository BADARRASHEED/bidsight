"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/utils";

export interface UploadItem {
  id: string;
  vendorName: string;
  fileName: string;
  fileSize: number;
  file?: File;
  status: "ready" | "pending" | "uploading" | "processing" | "error";
  progress: number;
  error?: string;
}

export function QuotationCard({
  item,
  index,
  onRemove,
  onRetry,
  onVendorChange,
}: {
  item: UploadItem;
  index: number;
  onRemove: () => void;
  onRetry: () => void;
  onVendorChange: (value: string) => void;
}) {
  const isWorking = item.status === "uploading" || item.status === "processing";
  const isReady = item.status === "ready";

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="max-w-full truncate text-sm font-semibold text-navy-950">
                  {item.fileName}
                </p>
                {isReady && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </Badge>
                )}
                {isWorking && (
                  <Badge variant="info" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {item.status === "uploading" ? "Uploading" : "Processing"}
                  </Badge>
                )}
                {item.status === "pending" && <Badge variant="muted">Ready to upload</Badge>}
                {item.status === "error" && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> Failed
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                PDF · {formatFileSize(item.fileSize)} · Quotation {index + 1}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {item.status === "error" && (
                <Button variant="ghost" size="sm" onClick={onRetry}>
                  <RefreshCw /> Retry
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                onClick={onRemove}
                disabled={isWorking}
                aria-label={`Remove ${item.fileName}`}
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
            <div className="min-w-0">
              <label
                htmlFor={`vendor-${item.id}`}
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Vendor name
              </label>
              <Input
                id={`vendor-${item.id}`}
                value={item.vendorName}
                onChange={(event) => onVendorChange(event.target.value)}
                placeholder="Enter vendor name"
                disabled={isWorking}
              />
            </div>
            <div className="pb-0.5">
              <div className="mb-2 flex justify-between text-[11px] font-medium text-slate-500">
                <span>
                  {isReady
                    ? "Extraction complete"
                    : item.status === "error"
                      ? "Action required"
                      : item.status === "pending"
                        ? "Waiting"
                        : "Processing document"}
                </span>
                <span>{item.progress}%</span>
              </div>
              <Progress
                value={item.progress}
                indicatorClassName={item.status === "error" ? "bg-red-500" : undefined}
              />
            </div>
          </div>

          {item.error && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {item.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

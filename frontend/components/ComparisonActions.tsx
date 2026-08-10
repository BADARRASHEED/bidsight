"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, generateRecommendation, runEvaluation } from "@/lib/api";
import { downloadCsv, exportDateStamp } from "@/lib/export";
import type {
  ComparisonResponse,
  Recommendation,
  VendorComparison,
} from "@/lib/types";

export function ComparisonActions({
  evaluationId,
  vendors,
  onScored,
  onRecommended,
}: {
  evaluationId: string;
  vendors: VendorComparison[];
  onScored?: (comparison: ComparisonResponse) => void;
  onRecommended?: (recommendation: Recommendation) => void;
}) {
  const [action, setAction] = useState<"score" | "recommend" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleRescore() {
    setAction("score");
    setNotice(null);
    try {
      const comparison = await runEvaluation(evaluationId);
      onScored?.(comparison);
      setNotice({ tone: "success", message: "Scores updated successfully." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof ApiError ? error.message : "Scores could not be updated.",
      });
    } finally {
      setAction(null);
    }
  }

  async function handleRecommendation() {
    setAction("recommend");
    setNotice(null);
    try {
      const recommendation = await generateRecommendation(evaluationId);
      onRecommended?.(recommendation);
      setNotice({ tone: "success", message: "Recommendation refreshed from verified results." });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "The recommendation could not be generated.",
      });
    } finally {
      setAction(null);
    }
  }

  function exportComparison() {
    downloadCsv(
      `bidsight-comparison-${evaluationId.slice(0, 8)}-${exportDateStamp()}.csv`,
      [
        "Rank",
        "Vendor",
        "Total price",
        "Currency",
        "Compliance %",
        "Delivery days",
        "Warranty months",
        "Price score",
        "Technical score",
        "Delivery score",
        "Warranty score",
        "Payment score",
        "Support score",
        "Overall score",
        "Status",
        "Recommended",
        "Failed requirement",
        "Risks",
        "Missing information",
      ],
      vendors.map((vendor) => [
        vendor.rank,
        vendor.vendorName,
        vendor.totalPrice,
        vendor.currency,
        vendor.compliancePercentage,
        vendor.deliveryDays,
        vendor.warrantyMonths,
        vendor.priceScore,
        vendor.technicalScore,
        vendor.deliveryScore,
        vendor.warrantyScore,
        vendor.paymentScore,
        vendor.supportScore,
        vendor.overallScore,
        vendor.status,
        vendor.isRecommended ? "Yes" : "No",
        vendor.failedRequirement,
        vendor.risks?.join("; "),
        vendor.missingInformation?.join("; "),
      ]),
    );
    setNotice({ tone: "success", message: "Comparison exported as CSV." });
  }

  return (
    <div data-print-hide className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button variant="outline" onClick={exportComparison} disabled={vendors.length === 0}>
          <Download /> Export CSV
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print report
        </Button>
        <Button asChild variant="outline">
          <Link href={`/evaluations/${evaluationId}/review`}>Review extraction</Link>
        </Button>
        <Button variant="outline" onClick={handleRescore} disabled={action !== null}>
          {action === "score" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Re-score
        </Button>
        <Button variant="teal" onClick={handleRecommendation} disabled={action !== null}>
          {action === "recommend" ? <Loader2 className="animate-spin" /> : <WandSparkles />}
          Refresh recommendation
        </Button>
      </div>
      {notice && (
        <p
          role="status"
          className={`flex items-center gap-1.5 text-xs font-medium ${notice.tone === "success" ? "text-emerald-700" : "text-red-600"}`}
        >
          {notice.tone === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {notice.message}
        </p>
      )}
    </div>
  );
}

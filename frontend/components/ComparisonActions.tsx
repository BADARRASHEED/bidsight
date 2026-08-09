"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, RefreshCw, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, generateRecommendation, runEvaluation } from "@/lib/api";
import type { ComparisonResponse, Recommendation } from "@/lib/types";

export function ComparisonActions({
  evaluationId,
  onScored,
  onRecommended,
}: {
  evaluationId: string;
  onScored?: (comparison: ComparisonResponse) => void;
  onRecommended?: (recommendation: Recommendation) => void;
}) {
  const [action, setAction] = useState<"score" | "recommend" | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleRescore() {
    setAction("score");
    setStatus(null);
    try {
      const comparison = await runEvaluation(evaluationId);
      onScored?.(comparison);
      setStatus("Scores updated from FastAPI.");
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "Scores could not be updated.");
    } finally {
      setAction(null);
    }
  }

  async function handleRecommendation() {
    setAction("recommend");
    setStatus(null);
    try {
      const recommendation = await generateRecommendation(evaluationId);
      onRecommended?.(recommendation);
      setStatus("Recommendation refreshed from verified results.");
    } catch (error) {
      setStatus(
        error instanceof ApiError
          ? error.message
          : "The recommendation could not be generated.",
      );
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
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
      {status && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" /> {status}
        </p>
      )}
    </div>
  );
}

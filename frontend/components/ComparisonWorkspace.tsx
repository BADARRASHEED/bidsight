"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileSearch, Loader2 } from "lucide-react";

import { ComparisonActions } from "@/components/ComparisonActions";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { RecommendationPanel } from "@/components/RecommendationPanel";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { VendorComparisonTable } from "@/components/VendorComparisonTable";
import {
  ApiError,
  generateRecommendation,
  getComparison,
  runEvaluation,
} from "@/lib/api";
import type { ComparisonResponse, Recommendation } from "@/lib/types";

function applyRecommendation(
  comparison: ComparisonResponse,
  recommendation: Recommendation,
): ComparisonResponse {
  const recommendedName = recommendation.recommendedVendor.toLocaleLowerCase();
  return {
    ...comparison,
    recommendation,
    vendors: comparison.vendors.map((vendor) => ({
      ...vendor,
      isRecommended: vendor.vendorName.toLocaleLowerCase() === recommendedName,
    })),
  };
}

export function ComparisonWorkspace({ evaluationId }: { evaluationId: string }) {
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        let result: ComparisonResponse;
        try {
          result = await getComparison(evaluationId);
        } catch (loadError) {
          if (!(loadError instanceof ApiError) || loadError.status !== 409) {
            throw loadError;
          }
          result = await runEvaluation(evaluationId);
        }
        if (cancelled) return;
        setComparison(result);
        setIsLoading(false);

        if (!result.recommendation) {
          setIsGenerating(true);
          try {
            const recommendation = await generateRecommendation(evaluationId);
            if (!cancelled) {
              setComparison((current) =>
                current ? applyRecommendation(current, recommendation) : current,
              );
            }
          } catch (recommendationFailure) {
            if (!cancelled) {
              setRecommendationError(
                recommendationFailure instanceof ApiError
                  ? recommendationFailure.message
                  : "The recommendation could not be generated.",
              );
            }
          } finally {
            if (!cancelled) setIsGenerating(false);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : "Vendor comparison could not be loaded.",
          );
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [evaluationId]);

  function handleRecommended(recommendation: Recommendation) {
    setRecommendationError(null);
    setComparison((current) =>
      current ? applyRecommendation(current, recommendation) : current,
    );
  }

  if (isLoading) return <LoadingState />;

  if (error || !comparison) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Comparison is not ready"
        description={
          error ??
          "Review every quotation extraction before running the vendor comparison."
        }
        actionLabel="Return to extraction review"
        actionHref={`/evaluations/${evaluationId}/review`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ComparisonActions
          evaluationId={evaluationId}
          vendors={comparison.vendors}
          onScored={setComparison}
          onRecommended={handleRecommended}
        />
      </div>

      <VendorComparisonTable vendors={comparison.vendors} />
      <ScoreBreakdown vendors={comparison.vendors} />

      {recommendationError && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>Recommendation is not available yet</AlertTitle>
          <AlertDescription>{recommendationError}</AlertDescription>
        </Alert>
      )}

      {comparison.recommendation ? (
        <RecommendationPanel
          recommendation={comparison.recommendation}
          overallScore={comparison.vendors.find(
            (vendor) =>
              vendor.vendorName.toLocaleLowerCase() ===
              comparison.recommendation?.recommendedVendor.toLocaleLowerCase(),
          )?.overallScore}
        />
      ) : (
        <Card>
          <CardContent className="flex min-h-44 items-center justify-center gap-3 p-8 text-sm text-slate-500">
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
            {isGenerating
              ? "Generating an evidence-based recommendation…"
              : "A recommendation has not been generated for these results yet."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

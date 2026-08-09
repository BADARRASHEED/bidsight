import { cn } from "@/lib/utils";

export function ScoreBadge({
  score,
  size = "default",
}: {
  score: number;
  size?: "default" | "large";
}) {
  const tone =
    score >= 90
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score >= 75
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={cn(
        "inline-flex items-baseline justify-center rounded-md border font-bold tabular-nums",
        tone,
        size === "large" ? "min-w-[68px] px-3 py-2 text-lg" : "min-w-[52px] px-2 py-1 text-sm",
      )}
      aria-label={`Score ${score.toFixed(1)} out of 100`}
    >
      {score.toFixed(1)}
      {size === "large" && <span className="ml-0.5 text-[10px] font-semibold">/100</span>}
    </span>
  );
}

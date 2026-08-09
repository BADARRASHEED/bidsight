import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  { id: "details", label: "Details", suffix: "" },
  { id: "quotations", label: "Quotations", suffix: "/upload" },
  { id: "review", label: "Review", suffix: "/review" },
  { id: "comparison", label: "Comparison", suffix: "/comparison" },
];

export function WorkflowStepper({
  evaluationId,
  current,
}: {
  evaluationId?: string;
  current: string;
}) {
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <div className="mb-7 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
      <ol className="grid grid-cols-4" aria-label="Evaluation progress">
        {steps.map((step, index) => {
          const completed = index < currentIndex;
          const active = index === currentIndex;
          const content = (
            <div
              className={cn(
                "relative flex min-h-[66px] items-center justify-center gap-2 border-r border-slate-100 px-2 text-center last:border-r-0 sm:justify-start sm:px-4 lg:px-6",
                active && "bg-teal-50/70",
              )}
            >
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-600" />
              )}
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  completed && "border-teal-600 bg-teal-600 text-white",
                  active && "border-teal-600 bg-white text-teal-700",
                  !active && !completed &&
                    "border-slate-200 bg-slate-50 text-slate-400",
                )}
              >
                {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:block lg:text-sm",
                  active ? "text-teal-800" : completed ? "text-slate-700" : "text-slate-400",
                )}
              >
                {step.label}
              </span>
            </div>
          );

          if (evaluationId && index < currentIndex) {
            const href =
              step.id === "details"
                ? `/evaluations/${evaluationId}`
                : `/evaluations/${evaluationId}${step.suffix}`;
            return (
              <li key={step.id}>
                <Link href={href} className="block hover:bg-slate-50">
                  {content}
                </Link>
              </li>
            );
          }

          return <li key={step.id}>{content}</li>;
        })}
      </ol>
    </div>
  );
}

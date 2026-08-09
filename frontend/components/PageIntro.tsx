import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
            {eyebrow}
          </p>
        )}
        <h2 className="text-balance break-words text-2xl font-bold tracking-[-0.025em] text-navy-950 sm:text-[28px]">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
          {description}
        </p>
      </div>
      {actions && <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
    </div>
  );
}

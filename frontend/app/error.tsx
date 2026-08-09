"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[520px] items-center justify-center">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-navy-950">This screen could not be loaded</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Your evaluation data has not been changed. Try loading the screen again.</p>
        <Button variant="outline" className="mt-5" onClick={reset}><RefreshCw /> Try again</Button>
      </div>
    </div>
  );
}

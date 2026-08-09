import type { ReactNode } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar />
      <div className="min-h-screen min-w-0 overflow-x-hidden lg:pl-[260px]">
        <AppHeader />
        <main className="mx-auto min-w-0 w-full max-w-[1600px] overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

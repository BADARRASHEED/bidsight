"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  FileCheck2,
  Menu,
  Search,
  Settings,
} from "lucide-react";

import { SidebarContents } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function getPageTitle(pathname: string) {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/evaluations") return "Evaluations";
  if (pathname === "/evaluations/new") return "New Evaluation";
  if (pathname.endsWith("/upload")) return "Quotation Upload";
  if (pathname.endsWith("/review")) return "Extraction Review";
  if (pathname.endsWith("/comparison")) return "Vendor Comparison";
  if (/^\/evaluations\/[^/]+$/.test(pathname)) return "Evaluation Overview";
  if (pathname === "/vendors") return "Vendors";
  if (pathname === "/settings") return "Settings";
  return "BidSight";
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[72px] min-w-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SidebarContents />
          </SheetContent>
        </Sheet>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:hidden">
            BidSight
          </p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-navy-950 sm:text-xl">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <div className="relative hidden w-[min(25vw,320px)] md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search evaluations..."
            aria-label="Search evaluations"
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-12 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/10"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400 xl:block">
            ⌘ K
          </kbd>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
        </Button>

        <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />

        <details className="group relative">
          <summary
            aria-label="Open user menu"
            className="flex cursor-pointer list-none items-center gap-2 rounded-md p-1.5 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-600/20 [&::-webkit-details-marker]:hidden"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white ring-2 ring-slate-100">
              BB
            </span>
            <span className="hidden lg:block">
              <span className="block text-xs font-semibold text-slate-800">Badar Butt</span>
              <span className="block text-[10px] text-slate-500">Procurement Lead</span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180 lg:block" />
          </summary>

          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lift">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-navy-950">Badar Butt</p>
              <p className="mt-0.5 text-xs text-slate-500">Procurement Lead</p>
            </div>
            <nav className="p-1.5" aria-label="User menu">
              <Link
                href="/evaluations"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-navy-950"
              >
                <FileCheck2 className="h-4 w-4 text-slate-400" />
                My evaluations
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-navy-950"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Workspace settings
              </Link>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}

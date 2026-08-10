"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CircleCheck,
  FileCheck2,
  Menu,
  Search,
  Settings,
} from "lucide-react";

import { SidebarContents } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getEvaluations } from "@/lib/api";
import type { Evaluation } from "@/lib/types";

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
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [reviewQueue, setReviewQueue] = useState<Evaluation[]>([]);
  const title = getPageTitle(pathname);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    let cancelled = false;
    function loadReviewQueue() {
      void getEvaluations()
        .then((evaluations) => {
        if (!cancelled) {
          setReviewQueue(
            evaluations.filter((evaluation) => evaluation.status === "REVIEW_REQUIRED"),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setReviewQueue([]);
      });
    }
    loadReviewQueue();
    window.addEventListener("bidsight:evaluations-changed", loadReviewQueue);
    return () => {
      cancelled = true;
      window.removeEventListener("bidsight:evaluations-changed", loadReviewQueue);
    };
  }, [pathname]);

  function openSearchResults() {
    const term = search.trim();
    router.push(term ? `/evaluations?search=${encodeURIComponent(term)}` : "/evaluations");
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openSearchResults();
  }

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
        <form onSubmit={submitSearch} className="relative hidden w-[min(25vw,320px)] md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                openSearchResults();
              }
            }}
            placeholder="Search evaluations..."
            aria-label="Search evaluations"
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/10"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400 xl:block">
            Ctrl K
          </kbd>
        </form>

        <details className="group relative">
          <summary
            className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/20 [&::-webkit-details-marker]:hidden"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {reviewQueue.length > 0 && (
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </summary>
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-navy-950">Review queue</p>
              {reviewQueue.length > 0 && (
                <span className="text-xs font-semibold text-red-600">{reviewQueue.length} pending</span>
              )}
            </div>
            {reviewQueue.length ? (
              <div className="max-h-72 overflow-y-auto p-1.5">
                {reviewQueue.map((evaluation) => (
                  <Link
                    key={evaluation.id}
                    href={`/evaluations/${evaluation.id}/review`}
                    className="block rounded-md px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    <p className="truncate text-sm font-semibold text-slate-800">{evaluation.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Quotation extraction needs review</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-7 text-center">
                <CircleCheck className="mx-auto h-7 w-7 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">You are all caught up</p>
                <p className="mt-1 text-xs text-slate-500">No quotation reviews are waiting.</p>
              </div>
            )}
          </div>
        </details>

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

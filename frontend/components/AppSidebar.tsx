"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileCheck2,
  Plus,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", href: "/", icon: BarChart3 },
  { label: "Evaluations", href: "/evaluations", icon: FileCheck2 },
  { label: "Vendors", href: "/vendors", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-[72px] items-center gap-3 border-b border-white/10 px-6"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-500 text-white shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[17px] font-bold tracking-tight text-white">
            BidSight
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">
            Procurement Intelligence
          </span>
        </span>
      </Link>

      <div className="px-4 py-5">
        <Button asChild variant="teal" className="w-full justify-center">
          <Link href="/evaluations/new" onClick={onNavigate}>
            <Plus />
            New Evaluation
          </Link>
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Workspace
        </p>
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              {isActive && (
                <span className="absolute -left-3 h-6 w-0.5 rounded-r bg-teal-400" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  isActive ? "text-teal-300" : "text-slate-500 group-hover:text-slate-300",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-500/15 text-teal-300">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Decision support</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              Scores are deterministic and every AI-extracted value remains reviewable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] bg-navy-950 lg:block">
      <SidebarContents />
    </aside>
  );
}

export { SidebarContents };

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, deleteQuotation } from "@/lib/api";
import { downloadCsv, exportDateStamp } from "@/lib/export";
import { formatDate } from "@/lib/utils";

export interface VendorSource {
  quotationId: string;
  evaluationId: string;
  evaluationTitle: string;
}

export interface VendorDirectoryItem {
  name: string;
  category: string;
  quotations: number;
  selections: number;
  lastAnalysed: string;
  reviewed: boolean;
  sources: VendorSource[];
}

export function VendorWorkspace({ vendors }: { vendors: VendorDirectoryItem[] }) {
  const router = useRouter();
  const [deletedVendorNames, setDeletedVendorNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorDirectoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const rows = useMemo(
    () => vendors.filter((vendor) => !deletedVendorNames.has(vendor.name)),
    [deletedVendorNames, vendors],
  );

  const filteredVendors = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return rows;
    return rows.filter((vendor) =>
      [vendor.name, vendor.category, ...vendor.sources.map((source) => source.evaluationTitle)]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term),
    );
  }, [query, rows]);

  function exportVendors() {
    downloadCsv(
      `bidsight-vendors-${exportDateStamp()}.csv`,
      [
        "Vendor",
        "Category",
        "Quotation records",
        "Selected",
        "Last analysed",
        "Review status",
        "Evaluations",
      ],
      filteredVendors.map((vendor) => [
        vendor.name,
        vendor.category,
        vendor.quotations,
        vendor.selections,
        vendor.lastAnalysed,
        vendor.reviewed ? "Reviewed" : "Needs review",
        vendor.sources.map((source) => source.evaluationTitle).join("; "),
      ]),
    );
    setNotice({
      tone: "success",
      message: `${filteredVendors.length} vendor ${filteredVendors.length === 1 ? "record" : "records"} exported.`,
    });
  }

  async function removeVendorData() {
    if (!selectedVendor) return;
    setIsDeleting(true);
    setNotice(null);
    try {
      for (const source of selectedVendor.sources) {
        await deleteQuotation(source.quotationId);
      }
      setDeletedVendorNames((current) => {
        const next = new Set(current);
        next.add(selectedVendor.name);
        return next;
      });
      setNotice({
        tone: "success",
        message: `${selectedVendor.name} and ${selectedVendor.sources.length} linked quotation ${selectedVendor.sources.length === 1 ? "record" : "records"} were removed.`,
      });
      setSelectedVendor(null);
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "The vendor data could not be removed. Please try again.",
      });
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <VendorSummaryCards vendors={rows} />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by vendor, category, or evaluation"
              className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
              aria-label="Search vendors"
            />
          </div>
          <Button variant="outline" onClick={exportVendors} disabled={filteredVendors.length === 0}>
            <Download /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {notice && (
        <div
          role="status"
          className={
            notice.tone === "success"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          }
        >
          {notice.message}
        </div>
      )}

      <VendorDirectory vendors={filteredVendors} onDelete={setSelectedVendor} />

      <Dialog open={selectedVendor !== null} onOpenChange={(open) => !open && !isDeleting && setSelectedVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedVendor?.name}?</DialogTitle>
            <DialogDescription>
              This removes {selectedVendor?.sources.length ?? 0} linked quotation
              {(selectedVendor?.sources.length ?? 0) === 1 ? "" : "s"}, extracted fields, scores,
              and any recommendation based on that data. The evaluation itself will remain available.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-red-100 bg-red-50/70 px-4 py-3 text-xs leading-5 text-red-700">
            This action cannot be undone. You can upload the quotation PDF again later if needed.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVendor(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void removeVendorData()} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete vendor data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VendorDirectory({
  vendors,
  onDelete,
}: {
  vendors: VendorDirectoryItem[];
  onDelete: (vendor: VendorDirectoryItem) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[260px] pl-6">Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quotations</TableHead>
              <TableHead>Selected</TableHead>
              <TableHead>Last analysed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[170px] pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.name}>
                <TableCell className="pl-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-900 text-xs font-bold text-white">
                      {vendor.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold text-navy-950">{vendor.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {vendor.sources.length} linked evaluation{vendor.sources.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-slate-600">{vendor.category}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    {vendor.quotations}
                  </span>
                </TableCell>
                <TableCell className="font-semibold tabular-nums text-slate-700">{vendor.selections}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatDate(vendor.lastAnalysed)}</TableCell>
                <TableCell>
                  <Badge variant={vendor.reviewed ? "success" : "warning"} className="gap-1">
                    {vendor.reviewed && <CheckCircle2 className="h-3 w-3" />}
                    {vendor.reviewed ? "Reviewed" : "Needs review"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex justify-end gap-1">
                    {vendor.sources[0] && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/evaluations/${vendor.sources[0].evaluationId}`}>
                          <ExternalLink /> Open
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onDelete(vendor)}
                    >
                      <Trash2 /> Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {vendors.length === 0 && (
          <div className="px-6 py-14 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No matching vendors</p>
            <p className="mt-1 text-sm text-slate-500">
              Upload a quotation or adjust your search to see vendor records.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VendorSummaryCards({ vendors }: { vendors: VendorDirectoryItem[] }) {
  const quotationCount = vendors.reduce((total, vendor) => total + vendor.quotations, 0);
  const selectedCount = vendors.reduce((total, vendor) => total + vendor.selections, 0);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        [Building2, "Known vendors", String(vendors.length), "From saved evaluations"],
        [FileText, "Quotations analysed", String(quotationCount), "Uploaded vendor PDFs"],
        [
          CheckCircle2,
          "Selected vendors",
          String(selectedCount),
          quotationCount
            ? `${Math.round((selectedCount / quotationCount) * 100)}% selection rate`
            : "No selections yet",
        ],
      ].map(([Icon, label, value, detail]) => (
        <Card key={String(label)}>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">{String(label)}</p>
              <p className="mt-1.5 text-2xl font-bold text-navy-950">{String(value)}</p>
              <p className="mt-1 text-xs text-slate-400">{String(detail)}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <Icon className="h-[18px] w-[18px]" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

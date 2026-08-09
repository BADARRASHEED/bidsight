import { Building2, CheckCircle2, FileText, MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export interface VendorDirectoryItem {
  name: string;
  category: string;
  quotations: number;
  selections: number;
  lastAnalysed: string;
  reviewed: boolean;
}

export function VendorDirectory({ vendors }: { vendors: VendorDirectoryItem[] }) {
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
              <TableHead className="pr-6" />
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
                        Discovered from uploaded quotations
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-slate-600">{vendor.category}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700"><FileText className="h-3.5 w-3.5 text-slate-400" />{vendor.quotations}</span>
                </TableCell>
                <TableCell className="font-semibold tabular-nums text-slate-700">{vendor.selections}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatDate(vendor.lastAnalysed)}</TableCell>
                <TableCell>
                  <Badge variant={vendor.reviewed ? "success" : "warning"} className="gap-1">
                    {vendor.reviewed && <CheckCircle2 className="h-3 w-3" />}
                    {vendor.reviewed ? "Reviewed" : "Needs review"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <Button variant="ghost" size="icon" aria-label={`Actions for ${vendor.name}`}>
                    <MoreHorizontal />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {vendors.length === 0 && (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            Vendors will appear after quotation PDFs are uploaded.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function VendorSummaryCards({ vendors }: { vendors: VendorDirectoryItem[] }) {
  const quotationCount = vendors.reduce((total, vendor) => total + vendor.quotations, 0);
  const selectedCount = vendors.reduce((total, vendor) => total + vendor.selections, 0);
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
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

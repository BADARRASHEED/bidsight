import { Crown, Minus } from "lucide-react";

import { ComplianceBadge } from "@/components/ComplianceBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VendorComparison } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function VendorComparisonTable({ vendors }: { vendors: VendorComparison[] }) {
  const lowestPrice = Math.min(
    ...vendors
      .map((vendor) => vendor.totalPrice)
      .filter((price): price is number => price !== null),
  );
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <CardTitle>Vendor comparison</CardTitle>
          <p className="mt-1.5 text-sm text-slate-500">
            Verified quotations ranked against mandatory requirements and the weighted scoring model.
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          {vendors.length} {vendors.length === 1 ? "quotation" : "quotations"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[220px] pl-6">Vendor</TableHead>
              <TableHead className="min-w-[140px]">Total price</TableHead>
              <TableHead className="min-w-[150px]">Compliance</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Warranty</TableHead>
              <TableHead>Price score</TableHead>
              <TableHead>Overall score</TableHead>
              <TableHead className="min-w-[170px] pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => {
              const failedChecks =
                vendor.requirementChecks?.filter(
                  (check) => check.outcome === "FAIL",
                ) ?? [];
              const failureReasons = failedChecks.length
                ? failedChecks.map((check) => check.reason)
                : vendor.failedRequirement
                  ? [vendor.failedRequirement]
                  : [];

              return (
                <TableRow
                key={vendor.id}
                className={cn(
                  "group",
                  vendor.isRecommended &&
                    "border-y border-teal-200 bg-teal-50/50 hover:bg-teal-50/80",
                )}
              >
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                        vendor.isRecommended
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {vendor.vendorName
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div>
                      <p className="whitespace-nowrap font-semibold text-navy-950">
                        {vendor.vendorName}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {vendor.isRecommended ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-teal-700">
                            <Crown className="h-3 w-3" /> Recommended
                          </span>
                        ) : vendor.rank ? (
                          <span className="text-[11px] font-medium text-slate-400">
                            Rank #{vendor.rank}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-red-500">
                            Not eligible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="whitespace-nowrap font-semibold tabular-nums text-slate-800">
                    {vendor.totalPrice == null
                      ? "—"
                      : formatCurrency(vendor.totalPrice, vendor.currency)}
                  </p>
                  {vendor.totalPrice !== null && vendor.totalPrice === lowestPrice && (
                    <span className="mt-0.5 block text-[10px] font-semibold text-emerald-600">
                      Lowest price
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums text-slate-800">
                      {vendor.compliancePercentage}%
                    </span>
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          vendor.compliancePercentage >= 90
                            ? "bg-emerald-500"
                            : vendor.compliancePercentage >= 75
                              ? "bg-amber-500"
                              : "bg-red-500",
                        )}
                        style={{ width: `${vendor.compliancePercentage}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium text-slate-700">
                  {vendor.deliveryDays == null ? (
                    <Minus className="h-4 w-4 text-slate-400" />
                  ) : (
                    `${vendor.deliveryDays} days`
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium text-slate-700">
                  {vendor.warrantyMonths == null ? (
                    <Minus className="h-4 w-4 text-slate-400" />
                  ) : (
                    `${vendor.warrantyMonths} months`
                  )}
                </TableCell>
                <TableCell className="font-semibold tabular-nums text-slate-700">
                  {vendor.priceScore.toFixed(1)}
                </TableCell>
                <TableCell>
                  <ScoreBadge score={vendor.overallScore} size="large" />
                </TableCell>
                <TableCell className="pr-6">
                  <ComplianceBadge status={vendor.status} />
                  {failureReasons.slice(0, 2).map((reason) => (
                    <p
                      key={reason}
                      className="mt-1.5 max-w-[210px] text-[10px] leading-4 text-slate-500"
                    >
                      {reason}
                    </p>
                  ))}
                  {failureReasons.length > 2 && (
                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                      +{failureReasons.length - 2} more mandatory failures
                    </p>
                  )}
                </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

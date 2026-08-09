import { Building2, CheckCircle2, FileText, Mail, MapPin, MoreHorizontal } from "lucide-react";

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

const vendors = [
  {
    name: "TechCore Solutions",
    initials: "TS",
    category: "IT Equipment",
    location: "Lahore",
    email: "sales@techcore.example",
    quotations: 8,
    wins: 4,
    lastAnalysed: "09 Aug 2026",
    status: "Verified",
  },
  {
    name: "Nexa Systems",
    initials: "NS",
    category: "IT & Networking",
    location: "Islamabad",
    email: "bids@nexa.example",
    quotations: 6,
    wins: 2,
    lastAnalysed: "09 Aug 2026",
    status: "Verified",
  },
  {
    name: "Orbit Technologies",
    initials: "OT",
    category: "Enterprise Technology",
    location: "Karachi",
    email: "proposals@orbit.example",
    quotations: 5,
    wins: 1,
    lastAnalysed: "09 Aug 2026",
    status: "Needs details",
  },
  {
    name: "Vertex Office Systems",
    initials: "VO",
    category: "Office Technology",
    location: "Lahore",
    email: "sales@vertex.example",
    quotations: 4,
    wins: 1,
    lastAnalysed: "01 Aug 2026",
    status: "Verified",
  },
];

export function VendorDirectory() {
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
                      {vendor.initials}
                    </span>
                    <div>
                      <p className="font-semibold text-navy-950">{vendor.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{vendor.location}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{vendor.email}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-slate-600">{vendor.category}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700"><FileText className="h-3.5 w-3.5 text-slate-400" />{vendor.quotations}</span>
                </TableCell>
                <TableCell className="font-semibold tabular-nums text-slate-700">{vendor.wins}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-500">{vendor.lastAnalysed}</TableCell>
                <TableCell>
                  <Badge variant={vendor.status === "Verified" ? "success" : "warning"} className="gap-1">
                    {vendor.status === "Verified" && <CheckCircle2 className="h-3 w-3" />}
                    {vendor.status}
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
      </CardContent>
    </Card>
  );
}

export function VendorSummaryCards() {
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      {[
        [Building2, "Known vendors", "14", "Across 6 categories"],
        [FileText, "Quotations analysed", "57", "12 in the last 30 days"],
        [CheckCircle2, "Selected vendors", "18", "31.6% selection rate"],
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

import { Download, Search } from "lucide-react";

import { PageIntro } from "@/components/PageIntro";
import { VendorDirectory, VendorSummaryCards } from "@/components/VendorDirectory";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VendorsPage() {
  return (
    <div>
      <PageIntro
        title="Vendors"
        description="A read-only view of suppliers discovered across quotation evaluations."
        actions={<Button variant="outline"><Download /> Export vendors</Button>}
      />
      <VendorSummaryCards />
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search vendors by name, category, or city" className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10" aria-label="Search vendors" />
          </div>
        </CardContent>
      </Card>
      <VendorDirectory />
    </div>
  );
}

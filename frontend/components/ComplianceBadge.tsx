import { AlertCircle, CheckCircle2, CircleMinus, HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ComplianceStatus } from "@/lib/types";

const badgeConfig = {
  COMPLIANT: {
    label: "Compliant",
    variant: "success" as const,
    icon: CheckCircle2,
  },
  PARTIALLY_COMPLIANT: {
    label: "Partially compliant",
    variant: "warning" as const,
    icon: CircleMinus,
  },
  NON_COMPLIANT: {
    label: "Non-compliant",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
  MISSING_INFORMATION: {
    label: "Missing information",
    variant: "muted" as const,
    icon: HelpCircle,
  },
};

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const config = badgeConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1.5 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

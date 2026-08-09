export type EvaluationStatus =
  | "DRAFT"
  | "REQUIREMENTS_READY"
  | "QUOTATIONS_UPLOADED"
  | "REVIEW_REQUIRED"
  | "READY_FOR_SCORING"
  | "SCORED"
  | "RECOMMENDATION_READY";

export type RequirementType = "MANDATORY" | "PREFERRED";

export type ComplianceStatus =
  | "COMPLIANT"
  | "PARTIALLY_COMPLIANT"
  | "NON_COMPLIANT"
  | "MISSING_INFORMATION";

export interface Requirement {
  id?: string;
  name: string;
  expectedValue: string;
  unit?: string;
  type: RequirementType;
  operator?: string;
}

export interface EvaluationInput {
  title: string;
  category: string;
  quantity: number;
  budget: string;
  currency: string;
  requiredDeliveryDays: number;
  notes?: string;
  requirements: Requirement[];
}

export interface Evaluation {
  id: string;
  title: string;
  category: string;
  quantity: number;
  budget: string;
  currency: string;
  requiredDeliveryDays: number;
  notes?: string;
  requirements: Requirement[];
  status: EvaluationStatus;
  quotationsCount: number;
  recommendedVendor?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationExtraction {
  vendorName: string | null;
  productName: string | null;
  productModel: string | null;
  quantity: number | null;
  unitPrice: string | null;
  currency: string | null;
  subtotal: string | null;
  taxAmount: string | null;
  totalPrice: string | null;
  deliveryDays: number | null;
  warrantyMonths: number | null;
  paymentTerms: string | null;
  supportDetails: string | null;
  quotationValidityDays?: number | null;
  specifications?: Record<string, string | number>;
  extractionNotes?: string[];
  sourcePages?: Record<string, number>;
  reviewed?: boolean;
}

export interface Quotation {
  id: string;
  evaluationId: string;
  vendorName: string;
  fileName: string;
  fileSize?: number;
  processingStatus: "UPLOADED" | "PROCESSING" | "READY" | "ERROR";
  reviewed: boolean;
  errorMessage?: string | null;
  extraction?: QuotationExtraction;
}

export interface VendorComparison {
  id: string;
  vendorName: string;
  totalPrice: number | null;
  currency: string;
  compliancePercentage: number;
  deliveryDays: number | null;
  warrantyMonths: number | null;
  priceScore: number;
  technicalScore: number;
  deliveryScore: number;
  warrantyScore: number;
  paymentScore: number;
  supportScore: number;
  overallScore: number;
  status: ComplianceStatus;
  rank: number | null;
  isRecommended?: boolean;
  failedRequirement?: string | null;
  requirementChecks?: RequirementCheck[];
  risks?: string[];
  missingInformation?: string[];
}

export interface RequirementCheck {
  requirementName: string;
  expectedValue: string;
  actualValue: string | null;
  outcome: "PASS" | "FAIL" | "UNKNOWN";
  reason: string;
}

export interface Recommendation {
  recommendedVendor: string;
  summary: string;
  strengths: string[];
  risks: string[];
  missingInformation: string[];
  cheaperVendorReason: string;
  generatedAt: string;
}

export interface ComparisonResponse {
  evaluationId: string;
  vendors: VendorComparison[];
  recommendation?: Recommendation | null;
}

export interface HealthResponse {
  status: string;
}

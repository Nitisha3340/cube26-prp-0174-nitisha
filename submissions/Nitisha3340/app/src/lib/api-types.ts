import type { AnalysisRecord, CheckId } from "prep-manager-agent";

export interface AnalyzeResponse {
  capture: {
    recordId: string;
    unitId: string;
    orgId: string;
    workOrderId?: string;
    sku?: string;
    fnsku?: string;
    providerRequested: "mock" | "gemini";
  };
  analysis: AnalysisRecord;
}

export const CHECK_LABELS: Record<CheckId, string> = {
  polybag: "Polybag seal",
  suffocation_warning: "Suffocation warning",
  fnsku_placement: "FNSKU placement",
  original_barcode: "Original barcode",
  expiry_date: "Expiry date",
  handling_marks: "Handling marks",
};

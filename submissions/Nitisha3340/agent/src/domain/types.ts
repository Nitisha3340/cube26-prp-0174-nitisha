export const CHECK_IDS = [
  "polybag",
  "suffocation_warning",
  "fnsku_placement",
  "original_barcode",
  "expiry_date",
  "handling_marks",
] as const;

export type CheckId = (typeof CHECK_IDS)[number];
export type Verdict = "PASS" | "FAIL" | "UNCERTAIN" | "PENDING";
export type Applicability = "required" | "not_required" | "unknown";
export type ObservedState = string;
export type EvidenceQuality = "sufficient" | "insufficient" | "unknown";
export type NormalizedBoundingBox = [number, number, number, number];

export interface SpatialRelation {
  placement?: "flat" | "on_seam" | "on_curve" | "on_edge" | "uncertain";
  reason?: string;
  labelBox?: NormalizedBoundingBox;
  seamBox?: NormalizedBoundingBox;
}

export interface UnitImage {
  imageReference: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  dataBase64: string;
}

export interface UnitCapture {
  recordId: string;
  unitId: string;
  orgId: string;
  capturedAt: string;
  imageReferences: string[];
  images?: UnitImage[];
  requirements?: RequirementConfig[];
}

export interface RequirementConfig {
  checkId: CheckId;
  applicability: Applicability;
  requirement: string;
  sourceReference?: string;
  supportingObservedStates?: string[];
  failingObservedStates?: string[];
}

export interface VisualObservation {
  checkId: CheckId;
  observedState: ObservedState;
  evidenceText: string;
  imageReference: string | null;
  evidenceQuality: EvidenceQuality;
  boundingBoxes: NormalizedBoundingBox[];
  ocrText: string | null;
  spatialRelation?: SpatialRelation;
  observedHandlingMarks?: string[];
}

export interface ProviderMetadata {
  provider: string;
  model: string;
  requestId?: string;
  isMock: boolean;
}

export interface BatchedVisualObservation {
  unitId: string;
  observations: Record<CheckId, VisualObservation>;
  metadata: ProviderMetadata;
}

export interface CheckResult {
  checkId: CheckId;
  requirement: string;
  applicability: Applicability;
  verdict: Verdict;
  explanation: string;
  observation: string;
  evidence: string[];
  imageReferences: string[];
  evidenceQuality: EvidenceQuality;
  boundingBoxes: NormalizedBoundingBox[];
  ocrText: string | null;
  spatialRelation?: SpatialRelation;
  observedHandlingMarks?: string[];
}

export interface EvidenceRecord {
  evidenceId: string;
  recordId: string;
  unitId: string;
  orgId: string;
  capturedAt: string;
  checkId: CheckId;
  requirementId: CheckId;
  evidenceText: string;
  observation: string;
  verdict: Verdict;
  explanation: string;
  evidenceSource: "image" | "system";
  imageReference: string | null;
  evidenceQuality: EvidenceQuality;
  boundingBoxes: NormalizedBoundingBox[];
  ocrText: string | null;
  spatialRelation?: SpatialRelation;
  observedHandlingMarks?: string[];
  provider: ProviderMetadata;
  createdAt: string;
}

export type OverallStatus = Verdict;

export interface AnalysisRecord {
  recordId: string;
  unitId: string;
  orgId: string;
  capturedAt: string;
  imageReferences: string[];
  modelCalls: number;
  failureCode?: string;
  failureReason?: string;
  status: OverallStatus;
  checks: Record<CheckId, CheckResult>;
  evidenceRecords: EvidenceRecord[];
  provider: ProviderMetadata;
}

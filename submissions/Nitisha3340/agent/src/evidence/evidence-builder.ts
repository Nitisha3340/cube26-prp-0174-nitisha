import type {
  CheckResult,
  EvidenceRecord,
  ProviderMetadata,
  UnitCapture,
} from "../domain/types";

export function buildEvidenceRecord(
  unit: UnitCapture,
  result: CheckResult,
  provider: ProviderMetadata,
  createdAt: string,
): EvidenceRecord {
  return {
    evidenceId: `evidence-${unit.recordId}-${result.checkId}`,
    recordId: unit.recordId,
    unitId: unit.unitId,
    orgId: unit.orgId,
    capturedAt: unit.capturedAt,
    checkId: result.checkId,
    requirementId: result.checkId,
    evidenceText: result.observation,
    observation: result.observation,
    verdict: result.verdict,
    explanation: result.explanation,
    evidenceSource: result.imageReferences.length > 0 ? "image" : "system",
    imageReference: result.imageReferences[0] ?? null,
    evidenceQuality: result.evidenceQuality,
    boundingBoxes: result.boundingBoxes,
    ocrText: result.ocrText,
    spatialRelation: result.spatialRelation,
    observedHandlingMarks: result.observedHandlingMarks,
    provider,
    createdAt,
  };
}

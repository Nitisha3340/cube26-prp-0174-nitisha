import { CHECK_IDS, type AnalysisRecord, type CheckResult, type ProviderMetadata, type RequirementConfig, type UnitCapture } from "../domain/types";
import { batchedVisualObservationSchema } from "../domain/schemas";
import { deriveOverallStatus } from "../domain/verdict";
import { requirementsByCheck } from "../domain/requirements";
import { buildEvidenceRecord } from "../evidence/evidence-builder";
import { evaluateCheck } from "../rules/prep-rules";
import { ProviderFailure, type VisionProvider } from "../vision/provider";

export interface AnalyzeUnitDependencies {
  provider: VisionProvider;
  requirements: RequirementConfig[];
  now?: () => string;
}

export async function analyzeUnit(
  unit: UnitCapture,
  dependencies: AnalyzeUnitDependencies,
): Promise<AnalysisRecord> {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const configuredRequirements = requirementsByCheck(dependencies.requirements);

  try {
    // This is intentionally the only provider invocation in the unit pipeline.
    const batch = batchedVisualObservationSchema.parse(
      await dependencies.provider.analyze({
        ...unit,
        requirements: dependencies.requirements,
      }),
    );
    const checks = Object.fromEntries(
      CHECK_IDS.map((checkId) => {
        const requirement = configuredRequirements[checkId];
        const observation = batch.observations[checkId];
        if (!requirement || !observation) {
          throw new Error(`Missing configuration or observation for ${checkId}`);
        }
        return [checkId, evaluateCheck(requirement, observation)];
      }),
    ) as Record<typeof CHECK_IDS[number], CheckResult>;

    return createRecord(unit, checks, batch.metadata, now());
  } catch (error) {
    if (!(error instanceof ProviderFailure)) {
      throw error;
    }

    const metadata: ProviderMetadata = {
      provider: "unavailable",
      model: "unknown",
      isMock: false,
    };
    const checks = Object.fromEntries(
      CHECK_IDS.map((checkId) => [checkId, pendingCheck(checkId, unit.imageReferences)]),
    ) as Record<typeof CHECK_IDS[number], CheckResult>;

    return createRecord(unit, checks, metadata, now(), error.code, error.safeMessage);
  }
}

function pendingCheck(
  checkId: typeof CHECK_IDS[number],
  imageReferences: string[],
): CheckResult {
  return {
    checkId,
    requirement: "Analysis pending; requirement evaluation is deferred.",
    applicability: "unknown",
    verdict: "PENDING",
    explanation:
      "The analysis could not be completed because the model/system was unavailable or failed; the capture remains recorded for later review.",
    observation: "No completed observation is available.",
    evidence: [],
    imageReferences,
    evidenceQuality: "insufficient",
    boundingBoxes: [],
    ocrText: null,
  };
}

function createRecord(
  unit: UnitCapture,
  checks: Record<typeof CHECK_IDS[number], CheckResult>,
  provider: ProviderMetadata,
  createdAt: string,
  failureCode?: string,
  failureReason?: string,
): AnalysisRecord {
  const results = CHECK_IDS.map((checkId) => checks[checkId]);
  return {
    recordId: unit.recordId,
    unitId: unit.unitId,
    orgId: unit.orgId,
    capturedAt: unit.capturedAt,
    imageReferences: unit.imageReferences,
    modelCalls: 1,
    failureCode,
    failureReason,
    status: deriveOverallStatus(results),
    checks,
    evidenceRecords: results.map((result) =>
      buildEvidenceRecord(unit, result, provider, createdAt),
    ),
    provider,
  };
}

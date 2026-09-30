import { z } from "zod";
import type { EvidenceRecord } from "../domain/types";

/**
 * Provisional local wire shape. It is not the official CUBE cross-pod contract.
 */
export const provisionalEvidenceRecordSchema = z.object({
  evidence_id: z.string(),
  record_id: z.string(),
  unit_id: z.string(),
  org_id: z.string().min(1),
  captured_at: z.string(),
  check_id: z.enum([
    "polybag",
    "suffocation_warning",
    "fnsku_placement",
    "original_barcode",
    "expiry_date",
    "handling_marks",
  ]),
  requirement_id: z.enum([
    "polybag",
    "suffocation_warning",
    "fnsku_placement",
    "original_barcode",
    "expiry_date",
    "handling_marks",
  ]),
  evidence_text: z.string(),
  observation: z.string(),
  verdict: z.enum(["PASS", "FAIL", "UNCERTAIN", "PENDING"]),
  explanation: z.string(),
  evidence_source: z.enum(["image", "system"]),
  image_reference: z.string().nullable(),
  evidence_quality: z.enum(["sufficient", "insufficient", "unknown"]),
  bounding_boxes: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])),
  ocr_text: z.string().nullable(),
  spatial_relation: z
    .object({
      placement: z.enum(["flat", "on_seam", "on_curve", "on_edge", "uncertain"]).optional(),
      reason: z.string().optional(),
      label_box: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      seam_box: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
    })
    .optional(),
  observed_handling_marks: z.array(z.string()).optional(),
  provider: z.object({
    provider: z.string(),
    model: z.string(),
    request_id: z.string().optional(),
    is_mock: z.boolean(),
  }),
  created_at: z.string(),
});

export type ProvisionalEvidenceRecord = z.infer<
  typeof provisionalEvidenceRecordSchema
>;

export function serializeEvidenceRecord(
  record: EvidenceRecord,
): ProvisionalEvidenceRecord {
  return {
    evidence_id: record.evidenceId,
    record_id: record.recordId,
    unit_id: record.unitId,
    org_id: record.orgId,
    captured_at: record.capturedAt,
    check_id: record.checkId,
    requirement_id: record.requirementId,
    evidence_text: record.evidenceText,
    observation: record.observation,
    verdict: record.verdict,
    explanation: record.explanation,
    evidence_source: record.evidenceSource,
    image_reference: record.imageReference,
    evidence_quality: record.evidenceQuality,
    bounding_boxes: record.boundingBoxes,
    ocr_text: record.ocrText,
    spatial_relation: record.spatialRelation
      ? {
          placement: record.spatialRelation.placement,
          reason: record.spatialRelation.reason,
          label_box: record.spatialRelation.labelBox,
          seam_box: record.spatialRelation.seamBox,
        }
      : undefined,
    observed_handling_marks: record.observedHandlingMarks,
    provider: {
      provider: record.provider.provider,
      model: record.provider.model,
      ...(record.provider.requestId === undefined
        ? {}
        : { request_id: record.provider.requestId }),
      is_mock: record.provider.isMock,
    },
    created_at: record.createdAt,
  };
}

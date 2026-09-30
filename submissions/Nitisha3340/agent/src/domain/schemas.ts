import { z } from "zod";
import { CHECK_IDS } from "./types";

const checkIdSchema = z.enum(CHECK_IDS);
const observationStateSchema = z.string().refine(
  (value) => !["PASS", "FAIL", "UNCERTAIN", "PENDING"].includes(value),
  "Model observations must not contain compliance verdicts",
);
const boundingBoxSchema = z.tuple([
  z.number().min(0).max(1000),
  z.number().min(0).max(1000),
  z.number().min(0).max(1000),
  z.number().min(0).max(1000),
]);

const spatialRelationSchema = z.object({
  placement: z.enum(["flat", "on_seam", "on_curve", "on_edge", "uncertain"]).optional(),
  reason: z.string().optional(),
  label_box: boundingBoxSchema.optional(),
  seam_box: boundingBoxSchema.optional(),
});

export const rawVisualObservationSchema = z.object({
  check_id: checkIdSchema,
  observed_state: observationStateSchema,
  evidence_text: z.string(),
  image_reference: z.string().nullable(),
  evidence_quality: z.enum(["sufficient", "insufficient", "unknown"]),
  bounding_boxes: z.array(boundingBoxSchema),
  ocr_text: z.string().nullable(),
  spatial_relation: spatialRelationSchema.optional(),
  observed_handling_marks: z.array(z.string()).optional(),
});

export const batchedVisualObservationSchema = z.object({
  unitId: z.string(),
  observations: z.record(
    checkIdSchema,
    z.object({
      checkId: checkIdSchema,
      observedState: observationStateSchema,
      evidenceText: z.string(),
      imageReference: z.string().nullable(),
      evidenceQuality: z.enum(["sufficient", "insufficient", "unknown"]),
      boundingBoxes: z.array(boundingBoxSchema),
      ocrText: z.string().nullable(),
      spatialRelation: z
        .object({
          placement: z.enum(["flat", "on_seam", "on_curve", "on_edge", "uncertain"]).optional(),
          reason: z.string().optional(),
          labelBox: boundingBoxSchema.optional(),
          seamBox: boundingBoxSchema.optional(),
        })
        .optional(),
      observedHandlingMarks: z.array(z.string()).optional(),
    }),
  ),
  metadata: z.object({
    provider: z.string(),
    model: z.string(),
    requestId: z.string().optional(),
    isMock: z.boolean(),
  }),
});

export const rawBatchedVisualObservationSchema = z.object({
  unit_id: z.string(),
  observations: z.record(checkIdSchema, rawVisualObservationSchema),
});

import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "../src/domain/types";
import {
  provisionalEvidenceRecordSchema,
  serializeEvidenceRecord,
} from "../src/evidence/evidence-serializer";

describe("provisional evidence serialization", () => {
  it("maps every evidence field to the snake_case local wire shape", () => {
    const record: EvidenceRecord = {
      evidenceId: "evidence-PRP-1-polybag",
      recordId: "PRP-1",
      unitId: "UNIT-1",
      orgId: "org_demo_alpha",
      capturedAt: "2026-09-30T09:00:00.000Z",
      checkId: "polybag",
      requirementId: "polybag",
      evidenceText: "The package is visibly sealed.",
      observation: "The package is visibly sealed.",
      verdict: "PASS",
      explanation: "The available evidence supports the configured requirement.",
      evidenceSource: "image",
      imageReference: "captures/UNIT-1/front.jpg",
      evidenceQuality: "sufficient",
      boundingBoxes: [[100, 200, 300, 400]],
      ocrText: "VISIBLE",
      spatialRelation: {
        placement: "flat",
        reason: "The label surface is visible.",
        labelBox: [100, 200, 300, 400],
      },
      observedHandlingMarks: ["fragile"],
      provider: {
        provider: "mock",
        model: "deterministic-mock",
        requestId: "request-1",
        isMock: true,
      },
      createdAt: "2026-09-30T09:01:00.000Z",
    };

    expect(serializeEvidenceRecord(record)).toEqual({
      evidence_id: "evidence-PRP-1-polybag",
      record_id: "PRP-1",
      unit_id: "UNIT-1",
      org_id: "org_demo_alpha",
      captured_at: "2026-09-30T09:00:00.000Z",
      check_id: "polybag",
      requirement_id: "polybag",
      evidence_text: "The package is visibly sealed.",
      observation: "The package is visibly sealed.",
      verdict: "PASS",
      explanation: "The available evidence supports the configured requirement.",
      evidence_source: "image",
      image_reference: "captures/UNIT-1/front.jpg",
      evidence_quality: "sufficient",
      bounding_boxes: [[100, 200, 300, 400]],
      ocr_text: "VISIBLE",
      spatial_relation: {
        placement: "flat",
        reason: "The label surface is visible.",
        label_box: [100, 200, 300, 400],
      },
      observed_handling_marks: ["fragile"],
      provider: {
        provider: "mock",
        model: "deterministic-mock",
        request_id: "request-1",
        is_mock: true,
      },
      created_at: "2026-09-30T09:01:00.000Z",
    });
  });

  it("validates the serialized record against the provisional Zod schema", () => {
    const serialized = serializeEvidenceRecord({
      evidenceId: "evidence-PRP-1-polybag",
      recordId: "PRP-1",
      unitId: "UNIT-1",
      orgId: "org_demo_alpha",
      capturedAt: "2026-09-30T09:00:00.000Z",
      checkId: "polybag",
      requirementId: "polybag",
      evidenceText: "No reliable visual finding.",
      observation: "No reliable visual finding.",
      verdict: "UNCERTAIN",
      explanation: "The available evidence is insufficient to make a reliable compliance determination.",
      evidenceSource: "system",
      imageReference: null,
      evidenceQuality: "insufficient",
      boundingBoxes: [],
      ocrText: null,
      provider: {
        provider: "mock",
        model: "deterministic-mock",
        isMock: true,
      },
      createdAt: "2026-09-30T09:01:00.000Z",
    });

    expect(() => provisionalEvidenceRecordSchema.parse(serialized)).not.toThrow();
  });
});

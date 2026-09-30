import { describe, expect, it } from "vitest";
import { CHECK_IDS, type RequirementConfig, type UnitCapture } from "../src/domain/types";
import { analyzeUnit } from "../src/pipeline/analyze-unit";
import { MockVisionProvider } from "../src/vision/mock-provider";
import { ProviderFailure, type VisionProvider } from "../src/vision/provider";

const unit: UnitCapture = {
  recordId: "PRP-TEST-0001",
  unitId: "UNIT-TEST-0001",
  orgId: "org_demo_alpha",
  capturedAt: "2026-09-30T09:00:00.000Z",
  imageReferences: ["captures/UNIT-TEST-0001/front.jpg"],
};

const requirements: RequirementConfig[] = CHECK_IDS.map((checkId) => ({
  checkId,
  applicability: "required",
  requirement: `Configured ${checkId} requirement`,
  supportingObservedStates: ["present"],
}));

describe("unit analysis pipeline", () => {
  it("processes all six checks with exactly one provider call and creates evidence", async () => {
    const provider = new MockVisionProvider(
      Object.fromEntries(
        CHECK_IDS.map((checkId) => [
          checkId,
          {
            observedState: "present",
            evidenceText: `Observed ${checkId}`,
            imageReference: unit.imageReferences[0],
            evidenceQuality: "sufficient",
            boundingBoxes: [],
            ocrText: null,
          },
        ]),
      ),
    );

    const result = await analyzeUnit(unit, {
      provider,
      requirements,
      now: () => "2026-09-30T09:01:00.000Z",
    });

    expect(provider.callCount).toBe(1);
    expect(Object.keys(result.checks)).toHaveLength(6);
    expect(result.status).toBe("PASS");
    expect(result.evidenceRecords).toHaveLength(6);
    expect(result.evidenceRecords[0]).toMatchObject({
      recordId: unit.recordId,
      unitId: unit.unitId,
      orgId: unit.orgId,
      verdict: "PASS",
    });
  });

  it("fails open with a pending reviewable record when the provider fails", async () => {
    const provider: VisionProvider = {
      analyze: async () => {
        throw new ProviderFailure("provider timeout");
      },
    };

    const result = await analyzeUnit(unit, { provider, requirements });

    expect(result.status).toBe("PENDING");
    expect(Object.values(result.checks).every((check) => check.verdict === "PENDING")).toBe(true);
    expect(result.recordId).toBe(unit.recordId);
    expect(result.orgId).toBe(unit.orgId);
    expect(result.imageReferences).toEqual(unit.imageReferences);
    expect(result.evidenceRecords[0].imageReference).toBe(unit.imageReferences[0]);
    expect(result.evidenceRecords).toHaveLength(6);
  });

  it("rethrows an internal programming error instead of converting it to PENDING", async () => {
    const provider: VisionProvider = {
      analyze: async () => {
        throw new Error("invalid internal invariant");
      },
    };

    await expect(analyzeUnit(unit, { provider, requirements })).rejects.toThrow(
      "invalid internal invariant",
    );
  });
});

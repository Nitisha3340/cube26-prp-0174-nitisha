import { describe, expect, it } from "vitest";
import { evaluateCheck } from "../src/rules/prep-rules";
import type { RequirementConfig, VisualObservation } from "../src/domain/types";

const requirement = (applicability: RequirementConfig["applicability"]): RequirementConfig => ({
  checkId: "polybag",
  applicability,
  requirement: "Configured requirement",
});

const observation = (observedState: string, evidenceQuality: VisualObservation["evidenceQuality"] = "sufficient"): VisualObservation => ({
  checkId: "polybag",
  observedState,
  evidenceText: "Observed condition",
  imageReference: "capture/front.jpg",
  evidenceQuality,
  boundingBoxes: [],
  ocrText: null,
});

describe("deterministic preparation rules", () => {
  it("returns PASS when required evidence supports the requirement", () => {
    expect(evaluateCheck({ ...requirement("required"), supportingObservedStates: ["present"] }, observation("present")).verdict).toBe("PASS");
  });

  it("returns FAIL when required evidence does not support the requirement", () => {
    expect(evaluateCheck({ ...requirement("required"), failingObservedStates: ["missing"] }, observation("missing")).verdict).toBe("FAIL");
  });

  it("returns UNCERTAIN for insufficient evidence", () => {
    expect(evaluateCheck(requirement("required"), observation("insufficient_evidence", "insufficient")).verdict).toBe("UNCERTAIN");
    expect(evaluateCheck(requirement("required"), observation("present", "insufficient")).verdict).toBe("UNCERTAIN");
  });

  it("returns PASS without evaluating a not-required check as a failure", () => {
    expect(evaluateCheck(requirement("not_required"), observation("insufficient_evidence", "insufficient")).verdict).toBe("PASS");
  });

  it("returns UNCERTAIN when applicability is unknown", () => {
    expect(evaluateCheck(requirement("unknown"), observation("present")).verdict).toBe("UNCERTAIN");
  });

  it("returns UNCERTAIN when placement cannot be established spatially", () => {
    expect(
      evaluateCheck(
        { ...requirement("required"), failingObservedStates: ["on_seam"] },
        {
          ...observation("on_seam"),
          spatialRelation: { placement: "uncertain", reason: "The seam is not visible." },
        },
      ).verdict,
    ).toBe("UNCERTAIN");
  });
});

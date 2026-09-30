import { describe, expect, it } from "vitest";
import { deriveOverallStatus, isVerdict, VERDICT_EXPLANATIONS } from "../src/domain/verdict";
import type { CheckResult } from "../src/domain/types";

const check = (verdict: CheckResult["verdict"]): CheckResult => ({
  checkId: "polybag",
  requirement: "Configured requirement",
  applicability: "required",
  verdict,
  explanation: VERDICT_EXPLANATIONS[verdict],
  observation: "Recorded observation",
  evidence: ["Recorded evidence"],
  imageReferences: ["capture/front.jpg"],
  evidenceQuality: "sufficient",
  boundingBoxes: [],
  ocrText: null,
});

describe("verdict model", () => {
  it("recognizes PASS, FAIL, UNCERTAIN, and PENDING as first-class verdicts", () => {
    expect(["PASS", "FAIL", "UNCERTAIN", "PENDING"].every(isVerdict)).toBe(true);
  });

  it("rejects inherited Object properties as verdicts", () => {
    expect(isVerdict("toString")).toBe(false);
    expect(isVerdict("constructor")).toBe(false);
  });

  it("derives PASS and FAIL statuses", () => {
    expect(deriveOverallStatus([check("PASS")])).toBe("PASS");
    expect(deriveOverallStatus([check("PASS"), check("FAIL")])).toBe("FAIL");
  });

  it("keeps UNCERTAIN and PENDING distinct", () => {
    expect(deriveOverallStatus([check("UNCERTAIN")])).toBe("UNCERTAIN");
    expect(deriveOverallStatus([check("PENDING"), check("PASS")])).toBe("PENDING");
    expect(VERDICT_EXPLANATIONS.UNCERTAIN).toContain("insufficient");
    expect(VERDICT_EXPLANATIONS.PENDING).toContain("unavailable or failed");
  });
});

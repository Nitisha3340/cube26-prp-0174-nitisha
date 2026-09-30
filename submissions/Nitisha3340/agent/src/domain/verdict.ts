import type { CheckResult, Verdict } from "./types";

export const VERDICT_EXPLANATIONS: Record<Verdict, string> = {
  PASS: "The available evidence supports the configured requirement.",
  FAIL: "The available evidence does not support the configured requirement.",
  UNCERTAIN:
    "The available evidence is insufficient to make a reliable compliance determination.",
  PENDING:
    "The analysis could not be completed because the model/system was unavailable or failed; the capture remains recorded for later review.",
};

export function isVerdict(value: string): value is Verdict {
  return Object.prototype.hasOwnProperty.call(VERDICT_EXPLANATIONS, value);
}

export function deriveOverallStatus(results: CheckResult[]): Verdict {
  if (results.some((result) => result.verdict === "PENDING")) {
    return "PENDING";
  }

  if (results.some((result) => result.verdict === "FAIL")) {
    return "FAIL";
  }

  if (results.some((result) => result.verdict === "UNCERTAIN")) {
    return "UNCERTAIN";
  }

  return "PASS";
}

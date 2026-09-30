import type { Applicability } from "../domain/types";

export interface AuthoritativeRule {
  ruleId: string;
  requirement: string;
  applicability: Applicability;
  sourceName: string;
  sourceUrl: string;
  retrievedAt: string;
  notes: string;
}

const AMAZON_PACKAGING_SOURCE = "https://sellercentral.amazon.com/help/hub/reference/G200141480";
const AMAZON_SOURCE_NAME = "Amazon Seller Central - Packaging and prep requirements";
const SOURCE_RETRIEVED_AT = "2026-09-30";

/**
 * Registry entries are documented source facts only. They are not automatically
 * applied to a unit until an authoritative requirement configuration supplies
 * the applicable rule and any required measurement.
 */
export const AUTHORITATIVE_RULES: readonly AuthoritativeRule[] = [
  {
    ruleId: "amazon-polybag-completely-sealed",
    requirement: "Polybags used for FBA must be completely sealed.",
    applicability: "unknown",
    sourceName: AMAZON_SOURCE_NAME,
    sourceUrl: AMAZON_PACKAGING_SOURCE,
    retrievedAt: SOURCE_RETRIEVED_AT,
    notes: "Registry fact only; visual applicability must be supplied per unit.",
  },
  {
    ruleId: "amazon-polybag-large-opening-warning",
    requirement: "A polybag with an opening of 5 inches or larger measured flat requires a suffocation warning.",
    applicability: "unknown",
    sourceName: AMAZON_SOURCE_NAME,
    sourceUrl: AMAZON_PACKAGING_SOURCE,
    retrievedAt: SOURCE_RETRIEVED_AT,
    notes: "Do not apply from an image alone. A required bag-opening measurement must be supplied separately.",
  },
  {
    ruleId: "amazon-suffocation-warning-prominent-legible",
    requirement: "A required suffocation warning must be prominent and legible.",
    applicability: "unknown",
    sourceName: AMAZON_SOURCE_NAME,
    sourceUrl: AMAZON_PACKAGING_SOURCE,
    retrievedAt: SOURCE_RETRIEVED_AT,
    notes: "Registry fact only; visual evidence can remain uncertain when the warning cannot be read or assessed.",
  },
  {
    ruleId: "amazon-accessible-scannable-barcode",
    requirement: "The unit must retain an accessible and scannable barcode after preparation.",
    applicability: "unknown",
    sourceName: AMAZON_SOURCE_NAME,
    sourceUrl: AMAZON_PACKAGING_SOURCE,
    retrievedAt: SOURCE_RETRIEVED_AT,
    notes: "Registry fact only; this registry does not decide barcode coverage for a unit.",
  },
];

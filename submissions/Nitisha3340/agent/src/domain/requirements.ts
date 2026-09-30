import { CHECK_IDS, type CheckId, type RequirementConfig } from "./types";

export function createUnknownRequirements(): RequirementConfig[] {
  return CHECK_IDS.map((checkId) => ({
    checkId,
    applicability: "unknown",
    requirement: "No authoritative preparation requirement is configured.",
  }));
}

export function requirementsByCheck(
  requirements: RequirementConfig[],
): Record<CheckId, RequirementConfig> {
  return requirements.reduce(
    (result, requirement) => {
      result[requirement.checkId] = requirement;
      return result;
    },
    {} as Record<CheckId, RequirementConfig>,
  );
}

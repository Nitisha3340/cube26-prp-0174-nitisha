import { VERDICT_EXPLANATIONS } from "../domain/verdict";
import type {
  CheckResult,
  RequirementConfig,
  VisualObservation,
} from "../domain/types";

export function evaluateCheck(
  requirement: RequirementConfig,
  observation: VisualObservation,
): CheckResult {
  if (requirement.applicability === "unknown") {
    return result(requirement, observation, "UNCERTAIN", "Requirement applicability is unknown; no compliance decision was guessed.");
  }

  if (requirement.applicability === "not_required") {
    return result(requirement, observation, "PASS", "The configured requirement is not applicable to this unit.");
  }

  if (
    observation.observedState === "insufficient_evidence" ||
    observation.evidenceQuality === "insufficient" ||
    observation.imageReference === null
  ) {
    return result(requirement, observation, "UNCERTAIN", VERDICT_EXPLANATIONS.UNCERTAIN);
  }

  if (observation.spatialRelation?.placement === "uncertain") {
    return result(requirement, observation, "UNCERTAIN", VERDICT_EXPLANATIONS.UNCERTAIN);
  }

  if (requirement.failingObservedStates?.includes(observation.observedState)) {
    return result(requirement, observation, "FAIL", VERDICT_EXPLANATIONS.FAIL);
  }

  if (requirement.supportingObservedStates?.includes(observation.observedState)) {
    return result(requirement, observation, "PASS", VERDICT_EXPLANATIONS.PASS);
  }

  return result(requirement, observation, "UNCERTAIN", VERDICT_EXPLANATIONS.UNCERTAIN);
}

function result(
  requirement: RequirementConfig,
  observation: VisualObservation,
  verdict: CheckResult["verdict"],
  explanation: string,
): CheckResult {
  return {
    checkId: requirement.checkId,
    requirement: requirement.requirement,
    applicability: requirement.applicability,
    verdict,
    explanation,
    observation: observation.evidenceText,
    evidence: observation.evidenceText.length > 0 ? [observation.evidenceText] : [],
    imageReferences: observation.imageReference === null ? [] : [observation.imageReference],
    evidenceQuality: observation.evidenceQuality,
    boundingBoxes: observation.boundingBoxes,
    ocrText: observation.ocrText,
    spatialRelation: observation.spatialRelation,
    observedHandlingMarks: observation.observedHandlingMarks,
  };
}

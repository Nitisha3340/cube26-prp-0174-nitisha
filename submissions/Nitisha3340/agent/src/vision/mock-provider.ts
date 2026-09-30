import { CHECK_IDS, type BatchedVisualObservation, type CheckId, type UnitCapture, type VisualObservation } from "../domain/types";
import type { VisionProvider } from "./provider";

export type MockObservationOverrides = Partial<Record<CheckId, Partial<VisualObservation>>>;

/** Deterministic development/test provider. It is not real AI and has no accuracy claim. */
export class MockVisionProvider implements VisionProvider {
  public readonly isMock = true;
  public callCount = 0;

  public constructor(private readonly overrides: MockObservationOverrides = {}) {}

  public async analyze(unit: UnitCapture): Promise<BatchedVisualObservation> {
    this.callCount += 1;

    const observations = Object.fromEntries(
      CHECK_IDS.map((checkId) => [
        checkId,
        {
          checkId,
          observedState: "insufficient_evidence",
          evidenceText: "Mock provider has no captured visual finding.",
          imageReference: unit.imageReferences[0] ?? null,
          evidenceQuality: "insufficient",
          boundingBoxes: [],
          ocrText: null,
          ...this.overrides[checkId],
        },
      ]),
    ) as Record<CheckId, VisualObservation>;

    return {
      unitId: unit.unitId,
      observations,
      metadata: {
        provider: "mock",
        model: "deterministic-mock",
        isMock: true,
      },
    };
  }
}

import type {
  BatchedVisualObservation,
  UnitCapture,
} from "../domain/types";

export type ProviderFailureCode =
  | "GEMINI_AUTH_ERROR"
  | "GEMINI_BAD_REQUEST"
  | "GEMINI_RATE_LIMIT"
  | "GEMINI_SERVER_ERROR"
  | "GEMINI_TIMEOUT"
  | "GEMINI_INVALID_RESPONSE"
  | "GEMINI_NETWORK_ERROR";

export class ProviderFailure extends Error {
  public override readonly name = "ProviderFailure";
  public readonly code: ProviderFailureCode;
  public readonly safeMessage: string;

  public constructor(
    message: string,
    options: {
      cause?: unknown;
      code?: ProviderFailureCode;
      safeMessage?: string;
    } = {},
  ) {
    super(message, options);
    this.code = options.code ?? "GEMINI_NETWORK_ERROR";
    this.safeMessage = options.safeMessage ?? message;
  }
}

/** One invocation receives one unit and returns all six observations. */
export interface VisionProvider {
  analyze(unit: UnitCapture): Promise<BatchedVisualObservation>;
}

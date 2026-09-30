import { rawBatchedVisualObservationSchema } from "../domain/schemas";
import {
  CHECK_IDS,
  type BatchedVisualObservation,
  type RequirementConfig,
  type UnitCapture,
} from "../domain/types";
import {
  ProviderFailure,
  type ProviderFailureCode,
  type VisionProvider,
} from "./provider";
import { z } from "zod";

const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_TIMEOUT_MS = 30_000;

const geminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(
          z.object({
            text: z.string().optional(),
          }).passthrough(),
        ),
      }).passthrough(),
    }).passthrough(),
  ),
}).passthrough();

const observationJsonSchema = {
  type: "OBJECT",
  required: [
    "check_id",
    "observed_state",
    "evidence_text",
    "image_reference",
    "evidence_quality",
    "bounding_boxes",
    "ocr_text",
  ],
  properties: {
    check_id: { type: "STRING", enum: CHECK_IDS },
    observed_state: { type: "STRING" },
    evidence_text: { type: "STRING" },
    image_reference: { type: "STRING", nullable: true },
    evidence_quality: {
      type: "STRING",
      enum: ["sufficient", "insufficient", "unknown"],
    },
    bounding_boxes: {
      type: "ARRAY",
      items: {
        type: "ARRAY",
        minItems: 4,
        maxItems: 4,
        items: { type: "NUMBER", minimum: 0, maximum: 1000 },
      },
    },
    ocr_text: { type: "STRING", nullable: true },
    spatial_relation: {
      type: "OBJECT",
      properties: {
        placement: {
          type: "STRING",
          enum: ["flat", "on_seam", "on_curve", "on_edge", "uncertain"],
        },
        reason: { type: "STRING" },
        label_box: {
          type: "ARRAY",
          minItems: 4,
          maxItems: 4,
          items: { type: "NUMBER", minimum: 0, maximum: 1000 },
        },
        seam_box: {
          type: "ARRAY",
          minItems: 4,
          maxItems: 4,
          items: { type: "NUMBER", minimum: 0, maximum: 1000 },
        },
      },
    },
    observed_handling_marks: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
};

const responseSchema = {
  type: "OBJECT",
  required: ["unit_id", "observations"],
  properties: {
    unit_id: { type: "STRING" },
    observations: {
      type: "OBJECT",
      required: CHECK_IDS,
      properties: Object.fromEntries(
        CHECK_IDS.map((checkId) => [checkId, observationJsonSchema]),
      ),
    },
  },
};

export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  requirements?: RequirementConfig[];
}

export class GeminiVisionProvider implements VisionProvider {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly requirements: RequirementConfig[];

  public constructor(options: GeminiProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    this.model = options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.requirements = options.requirements ?? [];
  }

  public async analyze(unit: UnitCapture): Promise<BatchedVisualObservation> {
    if (!this.apiKey) {
      throw providerFailure(
        "GEMINI_API_KEY is not configured",
        "GEMINI_AUTH_ERROR",
        "Gemini authentication is not configured on the server.",
      );
    }
    if (!unit.images || unit.images.length === 0) {
      throw providerFailure(
        "No inline image payloads are available for this unit",
        "GEMINI_INVALID_RESPONSE",
        "No usable image payload was available for Gemini.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

    try {
      let response: Response; 
      try {
        response = await this.fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(this.requestBody(unit)),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw providerFailure(
            "Gemini request timed out",
            "GEMINI_TIMEOUT",
            "Gemini analysis timed out. The capture is pending review.",
            error,
          );
        }
        throw providerFailure(
          "Gemini network request failed",
          "GEMINI_NETWORK_ERROR",
          "Gemini could not be reached. The capture is pending review.",
          error,
        );
      }

      if (!response.ok) {
        const failureCode = classifyHttpFailure(response.status);
        const errorBody = await response.text();
        const sanitizedDetail = sanitizeGeminiErrorBody(errorBody);
        const safeMessage = [
          `Gemini returned HTTP ${response.status}.`,
          sanitizedDetail,
          "The capture is pending review.",
        ].filter(Boolean).join(" ");
        console.warn(
          `[prep-manager] ${failureCode} status=${response.status} detail=${sanitizedDetail}`,
        );
        throw providerFailure(
          `Gemini request failed with HTTP ${response.status} ${response.statusText}`, 
          failureCode,
          failureCode === "GEMINI_AUTH_ERROR"
            ? "Gemini rejected the server credentials."
            : safeMessage,
        );
      }

      let responseJson: z.infer<typeof geminiResponseSchema>;
      try {
        responseJson = geminiResponseSchema.parse(await response.json());
      } catch (error) {
        throw providerFailure(
          "Gemini response envelope was invalid",
          "GEMINI_INVALID_RESPONSE",
          "Gemini returned an invalid response. The capture is pending review.",
          error,
        );
      }
      const modelText = responseJson.candidates[0]?.content.parts
        .map((part) => part.text)
        .find((text): text is string => text !== undefined);
      if (!modelText) {
        throw providerFailure(
          "Gemini response did not contain JSON text",
          "GEMINI_INVALID_RESPONSE",
          "Gemini returned no structured observation. The capture is pending review.",
        );
      }

      try {
        return this.toDomainObservation(
          rawBatchedVisualObservationSchema.parse(JSON.parse(modelText)),
          unit,
          response.headers.get("x-request-id") ?? undefined,
        );
      } catch (error) {
        if (error instanceof ProviderFailure) {
          throw error;
        }
        throw providerFailure(
          "Gemini observation JSON did not match the domain schema",
          "GEMINI_INVALID_RESPONSE",
          "Gemini returned observations in an unsupported format. The capture is pending review.",
          error,
        );
      }
    } catch (error) {
      if (error instanceof ProviderFailure) {
        throw error;
      }
      throw providerFailure(
        "Gemini provider request or response failed",
        "GEMINI_INVALID_RESPONSE",
        "Gemini analysis could not be completed. The capture is pending review.",
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private requestBody(unit: UnitCapture) {
    const imageParts = (unit.images ?? []).map((image) => ({
      inline_data: {
        mime_type: image.mimeType,
        data: image.dataBase64,
      },
    }));

    return {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: this.prompt(unit),
            },
            ...imageParts,
          ],
        },
      ],
      generationConfig: {
        responseFormat: {
          text: {
            mimeType: "APPLICATION_JSON",
            schema: responseSchema,
          },
        },
      },
    };
  }

  private prompt(unit: UnitCapture): string {
    return [
      "Analyze only the supplied images for this one unit.",
      "Do not use outside knowledge to decide compliance.",
      "Do not invent missing labels, barcodes, dates, or marks.",
      "Do not infer an object, seam, curve, edge, or text that is not visible.",
      "Do not output PASS, FAIL, UNCERTAIN, or PENDING verdicts.",
      "Report observations only. Prefer observed_state=insufficient_evidence over guessing.",
      "Tie every observation to one supplied image_reference when possible.",
      "Use normalized bounding boxes [ymin, xmin, ymax, xmax] from 0 to 1000.",
      "If OCR is unreadable, set ocr_text to null and evidence_quality to insufficient.",
      "Inspect all six checks in this single response: polybag, suffocation_warning, fnsku_placement, original_barcode, expiry_date, handling_marks.",
      "For FNSKU placement, only use spatial placement when the relevant surface or seam is visibly supported; otherwise use placement=uncertain.",
      `Unit metadata: ${JSON.stringify({
        record_id: unit.recordId,
        unit_id: unit.unitId,
        org_id: unit.orgId,
        captured_at: unit.capturedAt,
        image_references: unit.imageReferences,
      })}`,
      `Configured requirements and applicability: ${JSON.stringify(unit.requirements ?? this.requirements)}`,
      "Return exactly one observation object for each of the six check IDs.",
    ].join("\n");
  }

  private toDomainObservation(
    raw: ReturnType<typeof rawBatchedVisualObservationSchema.parse>,
    unit: UnitCapture,
    requestId?: string,
  ): BatchedVisualObservation {
    if (raw.unit_id !== unit.unitId) {
      throw new ProviderFailure("Gemini response unit_id did not match the capture");
    }

    const allowedReferences = new Set(unit.imageReferences);
    const observations = Object.fromEntries(
      CHECK_IDS.map((checkId) => {
        const item = raw.observations[checkId];
        if (
          item.check_id !== checkId ||
          item.image_reference !== null &&
          !allowedReferences.has(item.image_reference)
        ) {
          throw new ProviderFailure(
            `Gemini response used an unknown image reference for ${checkId}`,
          );
        }
        if (item.evidence_quality === "insufficient" && item.ocr_text !== null) {
          throw new ProviderFailure(
            `Gemini response claimed OCR despite insufficient evidence for ${checkId}`,
          );
        }

        return [
          checkId,
          {
            checkId: item.check_id,
            observedState: item.observed_state,
            evidenceText: item.evidence_text,
            imageReference: item.image_reference,
            evidenceQuality: item.evidence_quality,
            boundingBoxes: item.bounding_boxes,
            ocrText: item.ocr_text,
            spatialRelation: item.spatial_relation
              ? {
                  placement: item.spatial_relation.placement,
                  reason: item.spatial_relation.reason,
                  labelBox: item.spatial_relation.label_box,
                  seamBox: item.spatial_relation.seam_box,
                }
              : undefined,
            observedHandlingMarks: item.observed_handling_marks,
          },
        ];
      }),
    ) as BatchedVisualObservation["observations"];

    return {
      unitId: raw.unit_id,
      observations,
      metadata: {
        provider: "gemini",
        model: this.model,
        requestId,
        isMock: false,
      },
    };
  }
}

function providerFailure(
  message: string,
  code: ProviderFailureCode,
  safeMessage: string,
  cause?: unknown,
): ProviderFailure {
  return new ProviderFailure(message, { code, safeMessage, cause });
}

function classifyHttpFailure(status: number): ProviderFailureCode {
  if (status === 401 || status === 403) {
    return "GEMINI_AUTH_ERROR";
  }
  if (status === 400) {
    return "GEMINI_BAD_REQUEST";
  }
  if (status === 429) {
    return "GEMINI_RATE_LIMIT";
  }
  if (status >= 500) {
    return "GEMINI_SERVER_ERROR";
  }
  return "GEMINI_BAD_REQUEST";
}

function sanitizeGeminiErrorBody(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== "object" || parsed === null || !("error" in parsed)) {
      return "No structured Gemini error details were provided.";
    }

    const error = parsed.error;
    if (typeof error !== "object" || error === null) {
      return "No structured Gemini error details were provided.";
    }

    const message = "message" in error && typeof error.message === "string"
      ? error.message.slice(0, 300)
      : undefined;
    const status = "status" in error && typeof error.status === "string"
      ? error.status.slice(0, 80)
      : undefined;
    return [status, message].filter(Boolean).join(": ") || "No structured Gemini error details were provided.";
  } catch {
    return "No structured Gemini error details were provided.";
  }
}

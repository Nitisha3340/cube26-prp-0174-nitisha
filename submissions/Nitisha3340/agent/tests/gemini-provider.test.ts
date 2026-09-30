import { describe, expect, it } from "vitest";
import { CHECK_IDS, type CheckId, type UnitCapture } from "../src/domain/types";
import { GeminiVisionProvider } from "../src/vision/gemini-provider";
import { ProviderFailure } from "../src/vision/provider";
import { evaluateCheck } from "../src/rules/prep-rules";

const unit: UnitCapture = {
  recordId: "PRP-GEMINI-0001",
  unitId: "UNIT-GEMINI-0001",
  orgId: "org_demo_alpha",
  capturedAt: "2026-09-30T10:00:00.000Z",
  imageReferences: ["fixtures/unit-0001/image-01.jpg", "fixtures/unit-0001/image-02.jpg"],
  images: [
    {
      imageReference: "fixtures/unit-0001/image-01.jpg",
      mimeType: "image/jpeg",
      dataBase64: "encoded-image-01",
    },
    {
      imageReference: "fixtures/unit-0001/image-02.jpg",
      mimeType: "image/jpeg",
      dataBase64: "encoded-image-02",
    },
  ],
};

const baseObservation = (checkId: CheckId) => ({
  check_id: checkId,
  observed_state: "present",
  evidence_text: `Observed ${checkId} in supplied image.`,
  image_reference: unit.imageReferences[0],
  evidence_quality: "sufficient",
  bounding_boxes: [[100, 100, 300, 300]],
  ocr_text: "READABLE TEXT",
});

function modelOutput(
  overrides: Partial<Record<CheckId, Record<string, unknown>>> = {},
) {
  return {
    unit_id: unit.unitId,
    observations: Object.fromEntries(
      CHECK_IDS.map((checkId) => [checkId, { ...baseObservation(checkId), ...overrides[checkId] }]),
    ),
  };
}

function fakeFetch(body: unknown, status = 200) {
  const requests: Array<{ url: string; body: Record<string, unknown>; apiKeyHeader: string | null }> = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    requests.push({
      url,
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      apiKeyHeader: new Headers(init?.headers).get("x-goog-api-key"),
    });
    return new Response(
      JSON.stringify(
        status >= 200 && status < 300
          ? { candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }
          : body,
      ),
      { status, statusText: status === 500 ? "Server Error" : "OK" },
    );
  };

  return { requests, fetchImpl: fetchImpl as typeof fetch };
}

describe("Gemini vision provider", () => {
  it("makes one request for multiple images and returns all six observations", async () => {
    const fake = fakeFetch(modelOutput());
    const provider = new GeminiVisionProvider({
      apiKey: "test-key",
      model: "test-model",
      fetchImpl: fake.fetchImpl,
    });

    const result = await provider.analyze(unit);
    const requestBody = fake.requests[0].body;
    const parts = (requestBody.contents as Array<{ parts: unknown[] }>)[0].parts;

    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0].url).toContain("/v1beta/models/test-model:generateContent");
    expect(fake.requests[0].url).not.toContain("test-key");
    expect(fake.requests[0].apiKeyHeader).toBe("test-key");
    expect((fake.requests[0].body as { generationConfig: { responseFormat: unknown } }).generationConfig.responseFormat).toBeDefined();
    expect(parts.filter((part) => "inline_data" in (part as object))).toHaveLength(2);
    expect(Object.keys(result.observations)).toEqual([...CHECK_IDS]);
    expect(result.metadata.model).toBe("test-model");
  });

  it("classifies a missing API key without making a request", async () => {
    const fake = fakeFetch(modelOutput());
    const provider = new GeminiVisionProvider({ apiKey: "", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toMatchObject({
      code: "GEMINI_AUTH_ERROR",
      safeMessage: "Gemini authentication is not configured on the server.",
    });
    expect(fake.requests).toHaveLength(0);
  });

  it("turns malformed model output into ProviderFailure", async () => {
    const fake = fakeFetch({ unit_id: unit.unitId, observations: {} });
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toBeInstanceOf(ProviderFailure);
  });

  it("rejects compliance verdict strings from the model observation", async () => {
    const fake = fakeFetch(modelOutput({ polybag: { observed_state: "PASS" } }));
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toBeInstanceOf(ProviderFailure);
  });

  it("classifies a server HTTP failure as server error", async () => {
    const fake = fakeFetch({}, 500);
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toMatchObject({ code: "GEMINI_SERVER_ERROR" });
  });

  it.each([401, 403])("classifies HTTP %s as authentication failure", async (status) => {
    const fake = fakeFetch({}, status);
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toMatchObject({ code: "GEMINI_AUTH_ERROR" });
  });

  it("classifies HTTP 400 as a bad request", async () => {
    const fake = fakeFetch({}, 400);
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toMatchObject({ code: "GEMINI_BAD_REQUEST" });
  });

  it.each([429])("classifies HTTP %s as a rate-limit failure", async (status) => {
    const fake = fakeFetch({}, status);
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toMatchObject({ code: "GEMINI_RATE_LIMIT" });
  });

  it.each([500, 503])("classifies HTTP %s as a server failure", async (status) => {
    const fake = fakeFetch({}, status);
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toMatchObject({ code: "GEMINI_SERVER_ERROR" });
  });

  it("preserves only sanitized Gemini error details for a 503 response", async () => {
    const fake = fakeFetch({
      error: {
        code: 503,
        status: "UNAVAILABLE",
        message: "The model service is temporarily unavailable.",
        secret: "must-not-be-forwarded",
      },
    }, 503);
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toMatchObject({
      code: "GEMINI_SERVER_ERROR",
      safeMessage: expect.stringContaining("UNAVAILABLE"),
    });
    await expect(provider.analyze(unit)).rejects.not.toMatchObject({
      safeMessage: expect.stringContaining("must-not-be-forwarded"),
    });
  });

  it("classifies timeout and network failures without exposing request data", async () => {
    const timeoutProvider = new GeminiVisionProvider({
      apiKey: "test-key",
      fetchImpl: (async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }) as typeof fetch,
    });
    await expect(timeoutProvider.analyze(unit)).rejects.toMatchObject({ code: "GEMINI_TIMEOUT" });

    const networkProvider = new GeminiVisionProvider({
      apiKey: "test-key",
      fetchImpl: (async () => { throw new Error("connection reset"); }) as typeof fetch,
    });
    await expect(networkProvider.analyze(unit)).rejects.toMatchObject({ code: "GEMINI_NETWORK_ERROR" });
  });

  it("rejects bounding boxes outside the normalized 0-1000 range", async () => {
    const fake = fakeFetch(
      modelOutput({ polybag: { bounding_boxes: [[-1, 0, 100, 100]] } }),
    );
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(provider.analyze(unit)).rejects.toBeInstanceOf(ProviderFailure);
  });

  it("fails as a provider error when no inline images are available", async () => {
    const fake = fakeFetch(modelOutput());
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    await expect(
      provider.analyze({ ...unit, images: undefined }),
    ).rejects.toBeInstanceOf(ProviderFailure);
    expect(fake.requests).toHaveLength(0);
  });

  it("preserves missing OCR as null and insufficient quality", async () => {
    const fake = fakeFetch(
      modelOutput({
        suffocation_warning: {
          observed_state: "insufficient_evidence",
          evidence_quality: "insufficient",
          ocr_text: null,
        },
      }),
    );
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    const result = await provider.analyze(unit);

    expect(result.observations.suffocation_warning.ocrText).toBeNull();
    expect(result.observations.suffocation_warning.evidenceQuality).toBe("insufficient");
  });

  it("returns supported seam evidence when the seam is visible", async () => {
    const fake = fakeFetch(
      modelOutput({
        fnsku_placement: {
          observed_state: "on_seam",
          spatial_relation: {
            placement: "on_seam",
            reason: "A visible seam crosses the label area.",
            label_box: [100, 100, 300, 300],
            seam_box: [180, 80, 220, 320],
          },
        },
      }),
    );
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    const result = await provider.analyze(unit);
    const observation = result.observations.fnsku_placement;
    const verdict = evaluateCheck(
      {
        checkId: "fnsku_placement",
        applicability: "required",
        requirement: "Configured label placement requirement",
        supportingObservedStates: ["flat"],
        failingObservedStates: ["on_seam", "on_curve", "on_edge"],
      },
      observation,
    );

    expect(observation.spatialRelation?.placement).toBe("on_seam");
    expect(verdict.verdict).toBe("FAIL");
  });

  it("keeps invisible seam evidence uncertain", async () => {
    const fake = fakeFetch(
      modelOutput({
        fnsku_placement: {
          observed_state: "insufficient_evidence",
          evidence_quality: "insufficient",
          ocr_text: null,
          bounding_boxes: [],
          spatial_relation: { placement: "uncertain", reason: "The seam is not visible." },
        },
      }),
    );
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    const result = await provider.analyze(unit);

    expect(result.observations.fnsku_placement.spatialRelation?.placement).toBe("uncertain");
    expect(result.observations.fnsku_placement.observedState).toBe("insufficient_evidence");
  });

  it("represents warning, barcode, expiry, and handling-mark observations", async () => {
    const fake = fakeFetch(
      modelOutput({
        suffocation_warning: { observed_state: "legible", ocr_text: "Suffocation warning" },
        original_barcode: { observed_state: "covered", ocr_text: null },
        expiry_date: { observed_state: "illegible", evidence_quality: "insufficient", ocr_text: null },
        handling_marks: {
          observed_state: "marks_present",
          observed_handling_marks: ["fragile", "this way up"],
        },
      }),
    );
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    const result = await provider.analyze(unit);

    expect(result.observations.suffocation_warning.ocrText).toBe("Suffocation warning");
    expect(result.observations.original_barcode.observedState).toBe("covered");
    expect(result.observations.expiry_date.ocrText).toBeNull();
    expect(result.observations.handling_marks.observedHandlingMarks).toEqual(["fragile", "this way up"]);
  });

  it("represents obscured warnings, visible barcodes, readable expiry, and missing handling marks", async () => {
    const fake = fakeFetch(
      modelOutput({
        suffocation_warning: {
          observed_state: "obscured",
          ocr_text: null,
          evidence_quality: "insufficient",
        },
        original_barcode: { observed_state: "visible", ocr_text: "0123456789" },
        expiry_date: { observed_state: "readable", ocr_text: "EXP 2027-01" },
        handling_marks: {
          observed_state: "missing",
          observed_handling_marks: [],
        },
      }),
    );
    const provider = new GeminiVisionProvider({ apiKey: "test-key", fetchImpl: fake.fetchImpl });

    const result = await provider.analyze(unit);

    expect(result.observations.suffocation_warning.observedState).toBe("obscured");
    expect(result.observations.original_barcode.observedState).toBe("visible");
    expect(result.observations.expiry_date.ocrText).toBe("EXP 2027-01");
    expect(result.observations.handling_marks.observedState).toBe("missing");
    expect(result.observations.handling_marks.observedHandlingMarks).toEqual([]);
  });
});

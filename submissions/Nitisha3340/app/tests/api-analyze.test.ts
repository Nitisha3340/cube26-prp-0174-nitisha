import { afterEach, describe, expect, it, vi } from "vitest";
import { CHECK_IDS } from "prep-manager-agent/domain/types";
import { POST } from "../src/app/api/analyze/route";

const image = {
  imageReference: "capture/front.jpg",
  mimeType: "image/jpeg" as const,
  dataBase64: "cnVudGltZS1pbWFnZS1kYXRh",
};

const requestBody = (overrides: Record<string, unknown> = {}) => ({
  unitId: "UNIT-API-0001",
  recordId: "PRP-API-0001",
  orgId: "org_demo_alpha",
  provider: "mock",
  images: [image],
  ...overrides,
});

const request = (body: unknown) =>
  new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
});

describe("POST /api/analyze", () => {
  it("rejects a request with no images", async () => {
    const response = await POST(request(requestBody({ images: [] })));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Invalid analysis request");
  });

  it("returns a successful mock analysis with all six checks", async () => {
    const response = await POST(request(requestBody()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.provider.provider).toBe("mock");
    expect(body.analysis.modelCalls).toBe(1);
    expect(Object.keys(body.analysis.checks)).toEqual([...CHECK_IDS]);
    expect(body.analysis.status).toBe("UNCERTAIN");
  });

  it("returns PENDING when the selected Gemini provider fails", async () => {
    process.env.GEMINI_API_KEY = "test-server-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream failure", { status: 503, statusText: "Unavailable" })),
    );

    const response = await POST(request(requestBody({ provider: "gemini" })));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.status).toBe("PENDING");
    expect(body.analysis.imageReferences).toEqual([image.imageReference]);
    expect(body.analysis.checks.polybag.verdict).toBe("PENDING");
  });

  it("returns a safe pending reason when the Gemini key is missing", async () => {
    const response = await POST(request(requestBody({ provider: "gemini" })));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.status).toBe("PENDING");
    expect(body.analysis.failureCode).toBe("GEMINI_AUTH_ERROR");
    expect(body.analysis.failureReason).toContain("authentication");
  });

  it("rejects malformed base64 image data", async () => {
    const response = await POST(request(requestBody({ images: [{ ...image, dataBase64: "not-base64" }] })));

    expect(response.status).toBe(400);
  });

  it("does not return the server Gemini key to the client", async () => {
    process.env.GEMINI_API_KEY = "server-only-test-key";
    const response = await POST(request(requestBody({ provider: "mock" })));
    const serializedResponse = JSON.stringify(await response.json());

    expect(serializedResponse).not.toContain("server-only-test-key");
  });
});

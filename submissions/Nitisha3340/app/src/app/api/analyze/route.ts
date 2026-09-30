import {
  analyzeUnit,
  createUnknownRequirements,
  GeminiVisionProvider,
  MockVisionProvider,
} from "prep-manager-agent";
import { z } from "zod";

const imageSchema = z.object({
  imageReference: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  dataBase64: z.string().min(4).refine(isBase64, "Image data must be valid base64."),
});

const requestSchema = z.object({
  unitId: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  orgId: z.string().trim().min(1),
  capturedAt: z.string().datetime().optional(),
  workOrderId: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  fnsku: z.string().trim().optional(),
  provider: z.enum(["mock", "gemini"]).default("mock"),
  images: z.array(imageSchema).min(1),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid analysis request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (input.provider === "gemini") {
    console.info(
      `[prep-manager] GEMINI_API_KEY configured: ${Boolean(process.env.GEMINI_API_KEY)}`,
    );
  }
  const requirements = createUnknownRequirements();
  const unit = {
    recordId: input.recordId,
    unitId: input.unitId,
    orgId: input.orgId,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    imageReferences: input.images.map((image) => image.imageReference),
    images: input.images,
    requirements,
  };
  const provider = input.provider === "gemini"
    ? new GeminiVisionProvider({ requirements })
    : new MockVisionProvider();

  try {
    const analysis = await analyzeUnit(unit, { provider, requirements });
    return Response.json({
      capture: {
        recordId: input.recordId,
        unitId: input.unitId,
        orgId: input.orgId,
        workOrderId: input.workOrderId,
        sku: input.sku,
        fnsku: input.fnsku,
        providerRequested: input.provider,
      },
      analysis,
    });
  } catch {
    return Response.json(
      {
        error: "The analysis service encountered an internal error. The capture was not scored.",
        capture: {
          recordId: input.recordId,
          unitId: input.unitId,
          orgId: input.orgId,
          workOrderId: input.workOrderId,
          sku: input.sku,
          fnsku: input.fnsku,
          providerRequested: input.provider,
        },
      },
      { status: 500 },
    );
  }
}

function isBase64(value: string): boolean {
  return value.length % 4 === 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}

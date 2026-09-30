# Prep Manager Architecture

This document describes the Phase 2 headless vision layer. It is not a production-readiness claim, and the local evidence schema is not the official CUBE cross-pod contract.

## Components

- `domain`: typed unit, check, requirement, observation, verdict, and evidence models.
- `vision`: `VisionProvider` interface, deterministic mock provider, and native-fetch Gemini provider.
- `rules`: deterministic evaluation of configured requirements and visual observations, plus a source registry containing only documented facts.
- `pipeline`: one-unit orchestration and overall preparation status.
- `evidence`: structured records preserving observations, verdicts, explanations, images, and provider metadata.
- `contract`: provisional JSON Schema for the local evidence record.
- `app`: local Next.js operator console and server-only `/api/analyze` adapter.

## Data flow

1. A capture arrives with `recordId`, `unitId`, `orgId`, timestamp, image references, and optionally inline image data.
2. The pipeline attaches the explicit requirement configuration and invokes `VisionProvider.analyze` exactly once for that unit.
3. `GeminiVisionProvider` sends one REST request containing the prompt and all available images.
4. Gemini returns observation-only JSON for all six checks; no compliance verdict is requested or accepted.
5. Zod validates the response, image references, OCR uncertainty, and normalized bounding-box bounds.
6. The deterministic rule engine evaluates each observation against configured applicability and explicitly supplied supporting/failing states.
7. The pipeline derives an overall `PASS`, `FAIL`, `UNCERTAIN`, or `PENDING` status and records `modelCalls: 1`.
8. One evidence record is created for every check, retaining image, OCR, quality, box, and spatial metadata.

## Demo UI boundary

The browser captures unit metadata and encodes selected images for a single request. `POST /api/analyze` validates the request on the server, selects either the explicit deterministic mock or Gemini provider, invokes the existing agent pipeline, and returns the analysis record. React never imports or calls Gemini and never receives `GEMINI_API_KEY`.

## One batched model call

The provider interface has one operation: `analyze(unit)`. The pipeline calls it once and does not expose per-check model operations. Gemini receives all images and all six check instructions in the same request. `modelCalls: 1` is recorded on the analysis result. A future provider must preserve this contract.

## Gemini observations

The provider returns `observed_state`, `evidence_text`, `image_reference`, `evidence_quality`, normalized `[ymin, xmin, ymax, xmax]` bounding boxes, optional OCR text, optional spatial relation, and optional observed handling marks. `insufficient_evidence` is preferred over guessing. OCR is `null` when unreadable. FNSKU placement remains uncertain when a seam, curve, or edge is not visibly supported.

## Rule engine

The rule engine does not contain invented Amazon thresholds. It consumes documented requirement configuration and observations. A required observation passes only when its state is explicitly listed in `supportingObservedStates`; it fails only when its state is explicitly listed in `failingObservedStates`; insufficient evidence is uncertain. `not_required` is explicitly applicable and does not become a failure. Unknown applicability is uncertain. The authoritative registry records sourced facts but does not automatically apply them.

## Verdict model

`PASS`, `FAIL`, `UNCERTAIN`, and `PENDING` are distinct states. `UNCERTAIN` means: “The available evidence is insufficient to make a reliable compliance determination.” `PENDING` means the system could not complete analysis because the provider/system failed. Confidence metadata cannot convert insufficient evidence into a pass.

## Evidence generation

Evidence records retain tenant, unit, capture, requirement, observation, verdict, explanation, image reference, provider metadata, and timestamps. The JSON Schema under `contract/` is a provisional local contract pending organiser and other-pod confirmation.

## Fail-open behavior

Gemini HTTP, authentication, timeout, network, and malformed-response failures become `ProviderFailure`. The capture metadata remains represented in a `PENDING` analysis record, each check is reviewable, and the operator is not blocked by the model failure. Internal invariant/configuration errors are rethrown rather than hidden as `PENDING`.

## Tenant isolation design

Every persistent record includes `orgId`. The intended PostgreSQL implementation must use tenant-scoped tables with Row Level Security enabled and forced, and storage keys must be tenant-scoped and non-guessable. Application filtering alone is not considered tenant isolation. Phase 1 reserves this boundary but does not claim RLS is implemented.

## Current limitations

- No UI, database schema, storage adapter, authentication, or deployment exists yet.
- Provider credentials and live model behavior require runtime environment configuration.
- The authoritative registry is a documented source record, not a complete compliance policy or automatic applicability resolver.
- No product images or held-out evaluation set are included.
- No real vision accuracy or evaluation result is claimed.
- The official cross-pod evidence contract is unavailable in this repository.

## Future real provider integration

The Gemini adapter is the first real provider implementation. Future changes should keep credentials in environment variables, send one request per unit with all photographs and check context, validate the structured response with Zod, and preserve the fail-open behavior. Provider metadata should identify the actual provider/model without exposing secrets.

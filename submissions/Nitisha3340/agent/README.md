# Prep Manager Agent

Phase 2 is a headless, backend-first vision analysis layer for Visual Prep Manager. It adds a native-fetch Gemini provider while preserving the single batched vision-provider boundary, deterministic requirement evaluation, and provisional evidence records.

## Commands

```sh
npm install
npm test
npm run typecheck
```

## Gemini configuration

The real provider reads configuration only from environment variables:

- `GEMINI_API_KEY` is required and must never be committed.
- `GEMINI_MODEL` is optional and defaults to `gemini-3.8-flash`.

No `.env` file is included. The provider sends one request per unit with all available inline images, all six check instructions, and the supplied requirement/applicability configuration.

The `MockVisionProvider` is deterministic development/test infrastructure. It is not a real vision model and provides no accuracy claim.

## Design boundaries

- One call to `VisionProvider.analyze` receives one unit and all photographs, then returns observations for all six checks.
- `GeminiVisionProvider` uses native `fetch`, structured JSON output, Zod validation, OCR fields, normalized bounding boxes, and spatial evidence.
- The model reports observations only. The deterministic rule engine is the only component that derives `PASS`, `FAIL`, or `UNCERTAIN`.
- Requirement configuration is explicit and supports `required`, `not_required`, and `unknown` applicability.
- Missing applicability, missing evidence, and `insufficient_evidence` observations produce `UNCERTAIN`.
- Provider failure produces a persisted-shaped `PENDING` response while preserving capture metadata.
- Provider adapters must wrap availability, timeout, network, and model failures in `ProviderFailure`; internal invariant errors are rethrown.
- Successful analysis records `modelCalls: 1`; there is no per-check provider operation.
- Fixture conventions are documented in `fixtures/README.md`; no real evaluation images are included.
- Every record carries `orgId`; PostgreSQL Row Level Security remains a required persistence-layer implementation task.
- `serializeEvidenceRecord` is the explicit camelCase-to-snake_case boundary for the local/provisional evidence schema; it is not the official cross-pod contract.

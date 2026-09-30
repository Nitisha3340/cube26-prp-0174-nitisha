# Build Log

## 2026-09-30

Started Phase 1 on branch `feature/prep-manager`.

Implemented the headless backend-first skeleton under `agent/`:

- Added typed domain models for six checks, applicability, observations, verdicts, evidence, and overall status.
- Added first-class `PASS`, `FAIL`, `UNCERTAIN`, and `PENDING` semantics.
- Added a single batched `VisionProvider` interface and deterministic mock provider.
- Added Zod validation at the provider boundary.
- Added deterministic rule evaluation without inventing Amazon thresholds.
- Added fail-open pending analysis records for provider failure.
- Added provisional local evidence-record JSON Schema, explicitly not claiming official contract status.
- Added tests for verdicts, rules, one-call batching, evidence creation, and provider failure.
- Added architecture and implementation documentation.

No UI, deployment, real provider, authoritative requirement integration, evaluation data, evaluation metrics, commit, or push has been created yet.

## 2026-09-30 Phase 1 fixes

Hardened verdict validation so inherited Object properties are rejected. Added an explicit deterministic serializer from the camelCase domain evidence record to the snake_case local/provisional contract shape, with schema validation tests. Provider failures are now represented by `ProviderFailure` and still fail open to `PENDING`, while internal programming/configuration errors are rethrown. No test or evaluation result is claimed here because dependency installation remains incomplete.

## 2026-09-30 Phase 2

Added a native `fetch` Gemini REST provider behind the existing `VisionProvider` interface. It sends one request per unit with all available images, explicit requirement configuration, and observation-only structured JSON. Added Zod validation for normalized bounding boxes, OCR nullability, image references, and all six checks; expanded evidence records with visual metadata; added a sourced-but-not-automatically-applied authoritative rule registry; added fixture conventions; and recorded `modelCalls: 1` for unit analyses. No UI, deployment, evaluation result, accuracy claim, commit, or push was created.

## 2026-09-30 Phase 2 review fixes

Rejected reserved compliance verdict strings from model observations, made uncertain spatial placement produce `UNCERTAIN`, completed explicit `check_id` and `evidence_text` evidence serialization, constrained nested spatial boxes, and prevented image-less provider calls. Added regression coverage for these boundaries. Tests were not claimed as passed because the local Vitest and TypeScript binaries remain unavailable.

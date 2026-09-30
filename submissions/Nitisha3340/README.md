# Nitisha3340 Prep Manager

Phase 1 implementation index for the CUBE Buildathon 2026 Round 2 Visual Prep Manager.

## Status

The current implementation is a headless backend-first skeleton. It is not production-ready, does not include a UI or deployment, and makes no real vision-accuracy claim.

## Contents

- [Architecture](../../ARCHITECTURE.md)
- [Customer letter](01-customer-letter.md)
- [PR/FAQ](02-prfaq.md)
- [One-pager](03-one-pager.md)
- [Build brief](build-brief.md)
- [Build log](build-log.md)
- [Durable constraints](CLAUDE.md)
- [Evaluation report](eval-report.md)
- [Agent README](agent/README.md)
- [Local demo app](app/README.md)
- [Provisional local evidence schema](contract/evidence-record.schema.json)

## Phase 1 capabilities

- Six typed checks: polybag, suffocation warning, FNSKU placement, original barcode, expiry date, and handling marks.
- First-class `PASS`, `FAIL`, `UNCERTAIN`, and `PENDING` verdicts.
- One batched provider call per unit.
- Deterministic rule evaluation without invented Amazon requirements.
- Structured evidence records with tenant context.
- Fail-open pending records for provider failures.

The local demo app is under `app/`. It provides the operator capture form and results view through a server-side `/api/analyze` adapter; it does not expose Gemini credentials to the browser.

The evidence schema is provisional and is not the official cross-pod contract. The deterministic mock provider is for development and testing only.

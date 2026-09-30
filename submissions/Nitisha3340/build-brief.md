# Build Brief

## Problem

Prep centers and self-prepping sellers need durable compliance proof for each unit prepared for inbound shipment. A photograph should become a reviewable record rather than an unrecorded operator judgment.

## User

The primary user is a prep-center operator or self-prepping seller working quickly through prepared units. A downstream Recovery Manager may consume the evidence when a prep defect is disputed.

## Workflow

1. Capture a prepared unit and its photographs.
2. Associate the capture with unit and organisation metadata.
3. Analyze the six preparation checks in one batched provider call.
4. Evaluate observations against configured, authoritative requirements.
5. Record each verdict, explanation, observation, and image reference.
6. Route uncertain or pending cases for review without blocking capture.

## Solution hypothesis

A visual preparation record that separates observation from rule evaluation and makes uncertainty explicit can provide more useful operational evidence than an unrecorded manual judgment, provided the evidence and requirements remain traceable.

## Measurable success criteria

- Every unit analysis returns all six check slots.
- Every check has exactly one first-class verdict: `PASS`, `FAIL`, `UNCERTAIN`, or `PENDING`.
- Every completed check has an observation, explanation, and evidence reference or an explicit insufficient-evidence state.
- Provider failure preserves capture metadata and returns a reviewable `PENDING` record.
- The pipeline makes one provider call per unit.
- Tenant isolation is enforced by PostgreSQL Row Level Security before persistent multi-tenant use.
- A later held-out evaluation reports per-check false positives, false negatives, uncertain cases, and named failure modes.

No performance target or evaluation result is claimed in Phase 1.

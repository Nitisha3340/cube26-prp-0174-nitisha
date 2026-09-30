# Durable Build Constraints

- Never invent evidence. Preserve the capture and state when evidence is missing.
- Never invent Amazon compliance rules. Use authoritative, documented requirements when they are wired in.
- `UNCERTAIN` is a first-class outcome: “The available evidence is insufficient to make a reliable compliance determination.”
- `PENDING` is a first-class outcome for unavailable or failed analysis.
- Make exactly one model/provider call per unit carrying all six checks.
- Fail open: provider errors must preserve capture metadata and create a reviewable pending record.
- Every persistent record must carry `org_id`; PostgreSQL Row Level Security is required for tenant isolation.
- Keep provider credentials in environment variables. Never commit secrets or `.env` files containing secrets.
- Do not use the synthetic sample CSV as ground truth.
- Do not fabricate evaluation metrics, real vision performance, or official contract status.
- The local evidence schema remains provisional until confirmed by organisers and other pods.

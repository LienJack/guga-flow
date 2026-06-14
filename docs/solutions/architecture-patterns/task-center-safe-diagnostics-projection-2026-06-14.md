# Task Center Safe Diagnostics Projection

Date: 2026-06-14
Status: accepted

## Context

CEX-22 needs task-center and diagnostics visibility across provider, media,
workflow, editor export, and Agent work. Existing GenerationJob records already
store status, provider/model, related nodes, errors, and retry/cancel behavior.

## Decision

- Build task center as a typed projection over GenerationJob instead of adding a
  second task table.
- Classify tasks by operation into llm, image, video, audio, asset, media,
  workflow, editor export, agent, or unknown.
- Generate deterministic trace ids from project and job id.
- Extract only safe related object pointers such as node id, asset id,
  scriptDraft id, or editorExport id.
- Create diagnostic records only from safe error messages, with secret and local
  path redaction.
- Reuse existing retry and cancel generation endpoints.
- Keep clear as a frontend panel cleanup action so audit history is preserved.

## Consequences

- Users get one project-level task view without duplicating job state.
- Diagnostics can be copied or inspected without leaking raw prompts, secrets,
  full provider responses, or local absolute paths by default.
- Future persistent diagnostics can reuse the same public contracts.
- The canvas workspace can locate task-related nodes through existing selection
  plumbing.

## Verification

- Shared tests cover task center and diagnostics contracts.
- Backend tests cover projection, classification, trace ids, actions, and
  diagnostic sanitization.
- Frontend tests cover task center API routing and panel rendering.
- Repository lint/test and Next production build pass.

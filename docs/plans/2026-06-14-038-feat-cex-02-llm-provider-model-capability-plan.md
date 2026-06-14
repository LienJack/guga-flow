---
title: feat: Complete CEX-02 LLM provider and model capability foundation
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-038-cex-02-llm-provider-model-capability-requirements.md
---

# feat: Complete CEX-02 LLM Provider And Model Capability Foundation

## Summary

Extend the existing provider management system to cover LLM providers, safe manual model metadata, and normalized provider errors while preserving the current browser-safe and worker/runtime secret boundary.

---

## Assumptions

*This plan was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before implementation proceeds.*

- Manual model CRUD can live in `ProviderConfig.paramsJson` for this slice and does not require a new Prisma model.
- LLM connection tests validate configuration/readiness only and do not call paid text generation APIs.
- Built-in LLM catalog coverage for mock, generic OpenAI-compatible, Gemini, Anthropic, and Ark is enough for CEX-03 to resolve role models.

---

## Requirements

- R1. Managed provider kind includes `llm`.
- R2. Built-in LLM catalog covers mock, OpenAI-compatible, Gemini, Anthropic/Claude-like, and Ark-compatible entries.
- R3. LLM save/test/discover flows are browser-secret-safe.
- R4. Provider model metadata supports id, display name, enabled state, kind, modes, duration/ratio/reference support, and prompt template binding.
- R5. Settings UI supports model add/remove/disable/rename.
- R6. Backend validation allows configured manual models and rejects disabled or unknown defaults.
- R7. Project-scoped provider catalog endpoints expose safe model/default resolution.
- R8. Provider failures normalize to auth, quota, rate limit, bad input, unsupported model, timeout, safety block, or unknown.
- R9. Normalized errors omit raw upstream response bodies, credentials, secret headers, and local paths.
- R10. Existing provider errors and worker failure JSON remain backward-compatible while adding a category.

**Origin actors:** A1 Creator/admin, A2 backend provider manager, A3 future Agent runtime, A4 future generation UI
**Origin flows:** F1 Configure and test an LLM provider, F2 Manage provider model metadata, F3 Surface normalized provider failures
**Origin acceptance examples:** AE1, AE2, AE3, AE4

---

## Scope Boundaries

- Do not implement CEX-03 Agent role assignment.
- Do not implement CEX-08 AI text node behavior or real LLM text generation.
- Do not add programmable LLM providers.
- Do not add a provider model table until later requirements prove versioning/ownership needs.
- Do not store raw upstream model discovery responses, raw provider response bodies, credentials, secret headers, or local paths.

---

## Context & Research

### Relevant Code and Patterns

- `packages/shared-types/src/domain/generation.ts` owns provider kinds, catalog DTOs, provider config params, discovery DTOs, and normalization helpers.
- `apps/backend/src/providers/providers.service.ts` builds image/video catalogs, overlays `ProviderConfig`, discovers models, tests configs, and returns worker runtime config.
- `apps/backend/src/providers/providers.controller.ts` exposes global and project-scoped provider catalog/config endpoints.
- `apps/frontend/src/components/projects/provider-settings-panel.tsx` renders project provider management and programmable provider controls.
- `packages/provider-contracts/src/contracts.ts` owns `ProviderError` and provider error JSON.
- `apps/worker/src/generation-executors.ts` serializes provider failures into worker/backend job results.

### Institutional Learnings

- `docs/solutions/architecture-patterns/provider-management-secret-safe-runtime-config-2026-06-13.md`
- `docs/solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md`
- `docs/solutions/documentation-gaps/reference-coverage-ledger-governance-2026-06-14.md`

### External References

- Anthropic model list API: `https://docs.anthropic.com/en/api/models-list`
- Anthropic version header requirement: `https://docs.anthropic.com/claude/reference/versioning`
- Gemini model endpoint reference: `https://ai.google.dev/api/models`
- Gemini service endpoint reference: `https://ai.google.dev/api/all-methods`

---

## Key Technical Decisions

- Model override metadata goes in `ProviderConfig.paramsJson.models`: this reuses the existing project-scoped, browser-safe config path and avoids a migration before model versioning is required.
- `ProviderErrorShape` gains an optional normalized category: existing code that reads `code`, `message`, and `retryable` remains valid, while CEX-22 diagnostics can group failures later.
- LLM provider runtime credentials use the same worker-token-gated runtime config path as image/video providers, even though CEX-02 does not execute LLM generation yet.
- Discovery stays best-effort and safe: failed discovery returns sanitized messages and grouped ids, never raw bodies.

---

## Open Questions

### Resolved During Planning

- Anthropic model discovery uses `GET /v1/models` with API-key authentication and the required `anthropic-version` header, based on official docs.
- Gemini model discovery uses the Gemini Models API/service endpoint, based on official Google AI docs.

### Deferred to Implementation

- Exact CSS layout for model CRUD controls can follow existing provider row/grid classes and adjust only as needed for readable compact controls.
- If TypeScript unions become noisy when adding `llm`, prefer small shared helper aliases over broad `any` casts.

---

## Implementation Units

- U1. **Shared provider contracts and error taxonomy**

**Goal:** Add LLM provider/catalog types, safe model metadata, model override normalization, and normalized provider error categories.

**Requirements:** R1, R4, R8, R9, R10

**Dependencies:** None

**Files:**
- Modify: `packages/shared-types/src/domain/generation.ts`
- Modify: `packages/shared-types/src/domain/domain.test.ts`
- Modify: `packages/provider-contracts/src/contracts.ts`
- Modify: `packages/provider-contracts/src/mock-providers.test.ts`

**Approach:**
- Add LLM provider ids and catalog item/result interfaces that reuse model metadata conventions.
- Expand `MANAGED_PROVIDER_KINDS`, `ManagedProviderId`, model discovery input, provider management result, runtime config input, and helpers to include `llm`.
- Add safe provider model metadata and params normalization for manual model overrides.
- Add provider error category constants and a normalization helper; extend `ProviderErrorShape`/`ProviderError` without removing existing fields.

**Test scenarios:**
- Covers AE4. Error category normalization maps auth, quota, rate limit, bad input, unsupported model, timeout, safety, and unknown examples.
- Manual model params remove key-like unsafe fields and preserve safe model capability metadata.
- Managed provider helpers accept `llm` and reject unknown LLM provider ids.

**Verification:**
- Shared type tests and provider-contract tests pass.

---

- U2. **Backend LLM provider management**

**Goal:** Add LLM provider catalog, project-scoped LLM management, discovery, testing, runtime config, and default model validation.

**Requirements:** R1, R2, R3, R6, R7, R8, R9

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/src/config/app-config.ts`
- Modify: `apps/backend/src/providers/dto.ts`
- Modify: `apps/backend/src/providers/providers.controller.ts`
- Modify: `apps/backend/src/providers/providers.service.ts`
- Modify: `apps/backend/src/providers/providers.service.spec.ts`

**Approach:**
- Add built-in LLM provider catalog entries for mock, generic OpenAI-compatible, Gemini, Anthropic, and Ark.
- Include LLM in management and project catalog endpoints.
- Reuse provider config overlay, credential sealing, discovery, test, and runtime config patterns.
- Apply manual model metadata before default validation and reject disabled defaults.
- Add protocol-specific discovery URL/header support for Anthropic and keep Gemini/OpenAI-compatible/Ark behavior safe.

**Test scenarios:**
- Covers AE1. LLM management returns mock enabled and real LLM providers disabled without keys and no key leakage.
- Covers AE2. Saving a manual LLM model makes it available as a default model.
- Covers AE3. Disabled manual model cannot be saved/tested as the default.
- Discovery with temporary LLM credentials groups chat models without persisting secrets.
- Runtime config for stored LLM credentials requires worker token.

**Verification:**
- Backend provider service tests pass.

---

- U3. **Frontend provider settings and API**

**Goal:** Show LLM providers in settings and provide compact manual model add/edit/remove/disable controls for all managed providers.

**Requirements:** R3, R4, R5, R7

**Dependencies:** U1, U2

**Files:**
- Modify: `apps/frontend/src/lib/api.ts`
- Modify: `apps/frontend/src/lib/api.test.ts`
- Modify: `apps/frontend/src/components/projects/provider-settings-panel.tsx`
- Modify: `apps/frontend/src/components/projects/provider-settings-panel.test.tsx`

**Approach:**
- Add project LLM provider catalog helper.
- Render provider groups from `llm`, `image`, and `video`.
- Extend provider drafts to carry model override metadata and save it through safe provider params.
- Add inline model controls for id/display name/kind/enabled state and remove/add actions.
- Ensure model discovery for LLM uses chat model groups and does not expose temporary credentials.

**Test scenarios:**
- Covers AE1. Static rendering shows LLM Providers alongside Image and Video Providers without secret values.
- Covers AE2. API helper calls the LLM catalog endpoint and provider config payload carries manual model params.
- Covers AE3. Disabled model controls render and do not place disabled models in default selection once backend returns validation state.

**Verification:**
- Frontend API and provider settings tests pass.

---

- U4. **Targeted validation and learning capture**

**Goal:** Run focused checks and document the reusable LLM provider/model boundary.

**Requirements:** R1-R10

**Dependencies:** U1, U2, U3

**Files:**
- Create: `docs/solutions/architecture-patterns/llm-provider-model-metadata-boundary-2026-06-14.md`
- Modify: `docs/plans/2026-06-14-038-feat-cex-02-llm-provider-model-capability-plan.md`

**Approach:**
- Run targeted shared/backend/provider/frontend tests.
- Capture how LLM provider management reuses provider config params, model metadata, and normalized errors without a new table.
- Mark this plan completed only after targeted verification passes or failures are documented.

**Test scenarios:**
- Test expectation: none -- this unit verifies and documents the completed implementation.

**Verification:**
- Completion log records executed commands and any known environment caveats.

---

## System-Wide Impact

- **Interaction graph:** Provider settings UI -> frontend API -> Nest providers controller/service -> Prisma ProviderConfig; future workers/agents can request runtime config through existing token-gated path.
- **Error propagation:** Provider errors gain normalized categories but keep existing code/message/retryable fields.
- **State lifecycle risks:** Manual model metadata is stored with provider params; bad defaults should fail before ProviderConfig writes.
- **API surface parity:** Global/project provider catalog endpoints add LLM counterparts; existing image/video endpoints remain.
- **Integration coverage:** Backend service tests prove secret-safe config, manual model defaults, discovery, test, and runtime token behavior. Frontend tests prove UI/API payload shape.
- **Unchanged invariants:** Browser DTOs do not contain provider secrets; job JSON remains secret-free; mock providers remain usable without paid keys.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Model override params become an unstructured dumping ground | Normalize model metadata and drop unsafe/key-like fields before persistence. |
| LLM management weakens the secret boundary | Reuse encrypted ProviderConfig secrets and worker-token-gated runtime config. |
| Discovery endpoint details drift | Keep discovery best-effort and sanitized; manual model entry remains the fallback. |
| UI becomes too dense | Use compact inline controls and preserve existing provider row layout. |

---

## Documentation / Operational Notes

- CEX-03 should consume the LLM provider/model list rather than defining its own model map.
- CEX-10 and CEX-09 may later specialize video/audio capability metadata using the shared model metadata fields added here.

---

## Sources & References

- **Origin document:** `docs/brainstorms/2026-06-14-038-cex-02-llm-provider-model-capability-requirements.md`
- CEX checklist: `docs/codex-reference-long-task-execution-checklist.md`
- Toonflow ledger: `docs/research/video-ref/toonflow-coverage-and-gaps.md`

---

## Completion Log

- Completed U1 by adding shared LLM provider catalog types, `llm` managed provider support, safe provider model override metadata, params normalization, and provider error categories.
- Completed U2 by adding backend LLM provider catalog entries, global/project LLM endpoints, project LLM management overlay, provider-specific discovery headers, manual model validation, runtime env mapping, and health key-state reporting.
- Completed U3 by adding frontend LLM provider API helpers, rendering an LLM provider group, and adding inline model add/rename/remove/disable controls persisted through provider params.
- Completed U4 by documenting the reusable LLM provider/model metadata boundary in `docs/solutions/architecture-patterns/llm-provider-model-metadata-boundary-2026-06-14.md`.

## Verification Log

- `pnpm --filter @guga-flow/shared-types run lint` passed.
- `pnpm --filter @guga-flow/shared-types test` passed.
- `pnpm --filter @guga-flow/shared-types run build` passed.
- `pnpm --filter @guga-flow/provider-contracts run lint` passed.
- `pnpm --filter @guga-flow/provider-contracts test` passed.
- `pnpm --filter @guga-flow/backend run lint` passed.
- `pnpm --filter @guga-flow/backend test` passed.
- `pnpm --filter @guga-flow/frontend run lint` passed.
- `pnpm --filter @guga-flow/frontend test` passed.
- `pnpm -r lint` passed.
- `pnpm -r test` passed.
- Chrome DevTools smoke opened `http://localhost:3001/projects/project_1/settings` against a temporary mock API; the page rendered LLM, Image, and Video provider groups plus model controls. Console had no provider-control errors after adding form names; four pre-existing form-field name/id issues remained in unrelated settings panels.
- Environment caveat: pnpm reported the local Node runtime as `v22.22.2` while the repo asks for `>=26.3.0`; the focused lint/test commands still passed under this runtime.
- AI-CanvasPro ledger: `docs/research/video-ref/ai-canvaspro-coverage-and-gaps.md`
- Provider settings pattern: `docs/solutions/architecture-patterns/provider-management-secret-safe-runtime-config-2026-06-13.md`
- Anthropic model list API: `https://docs.anthropic.com/en/api/models-list`
- Anthropic versioning: `https://docs.anthropic.com/claude/reference/versioning`
- Gemini models API: `https://ai.google.dev/api/models`
- Gemini API service endpoint: `https://ai.google.dev/api/all-methods`

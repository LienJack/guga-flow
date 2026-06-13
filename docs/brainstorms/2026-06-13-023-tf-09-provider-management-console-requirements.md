---
date: 2026-06-13
topic: tf-09-provider-management-console
status: completed
---

# TF-09 Provider Management Console Requirements

## Summary

TF-09 adds a project-scoped provider management console for safe provider enablement, model visibility, default model selection, credential presence, and connectivity tests. The slice should turn the existing static provider catalogs into durable server-owned configuration without introducing arbitrary provider code execution.

---

## Problem Frame

Phase 9 and Phase 10 proved safe image/video provider catalogs, real adapter seams, disabled-provider states, and mock-first generation. Provider selection is still effectively env-backed and scattered across generation panels, so creators cannot enable a provider for a project, inspect its models, choose defaults, or run a test from a settings surface.

The next risk is the settings boundary, not another adapter. guga-flow needs provider administration that keeps credentials and provider execution on trusted backend/worker surfaces, while giving users enough visibility to decide which image or video provider will be used for production work.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the TF-09 row and should be reviewed downstream.*

- TF-09 should manage the existing static image/video providers first: `mock-image`, `image2`, `banana`, `mock-video`, `seedance`, and `happyhorse`.
- A browser settings form may submit a newly typed credential to the backend, but persisted credentials must never be returned to the browser, stored in frontend state beyond the form submit, or embedded in generation jobs.
- Provider configuration should be project-scoped because the existing `ProviderConfig` model is project-owned and generation jobs are project-owned.
- Connectivity tests should be lightweight capability checks against the configured adapter/model, not full media production flows that create Assets or CanvasNodes.

---

## Actors

- A1. Creator/Admin: enables or disables providers for a project, enters or rotates credentials, chooses default models, and runs tests.
- A2. Settings console: shows safe provider metadata, model lists, credential presence, defaults, and test results.
- A3. Backend provider service: owns persisted provider configuration, secret handling, safe catalog composition, and connectivity test execution.
- A4. Worker/provider execution: resolves trusted server-side credentials when executing generation jobs without exposing them through browser or job input JSON.

---

## Key Flows

- F1. Configure a provider
  - **Trigger:** A creator wants to use or disable a real provider for a project.
  - **Actors:** A1, A2, A3
  - **Steps:** The creator opens provider settings, reviews image/video provider rows, updates enabled state, optionally submits a credential, and chooses a default model from the safe model list.
  - **Outcome:** The project has durable provider configuration, and the management response shows only safe metadata plus credential presence.
  - **Covered by:** R1, R2, R3, R4, R5, R8

- F2. Test a provider/model
  - **Trigger:** A creator wants to verify that an enabled provider and selected model can be reached.
  - **Actors:** A1, A2, A3
  - **Steps:** The creator runs a connectivity test. The backend validates configuration, calls the provider adapter with a bounded test path or mock test path, records a safe success/failure summary, and returns the result.
  - **Outcome:** The settings console shows whether the provider/model is usable without creating production media or exposing secrets.
  - **Covered by:** R6, R7, R8, R9

- F3. Generate with configured defaults
  - **Trigger:** A creator queues image or video generation without manually selecting every provider/model field.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** Generation UI receives catalog defaults composed from project provider configuration. Job input records provider/model/default parameters but not secrets. The trusted worker resolves runtime credentials server-side.
  - **Outcome:** Provider defaults influence future jobs while provider keys remain outside browser state and job payloads.
  - **Covered by:** R4, R5, R8, R10, R11

---

## Requirements

**Provider configuration**

- R1. The creator can view project-scoped image and video provider configuration from a settings console.
- R2. The console shows safe metadata for each managed provider: provider name, kind, enabled state, disabled reason, model list, selected default model, credential presence, supported modes, and relevant capability limits.
- R3. The creator can enable or disable a provider for the project.
- R4. The creator can choose a default model from the provider's known model list.
- R5. The creator can submit or rotate a provider credential through the backend, and future responses only expose whether a credential is present.

**Testing and execution readiness**

- R6. The creator can run a provider/model connectivity test from settings.
- R7. Connectivity test results include a safe status, timestamp, tested model, and readable non-secret message.
- R8. Disabled providers, unknown providers, missing credentials, unsupported models, and provider test failures produce visible non-secret errors.
- R9. Connectivity tests do not create production Assets, CanvasNodes, CanvasEdges, or GenerationJobs.

**Generation integration and safety**

- R10. Safe image and video catalogs used by generation panels honor project provider enablement and configured default models.
- R11. Generation jobs and worker execution can use server-stored provider credentials without embedding credentials in browser responses or job input/output JSON.
- R12. Mock providers remain enabled and usable without credentials so the no-key local and CI workflow keeps working.
- R13. The management console does not support arbitrary TypeScript/JavaScript provider adapter editing, remote provider code download, or user-supplied executable provider code.
- R14. Existing provider catalog, generation, worker, health, and mock workflow behavior remain backward-compatible when no project provider configuration exists.

---

## Acceptance Examples

- AE1. **Covers R1-R5, R12.** Given a new project with no saved provider settings, when the creator opens provider settings, mock image/video providers are enabled, real providers show safe disabled reasons or credential-missing state, and no secret values appear in the response or UI.
- AE2. **Covers R3-R5, R10.** Given the creator enables `image2`, submits a credential, and selects `gpt-image-2` as the default, when the Shot generation panel loads its provider catalog, `image2` appears enabled with `gpt-image-2` as the default and no credential value is present.
- AE3. **Covers R6-R9.** Given a provider has missing or invalid credentials, when the creator runs a test, the console displays a failed non-secret result and no Asset, CanvasNode, CanvasEdge, or GenerationJob is created.
- AE4. **Covers R10-R14.** Given no provider config exists, when existing mock generation and mock workflow tests run, they keep using mock providers and complete without real keys or settings console state.

---

## Success Criteria

- A creator can manage provider enablement, credential presence, default model, and test status from a settings surface.
- Backend and worker paths can use project provider configuration without leaking credentials into browser-safe DTOs or job traces.
- Existing mock-first development and generation workflows remain fully usable with no real keys.
- Downstream planning does not need to invent the provider management scope, safety boundary, test semantics, or non-goals for TF-09.

---

## Scope Boundaries

- Do not implement arbitrary provider code editing, user-supplied TypeScript/JavaScript execution, dynamic vendor code download, or sandboxed adapter authoring; TF-10 owns that after a dedicated security design.
- Do not add a full settings center information architecture beyond the provider management surface needed for this module; UI-TF-09/TF-17 can reorganize broader settings later.
- Do not create production media, Assets, CanvasNodes, CanvasEdges, or GenerationJobs as part of provider connectivity tests.
- Do not return stored credential values, credential field names with values, headers, or raw secret-bearing provider traces to the browser.
- Do not make real provider credentials required for CI, local mock workflow, or mock provider generation.
- Do not add billing, quota tracking, usage analytics, team permissions, or provider marketplace behavior in this module.

---

## Key Decisions

- Manage static adapters first: guga-flow already has typed image/video provider adapters and catalogs, so TF-09 should configure those safely before allowing programmable providers.
- Use project-scoped configuration: generation jobs, assets, and existing `ProviderConfig` persistence are project-owned, making project settings the least surprising first boundary.
- Treat credentials as write-only from the browser perspective: a user can submit or clear credentials, but the browser only sees credential presence and test status after save.
- Keep tests side-effect-light: connectivity checks prove readiness without polluting the production canvas graph or asset library.

---

## Dependencies / Assumptions

- Phase 9 and Phase 10 provider catalogs and adapters exist.
- The foundation `ProviderConfig` persistence model exists but may need safe secret/test metadata extensions.
- Worker execution already communicates with backend worker endpoints and can be extended to resolve trusted runtime provider configuration server-side.
- Existing settings navigation is minimal; TF-09 may add a project settings route or compact settings panel as long as it does not attempt the full UI-TF-09 scope.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5, R11][Technical] Decide whether provider credentials are stored as a dedicated encrypted blob field or folded into existing provider config JSON with server-only filtering.
- [Affects R6-R9][Technical] Decide the exact connectivity test behavior per provider kind so tests are useful but bounded and non-production.
- [Affects R10-R11][Technical] Decide how the trusted worker receives runtime provider configuration without adding secrets to `GenerationJob.inputJson`.

## Implementation Outcome

- Provider config is project-scoped through `ProviderConfig` with encrypted `secretJson` and safe last-test metadata.
- Browser APIs expose safe management DTOs only; credentials are write-only on update and never returned through management/catalog responses.
- Connectivity tests are side-effect-light readiness checks in the backend provider service. They validate project/provider/model/credential state, persist safe status, and do not create `GenerationJob`, `Asset`, `CanvasNode`, or `CanvasEdge` records.
- Generation panels now fetch project-scoped provider catalogs, and job creation validates against project enablement/defaults.
- Workers resolve stored runtime credentials through `POST /api/v1/worker/generation/providers/runtime` after claim-time context, keeping job input/output JSON secret-free.
- `/projects/:projectId/settings` provides the provider console for enablement, default model, credential rotation/clear, and readiness testing.

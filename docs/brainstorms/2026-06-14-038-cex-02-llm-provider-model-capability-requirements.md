---
date: 2026-06-14
topic: cex-02-llm-provider-model-capability
---

# CEX-02 LLM Provider, Model Capability, And Error Taxonomy

## Summary

Extend the existing provider management foundation from image/video providers to LLM/text providers, add safe manual model management and capability metadata, and normalize provider failures into a shared error taxonomy that future Agent, text, audio, and video workflows can reuse.

---

## Problem Frame

guga-flow already has project-scoped provider settings, encrypted provider secrets, model discovery, programmable image/video providers, and worker-only runtime credentials. The CEX backlog now needs the same safe boundary for LLM/text providers before Agent deploy, ScriptAgent, AI text nodes, and provider-specific model input policies can rely on real models. Without a shared model metadata and error taxonomy, each downstream module would invent its own provider model list, unsupported-mode handling, and user-facing failure language.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- The first CEX-02 implementation should extend the current `ProviderConfig`/settings panel rather than adding a new provider model table.
- Manual model CRUD can be represented as safe provider metadata in project-scoped provider params for the first slice.
- Real LLM text generation is not required in this card; connection testing and model resolution are enough for Agent deploy to consume later.
- Official provider docs are used only for model discovery endpoints and headers, not for adding broad provider SDK dependencies.

---

## Actors

- A1. Creator/admin: configures project providers and models from settings.
- A2. Backend provider manager: stores safe configuration, encrypted credentials, last test summaries, and runtime config.
- A3. Future Agent runtime: asks for an LLM role/model and needs readable errors when configuration is missing.
- A4. Future generation UI: needs model capability metadata to disable unsupported input combinations before task creation.

---

## Key Flows

- F1. Configure and test an LLM provider
  - **Trigger:** A creator opens project provider settings and enables an LLM provider.
  - **Actors:** A1, A2
  - **Steps:** Select provider, set protocol/base URL as needed, set or clear a credential, choose a default model, save, and run a safe connection test.
  - **Outcome:** The provider stores no browser-readable secret, records a safe test summary, and exposes the selected model to future Agent configuration.
  - **Covered by:** R1, R2, R3, R7

- F2. Manage provider model metadata
  - **Trigger:** A creator needs a model not returned by discovery, wants to rename a display label, or wants to disable a model.
  - **Actors:** A1, A2
  - **Steps:** Add or edit model id/display name/kind/capabilities, disable or remove unwanted entries, and save the provider config.
  - **Outcome:** Settings and backend validation use the updated model list without storing secrets or raw upstream discovery responses.
  - **Covered by:** R4, R5, R6

- F3. Surface normalized provider failures
  - **Trigger:** Discovery, provider testing, worker execution, or future generation encounters an upstream/provider error.
  - **Actors:** A2, A3, A4
  - **Steps:** Map the failure to a normalized category, keep the safe message, omit raw secret/upstream payloads, and expose retryability.
  - **Outcome:** Users see consistent error categories and future task/diagnostic surfaces can group failures safely.
  - **Covered by:** R8, R9, R10

---

## Requirements

**LLM Provider Management**
- R1. Provider management must include an `llm` managed provider kind alongside image and video.
- R2. The built-in LLM catalog must include mock/no-key and configurable real-provider entries suitable for OpenAI-compatible, Gemini, Anthropic/Claude-like, and Ark-compatible protocols.
- R3. Users must be able to save, enable/disable, test, and discover models for LLM providers without provider keys entering browser DTOs, job JSON, logs, or test snapshots.

**Model Metadata and CRUD**
- R4. Provider model metadata must express model id, display name, enabled/disabled state, model kind, modes, duration/ratio/reference support when applicable, and prompt template binding.
- R5. Users must be able to manually add, remove, disable, and rename provider models from settings.
- R6. Backend validation must allow configured manual models while rejecting disabled or unknown default models.
- R7. Project-scoped provider catalog endpoints must return safe model metadata and default model resolution for LLM, image, and video providers.

**Error Taxonomy**
- R8. Provider failures must normalize to one of: auth, quota, rate limit, bad input, unsupported model, timeout, safety block, or unknown.
- R9. Normalized errors must include a safe message and retryability signal without raw upstream response bodies, credentials, secret headers, or local paths.
- R10. Existing provider errors and worker failure JSON must remain backward-compatible while adding the normalized category.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given no real LLM keys are configured, when provider management loads, mock LLM is enabled, real LLM providers are disabled with readable reasons, and no response contains a key-like value.
- AE2. **Covers R3, R5, R6.** Given a creator adds `claude-sonnet-custom` as a manual model and makes it the default, when they save the provider, the backend accepts the default and returns it in the safe model list.
- AE3. **Covers R5, R6.** Given a creator disables a model and tries to make it the default, when the config is saved or tested, the backend returns a readable validation error and does not persist the bad default.
- AE4. **Covers R8, R9, R10.** Given a provider request fails with an auth-like, quota-like, rate-limit-like, bad-input-like, unsupported-model-like, timeout-like, or safety-like message, when the error is serialized, it has the expected normalized category and omits raw secret material.

---

## Success Criteria

- Project settings shows LLM, image, and video provider groups with safe save/test/discover flows.
- Model CRUD works for provider defaults without adding a schema migration.
- Shared/provider/backend/frontend tests cover LLM provider management, manual model metadata, and normalized error taxonomy.
- CEX-03 Agent deploy can consume this provider/model foundation without inventing a separate model registry.

---

## Scope Boundaries

- Do not implement Agent role configuration; CEX-03 owns role-to-model assignment.
- Do not implement AI text canvas nodes or real text generation; CEX-08 owns AI text node behavior.
- Do not add programmable LLM providers in this slice.
- Do not store raw upstream model discovery responses or provider error bodies.
- Do not copy Toonflow vendor code, AI-CanvasPro error parser source, provider manifests, prompts, or model catalogs.

---

## Key Decisions

- Extend the existing provider settings architecture: it already handles browser-safe DTOs, encrypted `ProviderConfig.secretJson`, runtime worker config, and safe test summaries.
- Store first-slice manual models in provider params: this avoids a migration before model ownership/versioning requirements are proven by later Agent/video/audio cards.
- Add a normalized provider error category to the shared provider error shape: this preserves existing `code/message/retryable` behavior while enabling task center and diagnostics grouping.

---

## Dependencies / Assumptions

- CEX-00 provides the Toonflow and AI-CanvasPro coverage ledgers for provider/model/error references.
- Existing provider settings and runtime-config patterns remain the safety baseline.
- External provider docs may change; the implementation should keep protocol-specific discovery narrow and safe.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R2, R3][Needs research] Which exact model discovery URL/header details should be supported for Anthropic and Gemini in the first slice?
- [Affects R4, R5][Technical] How much of video/audio capability metadata should the shared model option carry before CEX-10 and CEX-09 specialize it further?

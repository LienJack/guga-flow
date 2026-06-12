---
date: 2026-06-12
topic: phase-9-real-image-provider
---

# Phase 9 Real Image Provider Requirements

## Summary

Phase 9 will extend the mock image generation path into a real-provider image generation slice while preserving the existing canvas-first, worker-owned, backend-secret boundary. It must expose provider availability and parameters to creators, disable real providers when server-side keys are absent, and persist every real image result as local project Assets plus generated ImageNodes.

---

## Problem Frame

Phase 8 proved the durable job lifecycle with mock image and video providers, but image generation still does not exercise real provider configuration, real provider failures, remote media persistence, or multi-output image results. The next product risk is not another canvas primitive; it is whether a Shot can use a server-side image provider without leaking keys, breaking the mock path, or leaving generated media as temporary remote URLs.

The PRD names `image2` and `banana` as the first real-image adapter targets. Current public docs indicate `gpt-image-2` is exposed through OpenAI image generation APIs and Nano Banana image generation is exposed through the Gemini API, but the exact request and response shapes should be verified during planning before implementation.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input - un-validated bets that should be reviewed before planning proceeds.*

- `image2` can be treated as the product-facing adapter id for an OpenAI GPT Image 2 compatible provider unless planning finds a stronger repo-specific meaning.
- `banana` can be treated as the product-facing adapter id for a Google Gemini / Nano Banana image provider unless planning finds a stronger repo-specific meaning.
- Local development may not have real provider keys, so no-key disabled behavior and mocked adapter tests are mandatory; live provider smoke is conditional on keys being configured.
- Phase 9 should keep `shot_to_image` as the main user-facing path and should not expand into character/location/style asset generation beyond passing their existing reference images into image generation input.

---

## Actors

- A1. Creator: selects Shots, chooses image provider settings, starts image generation, and inspects generated assets on the canvas.
- A2. Backend: owns provider configuration visibility, project validation, remote media persistence, generated Asset records, and ImageNode side effects.
- A3. Worker: claims image generation jobs, calls the selected provider adapter, normalizes provider success/failure, and reports completion to the backend.
- A4. Provider adapter: converts canonical job input into one provider request and returns typed local-ready or remote image outputs.

---

## Key Flows

- F1. Real provider availability and selection
  - **Trigger:** A creator opens the workbench generation UI.
  - **Actors:** A1, A2
  - **Steps:** The UI shows mock and real image provider options, marks real providers disabled when required server-side keys are absent, and allows provider/model/parameter selection only for available providers.
  - **Outcome:** Creators can see why a provider cannot run before they create a job, and browser state never contains provider secrets.
  - **Covered by:** R1, R2, R3, R4

- F2. Shot to real image generation
  - **Trigger:** A creator starts image generation from a Shot with an available real provider selected.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** The existing prompt composer provides canonical image input, the backend stores the selected provider/model/parameters in the job, the worker calls the adapter, and successful outputs are persisted as Assets and ImageNodes connected to the source Shot.
  - **Outcome:** The canvas contains durable generated image results that survive refresh and can be used by later video generation.
  - **Covered by:** R5, R6, R7, R8, R9

- F3. Provider failure and no-key handling
  - **Trigger:** A creator attempts to use a disabled provider or a provider call fails.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** Disabled providers cannot create real-provider jobs; active provider failures are normalized into readable failed jobs; retry remains append-only and does not erase the failed attempt.
  - **Outcome:** Failure is visible, auditable, and recoverable without corrupting canvas graph state.
  - **Covered by:** R2, R11, R12, R13

---

## Requirements

**Provider catalog and availability**

- R1. The system must expose a project-safe image provider catalog that includes the existing `mock-image` provider plus `image2` and `banana` real-provider entries.
- R2. Real image providers must report disabled when their required server-side API key or configuration is absent; disabled providers must not be callable from the frontend.
- R3. Provider catalog data shown in the browser must include safe metadata only, such as id, display name, enabled/disabled state, default model, supported modes, and configurable parameters; it must not expose API keys, raw secret names, or secret values.
- R4. The health/config surfaces must continue to make provider mode inspectable without exposing secrets.

**Generation input and provider parameters**

- R5. Creating a `shot_to_image` job must preserve the backend-composed prompt, negative prompt, debug parts, reference asset ids, selected provider, selected model, requested output count, aspect ratio, and provider parameters.
- R6. Existing Character and Location reference image bindings should be passed into image generation input when the chosen provider supports references, and should be ignored with a visible unsupported/omitted signal when the provider does not support them.
- R7. Mock image generation must remain the default no-key path and must continue to pass the existing Phase 8 acceptance flow.

**Provider execution and output persistence**

- R8. `image2` and `banana` adapters must normalize provider success into one or more generated image outputs with provider id, model, prompt, MIME type, provider asset/task identifiers when available, and either local bytes/base64 or remote URLs for backend persistence.
- R9. Real provider outputs that are remote URLs must be downloaded server-side and saved into project storage before any Asset record is created; generated Asset records must never point only at temporary provider URLs.
- R10. Multi-output image generation must create one ImageNode and one `generated_image` edge per output while keeping the source job traceable to every generated node and Asset.

**Failure, retry, and observability**

- R11. Provider errors must be normalized into readable failed job errors that include provider id, stable error code, retryability, and enough context for the creator to decide whether to retry or change settings.
- R12. Retrying a failed image provider job must create a new queued job and leave the original failed job intact.
- R13. Queue counts, node statuses, Asset Library updates, prompt preview, and existing mock video generation must keep working after real image provider jobs complete or fail.

**Settings UI**

- R14. The workbench must give creators a compact image generation settings surface for provider, model, aspect ratio, output count, and provider-specific parameters without turning the app into a provider-admin console.
- R15. Provider settings must be scoped to generation requests and safe defaults; secret entry or secret persistence in the browser is out of scope.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R14.** Given no real image provider keys are configured, when a creator selects a Shot and opens generation settings, `mock-image` is available while `image2` and `banana` are visible as disabled, with no secret values exposed.
- AE2. **Covers R5, R7, R13.** Given no real provider keys are configured, when the creator generates an image with the default mock provider, the existing Phase 8 Shot -> ImageNode flow still succeeds.
- AE3. **Covers R5, R8, R9.** Given a real image provider is configured and returns a remote image URL, when the worker completes the job, the backend downloads the image into local storage, creates an Asset, creates an ImageNode, and the Asset preview works after refresh.
- AE4. **Covers R5, R8, R10.** Given a provider request asks for multiple outputs and the adapter returns three images, when the job succeeds, the canvas gains three generated ImageNodes, three generated-image edges, and a single job trace that references all outputs.
- AE5. **Covers R6, R11, R12.** Given a provider fails because references are unsupported or invalid, when the worker reports failure, the job shows a readable provider error and retry creates a separate queued job without deleting the failed attempt.
- AE6. **Covers R3, R15.** Given a browser session inspects network responses for provider catalog and generation requests, no provider API key or secret env value appears in payloads.

---

## Success Criteria

- Creators can tell which image providers are usable before starting a job and can generate images with mock providers without any paid key.
- With real keys configured, Shot image generation uses the same durable GenerationJob, worker, Asset, ImageNode, and edge lifecycle as mock generation.
- Remote provider images are persisted locally, previewable, and available to later Image -> Video generation.
- Downstream planning has clear product behavior for disabled providers, multi-output images, provider parameters, failures, and mock-path compatibility.

---

## Scope Boundaries

- Phase 9 includes real image provider registry/configuration, `image2` and `banana` adapter paths, disabled-provider UI, remote image persistence, provider parameter selection, and multi-output ImageNode creation.
- Phase 9 does not include real video providers, provider polling/cancel behavior, batch Image -> Video generation, editor export, or selected VideoNode export.
- Phase 9 does not introduce browser-side secret entry or browser-side third-party provider calls.
- Phase 9 does not replace the existing GenerationJob/worker/Asset/canvas graph architecture.
- Phase 9 does not require live provider smoke to pass in environments without keys, but must make live smoke possible and documented when keys are present.

---

## Key Decisions

- Keep mock-first as the default: this preserves the full local workflow for development, review, and CI when no paid provider keys are available.
- Treat provider availability as product-visible state: creators should see disabled providers and reason text before they start a job, not after a failed request.
- Persist provider media through backend storage: generated images must enter the same Asset lifecycle as uploads and mock outputs so later video generation and export can rely on stable project-owned files.
- Keep provider settings compact: Phase 9 should expose practical generation controls without building a general provider marketplace or admin console.

---

## Dependencies / Assumptions

- Phase 8 GenerationJob, worker claim/succeed/fail, generated ImageNode, generated edge, and queue polling behavior are available.
- Official provider docs must be checked during planning for the exact `image2` and `banana` request and response shapes. Current references: [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation) and [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation).
- Real provider adapter tests can use mocked HTTP/fetch responses; live provider smoke depends on local server-side keys.
- Generated media storage continues to use the backend storage boundary and project-scoped Asset records.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R8][Needs research] Confirm the exact provider API calls, model names, response formats, and key env var names for `image2` and `banana`.
- [Affects R10][Technical] Decide whether multi-output completion is represented as one job with multiple output records, multiple child jobs, or one job output containing multiple created targets.
- [Affects R14][Technical] Decide where the compact provider settings surface should live so it complements the existing Inspector generation actions without crowding prompt preview and reference image controls.

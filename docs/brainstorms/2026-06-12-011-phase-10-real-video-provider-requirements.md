---
date: 2026-06-12
topic: phase-10-real-video-provider
---

# Phase 10 Real Video Provider Requirements

## Summary

Phase 10 extends the existing ImageNode -> VideoNode path into a real video provider workflow: creators can keep using `mock-video` without keys, choose configured real video providers, submit async provider tasks once, poll them through `provider_waiting`, cancel when possible, and persist remote video outputs as project Assets.

---

## Problem Frame

Phase 8 proved that video generation can create mock video Assets and VideoNodes through the durable GenerationJob lifecycle. Phase 9 added real image provider selection and backend-owned media persistence, but video generation still behaves like a synchronous mock call. Real video providers usually return a task id before media exists, so guga-flow needs provider polling, cancel routing, concurrency limits, and batch Image -> Video work without moving provider secrets or storage responsibility into the browser.

---

## Key Decisions

- **Keep `GenerationJob` as the durable state authority.** Provider task ids, waiting state, cancellation, failure, and success must be visible through job records rather than a separate transient queue.
- **Use `mock-video` as the default no-key path.** Local development and CI must still prove the full ImageNode -> VideoNode lifecycle without paid credentials.
- **Treat real video providers as async by default.** The worker should submit once, store `providerTaskId`, move to `provider_waiting`, and poll until terminal instead of resubmitting provider work.
- **Persist provider media through the backend Asset boundary.** Remote video URLs become local project Assets before VideoNodes or previews rely on them.
- **Make batch Image -> Video an orchestration feature, not a provider-specific shortcut.** Batch work should create one child GenerationJob per eligible ImageNode so queue status, retry, cancel, and failure remain inspectable per item.

---

## Actors

- A1. Creator: selects ImageNodes, configures video settings, starts generation, watches queue state, retries or cancels work.
- A2. Backend: validates provider availability and settings, owns GenerationJob state transitions, persists remote video bytes, and creates graph side effects.
- A3. Worker: claims queued work, submits provider tasks, polls waiting tasks, enforces concurrency, and reports success or failure.
- A4. Video provider adapter: maps guga-flow input into provider API calls, normalizes task state, cancellation, remote outputs, and provider errors.

---

## Key Flows

- F1. Real provider availability and selection
  - **Trigger:** The creator opens generation controls for an ImageNode or batch selection.
  - **Actors:** A1, A2
  - **Steps:** The frontend loads a safe video provider catalog; `mock-video` is enabled; real providers such as `seedance` and `happyhorse` show enabled only when server-side keys are configured; the browser sees model and parameter metadata but no secrets.
  - **Outcome:** The creator can choose a usable provider or see a non-secret disabled reason.
  - **Covered by:** R1, R2, R3, R4, R15

- F2. Async Image -> Video generation
  - **Trigger:** The creator starts video generation from an ImageNode.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** The backend creates a queued `image_to_video` job with selected provider settings and source image context; the worker claims it, calls `createTask`, stores the provider task id, marks the job `provider_waiting`, polls `getTask`, downloads the final remote video, creates an Asset, creates a VideoNode, creates a `generated_video` edge, and marks the job succeeded.
  - **Outcome:** A real provider video appears as a previewable project Asset and graph node without duplicate provider submissions.
  - **Covered by:** R5, R6, R7, R8, R9, R10, R11, R13

- F3. Cancel and failure handling
  - **Trigger:** The creator cancels an active or waiting video job, or a provider task fails.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** The backend records cancellation intent; the worker calls `cancelTask` when the adapter supports it; unsupported provider cancel still stops local polling and marks the job cancelled; provider failures normalize to readable errors; retry creates a new queued job and keeps the old job.
  - **Outcome:** Cancel and retry do not erase history, recreate provider tasks accidentally, or leave node status misleading.
  - **Covered by:** R10, R12, R13, R14

- F4. Batch Image -> Video
  - **Trigger:** The creator selects multiple ImageNodes and starts batch video generation.
  - **Actors:** A1, A2, A3
  - **Steps:** The frontend presents batch generation controls; the backend validates eligible ImageNodes and creates one queued child job per image; the worker processes child jobs within video concurrency limits; queue UI shows each child status.
  - **Outcome:** Batch generation is resumable and inspectable per ImageNode instead of hiding all failures behind one opaque job.
  - **Covered by:** R5, R11, R13, R16, R17

---

## Requirements

**Provider catalog and secret safety**

- R1. The backend must expose a safe video provider catalog containing `mock-video`, `seedance`, and `happyhorse`.
- R2. Real video providers must be disabled and unusable when required server-side keys are absent.
- R3. Browser-visible provider data must include only safe metadata such as provider id, display name, enabled state, disabled reason, model options, duration, resolution, aspect ratio, and parameter definitions.
- R4. Health/config output must show video provider mode and configured-provider presence without exposing secret values.

**Job creation and provider settings**

- R5. `image_to_video` job creation must preserve source image asset id, prompt, duration, provider, model, resolution, aspect ratio, and provider parameters in `inputJson`.
- R6. The worker must use a unified VideoProvider interface for `mock-video`, `seedance`, and `happyhorse`.
- R7. Real provider submission must call `createTask` once per job and persist `providerTaskId` before the job enters `provider_waiting`.
- R8. `provider_waiting` jobs must be polled by provider task id and must not be claimed again as new queued provider submissions.
- R9. Provider task success must normalize one final video output into the same completion path used by mock video generation.

**Lifecycle, persistence, and cancellation**

- R10. Remote video outputs must be downloaded server-side, validated as video media, written to project storage, and represented as Assets before VideoNode creation.
- R11. Successful completion must create one VideoNode and one `generated_video` edge per video job while preserving existing queue polling and canvas refresh behavior.
- R12. Cancel must transition active or waiting video jobs to `cancelled` and call provider `cancelTask` when supported.
- R13. Provider errors, poll failures, cancellation failures, and unsupported operations must produce readable job errors without leaking provider secrets.
- R14. Retry must remain append-only: a failed job creates a new queued job with the same provider settings, while the failed job remains visible.

**Frontend and batch workflow**

- R15. ImageNode generation controls must expose compact provider, model, duration, resolution, aspect ratio, and provider parameter settings only for video generation.
- R16. Multi-selection batch Image -> Video must create separate child jobs for eligible ImageNodes and report skipped or invalid selections clearly.
- R17. Workbench queue UI must show queued, running, waiting, failed, and cancelled child jobs clearly enough that batch progress is inspectable.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R4.** Given no real video keys are configured, when the creator opens video generation controls, `mock-video` is enabled, `seedance` and `happyhorse` are disabled with non-secret reasons, and API responses contain no secret-like values.
- AE2. **Covers R5, R6, R9, R10, R11.** Given a mock ImageNode with an asset, when the creator generates video with default settings, the existing mock path still creates a video Asset, VideoNode, generated edge, and succeeded job.
- AE3. **Covers R7, R8.** Given a real provider job returns a task id, when the worker loops again before the provider finishes, the system polls the existing task id instead of submitting a second provider task.
- AE4. **Covers R10, R11, R13.** Given a mocked real provider poll returns a remote MP4 URL, when the job completes, the backend stores video bytes locally, creates a previewable Asset, and does not expose the provider URL as the lasting media reference.
- AE5. **Covers R12, R13.** Given a `provider_waiting` video job, when the creator cancels it, the backend records `cancelled`, the worker calls `cancelTask` for adapters that support it, and the UI stops presenting it as running.
- AE6. **Covers R14.** Given a real provider failure, when the creator retries, the original failed job remains in history and a new queued job carries the original provider settings.
- AE7. **Covers R16, R17.** Given three eligible ImageNodes are selected, when the creator starts batch Image -> Video, the backend creates three child jobs and the queue shows independent child states.

---

## Scope Boundaries

- In scope: safe video provider catalog/config, `seedance` and `happyhorse` adapter seams, async provider task submission, provider polling, cancel routing, remote video persistence, compact video generation settings, batch Image -> Video child jobs, concurrency limits, docs, tests, and smoke evidence.
- Out of scope: real editor export, timeline packaging, text-to-video from Shot without an ImageNode, webhook ingestion, provider admin CRUD, user-entered browser secrets, browser-side provider calls, replacing DB-backed polling with BullMQ/PGMQ, and audio-specific editing workflows.

### Deferred for Later

- Webhook-based provider callbacks can replace or supplement polling after the polling state machine is proven.
- Provider cost accounting, rate-limit dashboards, and per-provider spend controls need a separate policy module.
- Text-to-video and reference-to-video modes can build on the VideoProvider interface after Image -> Video is reliable.

---

## Dependencies / Assumptions

- Phase 8 GenerationJob claim/succeed/fail, ImageNode -> VideoNode mock completion, queue polling, and retry behavior are available.
- Phase 9 backend-owned remote media persistence and secret-safe provider catalog patterns are available and should be reused for video.
- Node must be upgraded to the repo-required `>=26.3.0`; Phase 10 should not lower engine requirements to fit the current local Node `v22.22.2`.
- `seedance` should be treated as a BytePlus ModelArk-style task provider unless planning finds a better supported official route.
- `happyhorse` public API access appears to vary by gateway; planning must choose a concrete server-side route and keep the adapter isolated behind guga-flow's provider contract.
- Live provider smoke depends on external paid credentials and should remain optional/manual unless a separate secrets and cost-control policy is added.

---

## Sources / Research

- PRD roadmap Phase 10: `infinite_canvas_video_prd_roadmap_v2_detailed.md`
- Tech stack worker and provider rules: `docs/tech-stack-text2sql-reference.md`
- Phase 8 requirements: `docs/brainstorms/2026-06-12-009-phase-8-generation-worker-mock-media-requirements.md`
- Phase 9 requirements and plan: `docs/brainstorms/2026-06-12-010-phase-9-real-image-provider-requirements.md`, `docs/plans/2026-06-12-010-feat-real-image-provider-plan.md`
- Generation lifecycle learning: `docs/solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md`
- Real image provider learning: `docs/solutions/architecture-patterns/real-image-provider-secret-safe-persistence-2026-06-12.md`
- BytePlus ModelArk Seedance video generation API lists task creation, retrieval, listing, and cancel/delete endpoints: https://docs.byteplus.com/en/docs/ModelArk/1520757
- fal Happy Horse image-to-video docs expose queue/status/result concepts and server-side `FAL_KEY` usage: https://fal.ai/models/alibaba/happy-horse/image-to-video/api
- Runware HappyHorse docs describe text-to-video and image-to-video support, 720p/1080p output, and 3-15 second durations: https://runware.ai/docs/models/alibaba-happyhorse-1-0

---
date: 2026-06-12
topic: phase-8-generation-worker-mock-media
---

# Phase 8 GenerationJob Worker And Mock Media

## Summary

Phase 8 should turn the prepared Shot prompt graph into durable mock media generation: creators can enqueue Shot-to-Image and Image-to-Video jobs, a worker consumes the DB-backed queue, mock providers create placeholder assets, and the canvas gains generated ImageNode/VideoNode records with semantic edges and visible job status.

---

## Problem Frame

Phase 7 makes a Shot's image/video prompt inspectable and reference-aware, but the product still stops before the creator can produce media from the graph. Existing provider contracts and the worker mock workflow prove the mock provider direction, yet they are not project-scoped, persistent, retryable, or connected to canvas nodes.

The next module is the first real asynchronous generation slice. It must establish that GenerationJob is the durable source of truth for queued/running/succeeded/failed work while keeping the provider path mock-first and local. This gives later real provider phases a queue, status, and canvas side-effect contract to plug into rather than re-inventing the lifecycle.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input - un-validated bets that should be reviewed before planning proceeds.*

- Phase 8 should implement `shot_to_image` and `image_to_video` only; batch generation, cancel, real provider adapters, and editor export remain later phases.
- MVP queue execution can use DB polling over `GenerationJob.status = queued` rather than BullMQ, PGMQ, Redis, or an in-memory queue.
- The worker may be manually run during local development with mock providers; the backend owns job creation, retry, listing, and project-scoped validation.
- Generated mock asset records should use local placeholder metadata and storage keys from provider output; real byte generation/download can remain a later provider/storage concern as long as asset records and previews stay valid for the mock path.
- Canvas node creation after successful jobs should reuse normalized CanvasNode/CanvasEdge facts and should not rely on tldraw snapshot-only state.
- Existing prompt compose behavior is canonical for `shot_to_image` job input; `image_to_video` should derive its video prompt and duration from the source ImageNode's parent Shot when available.

---

## Actors

- A1. Creator: starts image/video generation from selected canvas nodes, watches queue state, and retries failed jobs.
- A2. Backend generation API: validates project-scoped sources, creates durable jobs, exposes job lists/details, and creates retry jobs.
- A3. Worker: polls queued jobs, runs the operation executor, updates status, and applies successful canvas/asset side effects.
- A4. Mock providers: return deterministic local image/video outputs without API keys.
- A5. Canvas graph system: persists generated ImageNode/VideoNode records and `generated_image` / `generated_video` edges.

---

## Key Flows

- F1. Generate an image from a Shot
  - **Trigger:** Creator selects a Shot node and starts image generation.
  - **Actors:** A1, A2, A3, A4, A5
  - **Steps:** Backend composes the current Shot image prompt, creates a queued `shot_to_image` GenerationJob, worker marks it running, mock image provider returns an image asset output, worker creates an Asset, ImageNode, and `generated_image` edge, then marks the job succeeded.
  - **Outcome:** The canvas has a generated ImageNode connected to the source Shot, and the job records the prompt/debug input and provider output.
  - **Covered by:** R1, R2, R3, R4, R5, R6, R9, R10

- F2. Generate a video from an ImageNode
  - **Trigger:** Creator selects a generated ImageNode and starts video generation.
  - **Actors:** A1, A2, A3, A4, A5
  - **Steps:** Backend finds the source ImageNode and parent Shot context when available, creates a queued `image_to_video` GenerationJob, worker runs the mock video provider with source image asset id, prompt, duration, and references, then creates an Asset, VideoNode, and `generated_video` edge.
  - **Outcome:** The canvas has a generated VideoNode connected to the source ImageNode, with video status and input trace preserved.
  - **Covered by:** R1, R2, R3, R4, R7, R8, R9, R10

- F3. Retry failed generation
  - **Trigger:** Creator retries a failed image or video job.
  - **Actors:** A1, A2, A3
  - **Steps:** Backend validates the failed job belongs to the project, creates a new queued job with the same operation/source/target/input, and leaves the original failed job unchanged.
  - **Outcome:** Retry history is preserved while the worker can process the new job independently.
  - **Covered by:** R11, R12, R13

- F4. Watch queue state in the workbench
  - **Trigger:** Creator opens the project canvas while jobs exist or after starting a job.
  - **Actors:** A1, A2
  - **Steps:** Frontend polls job list/status, displays queued/running/failed counts in the existing queue area, and updates selected node status when backend/worker state changes.
  - **Outcome:** The creator can see that generation is queued/running/failed/succeeded without refreshing manually.
  - **Covered by:** R14, R15, R16

---

## Requirements

**Generation job lifecycle**

- R1. The backend must expose a project-scoped way to create `shot_to_image` and `image_to_video` GenerationJob records from valid source canvas nodes.
- R2. Created jobs must persist operation, status, provider, model, source node id, optional target node id, input JSON, output JSON, error message, and timestamps.
- R3. Job status must transition through durable states at minimum `queued -> running -> succeeded` for successful mock jobs and `queued -> running -> failed` for provider or executor failures.
- R4. The worker must poll queued jobs from the database and must not require an in-memory queue to survive process restarts.
- R5. `shot_to_image` job input must reuse the Phase 7 composed prompt output, including final image prompt, negative prompt, reference asset ids, source node ids, and debug parts.
- R6. Successful `shot_to_image` execution must create an image Asset, an ImageNode, and a `generated_image` CanvasEdge from the Shot to the ImageNode.
- R7. `image_to_video` job input must include source image asset id, video prompt, duration, parent Shot context when available, and reference asset ids.
- R8. Successful `image_to_video` execution must create a video Asset, a VideoNode, and a `generated_video` CanvasEdge from the ImageNode to the VideoNode.
- R9. Generated ImageNode and VideoNode data must preserve provider, model, prompt, input/output trace, source node ids, and asset id enough for Inspector/debug and later export phases.
- R10. Node statuses must stay synchronized with their active or completed job: queued/running/provider_waiting/failed/succeeded/cancelled must not be represented only in the job list.

**Failure and retry**

- R11. Failed mock provider execution must mark the job failed with a readable provider error and must not create a succeeded media node by accident.
- R12. Retry must create a new GenerationJob rather than mutating the original failed job back to queued.
- R13. Retried jobs must preserve enough original input to reproduce the failed attempt while allowing the new job to produce independent output.

**Workbench visibility**

- R14. The frontend must expose generation actions in the selected Shot and ImageNode Inspector contexts without hiding existing forms, prompt preview, reference binding, edge Inspector, or Asset Library.
- R15. The workbench queue area must show current queued/running/failed job counts and must refresh through polling for the MVP.
- R16. After job completion and page refresh, generated Asset, ImageNode, VideoNode, semantic edges, job records, and node statuses must still be visible from persisted backend state.
- R17. Existing project, asset library, canvas autosave, storyboard import, prompt preview, and semantic edge behavior must continue to work.

---

## Acceptance Examples

- AE1. **Covers R1, R3, R5, R6, R9, R16.** Given an imported Shot with linked Character and Location context, when the creator starts image generation and the worker runs, the job succeeds, an image Asset is created, an ImageNode appears after refresh, and a `generated_image` edge links the Shot to the ImageNode.
- AE2. **Covers R1, R3, R7, R8, R9, R16.** Given a generated ImageNode linked to a Shot, when the creator starts video generation and the worker runs, the job succeeds, a video Asset is created, a VideoNode appears after refresh, and a `generated_video` edge links the ImageNode to the VideoNode.
- AE3. **Covers R11, R12, R13.** Given a mock image job configured to fail, when the worker processes it, the original job remains failed with a readable error; when the creator retries, a new queued job is created with the same source and input.
- AE4. **Covers R10, R14, R15.** Given jobs in queued, running, and failed states, when the creator opens the canvas, the queue UI shows matching counts and selected source/target nodes show synchronized statuses.
- AE5. **Covers R17.** Given a project that has imported storyboard nodes, prompt preview, reference images, and generated media, after refresh all prior Phase 1-7 behaviors remain usable.

---

## Success Criteria

- Creators can generate a mock image from a Shot and a mock video from that ImageNode without real provider keys.
- Generation work is durable, inspectable, retryable, and recoverable across page reloads and worker restarts.
- Canvas business facts reflect generated media through normalized nodes and edges rather than tldraw-only artifacts.
- Phase 9 and Phase 10 can replace mock executors with real providers without changing the core job, status, and canvas side-effect model.

---

## Scope Boundaries

- Do not implement real image or video provider adapters, provider API keys, remote URL download, provider polling, or provider cancel behavior in this module.
- Do not implement batch generation, multi-output image generation, concurrent batch controls, or progress percentages beyond durable status.
- Do not implement editor export, EditorPackageNode creation, local editor POST, timeline manifest, zip packaging, or selected VideoNode export.
- Do not implement `novel_to_storyboard` GenerationJob migration; Phase 5's direct mock storyboard path can remain in place.
- Do not introduce BullMQ, PGMQ, Redis queue semantics, or a new queue service unless DB polling cannot satisfy the MVP.
- Do not delete source Shots/ImageNodes when generated media nodes or jobs fail.
- Do not downgrade Node, Next, React, Prisma, tldraw, or workspace architecture to avoid local Node runtime warnings.

---

## Key Decisions

- Use DB-backed polling for Phase 8: this satisfies the roadmap queue requirement while keeping GenerationJob as the durable fact source and deferring queue infrastructure.
- Keep mock providers first-class: mock image/video outputs must create real Asset and CanvasNode records so downstream UI and export phases exercise the same business model as real providers.
- Treat retry as append-only: new retry jobs preserve failure history and avoid hiding provider or executor failures.
- Keep worker side effects backend/data-layer owned: successful execution must write Asset, CanvasNode, CanvasEdge, and job output records rather than asking the browser to materialize generated nodes.

---

## Dependencies / Assumptions

- Phase 7 prompt compose API and shared composer provide the canonical `shot_to_image` prompt/debug input.
- Phase 4 semantic edge contracts already include `generated_image` and `generated_video`.
- Phase 3 business node support already includes ImageNode and VideoNode types, but their data may need enrichment for provider/job trace.
- Phase 0 provider contracts already include mock image and mock video providers.
- Local development can run backend and worker processes separately against the same database.

---

## Research Notes

- Fact: `infinite_canvas_video_prd_roadmap_v2_detailed.md` Phase 8 lists GenerationJob API, DB-backed queue, worker bootstrap, executor registry, mock image executor, mock video executor, queue UI, node status sync, and retry action.
- Fact: `docs/tech-stack-text2sql-reference.md` requires worker-owned async tasks, DB polling for MVP, and `GenerationJob.inputJson` to persist final prompt, negative prompt, reference asset ids, provider params, debug parts, and source/target node ids.
- Fact: `packages/provider-contracts` already has mock image/video providers returning provider, model, prompt, reference asset ids, storage key, and MIME type.
- Fact: `apps/backend/prisma/schema.prisma` already defines `GenerationJob`, statuses, operations, project relations, and source/target node relations.
- Fact: Toonflow reference assets research shows task records and generated asset flows, but Phase 8 should adapt the durable job/asset idea rather than copying its route structure.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R4][Technical] Decide whether job execution is triggered by a long-running worker poll loop, a one-shot worker command useful for tests, or both.
- [Affects R6, R8, R16][Technical] Decide how generated node geometry should be placed relative to the source node without requiring tldraw snapshot mutation from the worker.
- [Affects R14, R15][Technical] Decide whether job polling belongs in the Canvas workspace, a dedicated generation API hook, or the existing workbench queue footer.

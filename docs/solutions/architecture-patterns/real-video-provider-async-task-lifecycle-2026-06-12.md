---
title: "Model Real Video Providers as Resumable Async Tasks"
date: 2026-06-12
category: architecture-patterns
module: phase-10-real-video-provider-generation
problem_type: architecture_pattern
component: background_job
severity: medium
applies_when:
  - "Adding long-running video provider adapters"
  - "Persisting provider task ids through worker restarts or polling loops"
  - "Cancelling provider-backed generation jobs from the UI"
  - "Batching ImageNode to VideoNode generation"
related_components:
  - generation_jobs
  - worker_polling
  - video_provider_registry
  - asset_lifecycle
  - frontend_generation_panel
tags:
  - video-generation
  - provider-waiting
  - async-tasks
  - provider-cancel
  - batch-generation
---

# Model Real Video Providers as Resumable Async Tasks

## Context

Real image-to-video providers usually do not return video bytes in the initial request. They return a provider task id, expose a status or result endpoint, and may support cancellation. That lifecycle must survive worker restarts, repeated polling, UI refreshes, and job cancellation without leaking provider credentials or temporary media URLs to the browser.

The durable app state is still the project graph: a successful video job should create a project Asset, a VideoNode, and a `generated_video` edge. Provider task ids are an execution detail, not a frontend persistence model.

## Guidance

Use a task-oriented video provider contract:

```text
createTask(input) -> provider_waiting | succeeded | failed
getTask(providerTaskId) -> provider_waiting | succeeded | failed | cancelled
cancelTask(providerTaskId) -> cancelled | failed
```

Keep the older `generateVideo` shape only as compatibility sugar for mock or already-synchronous providers. Real adapters should implement task creation and polling directly.

The backend should persist a provider task id exactly once:

1. A browser creates an `image_to_video` job with safe provider settings from the catalog.
2. The worker claims the queued job and calls `createTask`.
3. If the provider is still processing, the worker reports `provider_waiting` to the backend worker wait endpoint.
4. The backend stores `providerTaskId`, marks the job and source node `provider_waiting`, and keeps the canonical input.
5. A later worker claim of the waiting job calls `getTask(providerTaskId)` instead of submitting another provider request.
6. On success, backend completion downloads the remote video server-side, creates the video Asset, creates the VideoNode, and links it with `generated_video`.

This makes duplicate provider submissions the bug to avoid. Treat `providerTaskId` as the idempotency anchor for all future polls and cancellation.

Cancellation should be backend-owned and best effort. The UI asks the project-scoped job API to cancel an active job; the backend records `cancelled` even if the remote provider cancel endpoint fails, then stores a sanitized cancel warning in job output. The browser should only see job status and readable non-secret errors.

Batch Image -> Video should create child jobs, not a new provider execution mode in the browser. The backend validates each selected ImageNode, creates one `image_to_video` job per eligible node, and returns skipped nodes with reasons. This keeps batch progress inspectable through normal queue counts and normal retry/cancel behavior.

## Why This Matters

Long-running providers are where local queue semantics and vendor semantics can drift. Persisting the provider task id before polling prevents accidental duplicate paid generations, while backend-owned completion keeps provider URLs from becoming durable canvas data.

The same boundary also makes failure and cancellation easier to reason about. A cancelled local job can stop the product workflow immediately, while a provider cancel failure remains an auditable implementation detail rather than a blocked UI state.

## When to Apply

- Adding another video provider with queue, task, or polling APIs.
- Introducing worker restart or one-shot worker execution for async providers.
- Adding cancellation for any provider-backed job.
- Creating batch generation from selected canvas nodes.
- Reviewing changes where remote provider media becomes a project Asset.

## Related

- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
- [Keep Real Image Provider Selection Secret-Safe and Backend-Persistent](./real-image-provider-secret-safe-persistence-2026-06-12.md)
- [Project-scoped asset lifecycle boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)

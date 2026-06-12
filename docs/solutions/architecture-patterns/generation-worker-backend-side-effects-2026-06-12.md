---
title: "Keep Generation Worker Side Effects Behind the Backend Boundary"
date: 2026-06-12
category: architecture-patterns
module: phase-8-generation-worker-mock-media
problem_type: architecture_pattern
component: generation_worker
severity: medium
applies_when:
  - "Creating durable image or video generation jobs from canvas nodes"
  - "Completing provider work into project assets and generated canvas graph records"
  - "Adding retry or failure handling for async provider execution"
  - "Moving from mock providers to real image or video provider adapters"
related_components:
  - backend_generation_api
  - worker_queue_runner
  - asset_lifecycle
  - normalized_canvas_graph
tags:
  - generation-job
  - worker
  - backend-boundary
  - generated-media
  - retry
---

# Keep Generation Worker Side Effects Behind the Backend Boundary

## Context

Phase 8 adds the first durable async media path. A creator starts generation from a Shot or generated ImageNode, a worker calls mock providers, and successful output must become project assets plus normalized canvas graph facts.

The risky part is ownership. Provider execution belongs outside the browser, but generated assets, node creation, semantic edges, and job status transitions must stay inside the backend because they depend on project scoping, storage paths, Prisma writes, and canvas graph validation.

## Guidance

Let the worker execute providers and report results, but keep job lifecycle and side effects in backend services.

The browser should call only project-scoped job APIs:

```text
POST /api/v1/projects/:projectId/generation/jobs
GET /api/v1/projects/:projectId/generation/jobs
POST /api/v1/projects/:projectId/generation/jobs/:jobId/retry
```

The worker should use a narrow internal protocol:

```text
POST /api/v1/worker/generation/jobs/claim
POST /api/v1/worker/generation/jobs/:jobId/succeed
POST /api/v1/worker/generation/jobs/:jobId/fail
```

Backend job creation should persist canonical input:

- final prompt and negative prompt;
- reference asset ids;
- source Shot/ImageNode ids;
- prompt debug parts;
- provider params and operation type.

Backend success handling should apply the full generated media mutation:

- write previewable placeholder bytes or downloaded provider bytes through the storage service;
- create an `Asset` with generated metadata;
- create an `ImageNode` or `VideoNode` near the source node;
- create a `generated_image` or `generated_video` semantic edge;
- write typed output JSON and target node id to `GenerationJob`;
- mark source, target, and job statuses as succeeded.

Backend failure should store a readable error, mark the job failed, and leave retry append-only. Retry should create a new queued job so the failed attempt remains auditable.

Keep provider storage keys bounded. Prompt-derived filenames can exceed filesystem limits once real composed prompts include scene, character, location, and reference context. Derive a short stable id from a prefix, a truncated normalized body, and a deterministic digest.

## Why This Matters

This split avoids duplicating Prisma and canvas graph rules inside the worker. It also keeps generated media indistinguishable from other project assets for preview, later editor export, and cleanup.

The append-only retry model makes failure analysis possible: a failed job keeps its original input and error, while a retry can move independently through queued, running, failed, or succeeded states.

The bounded storage key detail is small but important. Mock providers are often treated as harmless, but they exercise real local filesystem paths. Letting long prompts become filenames can break the smoke path that proves generation side effects end to end.

## When to Apply

- Adding real image or video provider adapters.
- Adding provider polling or remote result download.
- Adding cancellation, batch generation, or priority queues.
- Creating editor packages from selected VideoNodes.
- Reviewing any worker change that writes assets or canvas graph rows directly.

## Related

- [Project-scoped asset lifecycle boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)
- [Compose prompts from canvas graph records with debug parts](./prompt-composer-graph-derived-debug-parts-2026-06-12.md)
- [Semantic canvas edge projection lifecycle](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
- [tldraw business shape normalized node sync](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)

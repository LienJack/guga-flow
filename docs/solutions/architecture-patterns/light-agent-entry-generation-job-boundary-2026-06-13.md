---
title: "Model Lightweight Agent Entry as a Backend-Completed Generation Job"
date: 2026-06-13
category: architecture-patterns
module: phase-13-light-agent-entry
problem_type: architecture_pattern
component: assistant
severity: medium
applies_when:
  - "Adding a one-sentence creative brief entry point"
  - "Generating source text and a ready storyboard draft in one backend action"
  - "Recording agent-like work without introducing a full agent runtime"
  - "Projecting generated drafts into tldraw business shapes"
related_components:
  - backend_novels_api
  - generation_jobs
  - storyboard_import
  - frontend_novel_storyboard_panel
  - tldraw_business_shapes
tags:
  - light-agent
  - creative-brief
  - generation-job
  - storyboard-draft
  - tldraw
---

# Model Lightweight Agent Entry as a Backend-Completed Generation Job

## Context

Phase 13 adds a lightweight Agent-style entry: the user writes one sentence, chooses a creative mode, and receives a generated source document plus a ready storyboard draft. The work behaves like generation from the user's perspective, but it is not a long-running worker task and does not need a chat thread, agent memory, or skill orchestration model.

The feature also exposes a common boundary problem: a generated draft can optionally be imported into the canvas, where durable graph facts live in `CanvasNode`/`CanvasEdge` records while tldraw shape props must remain schema-safe projections.

## Guidance

Use the existing `GenerationJob` audit surface as the primitive for lightweight creative entry. Add a dedicated operation such as `novel_to_storyboard`, create the job before writing generated source or draft records, complete it inside the backend service, and store typed input/output JSON on the job.

```text
Browser -> Backend: idea, mode, optional audience/style/duration
Backend -> GenerationJob: operation=novel_to_storyboard, status=running
Backend -> NovelDocument: generated source text
Backend -> StoryboardDraft: validated ready draft
Backend -> GenerationJob: status=succeeded, output={ novelId, draftId, storyboard }
Browser -> Backend: optional storyboard import
Import service -> CanvasNode/CanvasEdge + tldraw projections
```

Treat source creation, storyboard validation, and job completion as one backend-owned action. If source persistence, provider generation, validation, or draft persistence fails, mark the job failed and avoid creating a ready draft. That gives later review and retry tooling one durable audit record for the user action.

Keep this operation out of worker-only type unions. Shared `GenerationJobInput` may include backend-completed operations, but worker services should narrow their accepted input to the operations they can actually claim, such as `shot_to_image`, `image_to_video`, and `editor_export`.

On the frontend, make canvas import explicit. The creative entry can call storyboard import after successful draft creation, but if the project already has an imported storyboard, require confirmation before appending another graph. This prevents a one-sentence action from silently duplicating a large canvas.

Do not persist UI-only view flags in custom tldraw shape props unless the shape schema declares them. For SceneFrame collapse, persist the durable choice on `CanvasNode.dataJson.collapsed`, pass it to React card rendering when needed, and filter it out of `BusinessNodeShapeProps`. tldraw snapshots should contain only schema-declared visual projection fields.

## Why This Matters

A lightweight Agent entry can easily grow into a second workflow system with its own audit records, draft state, and canvas side effects. Reusing `GenerationJob` keeps the MVP explainable: every creative generation still has a project-scoped job with typed input, status, error text, and output.

Separating draft generation from canvas import keeps each boundary testable. The brief endpoint proves source and storyboard creation. The import endpoint proves graph layout, provenance, and duplicate policy. tldraw remains a projection layer rather than the place where business-only state is smuggled.

Filtering shape props also avoids validation failures during snapshot load. UI components can accept richer props than persisted tldraw shapes, but the adapter between normalized nodes and tldraw must strip anything outside the shape schema.

## When to Apply

- Adding new prompt-first creation flows such as script-to-shots, ad idea-to-storyboard, or product brief-to-asset plan.
- Adding backend-completed generation operations that should be visible in job history without worker claiming.
- Adding optional canvas import after an upstream planning or drafting step.
- Reviewing custom tldraw shape changes that mix durable domain state with visual projection props.

## Examples

The Phase 13 service-level contract is:

```ts
const job = await prisma.generationJob.create({
  data: {
    projectId,
    operation: "novel_to_storyboard",
    status: "running",
    inputJson,
  },
});

try {
  const novel = await prisma.novelDocument.create({ data: sourceData });
  const draft = await prisma.storyboardDraft.create({ data: readyDraftData });
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { status: "succeeded", outputJson },
  });
} catch (error) {
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { status: "failed", errorMessage: message },
  });
  throw error;
}
```

The tldraw projection boundary is:

```ts
const { collapsed: _collapsed, ...shapeProps } = buildBusinessNodeCardModel(node);
```

The card may still render collapsed state from `CanvasNode.dataJson` or compact SceneFrame height, but the persisted shape props stay inside the declared schema.

## Related

- [Validate Storyboard Drafts Before Canvas Import](./storyboard-draft-validation-import-boundary-2026-06-12.md)
- [Storyboard Import Layout Provenance](./storyboard-import-layout-provenance-2026-06-12.md)
- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
- [Keep Canvas Productivity Controls on Normalized Graph Facts](./canvas-productivity-local-state-boundary-2026-06-13.md)
- [Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)

---
title: "Keep Storyboard Drafts Validated Before Canvas Import"
date: 2026-06-12
category: architecture-patterns
module: phase-5-novel-storyboard-json
problem_type: architecture_pattern
component: storyboard_drafts
severity: medium
applies_when:
  - "Generating storyboard JSON from novel text"
  - "Saving edited storyboard drafts before canvas import exists"
  - "Preparing a validated artifact for a later batch canvas import module"
  - "Preventing invalid provider output from replacing a usable draft"
related_components:
  - shared_types
  - backend_novels_api
  - frontend_workbench
  - provider_contracts
tags:
  - storyboard
  - zod
  - validation
  - import-boundary
  - mock-provider
---

# Keep Storyboard Drafts Validated Before Canvas Import

## Context

Phase 5 introduced the novel-to-storyboard layer that sits upstream of canvas
import. The app now needs to persist generated and edited storyboard JSON, make
it reloadable, and let creators mark it ready for the next phase. It must not
silently create canvas nodes or semantic edges before the Phase 6 import policy
exists.

## Guidance

Use the shared Zod `StoryboardResult` schema as the runtime contract for every
storyboard boundary: mock provider output, backend persistence, frontend edit
state, draft save, and ready-for-import mutation.

Validate generated candidates before writing a `StoryboardDraft`:

```ts
const candidate = await provider.generateStoryboard({
  projectId,
  title: novel.title,
  novelText: novel.content,
});
const validation = validateStoryboardResult(candidate);

if (!validation.success) {
  return { validation };
}

const draft = await prisma.storyboardDraft.create({
  data: {
    projectId,
    novelDocumentId: novel.id,
    status: "valid",
    storyboardJson: validation.data,
    validationIssuesJson: [],
    provider: provider.capability.id,
    model: config.llmModel,
    readyForImport: false,
  },
});
```

Apply the same gate to edited drafts. When a user changes scene, shot,
character, location, duration, prompt, or temp-reference fields, save only after
the shared validator succeeds. This prevents malformed local editor state from
becoming the latest reloadable artifact.

Treat ready-for-import as a validated state flag, not an import action. The
ready mutation should revalidate the stored JSON and set `status=ready` plus
`readyForImport=true`. It should not create tldraw shapes, `CanvasNode` rows, or
`CanvasEdge` rows.

Frontend editor helpers should preserve extension keys while updating known
fields. A later provider or import module may attach metadata to scenes or
shots before the UI knows about it. At the same time, helpers must allow
explicitly clearing optional temp-reference fields by preserving an explicit
`undefined` patch value.

## Why This Matters

The validated draft boundary keeps three responsibilities separate:

- `NovelDocument` owns source text and source metadata.
- `StoryboardDraft` owns generated or edited storyboard JSON plus validation,
  provider, model, and ready state.
- Phase 6 canvas import will own layout, duplicate policy, tldraw projections,
  `CanvasNode` creation, and semantic `CanvasEdge` creation.

Without this boundary, invalid provider output could replace the last usable
draft, edited JSON could fail only during import, or Phase 5 could accidentally
create canvas state before duplicate import and layout behavior are defined.

## When to Apply

- Adding real LLM adapters that return storyboard JSON.
- Building Phase 6 batch import from ready drafts.
- Extending storyboard fields for prompt composition or reference enrichment.
- Debugging a mismatch between provider output, UI editor state, and backend
  persistence.
- Writing smoke tests that prove a ready draft exists while the canvas remains
  unchanged.

## Regression Tests

Keep tests close to the boundary:

- shared schema tests for duplicate temp ids, missing character/location
  references, empty scenes/shots, non-positive durations, and missing prompts;
- backend service/e2e tests for provider success, provider failure, invalid
  provider output, edited draft validation, ready mutation, project scoping, and
  no canvas mutation;
- frontend API/helper tests for route paths, validation issue summaries,
  provider error summaries, ready-state predicates, and extension-preserving
  editor updates;
- browser/API smoke that creates a project and novel, generates a draft, edits
  duration/prompt, marks ready, reloads, and confirms canvas nodes/edges remain
  empty.

## Related

- [Project Semantic Canvas Edges Into tldraw Arrows](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
- [Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)
- [Phase 5 implementation plan](../../plans/2026-06-12-006-feat-novel-storyboard-json-plan.md)

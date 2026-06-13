---
title: "feat: Add canvas productivity controls"
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-013-phase-12-canvas-productivity-requirements.md
---

# feat: Add canvas productivity controls

## Summary

Implement Phase 12 as a bounded MVP productivity slice: batch Shot keyframe generation, search/outline navigation, SceneFrame collapse, preferred generated-media selection, duplicate-as-variant, and lightweight shortcuts. Keep the work canvas-first and durable through existing `CanvasNode`, `CanvasEdge`, and `GenerationJob` boundaries.

## Requirements Trace

- R1-R3: batch Shot image generation and preserve existing batch Image to Video.
- R4-R6: search/outline navigation and node focus.
- R7-R8: SceneFrame collapsed state without destructive child changes.
- R9: preferred Shot Image/Video selection.
- R10-R11: duplicate-as-variant and `derived_from` trace.
- R12-R13: keyboard shortcuts and scoped PNG export decision.

## Implementation Units

- U1. **Shared productivity contracts**

**Goal:** Add typed batch Shot image inputs/results and node data fields for collapsed state and selected media ids.

**Files:**
- Modify: `packages/shared-types/src/domain/generation.ts`
- Modify: `packages/shared-types/src/domain/canvas.ts`
- Modify: `packages/shared-types/src/domain/domain.test.ts`

**Approach:**
- Add `CreateBatchShotsToImagesJobInput` and `CreateBatchShotsToImagesJobResult`.
- Add `selectedImageNodeId` and `selectedVideoNodeId` to `ShotNodeData`.
- Add `collapsed` and optional `shotNodeIds` to `SceneFrameNodeData`.

**Tests:** shared domain tests prove the new contracts and node data shapes.

---

- U2. **Backend batch Shot image jobs and variant edge support**

**Goal:** Add a project-scoped batch Shot -> Image endpoint and allow `derived_from` edges for duplicate variants.

**Files:**
- Modify: `apps/backend/src/generation/dto.ts`
- Modify: `apps/backend/src/generation/generation.controller.ts`
- Modify: `apps/backend/src/generation/generation.service.ts`
- Modify: `apps/backend/src/generation/generation.service.spec.ts`
- Modify: `apps/backend/src/canvas/canvas.service.ts`
- Modify: `apps/backend/src/canvas/canvas.service.spec.ts`

**Approach:**
- Add `POST /projects/:projectId/generation/jobs/batch-shots-to-images`.
- Reuse `buildShotToImageInput` per eligible Shot and create one queued `shot_to_image` job per node.
- Return skipped node ids with readable reasons for non-Shot/missing nodes.
- Extend canvas edge validation to accept `derived_from` for project nodes, rejecting self-links.

**Tests:** backend generation service tests for happy path/skips; canvas service tests for variant edge validation.

---

- U3. **Frontend multi-selection batch image UI**

**Goal:** Let creators batch queue Shot keyframes from the existing multi-selection Inspector and keep Image -> Video batch behavior intact.

**Files:**
- Modify: `apps/frontend/src/lib/api.ts`
- Modify: `apps/frontend/src/lib/api.test.ts`
- Modify: `apps/frontend/src/components/canvas/generation-actions.tsx`
- Modify: `apps/frontend/src/components/canvas/generation-actions.test.tsx`
- Modify: `apps/frontend/src/components/canvas/canvas-inspector.tsx`
- Modify: `apps/frontend/src/components/canvas/canvas-inspector.test.tsx`

**Approach:**
- Add frontend API wrapper for batch Shot image endpoint.
- Add a compact `Batch Image` panel for selected Shot nodes, using the image provider settings pattern from single Shot generation.
- Keep the existing `Batch Video` panel for selected ImageNodes.

**Tests:** component tests render Shot batch actions and input builder tests preserve provider settings.

---

- U4. **Search/outline navigation and shortcuts**

**Goal:** Add a sidebar productivity panel that searches nodes and focuses selected results on the tldraw canvas.

**Files:**
- Create: `apps/frontend/src/components/canvas/canvas-productivity-panel.tsx`
- Create: `apps/frontend/src/components/canvas/canvas-productivity-panel.test.tsx`
- Modify: `apps/frontend/src/components/canvas/project-canvas-workspace.tsx`
- Modify: `apps/frontend/src/components/canvas/canvas-editor.tsx`
- Modify: `apps/frontend/src/components/canvas/canvas-editor.test.tsx`
- Modify: `apps/frontend/src/app/globals.css`

**Approach:**
- Build local search over node title, type, and common business fields.
- Group outline rows by node type with concise counts.
- Selecting a result updates workspace selection and sends a focus request to `CanvasEditor`.
- Verify installed tldraw `Editor` methods before using focus APIs; fallback is selecting the shape and using fit-to-content.
- Add shortcuts for search focus and fit-to-content, skipping inputs/textareas/contenteditable targets.

**Tests:** pure search helpers, panel rendering, and shortcut guard tests.

---

- U5. **SceneFrame collapse, media selection, and duplicate variant actions**

**Goal:** Add Inspector productivity actions for selected nodes without changing generation/export workflows.

**Files:**
- Create: `apps/frontend/src/components/canvas/canvas-productivity-actions.tsx`
- Create: `apps/frontend/src/components/canvas/canvas-productivity-actions.test.tsx`
- Modify: `apps/frontend/src/components/canvas/canvas-inspector.tsx`
- Modify: `apps/frontend/src/components/canvas/business-node-card.tsx`
- Modify: `apps/frontend/src/components/canvas/business-node-data.ts`
- Modify: `apps/frontend/src/lib/api.ts` if helper composition is needed.
- Modify: `apps/frontend/src/app/globals.css`

**Approach:**
- SceneFrame toggle patches `dataJson.collapsed` and updates the selected node callback.
- Business cards render collapsed SceneFrames as compact summaries.
- Shot media selection lists generated Image/Video candidates from current canvas graph and patches selected ids into Shot `dataJson`.
- Duplicate-as-variant creates a nearby node with copied data and adds a `derived_from` edge from source to copy.

**Tests:** action helpers for collapsed data, selected media data, generated candidate discovery, and duplicate input/edge calls.

---

- U6. **Docs, review, and learning**

**Goal:** Update development docs, run quality gates, review the Phase 12 diff, and capture a solution note if the navigation/focus pattern is reusable.

**Files:**
- Modify: `docs/development.md`
- Modify: `docs/plans/2026-06-13-013-feat-canvas-productivity-plan.md`
- Create if valuable: `docs/solutions/architecture-patterns/canvas-productivity-local-state-boundary-2026-06-13.md`

**Verification:**
- Targeted shared/backend/frontend tests and lint after each unit.
- Full `pnpm run format:check`, `pnpm run test`, and `pnpm run build` before final DoD verification if time and local Node allow.

## Risks

| Risk | Mitigation |
| --- | --- |
| tldraw focus/export APIs differ from assumptions | Inspect installed types before coding; keep fallback to select plus fit. |
| Productivity UI becomes a second canvas app | Keep it as compact sidebar/Inspector controls backed by existing graph state. |
| Variant duplication overwrites source data | Always create a new node and append a `derived_from` edge. |
| Selected media choices become detached from generation graph | Discover candidates from existing generated edges and store ids on the Shot for MVP. |
| PNG export needs unstable browser internals | Defer with documentation unless a stable installed API is verified. |

## Sources

- Requirements: [docs/brainstorms/2026-06-13-013-phase-12-canvas-productivity-requirements.md](../brainstorms/2026-06-13-013-phase-12-canvas-productivity-requirements.md)
- PRD Phase 12: [infinite_canvas_video_prd_roadmap_v2_detailed.md](../../infinite_canvas_video_prd_roadmap_v2_detailed.md)
- Tech stack reference: [docs/tech-stack-text2sql-reference.md](../tech-stack-text2sql-reference.md)

# CEX-15 Production Workspace Projection Plan

Date: 2026-06-14
Status: completed

## Goal

Add a canvas-first production workspace projection that gives creators and
agents a compact script/storyboard/assets/task view without introducing a
parallel flowData store.

## Implementation Units

### U1 Shared Contracts

- Add production workspace projection types.
- Add editable storyboard item update contract.
- Include agent-readable summary strings in the projection contract.

### U2 Backend

- Add CanvasService projection method from ScriptDraft, CanvasNode, CanvasEdge,
  Asset, and GenerationJob records.
- Add `GET /canvas/production-workspace`.
- Add `PATCH /canvas/production-workspace/items/:itemId` for storyboard item
  updates that write to Shot node data.
- Add service tests for projection and update behavior.

### U3 Frontend

- Add API helpers and request tests.
- Add a Production workspace panel to the canvas sidebar.
- Render script plan, storyboard rows, asset summary, and generation summary.
- Allow editing a selected storyboard item and refresh local canvas nodes after
  save.

### U4 Verification

- Run targeted shared/backend/frontend tests.
- Run repository-wide lint/test/build checks.
- Commit the completed module.

## Scope Boundaries

- Keep ScriptDraft plan data read-only in this module.
- Save storyboard item edits to `CanvasNode.dataJson`, not a separate flowData
  document.
- Do not stage unrelated `globals.css` or reference docs.

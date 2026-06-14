# CEX-16 Storyboard Panel And Media Board Plan

Date: 2026-06-14
Status: completed

## Goal

Extend the production workspace into a storyboard management panel and add an
MVP canvas storyboard media board that remains a projection over Shot/Image/Video
facts.

## Implementation Units

### U1 Shared Contracts

- Extend production workspace contracts with create/delete/reorder/board inputs
  and results.
- Add storyboard order fields to Shot node data.
- Add storyboard board metadata to SceneFrame node data.

### U2 Backend

- Add storyboard item create, delete, batch create, batch delete, and reorder
  service methods.
- Rebuild `sequence_next` edges and Shot order data after mutations.
- Add storyboard media board creation using a `scene_frame` node.
- Add CanvasService tests for sequence sync and board metadata.

### U3 Frontend

- Extend ProductionWorkspacePanel with add, add batch, delete, delete all,
  reorder up/down, and create board controls.
- Focus source Shot/Image/Video nodes from storyboard rows or board results.
- Update local canvas nodes/edges after backend mutations.

### U4 Verification

- Run targeted shared/backend/frontend tests.
- Run repository-wide lint/test/build checks.
- Commit the completed module.

## Scope Boundaries

- Keep writes on existing canvas entities.
- Do not introduce a parallel `flowData` or storyboard table store.
- Do not stage unrelated `globals.css` or reference docs.

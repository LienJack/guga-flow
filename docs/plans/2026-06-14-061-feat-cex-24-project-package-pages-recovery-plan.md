# CEX-24 Project Package, Canvas Pages, and Recovery Plan

Date: 2026-06-14

## Implementation Units

1. Shared contracts and schema migration
   - Add canvas page result/input types.
   - Add native project package and recovery snapshot contracts.
   - Replace the one-canvas-per-project unique index with a projectId index.

2. Backend page and package services
   - Resolve default canvas pages without relying on projectId uniqueness.
   - Add list/create/load/save page endpoints.
   - Add project package export, validation, transactional import, and recovery snapshot endpoints.
   - Sanitize package JSON and remap IDs during import.

3. Frontend integration
   - Add page tabs and active page state in the canvas workspace.
   - Pass active canvasDocumentId through load, autosave, node creation, and edge creation.
   - Add project package export/import/recovery controls.

4. Verification
   - Shared type build.
   - Backend and frontend type checks.
   - Unit tests for page behavior, package safety, import remapping, and API client routes.
   - Full lint/test/build before commit.

## Compatibility Notes

- Existing `/projects/:projectId/canvas` still opens the default page.
- Existing projects with one canvas document do not need data migration beyond dropping the unique index.
- Page metadata is stored in `snapshotJson.gugaFlowCanvasPage` but stripped from API snapshot payloads before the tldraw editor sees them.

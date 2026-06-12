---
title: "Persist tldraw Snapshots Through a Backend Autosave Boundary"
date: 2026-06-12
category: architecture-patterns
module: phase-2-canvas-persistence
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - "Embedding tldraw or another visual editor inside a project-scoped workspace"
  - "Autosaving visual document state with a backend-owned persistence boundary"
  - "Preserving existing inspector or asset workflows beside a new canvas surface"
  - "Reviewing debounce cleanup paths that can drop pending local edits"
related_components:
  - database
  - testing_framework
  - frontend_canvas
  - backend_canvas_api
tags:
  - tldraw
  - canvas-persistence
  - autosave
  - backend-boundary
  - browser-smoke
---

# Persist tldraw Snapshots Through a Backend Autosave Boundary

## Context

Phase 2 replaced the static workbench placeholder with a real tldraw canvas.
The important boundary is hybrid persistence: the complete visual tldraw
snapshot is saved as `CanvasDocument.snapshotJson`, while normalized
`CanvasNode`, `CanvasEdge`, and project asset metadata remain in the load
contract for later business modules.

The implementation also exposed an autosave edge case during code review. A
debounced save can be pending when the canvas component unmounts or the project
changes. If cleanup only clears the timer, the latest local edit never reaches
the backend.

## Guidance

Keep the visual editor state behind the backend API. The frontend should call a
project-scoped load route and save route rather than storing editor data in
browser-only storage:

```ts
export function getProjectCanvas(projectId: string): Promise<CanvasLoadResult> {
  return requestJson<CanvasLoadResult>(`/projects/${projectId}/canvas`);
}

export function saveCanvasSnapshot(
  projectId: string,
  input: SaveCanvasSnapshotInput,
): Promise<SaveCanvasSnapshotResult> {
  return requestJson<SaveCanvasSnapshotResult>(`/projects/${projectId}/canvas/snapshot`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
```

The backend should own project scoping, first-open document creation, JSON
validation, and the future-ready normalized envelope:

```ts
const canvasDocument = await this.prisma.canvasDocument.upsert({
  where: { projectId },
  update: {},
  create: { projectId },
});

return {
  canvasDocument: this.toCanvasDocumentRecord(canvasDocument),
  nodes: nodes.map((node) => this.toCanvasNodeRecord(node)),
  edges: edges.map((edge) => this.toCanvasEdgeRecord(edge)),
  assets: assets.map((asset) => this.toAssetRecord(asset)),
};
```

In the editor component, load the persisted snapshot before registering the
user-change listener. This avoids turning a programmatic restore into an
immediate autosave loop:

```ts
if (snapshotJson && hasPersistedSnapshot(snapshotJson)) {
  editor.loadSnapshot(snapshotJson as unknown as TldrawSnapshot);
}

const removeListener = editor.store.listen(
  () => {
    scheduleSave(editorSnapshotToJson(editor));
  },
  { source: "user", scope: "document" },
);
```

For autosave controllers, treat disposal as a persistence edge. A pending
debounced snapshot should be sent once before the controller is discarded, but
without setting React state during unmount:

```ts
dispose() {
  const pendingSnapshot = latestSnapshot;
  disposed = true;
  activeRunId += 1;
  clearTimer();
  if (pendingSnapshot !== undefined && pendingSnapshot !== inFlightSnapshot) {
    void options.saveSnapshot(projectId, pendingSnapshot).catch(() => undefined);
  }
}
```

Clear `latestSnapshot` after a successful save so disposal does not duplicate a
snapshot that is already durable:

```ts
failedSnapshot = undefined;
latestSnapshot = undefined;
setStatus("saved");
```

## Why This Matters

tldraw is the visual source of truth in Phase 2, but future modules need typed
business nodes, semantic edges, assets, and generation jobs. Returning the
normalized arrays from the canvas load API keeps the contract ready for those
modules without making Phase 2 implement them early.

The backend boundary keeps persistence rules, project existence checks, and
public asset metadata in one place. The browser owns interactivity and
autosave state, not storage paths or project lifecycle rules.

The disposal flush matters because debounce improves request volume but creates
a small data-loss window. Users can draw, navigate quickly, and lose the edit
unless cleanup persists the last pending snapshot. Browser smoke that waits for
`Saved` will not catch this edge; it needs a targeted controller test.

## When to Apply

- Adding custom business shapes on top of tldraw.
- Converting tldraw shapes into normalized `CanvasNode` records.
- Adding semantic edges or asset bindings to existing visual canvas state.
- Introducing generation jobs that depend on selected canvas nodes.
- Reviewing autosave, retry, route-change, or unload behavior in the canvas.

## Examples

Tests should prove both API durability and frontend autosave edge behavior:

```ts
await request(app.getHttpServer())
  .patch(`/api/v1/projects/${projectId}/canvas/snapshot`)
  .send({ snapshotJson })
  .expect(200);

await request(app.getHttpServer())
  .get(`/api/v1/projects/${projectId}/canvas`)
  .expect(200)
  .expect(({ body }) => {
    expect(body.canvasDocument.snapshotJson).toEqual(snapshotJson);
  });
```

```ts
controller.schedule({ document: { records: ["pending"] } });
controller.dispose();

expect(saveSnapshot).toHaveBeenCalledWith("project_1", {
  document: { records: ["pending"] },
});
```

Browser smoke should cover the real editor surface, not only static rendering:

```text
1. Create or open a project at /projects/:projectId/canvas.
2. Draw a built-in tldraw shape and wait for Saved.
3. Refresh and confirm the shape restores.
4. Move the shape, wait for Saved, refresh, and confirm the new position.
5. Confirm the inspector asset library still lists and previews uploads.
6. Check browser console errors and backend canvas responses.
```

## Related

- `docs/brainstorms/2026-06-12-003-phase-2-tldraw-canvas-persistence-requirements.md`
- `docs/plans/2026-06-12-003-feat-tldraw-canvas-persistence-plan.md`
- `docs/solutions/architecture-patterns/project-scoped-asset-lifecycle-boundary-2026-06-12.md`
- `docs/solutions/tooling-decisions/node-26-prisma-7-phase-0-foundation-2026-06-12.md`
- `packages/shared-types/src/domain/canvas.ts`
- `apps/backend/src/canvas/canvas.service.ts`
- `apps/frontend/src/components/canvas/canvas-editor.tsx`
- `apps/frontend/src/components/canvas/canvas-autosave.ts`

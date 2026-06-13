---
title: "Keep Collaboration Deferred While Export History Becomes Explicit"
date: 2026-06-13
category: architecture-patterns
module: phase-18-collaboration-export-history
problem_type: architecture_pattern
component: editor_export
severity: medium
applies_when:
  - "Adding export presets before dedicated renderers exist"
  - "Adding revision history without collaboration infrastructure"
  - "Planning single-user to team collaboration evolution"
related_components:
  - editor_exports
  - generation_jobs
  - timeline_manifest
  - canvas_persistence
tags:
  - export-presets
  - revision-history
  - collaboration
  - single-user-mvp
---

# Collaboration and Export History Evolution

## Decision

Keep the current MVP single-user and project-scoped. Phase 18 adds explicit export presets and revision lineage, but does not introduce realtime collaborative editing, team permissions, or cross-device conflict resolution.

## Current State

- Canvas persistence is project-scoped and optimized for one active editor.
- Editor exports are durable records with package Assets and EditorPackageNodes.
- Export presets are stored in job input, timeline manifests, package metadata, and EditorPackageNode data.
- Revisions are represented by `sourceEditorExportId`, which points from a new export request to the historical export it revises.

## Future Collaboration Path

1. Add server-owned project membership and permissions.
2. Add optimistic document revisions or event logs around canvas saves.
3. Introduce conflict detection before realtime presence.
4. Add presence/cursors after save conflict rules are explicit.
5. Promote export revision lineage into a queryable history view if multiple collaborators need audit trails.

## Non-Goals For Phase 18

- No WebSocket/Yjs/CRDT layer.
- No user invitation or team billing model.
- No background renderer for GIF/image sequence/HD outputs.
- No migration of historical editor exports; readers default missing presets to `standard_zip`.

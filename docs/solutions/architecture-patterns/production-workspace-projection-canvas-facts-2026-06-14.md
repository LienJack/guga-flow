---
title: "Project Production Workspace From Canvas Facts"
date: 2026-06-14
category: architecture-patterns
module: cex-15-production-workspace
problem_type: architecture_pattern
component: canvas_workspace
severity: medium
applies_when:
  - "Building a production workspace over ScriptDraft and canvas records"
  - "Giving agents a compact script/storyboard/assets context"
  - "Editing storyboard production data without creating a parallel store"
  - "Mapping Toonflow-like flowData concepts into guga-flow facts"
related_components:
  - canvas_service
  - agents_service
  - project_canvas_workspace
  - script_drafts
  - generation_jobs
tags:
  - production-workspace
  - canvas-first
  - agent-context
  - storyboard-table
  - flowdata-boundary
---

# Project Production Workspace From Canvas Facts

## Context

CEX-15 needed a production workspace comparable to Toonflow flowData, but
guga-flow already has durable business facts in `ScriptDraft`, `CanvasNode`,
`CanvasEdge`, `Asset`, and `GenerationJob`. Adding another large JSON document
for `scriptPlan`, `storyboardTable`, `storyboard`, and assets would create a
second source of truth.

## Guidance

Treat the production workspace as a projection. The backend reads the current
project records and returns:

- read-only `scriptPlan` from the latest ScriptDraft workspace;
- `storyboardTable` / `storyboardItems` from Shot nodes and scene membership
  edges;
- asset summaries from Character, Location, and Prop nodes;
- generation queue counts from GenerationJob records;
- `agentContext` strings that agents can consume directly.

The projection API lives under the canvas boundary:

```text
GET /api/v1/projects/:projectId/canvas/production-workspace
PATCH /api/v1/projects/:projectId/canvas/production-workspace/items/:itemId
GET /api/v1/projects/:projectId/agents/production-workspace-context
```

## Write Boundary

Keep writes narrow. In this module, only `storyboard_item` updates are accepted,
and the item id must be a Shot node id in the same project. Saving a row updates
the Shot node title and prompt-ready fields in `CanvasNode.dataJson`:

- `visualDescription`
- `imagePrompt`
- `videoPrompt`
- `durationSeconds`

Script plan data remains read-only here because the canonical ScriptDraft editor
already exists in the Novel panel. Rich storyboard board CRUD is intentionally
left for CEX-16.

## Why This Works

Agents and creators now see the same production state without new persistence.
The UI can scan the current script plan, storyboard rows, asset variants, and
queue status, while the agent endpoint exposes compact summary strings from the
same projection.

Because edits land on Shot nodes, existing prompt composer, generation actions,
canvas autosave, import/export, and future storyboard board features continue to
read one graph of facts.

## Reuse Guidance

Use this pattern when adding production workspace affordances:

- derive from current records first;
- add write endpoints only for specific existing entities;
- return agent-ready summaries alongside structured rows;
- keep ScriptDraft edits in ScriptDraft APIs and Shot edits in Canvas APIs;
- avoid storing a copy of `flowData` that can drift from canvas facts.

## Verification

CEX-15 verifies this pattern with:

- shared type tests/build for production workspace contracts;
- backend CanvasService tests for projection and Shot item update;
- frontend API tests for projection/update/agent-context endpoints;
- frontend Production panel render tests;
- repository-wide lint/tests and production frontend build.

## Related

- [Promote ScriptDraft Asset Candidates Into Variant-Aware Canvas Nodes](./script-asset-candidates-and-selected-variants-2026-06-14.md)
- [ScriptAgent Workspace In ScriptDraft JSON](./script-agent-workspace-in-scriptdraft-json-2026-06-14.md)
- [Compose Prompts From Canvas Graph Records With Debug Parts](./prompt-composer-graph-derived-debug-parts-2026-06-12.md)
- [CEX-15 plan](../../plans/2026-06-14-052-feat-cex-15-production-workspace-plan.md)

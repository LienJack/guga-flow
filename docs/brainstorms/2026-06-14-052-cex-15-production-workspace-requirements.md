# CEX-15 Production Workspace Projection Requirements

Date: 2026-06-14

## Source

- Checklist item: CEX-15
- Reference module: TFR-15
- Dependencies: CEX-13, CEX-14

## Product Need

Creators and agents need a production workspace that resembles Toonflow flowData
without becoming a second source of truth. The workspace should summarize the
current ScriptDraft plan, storyboard table, storyboard items, assets, and task
state by projecting existing ScriptDraft, CanvasNode, CanvasEdge, Asset, and
GenerationJob records.

## Required Outcomes

- Frontend canvas workspace includes a production workspace panel.
- Backend exposes a project-scoped projection API that agents can read.
- Projection includes script plan, storyboard table/items, asset summaries, and
  generation job summary.
- Storyboard item edits can sync back to the corresponding Shot CanvasNode.
- No standalone flowData JSON store is introduced.

## Non-Goals

- No ProductionAgent orchestration or free-form agent database writes.
- No dedicated storyboard table persistence layer.
- No bulk storyboard board UI; CEX-16 owns richer storyboard panels.
- No duplicate source of truth separate from canvas and ScriptDraft facts.

## Acceptance Gates

- Production workspace panel renders from backend projection data.
- Agent-readable API returns scriptPlan/storyboardTable/storyboard summaries.
- Editing a storyboard item saves to structured canvas node data.
- Projection remains derived from existing project records.

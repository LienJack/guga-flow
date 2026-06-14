# CEX-20 Production Agent Orchestration Requirements

Date: 2026-06-14

## Source

- Checklist item: CEX-20
- Reference module: TFR-14

## Product Need

ProductionAgent needs a controlled way to turn workspace context into production
artifacts. The first usable slice should create a storyboard board from the
production workspace while preserving auditability, visible failure reasons, and
undo compatibility through the existing agent canvas action job model.

## Required Outcomes

- ProductionAgent can create at least one production artifact.
- The action is exposed through a backend API and does not mutate frontend state
  directly.
- The created artifact is recorded in a GenerationJob audit record with a tool
  summary and target node.
- Failures from the controlled canvas tool are written back to the job as failed
  status with an error message.
- Created nodes carry agent metadata so existing undo can delete them safely.
- The frontend exposes the action from the Agent panel and refreshes through the
  same callback path as other agent canvas actions.

## Non-Goals

- No free-form Agent database writer.
- No Socket-only result storage.
- No full director-plan, derived-asset, supervision, or multi-tool planning loop
  in this module.
- No new task system or Prisma enum.

## Acceptance Gates

- ProductionAgent can create a storyboard board from selected or existing
  storyboard items.
- Users can see the tool call summary or backend failure reason in the Agent
  panel.
- The created storyboard board can be undone through the existing agent undo
  mechanism.
- Tests prove the action goes through CanvasService and records failed audit jobs
  when the controlled tool rejects the request.

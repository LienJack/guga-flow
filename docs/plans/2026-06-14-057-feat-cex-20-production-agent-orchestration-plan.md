# CEX-20 Production Agent Orchestration Plan

Date: 2026-06-14
Status: completed

## Goal

Add a controlled ProductionAgent action that creates a storyboard board through
existing backend services, records an auditable agent job, exposes failures, and
preserves undo compatibility.

## Implementation Units

### U1 Shared Contracts

- Add production agent action kinds and create-action input/result contracts.
- Reuse the existing `agent_canvas_action` job input/output shape for audit and
  undo.
- Include controlled tool parameters in job input for traceability.

### U2 Backend

- Add `POST /projects/:projectId/agents/production-actions`.
- Default the action to the `production` agent role unless explicitly supplied.
- Create a running GenerationJob before invoking the controlled tool.
- Call `CanvasService.createStoryboardMediaBoard` rather than writing the board
  directly from agent code.
- Tag the created board node with `agentAction` metadata so undo can delete it.
- Mark the job succeeded with created-node summary or failed with the tool error.

### U3 Frontend

- Add a typed API helper for production agent actions.
- Add an Agent panel command to create a storyboard board from selected Shot
  nodes or the full production workspace.
- Reuse the existing agent result, error, and undo UI paths.

### U4 Verification

- Add shared/backend/frontend tests.
- Run targeted checks, repository lint/test, frontend production build, and
  whitespace diff check.
- Commit the completed module.

## Scope Boundaries

- ProductionAgent tools may call backend services or create jobs; they may not
  mutate frontend state directly.
- This module implements one representative production tool and leaves broader
  multi-tool planning for later CEX items.
- No new Prisma operation enum is added.

# CEX-21 Agent Streaming Channel Plan

Date: 2026-06-14
Status: completed

## Goal

Add a lightweight SSE-first Agent streaming MVP for ScriptAgent and
ProductionAgent that is auditable through GenerationJob, cancellable through the
existing generation cancel endpoint, and resilient through polling fallback.

## Implementation Units

### U1 Shared Contracts

- Add streaming Agent roles and phases.
- Add Agent session create input/result contracts.
- Add Agent stream event payload carried by generation events.
- Extend agent canvas job input with `sessionMode`.

### U2 Backend

- Add `POST /projects/:projectId/agents/sessions`.
- Create running `agent_canvas_action` jobs for script/production sessions.
- Emit initial thinking payload in the session response.
- Enrich generation SSE `job.updated` snapshots with agent role, phase, status,
  action kind, and summary payloads.

### U3 Frontend

- Add typed API helper for session start.
- Add Agent panel role controls and Start/Stop commands.
- Subscribe to generation SSE for the active session.
- Fall back to `listGenerationJobs` polling when EventSource is unavailable or
  errors.

### U4 Verification

- Add shared/backend/frontend tests.
- Run targeted checks, repository lint/test, frontend production build, and
  whitespace diff check.
- Commit the completed module.

## Scope Boundaries

- Use SSE instead of Socket.IO because the project already has generation event
  infrastructure and this module needs status snapshots more than bidirectional
  collaboration.
- Critical Agent actions remain persisted in GenerationJob and existing backend
  services.
- The session endpoint starts an observable/cancellable Agent runtime session; it
  does not replace existing deterministic canvas or production actions.

# Agent Streaming SSE Polling Boundary

Date: 2026-06-14
Status: accepted

## Context

CEX-21 requires ScriptAgent and ProductionAgent status visibility, stop/cancel,
tool summaries, persistence, and disconnect fallback. The project already has a
GenerationJob lifecycle, generation cancel endpoint, and SSE endpoint that emits
job snapshots.

## Decision

- Use the existing generation SSE endpoint instead of adding Socket.IO.
- Start streaming Agent sessions by creating running `agent_canvas_action`
  GenerationJobs through `POST /projects/:projectId/agents/sessions`.
- Restrict streaming session roles to `script` and `production`.
- Carry stream-specific metadata in typed job input via `sessionMode: "stream"`.
- Enrich `job.updated` SSE snapshots for agent jobs with an
  `agent_session` payload containing role, phase, status, summary, and action
  kind.
- Stop Agent sessions through the existing generation job cancel endpoint.
- In the Agent panel, use EventSource for the active session and fall back to
  `listGenerationJobs` polling if the stream errors or is unavailable.

## Consequences

- Agent runtime status is durable and auditable because the session is a normal
  GenerationJob.
- Tool summaries from completed `agent_canvas_action` jobs are visible in the
  same streaming channel as active sessions.
- Stop/cancel behavior reuses the existing cancellation transaction and remains
  compatible with future worker-backed Agent execution.
- The frontend can recover from stream disconnects without losing the job
  history.

## Verification

- Shared tests cover streaming roles, phases, session input/result, and payload
  shape.
- Backend tests cover session job creation and SSE payload enrichment.
- Frontend tests cover API routing and Agent panel controls.
- Repository lint/test and Next production build pass.

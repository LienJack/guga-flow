# CEX-21 Agent Streaming Channel Requirements

Date: 2026-06-14
Status: completed

## Source

- Checklist item: CEX-21
- Reference module: TFR-02

## Product Need

ScriptAgent and ProductionAgent need visible runtime status instead of opaque
synchronous requests. Users should be able to start a cancellable agent session,
see status/tool summaries as generation events arrive, and fall back to job
polling or historical job records when the stream disconnects.

## Required Outcomes

- ScriptAgent and ProductionAgent can start an auditable running session.
- Agent session state is backed by `GenerationJob` records, not transient socket
  messages only.
- Existing generation SSE emits agent-specific role, phase, status, and tool
  summary payloads for `agent_canvas_action` jobs.
- Users can stop an active Agent session through the existing generation cancel
  endpoint.
- Frontend shows stream status and degrades to job polling when SSE is not
  available or errors.

## Non-Goals

- No Socket.IO migration in this module.
- No multiplayer collaboration or shared live cursor layer.
- No direct canvas store mutation from Agent stream messages.
- No background multi-tool planner beyond the existing persisted Agent actions.

## Acceptance Gates

- Agent panel can start ScriptAgent or ProductionAgent streaming sessions.
- Agent panel can stop a running session.
- Agent action/tool summaries are visible when SSE snapshots include completed
  agent jobs.
- Stream disconnects degrade to polling while retaining job history.

# Production Agent Controlled Tool Boundary

Date: 2026-06-14
Status: accepted

## Context

CEX-20 needs ProductionAgent to create production artifacts without giving the
agent a free-form database writer or leaving results only in transient messages.
Existing Agent canvas actions already provide GenerationJob audit records,
created-node summaries, visible errors, and undo metadata.

## Decision

- Expose ProductionAgent work through `POST
  /projects/:projectId/agents/production-actions`.
- Represent the first controlled tool as `create_storyboard_board`, carried by
  the existing `agent_canvas_action` job lifecycle.
- Resolve the production role through Agent deployment before creating a job.
- Create a running GenerationJob before invoking the controlled tool.
- Call `CanvasService.createStoryboardMediaBoard` to create the artifact.
- Tag the created board node with `agentAction.jobId`, message, and action kind
  so existing undo can safely delete it.
- Mark downstream tool failures on the job with failed status and error message.
- Let the frontend trigger the tool from the Agent panel and reuse existing
  result, failure, refresh, and undo paths.

## Consequences

- ProductionAgent can create a durable storyboard board without direct frontend
  state mutation.
- Tool summary and failure reasons stay visible through the same Agent panel and
  job record used by existing canvas actions.
- Undo remains conservative because it only deletes nodes that still match the
  created-node snapshot and agent metadata.
- Future ProductionAgent tools can reuse the same endpoint and job boundary while
  adding richer action kinds.

## Verification

- Shared type tests cover the production action kind and audited job input.
- Backend tests cover success through CanvasService and failed job recording
  when the controlled tool rejects the request.
- Frontend tests cover the API endpoint and Agent panel command.
- Repository lint/test and Next production build pass.

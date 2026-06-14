# CEX-22 Task Center And Diagnostics Requirements

Date: 2026-06-14

## Source

- Checklist item: CEX-22
- Reference modules: TFR-26, ACP-08, ACP-18

## Product Need

Users need a project-level view of production work across image, video, audio,
asset, workflow, editor export, and Agent tasks. Failures should be inspectable
without exposing raw prompts, provider secrets, full provider responses, or local
absolute paths.

## Required Outcomes

- Project task center is derived from existing `GenerationJob` records.
- Each task has a class, status, trace id, related object pointer, and recovery
  affordances.
- Failed/cancelled tasks expose safe diagnostic messages.
- Frontend task center can locate related canvas nodes.
- Retry and cancel use existing generation endpoints.
- Clear is local panel cleanup and does not delete audit records.

## Non-Goals

- No replacement task table or second task engine.
- No destructive deletion of GenerationJob audit history.
- No raw provider response, raw secret, raw prompt, or local absolute path in
  diagnostics.
- No desktop task queue implementation in this module.

## Acceptance Gates

- Users can view project production tasks in one panel.
- Tasks with related nodes can focus the canvas selection.
- Failed tasks show readable reason and trace id.
- Retry/cancel/clear controls are visible where applicable.
- Backend diagnostics sanitize secrets and local paths.

# CEX-22 Task Center And Diagnostics Plan

Date: 2026-06-14
Status: completed

## Goal

Add a project-level task center and safe diagnostics projection over existing
GenerationJob records, with a frontend panel for status, trace, locate, retry,
cancel, and local clear actions.

## Implementation Units

### U1 Shared Contracts

- Add task center task classes, diagnostic categories, and severities.
- Add task center item, related object, actions, diagnostic event, and result
  contracts.

### U2 Backend

- Add `GenerationService.getTaskCenter`.
- Map GenerationJob operations to task classes.
- Extract safe related object pointers without exposing prompt bodies.
- Generate deterministic trace ids.
- Sanitize diagnostic messages for secrets and local absolute paths.
- Add `GET /projects/:projectId/generation/jobs/task-center`.

### U3 Frontend

- Add typed task center API helper.
- Add task center panel to the canvas workspace sidebar.
- Show queue metrics, task rows, trace ids, safe reasons, locate, retry, cancel,
  and local clear controls.
- Refresh task center alongside generation job polling.

### U4 Verification

- Add shared/backend/frontend tests.
- Run targeted checks, repository lint/test, frontend production build, and
  whitespace diff check.
- Commit the completed module.

## Scope Boundaries

- Task center is a projection over GenerationJob, not a new task engine.
- Clear hides rows locally in the panel; audit records remain intact.
- Diagnostics are safe reports, not raw logs.

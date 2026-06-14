# CEX-13 ScriptAgent Workspace Plan

Date: 2026-06-14
Status: completed

## Goal

Promote ScriptDraft from a final-script container to a structured ScriptAgent workspace while preserving existing storyboard generation behavior.

## Implementation Units

### U1 Shared Contracts

- Add story skeleton, adaptation plan, and workspace interfaces.
- Add update input/result contracts for saving a ScriptDraft workspace.
- Preserve existing `script` access on `ScriptDraftRecord` for compatibility.

### U2 Backend

- Build workspace data when creating ScriptDrafts from novel/event graphs.
- Read both legacy script JSON and new workspace JSON.
- Add PATCH endpoint for saving editable workspace fields.
- Include workspace sections in script export.
- Keep storyboard generation reading the workspace script.

### U3 Frontend

- Add API client helper and request tests for saving script drafts.
- Add workspace editor controls in `NovelStoryboardPanel`.
- Keep existing export/storyboard actions on selected drafts.

### U4 Verification

- Run targeted shared/backend/frontend tests.
- Run full lint/test/build checks.
- Commit after the module is complete.

## Scope Boundaries

- Do not add a separate chat-only ScriptAgent endpoint.
- Do not change database schema; continue using `ScriptDraft.scriptJson`.
- Do not stage unrelated `globals.css` changes or reference source documents.

# ScriptAgent Workspace In ScriptDraft JSON

Date: 2026-06-14
Scope: CEX-13

## Problem

ScriptAgent output must be auditable and editable, not chat-only text. The existing `ScriptDraft` table already provides project scope, novel scope, versions, export, and storyboard selection, but its JSON payload only represented the final script.

## Pattern

Store the ScriptAgent workspace in `ScriptDraft.scriptJson`:

- `storySkeleton`: source chapter indexes, event IDs, and ordered beats
- `adaptationStrategy`: strategy, target format, supervision notes, and revision notes
- `script`: final structured scenes and beats

`ScriptDraftRecord.script` remains a compatibility alias for `workspace.script`, so existing storyboard generation continues to read the same shape.

## Backend Flow

- Creating a ScriptDraft from a Novel/EventGraph builds all three workspace sections.
- Legacy `scriptJson` records are wrapped into a workspace on read.
- PATCH saves edited workspace JSON back to the same ScriptDraft version.
- Export includes story skeleton, adaptation strategy, and final script sections.
- Storyboard generation continues to use `workspace.script`.

## Frontend Flow

The Novel panel Script section now behaves as a compact ScriptAgent workspace:

- script drafts are selectable
- skeleton title/logline/beats are editable
- adaptation strategy, supervision, and revision notes are editable
- script title/logline/scenes are editable
- save writes the workspace back to `ScriptDraft`

## Tradeoffs

The workspace is still JSON-backed rather than a separate table. This keeps versioning simple and avoids migration churn, but deep collaborative editing would eventually benefit from finer-grained persistence.

# CEX-13 ScriptAgent Workspace Requirements

Date: 2026-06-14

## Source

- Checklist item: CEX-13
- Reference module: TFR-12
- Dependencies: CEX-02, CEX-03, CEX-12

## Product Need

Novel-to-video work needs a structured script workspace between chapter events and storyboard generation. The current `ScriptDraft` can store scenes and beats, but it does not expose the intermediate story skeleton and adaptation plan as editable workspace data.

## Required Outcomes

- Users can generate a ScriptDraft workspace from a Novel/EventGraph.
- The workspace contains `storySkeleton`, `adaptationStrategy`, and `script`.
- Workspace fields are editable and save back into `ScriptDraft`.
- ScriptDrafts remain versioned through the existing version field.
- Export includes the intermediate workspace, not only the final scene script.
- A selected ScriptDraft can continue into storyboard generation.

## Non-Goals

- No real long-form LLM generation requirement.
- No Toonflow XML prompt protocol.
- No chat-only ScriptAgent output path.

## Acceptance Gates

- Novel/EventGraph creates a structured script workspace.
- storySkeleton, adaptationStrategy, and script can be edited, saved, exported, and versioned.
- ScriptDraft selection still generates storyboard output.

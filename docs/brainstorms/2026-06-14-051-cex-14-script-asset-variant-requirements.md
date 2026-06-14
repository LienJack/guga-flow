# CEX-14 Script Asset Extraction And Variants Requirements

Date: 2026-06-14
Status: completed

## Source

- Checklist item: CEX-14
- Reference modules: TFR-13, TFR-16
- Dependency: CEX-13

## Product Need

ScriptDraft workspaces need to produce reusable production assets. Character, location, and prop facts should be extractable from a script, previewable, editable, deduplicated or merged, and imported into the canvas with source trace. Asset nodes also need variant metadata so prompt composition can use a selected visual variant.

## Required Outcomes

- ScriptDraft asset extraction returns editable character/location/prop candidates.
- Import can create new CanvasNodes or merge into an existing target node.
- Imported nodes carry ScriptDraft source trace.
- Character/Location/Prop node data can hold multiple derived visual variants.
- Prompt composer includes the selected variant asset ID when composing shot prompts.

## Non-Goals

- No full asset image generation workflow in this module.
- No automatic replacement of selected variants.
- No deletion of old variants.

## Acceptance Gates

- Extraction results can be previewed, edited, deduped, merged, and imported.
- Imported asset nodes trace back to the ScriptDraft.
- Character/Location/Prop nodes support visual variants.
- Prompt composer can select the current variant.

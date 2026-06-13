---
title: "Keep Story Blueprint Context as Optional Canvas Trace"
date: 2026-06-13
category: architecture-patterns
module: phase-14-story-blueprint-lifecycle
problem_type: architecture_pattern
component: assistant
severity: medium
applies_when:
  - "Adding long-form story planning facts before a dedicated event graph exists"
  - "Projecting storyboard metadata into normalized canvas nodes"
  - "Preserving creator-edited character identity across regenerated imports"
  - "Explaining prompt changes with source debug parts"
related_components:
  - shared_storyboard_schema
  - storyboard_import
  - canvas_nodes
  - prompt_composer
  - storyboard_editor
tags:
  - story-blueprint
  - character-lifecycle
  - canvas-trace
  - prompt-debug
  - reusable-assets
---

# Keep Story Blueprint Context as Optional Canvas Trace

## Context

Phase 14 needed story-event traceability and character lifecycle continuity for longer stories, but the product was not ready for a dedicated EventGraph table, new canvas node types, or a full script workbench. The useful pattern was to keep planning facts optional in storyboard drafts, validate references at the draft boundary, then project the trace into existing canvas and prompt surfaces.

The same slice also needed creator authority over reusable characters. When a later generated storyboard reuses an existing Character node, imported trace metadata should be added, but user-edited identity fields should not be overwritten.

## Guidance

Keep story blueprint metadata optional and draft-local until queryable long-form workflows require a separate persistence model. Add optional fields for world summary, timeline events, relationships, character lifecycle stages, scene/shot event ids, and shot character-stage references. Validation should reject unknown event ids, relationship participants, and lifecycle stage references before import.

Project validated trace onto existing graph records:

```text
StoryboardResult.storyBlueprint
  -> NovelNode.dataJson.storyBlueprint

Scene/Shot.storyEventIds
  -> SceneFrame/Scene/Shot.dataJson.storyEventIds
  -> SceneFrame/Scene/Shot.dataJson.storyEvents

Character.lifecycleStages
  -> CharacterAsset.dataJson.lifecycleStages

Shot.characterStageRefs
  -> Shot.dataJson.characterStageRefs
```

Keep semantic relationships in `CanvasEdge`. Event and lifecycle trace explains story context; it does not replace durable scene, character, and location edges.

For reusable Character imports, merge planned metadata underneath existing node data. Existing data should win for identity fields, while the new import can refresh provenance and fill missing lifecycle trace:

```ts
const mergedData = {
  ...plannedData,
  ...existingData,
};

if (plannedData.storyboardImport) {
  mergedData.storyboardImport = plannedData.storyboardImport;
}
if (plannedData.lifecycleStages && !hasExistingLifecycleStages(existingData.lifecycleStages)) {
  mergedData.lifecycleStages = plannedData.lifecycleStages;
}
```

Prompt composition should turn event and lifecycle trace into explicit debug parts, such as `story_event` and `character_lifecycle`. This makes generated prompts explainable: creators can see that a shot prompt changed because it references a specific event and a specific character stage, not because generic shot text drifted.

On the frontend, surface trace without turning nested arrays into generic form fields. Cards can show concise event and lifecycle summaries, while the Inspector can render read-only trace sections for event summaries, stage references, lifecycle stages, and locked fields. Rich editing can stay in the storyboard editor until a dedicated script or event workbench exists.

## Why This Matters

Long-form story data becomes useful only if it survives generation, review, canvas import, and prompt composition. Keeping that data optional preserves older storyboard fixtures and short-story flows, while validation prevents broken references from entering the graph.

Using existing canvas nodes avoids premature visual and persistence complexity. The graph remains canvas-first, and tldraw remains a projection surface. When EventGraph persistence is justified later, the imported trace fields provide a migration path and test corpus.

Lock-aware reusable Character merging also protects creator edits. Generated storyboards can improve traceability without silently replacing appearance, identity prompt, or other identity fields that a creator already corrected.

## When to Apply

- Story planning facts need to influence canvas and prompts before a dedicated event model exists.
- Generated drafts must remain backward-compatible with older storyboard JSON.
- Imported nodes should expose traceability without adding new canvas node types.
- Prompt previews need source-attributed context for review and debugging.
- Re-importing generated storyboards must preserve creator-edited reusable assets.

## Examples

Phase 14 validates and imports this path end to end:

```text
Mock LLM storyboard
  -> validateStoryboardResult
  -> buildStoryboardImportPlan
  -> CanvasService.importStoryboard
  -> PromptService.composeShotPrompt
  -> ShotPromptPreview debug parts
```

The browser smoke path proved the combined workflow: creative brief generation produced a blueprint-backed storyboard, import created canvas nodes with event/lifecycle trace, selecting a Shot opened the Inspector `Story trace` panel, and prompt preview included event and character lifecycle text.

## Related

- [Validate Storyboard Drafts Before Canvas Import](./storyboard-draft-validation-import-boundary-2026-06-12.md)
- [Storyboard Import Layout Provenance](./storyboard-import-layout-provenance-2026-06-12.md)
- [Build Prompt Previews From Graph-Derived Debug Parts](./prompt-composer-graph-derived-debug-parts-2026-06-12.md)
- [Keep Canvas Productivity Controls on Normalized Graph Facts](./canvas-productivity-local-state-boundary-2026-06-13.md)

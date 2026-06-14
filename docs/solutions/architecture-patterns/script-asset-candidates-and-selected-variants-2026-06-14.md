---
title: "Promote ScriptDraft Asset Candidates Into Variant-Aware Canvas Nodes"
date: 2026-06-14
category: architecture-patterns
module: cex-14-script-asset-variants
problem_type: architecture_pattern
component: canvas_assets
severity: medium
applies_when:
  - "Extracting reusable production assets from ScriptDraft workspaces"
  - "Importing script-derived characters, locations, or props onto the canvas"
  - "Adding visual variants without replacing the creator-selected version"
  - "Composing shot prompts from current asset variants"
related_components:
  - script_drafts
  - canvas_nodes
  - prompt_composer
  - frontend_novel_workbench
  - shared_canvas_types
tags:
  - script-assets
  - asset-variants
  - prompt-composer
  - provenance
  - canvas-first
---

# Promote ScriptDraft Asset Candidates Into Variant-Aware Canvas Nodes

## Context

CEX-14 connects the ScriptAgent workspace to reusable production assets. The
ScriptDraft already contains the adapted script, story skeleton, and scene/beat
trace from CEX-13, but downstream image and storyboard work needs stable
Character, Location, and Prop nodes with prompt-ready fields and source
provenance.

The important boundary is that extraction is a preview/import workflow, not a
hidden graph mutation. Creators should be able to inspect, edit, dedupe, and
merge candidates before they become canvas facts.

## Guidance

Represent script extraction as editable `ScriptAssetCandidate` records:

- `type`: `character`, `location`, or `prop`
- `name`, `description`, and prompt text
- `dedupeKey`
- `sourceScriptDraftId`, `sourceSceneIds`, and `sourceBeatIds`
- optional `mergeTargetNodeId`

Importing candidates should either create a new typed canvas asset node or merge
into the explicitly selected target node. The imported node data should keep two
independent pieces of trace:

- `scriptAssetSource`: where the node came from in the ScriptDraft
- `assetVariants`: visual candidates or generated outputs for this node

For the MVP, import creates a draft variant with prompt and source IDs but no
generated `assetId` yet. Later asset-generation modules can update that variant
or add sibling variants after media is actually produced.

## Backend Boundary

Keep extraction and import behind project-scoped Novel APIs:

```text
POST /api/v1/projects/:projectId/novels/:novelId/script-drafts/:scriptDraftId/extract-assets
POST /api/v1/projects/:projectId/novels/:novelId/script-drafts/:scriptDraftId/import-assets
```

The backend re-loads the ScriptDraft by project and novel before doing any work.
It does not trust the browser to provide source ownership. Candidate input can
override editable fields, but `sourceScriptDraftId` is normalized to the route
ScriptDraft.

Merge behavior should preserve the existing `selectedVariantId`. New draft
variants may be appended or refreshed by `variantId`, but a merge must not
silently replace the creator's selected visual version.

## Prompt Composer Boundary

Prompt composition should continue to read from current canvas graph records.
For asset nodes, gather both:

- existing `referenceAssetIds`
- the selected variant's `assetId`

Selection order is explicit `selectedVariantId` first, then the first variant
with `status: "selected"`. Draft variants without an `assetId` remain prompt
metadata only and do not add invalid references.

This keeps visual variation local to the asset node while making the selected
version available to Shot prompt assembly without special-case UI code.

## Why This Works

Script-derived assets become durable canvas facts only after an import action.
That matches the canvas-first model: the ScriptDraft proposes production facts,
the creator edits or merges them, and the resulting Character/Location/Prop
nodes become the source of truth for later generation and storyboard work.

Separating `scriptAssetSource` from `assetVariants` also avoids provenance drift.
A node can keep its original script trace while accumulating multiple generated
visual versions over time. Prompt composition then chooses the current visual
asset without erasing earlier variants or source history.

## Reuse Guidance

Use this pattern when adding richer asset-generation flows:

- extract or generate candidate metadata first;
- let creators edit candidates before import;
- import through backend-owned canvas node writes;
- store source trace separately from generated media variants;
- preserve selected variants when merging updated candidate facts;
- make prompt composition read the current selected variant rather than a
  browser-provided reference list.

Do not use this path to mutate generated `Asset` rows directly from the browser.
Actual image generation should still go through the generation job and worker
side-effect boundary.

## Verification

CEX-14 verifies this pattern with:

- shared type tests and build for `prop_asset`, variant metadata, and selected
  variant prompt references;
- backend Novel service tests for extraction, import, and merge preservation;
- frontend API and Novel panel tests for candidate controls;
- canvas node data tests for Prop asset defaults and variant summaries;
- repository-wide lint/tests and production frontend build.

## Related

- [ScriptAgent Workspace In ScriptDraft JSON](./script-agent-workspace-in-scriptdraft-json-2026-06-14.md)
- [Compose Prompts From Canvas Graph Records With Debug Parts](./prompt-composer-graph-derived-debug-parts-2026-06-12.md)
- [Keep Project Asset Lifecycle Behind the Backend Boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)
- [CEX-14 plan](../../plans/2026-06-14-051-feat-cex-14-script-asset-variant-plan.md)

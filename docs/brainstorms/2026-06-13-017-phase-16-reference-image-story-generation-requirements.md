---
date: 2026-06-13
topic: phase-16-reference-image-story-generation
---

# Phase 16 Reference Image Story Generation Requirements

## Summary

Phase 16 lets a creator upload or select a reference image, use it as the seed for a creative story draft, edit the resulting storyboard, and preserve the source relationship when the draft is imported to the canvas. It covers XQ-07 by connecting Asset/ImageNode references to character, location, shot, and Novel provenance.

## Requirements

- R1. A creator can choose an existing image Asset as a story seed from the creative brief entry.
- R2. A creator can upload a new image Asset and immediately use it as a story seed.
- R3. A creator can select an existing canvas ImageNode and use it as a story seed.
- R4. Creative storyboard generation jobs carry the resolved reference Asset IDs, ImageNode IDs, and optional seed note.
- R5. The generated Storyboard draft stores seed references and propagates reference Asset IDs into editable character, location, and shot drafts.
- R6. Importing a seeded storyboard to canvas preserves reference Asset IDs on imported Character/Location/Shot nodes.
- R7. Importing a seeded storyboard from an ImageNode creates a durable canvas edge from the source ImageNode to the imported Novel node.
- R8. Missing or invalid reference Assets/ImageNodes fail before generation jobs are created.
- R9. Existing unseeded creative brief and novel-to-storyboard flows continue to work unchanged.

## Acceptance Examples

- AE1. Given a selected ImageNode with an attached Asset, when the creator creates a creative draft and imports it to canvas, the new Novel node is connected to that ImageNode by a story-seed edge.
- AE2. Given an uploaded image Asset, when the creator creates a draft without a selected ImageNode, the storyboard remains editable and imported Character/Location/Shot nodes retain the Asset reference IDs.
- AE3. Given a missing ImageNode ID, when the creator submits the creative brief, no GenerationJob or NovelDocument is created and the API returns a validation error.
- AE4. Given an older unseeded draft, when it is generated or imported, the existing storyboard flow still works.

## Scope Boundaries

- Do not build image understanding, segmentation, subject classification, or visual embedding search in this phase.
- Do not auto-create canvas ImageNodes for uploaded Assets; uploaded Assets are preserved as reference IDs.
- Do not require real LLM/image/video providers. Mock provider behavior is enough for verification.
- Do not replace the existing editable StoryboardEditor. The seed metadata should travel with the same draft model.

## Key Decisions

- Use `story_seed` as a dedicated canvas relation for ImageNode-to-Novel provenance instead of weakening `derived_from`, which remains same-type variant lineage.
- Resolve ImageNode seeds server-side into Asset IDs before creating the job, keeping browser logic limited to choosing IDs.
- Store seed references in the Storyboard JSON so deferred imports can still reconstruct provenance.
- Propagate reference Asset IDs to character, location, and shot drafts so subsequent prompt composition can reuse the existing reference-image path.

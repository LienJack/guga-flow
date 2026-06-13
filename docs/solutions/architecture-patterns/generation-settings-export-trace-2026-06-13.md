---
title: "Resolve Creative Generation Settings at Backend Boundaries"
date: 2026-06-13
category: architecture-patterns
module: phase-15-generation-settings-export-packaging
problem_type: architecture_pattern
component: generation
severity: medium
applies_when:
  - "Adding project defaults and Shot-level generation overrides"
  - "Carrying creative intent into prompt previews, jobs, generated nodes, or export manifests"
  - "Recording optional subtitle, BGM, transition, or style-pack references"
related_components:
  - shared_generation_contracts
  - project_settings_api
  - prompt_composer
  - generation_jobs
  - editor_export_package
tags:
  - generation-settings
  - prompt-composer
  - export-manifest
  - metadata-trace
---

# Resolve Creative Generation Settings at Backend Boundaries

## Context

Phase 15 adds durable creative defaults and Shot overrides for style, aspect, narration, voice, subtitle, BGM, transition, and style-pack intent. The key boundary is that the browser can edit settings, but prompt composition, media jobs, generated node trace, and export manifests must all derive their effective settings from persisted project and canvas facts.

## Guidance

Store project defaults on `Project.generationSettingsJson` and Shot overrides on `ShotNode.dataJson.generationSettings`. Normalize both through shared helpers, then resolve `{ project, shot, effective, sources }` inside backend prompt, generation, and export services.

Do not let the browser submit a resolved settings snapshot for generation. The browser should save project or Shot settings, then queue jobs with provider execution options. The backend should read the latest persisted state and attach the resolved settings to `GenerationJob.inputJson`, generated media node data, and export clip/package metadata.

For export packaging, treat subtitle, BGM, transition, style pack, and marketing references as metadata states. `available` references can name a project Asset, `requested_unresolved` records desired downstream work, and missing fields mean absent. Optional unresolved references should not fail a valid selected-VideoNode export.

## Why This Matters

Creative settings change over time. If generated media only points at current project defaults, old ImageNodes, VideoNodes, and packages become unauditable after a creator changes style or narration settings. Capturing resolved settings at job and export time preserves the creative contract without blocking legacy records that have no metadata.

## When to Apply

- Adding another inheritance layer, such as scene-level settings.
- Adding real subtitle, audio, transition, or style-pack assets.
- Extending provider settings while keeping provider secrets server-side.
- Reviewing export manifest changes that add optional downstream editor intent.

## Related

- [Build Prompt Previews From Graph-Derived Debug Parts](./prompt-composer-graph-derived-debug-parts-2026-06-12.md)
- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
- [Treat Editor Export Packages as Backend-Owned Generation Side Effects](./editor-export-package-worker-boundary-2026-06-13.md)

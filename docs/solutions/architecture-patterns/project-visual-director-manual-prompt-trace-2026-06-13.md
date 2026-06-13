---
title: "Resolve Project Manuals With Field-Level Shot Overrides"
date: 2026-06-13
category: architecture-patterns
module: tf-08-project-visual-director-manual
problem_type: architecture_pattern
component: prompt-composer
severity: medium
applies_when:
  - "Adding longer-form project creative manuals to generation settings"
  - "Allowing Shot-level manual notes to override only selected manual fields"
  - "Showing manual guidance in prompt debug parts and generated media trace"
related_components:
  - shared_generation_contracts
  - prompt_composer
  - backend_generation_api
  - frontend_canvas_inspector
tags:
  - generation-settings
  - visual-manual
  - director-manual
  - prompt-debug
  - traceability
---

# Resolve Project Manuals With Field-Level Shot Overrides

## Context

TF-08 adds longer visual and director manuals to the existing project/Shot generation settings path. Unlike compact scalar settings such as aspect ratio, manuals are multi-field objects: a Shot might need its own lens note while still inheriting the project's palette, lighting, and style rules.

## Guidance

Keep manuals inside the existing creative settings boundary so prompt preview, generation jobs, generated media trace, and exports all continue to derive from one resolved settings snapshot.

Do not use the generic top-level override behavior for manual objects. Merge visual and director manuals field by field:

- a populated Shot manual field overrides the matching Project field;
- an absent Shot manual field inherits the Project field;
- empty strings normalize away before resolution;
- prompt debug lines retain the source for each field.

Represent manuals as distinct prompt debug parts instead of appending long text into the compact generation settings part. This keeps art-direction guidance and director/camera guidance reviewable without hiding provider or packaging settings.

## Why This Matters

If a Shot-level manual object replaced the whole Project manual, a small local note would silently erase inherited style rules from the effective prompt. Field-level inheritance keeps local direction precise while preserving project consistency.

Capturing the resolved manual snapshot on generation jobs and generated media keeps old outputs auditable after the creator edits the project manual later.

## When to Apply

- Adding scene-level or sequence-level creative manuals.
- Adding manual templates or versioned manual history.
- Reviewing prompt debug changes that mix project-wide guidance with Shot-specific overrides.

## Related

- [Resolve Creative Generation Settings at Backend Boundaries](./generation-settings-export-trace-2026-06-13.md)
- [Build Prompt Previews From Graph-Derived Debug Parts](./prompt-composer-graph-derived-debug-parts-2026-06-12.md)

---
date: 2026-06-13
topic: tf-13-skill-file-management
status: completed
---

# TF-13 Skill File Management Requirements

## Summary

Add project-scoped skill template management backed by repository skill files and persisted version history. Story, art, production, and agent templates must be editable in settings, rollbackable by activating older valid versions, and used as plain prompt text by subsequent prompt and agent generation paths.

## Problem Frame

Prompt and agent behavior is currently controlled by scattered fields, hard-coded composer rules, and deterministic agent parsing. TF-13 calls for file-based skill templates without treating skills as executable code. The first implementation needs a clear boundary: templates are prompt text, not runtime modules, and their active versions must be auditable in generation inputs.

## Requirements

- R1. Seed default story, art, production, and agent skill templates from `data/skills/*`.
- R2. Store project-scoped skill templates and version history backend-side.
- R3. Allow users to edit template text from settings; every save creates a new version.
- R4. Validate template text as non-executable prompt content and mark invalid versions without activating them.
- R5. Allow activating an earlier valid version as rollback.
- R6. Include active story/art/production templates in Shot prompt composition.
- R7. Include active agent-related templates in `agent_canvas_action` job input for auditability.
- R8. Keep the UI compact and colocated with existing project settings.

## Acceptance Examples

- AE1. Given a new project, listing skill templates returns seeded story, art, production, and agent templates from `data/skills`.
- AE2. Given a user edits the Art template, the backend stores version 2 and the next Shot prompt contains the edited Art template text.
- AE3. Given version 2 is active, activating version 1 makes subsequent prompts use version 1 text again.
- AE4. Given a template source contains executable-looking code, it is stored as invalid and cannot be activated.
- AE5. Given an agent canvas action runs, the generated job input includes active skill template ids and a summary.

## Scope Boundaries

- No arbitrary code execution, imports, scripts, or runtime function hooks.
- No marketplace, cross-project sharing, or skill permissions model.
- No semantic diff UI; version rollback is activation by version id.
- No automatic LLM skill synthesis in this slice.

## Key Decisions

- Use JSON seed files with plain `sourceText` fields under `data/skills/`.
- Use string `kind`/`slug` fields in Prisma to keep the taxonomy flexible.
- Treat invalid edits similarly to programmable provider invalid versions: stored for review, not active.
- Surface active skill use through prompt debug parts and agent job input.

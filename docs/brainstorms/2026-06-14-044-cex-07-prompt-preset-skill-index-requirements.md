---
title: "CEX-07 Prompt Preset and Skill Index Requirements"
type: requirements
status: completed
date: 2026-06-14
source: docs/codex-reference-long-task-execution-checklist.md#cex-07
---

# CEX-07 Prompt Preset and Skill Index Requirements

## Context

guga-flow already has project-scoped `SkillTemplate` records with versioned
plain prompt text. CEX-07 should use that as the canonical prompt preset store
instead of creating a second prompt library. The missing layer is searchable
metadata: preset category, trigger mode, Agent role attribution, index status,
and a summary safe for Agent prompt injection.

## Requirements

- R1. Shared types define prompt preset categories for `ai-image`, `ai-text`,
  `ai-video`, `ai-audio`, `story`, `production`, and `agent`.
- R2. Skill template summaries expose preset categories, trigger modes, Agent
  role attribution, index status, and a compact active-version summary.
- R3. Backend skill listing can filter by query, category, trigger mode, Agent
  role, and explicit template ids.
- R4. Agent canvas actions inject only matching skill summaries by role by
  default, while prompt composer/generation paths can still load selected active
  template text.
- R5. Settings UI lets users search and filter presets/skills, inspect
  attribution and diagnostics, edit source text, and roll back versions.
- R6. Canvas generation UI can select a compatible preset and send its active
  template id with generation requests; free-text refinement can insert preset
  text into the prompt draft.

## Scope Boundaries

- Do not add embedding generation or vector search in CEX-07; use deterministic
  text/category/role filters and leave embedding as a later index upgrade.
- Do not execute arbitrary skill code. Skill templates remain plain prompt text.
- Do not copy reference project prompt files, thumbnails, or assets.
- Do not add provider-specific prompt execution logic beyond passing selected
  template ids into existing generation composition.

## Acceptance Examples

- AE1. A project lists default story/production/agent and AI image/text/video/audio
  prompt presets with metadata and ready/invalid/disabled/missing-description
  diagnostic status.
- AE2. Searching `video` or filtering `ai-video` returns only compatible
  templates.
- AE3. A production Agent action receives production-role skill summaries rather
  than every full active skill source.
- AE4. A Shot image generation request can include a selected template id, and
  the backend prompt composer includes that active template version.
- AE5. An Image refinement user can insert an AI image preset into the prompt
  draft before generating.

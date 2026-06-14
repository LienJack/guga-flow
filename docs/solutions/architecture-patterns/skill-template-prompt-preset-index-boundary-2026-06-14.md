---
title: "Use SkillTemplate as the Prompt Preset Index"
date: 2026-06-14
category: architecture-patterns
module: cex-07-prompt-preset-skill-index
problem_type: architecture_pattern
component: skill_templates
severity: medium
applies_when:
  - "Adding prompt presets for canvas generation nodes"
  - "Indexing prompt skills by category, trigger mode, or Agent role"
  - "Injecting skill context into Agent or generation jobs"
  - "Avoiding duplicate prompt library storage"
related_components:
  - skill_templates
  - prompt_composer
  - agent_canvas_actions
  - generation_actions
  - settings_center
tags:
  - prompt-presets
  - skill-templates
  - agent-attribution
  - semantic-index
  - plain-text-skills
---

# Use SkillTemplate as the Prompt Preset Index

## Context

CEX-07 combined AI-CanvasPro prompt presets with Toonflow-style skill indexing.
guga-flow already had `SkillTemplate` records with version history, diagnostics,
activation, and project scoping. Creating a separate prompt preset table would
have split prompt source, versioning, diagnostics, and settings UI into two
parallel systems.

## Guidance

Treat `SkillTemplate` as the canonical prompt preset store. Add deterministic
index metadata around it:

- preset category: `ai-image`, `ai-text`, `ai-video`, `ai-audio`, `story`,
  `production`, or `agent`;
- trigger mode: insert prompt or direct generate;
- Agent role attribution;
- index status: ready, disabled, missing description, or invalid source;
- active-version summary for Agent prompt injection.

The database can keep storing plain prompt source, active version id, enabled
state, and description. Metadata that follows from `kind` can live in shared
types so backend, frontend, prompt composer, and Agent orchestration all filter
the same way.

## Backend Boundary

Browser requests may pass selected `skillTemplateIds`, but not prompt source
text. The backend resolves active versions through `SkillTemplatesService` and
feeds trusted prompt text into the prompt composer.

Agent actions should request role-matching contexts and store summaries in job
input. Full source remains available through the skill template service when a
tool or composer path explicitly needs it.

Do not execute skill templates as code. Validation keeps rejecting imports,
exports, functions, script tags, and other code-like text.

## Why It Works

The pattern keeps one source of truth for prompt presets and skill templates:

- settings can search, filter, edit, diagnose, and roll back one object type;
- generation UI can select a compatible preset id without moving prompt text
  through the browser;
- Agent jobs receive concise summaries scoped to their role;
- future embedding search can index the same summaries and source versions
  without changing persistence again.

## Reuse Guidance

When adding a new prompt preset family:

- add the category or kind to shared skill metadata;
- seed default plain-text templates under `data/skills`;
- use `listSkillTemplates` filters in UI instead of duplicating search logic;
- pass selected template ids to backend composition/generation paths;
- keep provider-specific prompt formatting in generation/provider layers.

Only introduce a new table if prompt presets need lifecycle semantics that
`SkillTemplate` cannot represent, such as non-text binary preset assets or
cross-project marketplace distribution.

## Verification

CEX-07 verified the pattern with:

- shared type lint, tests, and build;
- backend skill, prompt, Agent, and generation tests;
- frontend API, settings, and generation action tests;
- repository-wide lint/tests and production frontend build.

## Related

- [Validate Canvas Input Slots Before Writing Semantic Edges](./canvas-input-slot-policy-boundary-2026-06-14.md)
- [Keep Canvas Node Taxonomy in a Shared Registry](./canvas-node-taxonomy-registry-2026-06-14.md)
- [CEX-07 plan](../../plans/2026-06-14-044-feat-cex-07-prompt-preset-skill-index-plan.md)

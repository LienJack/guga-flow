---
date: 2026-06-13
topic: skill-template-plain-text-version-boundary
status: accepted
---

# Skill Template Plain Text Version Boundary

## Context

TF-13 needs Toonflow-style story, art, production, and agent skill management, but the app must not turn editable skills into arbitrary code execution. Prompt and agent behavior also needs an audit trail that shows which template text influenced a generation path.

## Decision

Seed defaults from `data/skills/*.json` and persist project copies as `SkillTemplate` plus `SkillTemplateVersion` rows. The only editable runtime payload is `sourceText`, treated as plain prompt text.

New source saves create versions. Valid versions become active; invalid versions are retained with diagnostics but cannot be activated. Rollback is modeled as activating an earlier valid version.

## Consequences

- Prompt composition can include active story/art/production templates as `skill_template` debug parts.
- Agent canvas actions can record active template ids and summaries in `GenerationJob.inputJson`.
- Settings can provide editing and rollback without a code sandbox or plugin runtime.
- Future executable skills, if ever needed, require a separate OS/container sandbox design rather than extending this plain-text path.

## Guardrails

- Default files are JSON data, not TS/JS modules.
- Validation marks imports, exports, functions, `require(...)`, arrow functions, and script tags invalid.
- Invalid versions are audit-visible but inactive.
- Template text is project-scoped; there is no cross-project marketplace or sharing boundary in this slice.

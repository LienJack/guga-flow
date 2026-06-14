---
title: feat: Complete CEX-03 Agent deployment center
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-039-cex-03-agent-deployment-center-requirements.md
---

# feat: Complete CEX-03 Agent Deployment Center

## Summary

Create a project-scoped Agent role deployment center that resolves Agent roles to LLM provider/model configuration, exposes simple and advanced settings, and blocks Agent execution when role config is invalid.

## Scope Boundaries

- Do not implement real LLM Agent generation, streaming, or tool orchestration.
- Do not add Agent-specific provider secrets.
- Do not add historical deployment versions beyond an incrementing config version.
- Do not copy Toonflow prompts, deploy UI code, or runtime internals.

## Requirements

- R1. Support roles: script, production, universal, supervision, skeleton, adaptation, storyboard, asset, video prompt.
- R2. Simple mode makes every role inherit one primary provider/model.
- R3. Advanced mode allows role-specific provider/model overrides.
- R4. Runtime resolution validates provider/model availability, enabled state, and credential readiness through CEX-02 provider management.
- R5. Settings center exposes readable deploy controls and issues.
- R6. Agent job input records role/provider/model without credentials.
- R7. Invalid config fails before a `GenerationJob` is created.

## Implementation Units

- U1. **Shared Agent deployment contracts**
  - Modify `packages/shared-types/src/domain/agent.ts`.
  - Add roles, modes, role config, deployment record/result/update types, and `role` on Agent canvas action inputs.
  - Extend shared domain tests.

- U2. **Backend persistence and role resolution**
  - Add `AgentDeployment` Prisma model and migration.
  - Add AgentsService methods to get/update deployment, resolve a role, validate against LLM provider management, and record resolved role/provider/model in Agent jobs.
  - Add controller endpoints for get/update/resolve.
  - Extend backend Agent tests.

- U3. **Frontend settings center**
  - Add API helpers and tests.
  - Add an Agent deployment settings panel under settings center.
  - Support simple primary model selection and advanced per-role overrides.

- U4. **Validation and learning capture**
  - Run focused/shared/backend/frontend/workspace tests.
  - Capture solution learning for Agent role runtime config resolution.
  - Mark this plan completed after verification.

## Verification Targets

- `pnpm --filter @guga-flow/shared-types run lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/backend run lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm --filter @guga-flow/frontend run lint`
- `pnpm --filter @guga-flow/frontend test`
- `pnpm -r lint`
- `pnpm -r test`

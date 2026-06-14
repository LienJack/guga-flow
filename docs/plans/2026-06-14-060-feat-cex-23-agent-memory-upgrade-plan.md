# CEX-23 Agent Memory Upgrade Plan

Date: 2026-06-14
Status: completed

## Goal

Upgrade AgentMemory contracts and behavior with typed, role/context-aware,
safe, token-budgeted recall while keeping existing records compatible.

## Implementation Units

### U1 Shared Contracts

- Add memory types: message, summary, manual preference, tool result.
- Extend memory records and inputs with type, role, context node, token estimate,
  and safety-filter fields.
- Extend recall input with role, context node, and token budget.

### U2 Backend

- Store memory metadata in `tagsJson` as a backward-compatible object.
- Continue reading legacy array-only tags.
- Sanitize memory content for secret-like tokens and local absolute paths.
- Estimate tokens and record safety-filter status.
- Filter recall by Agent role/context and enforce token budget.

### U3 Frontend

- Add memory type and role controls to the Agent memory form.
- Save selected canvas node id as memory context.
- Show type, role, context, tags, and filtered status in memory rows.

### U4 Verification

- Add shared/backend/frontend tests.
- Run targeted checks, repository lint/test, frontend production build, and
  whitespace diff check.
- Commit the completed module.

## Scope Boundaries

- Do not add vector search or embedding infrastructure yet.
- Do not default to saving every Agent/user message.
- Do not introduce a Prisma migration for this metadata-only upgrade.

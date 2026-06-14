# Agent Memory Compatible Metadata

Date: 2026-06-14
Status: accepted

## Context

CEX-23 needs typed memory, role/context isolation, summary/token strategy, and
safe prompt injection. Existing AgentMemory rows have a simple schema with
`tagsJson`, and existing records store tags as an array.

## Decision

- Keep the Prisma schema unchanged for this module.
- Store upgraded memory metadata in `tagsJson` as an object containing tags,
  type, optional agentRole, optional contextNodeId, tokenEstimate, and
  safetyFiltered.
- Treat legacy array `tagsJson` as tags with `manual_preference` type.
- Sanitize memory content before storage by redacting secret-like tokens and
  local absolute paths.
- Estimate token usage from sanitized content and enforce recall token budgets.
- Recall role/context-specific memories only when they match the requested
  Agent role or context node.
- Keep memory creation manual through the UI; do not automatically persist every
  user message.

## Consequences

- Existing memory rows remain readable without migration.
- Agent prompt injection can include safer, bounded memory summaries.
- Future embedding/vector recall can add indexes without changing the public
  memory contracts.
- Users can inspect, disable, and clear typed memories in the existing Agent
  panel.

## Verification

- Shared tests cover upgraded memory contracts.
- Backend tests cover metadata storage, legacy compatibility, role/context
  recall filtering, token budget, and secret/path sanitization.
- Frontend tests cover the memory type/role controls.
- Repository lint/test and Next production build pass.

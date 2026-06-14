# CEX-23 Agent Memory Upgrade Requirements

Date: 2026-06-14
Status: completed

## Source

- Checklist item: CEX-23
- Reference module: TFR-25

## Product Need

Agent memory should move beyond manual notes while staying safe. Users need
typed memories for preferences, summaries, messages, and tool results, with
project/role/context isolation and token-aware recall. The system must not
silently persist every user input or store secrets.

## Required Outcomes

- Memories expose type, optional Agent role, optional context node, token
  estimate, and safety-filter status.
- Existing memory records remain readable.
- Create/update memory sanitizes raw secrets and local absolute paths.
- Recall can filter by Agent role and context node.
- Recall respects a token budget before injecting memory summaries into Agent
  prompts.
- Users can continue to view, disable, and clear memories from the Agent panel.

## Non-Goals

- No vector database or ONNX embedding runtime in this module.
- No automatic persistence of all chat/user input.
- No Prisma schema migration; metadata is stored compatibly in `tagsJson`.
- No raw provider key or raw secret in memory content.

## Acceptance Gates

- Agent recall returns project preferences and context-matching memories.
- Script-only memories are not recalled for production-only context.
- Memory summaries are token-budgeted.
- Memory UI shows type/role/context metadata.
- Secret/path filtering is covered by tests.

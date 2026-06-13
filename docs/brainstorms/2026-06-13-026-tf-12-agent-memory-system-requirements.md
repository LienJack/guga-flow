---
date: 2026-06-13
topic: tf-12-agent-memory-system
status: completed
---

# TF-12 Agent Memory System Requirements

## Summary

Add a project-scoped agent memory system that stores creator preferences and reusable context as visible, controllable records. Agent actions can recall enabled memories, but memories must remain inspectable, disableable, and clearable instead of being hidden inside prompt text.

## Problem Frame

TF-11 added auditable canvas actions, but each message is stateless. The roadmap calls for project-level and agent-level memory with summary and recall while keeping memory visible and controllable. Without a durable memory boundary, later LLM agent work would either forget project preferences or smuggle them into prompts with no clear audit path.

## Assumptions

- The first memory slice can use deterministic keyword/tag recall rather than embeddings.
- Memory records should be project-scoped now; agent-level scope can be represented as a field without introducing multiple agent identities yet.
- Agent canvas actions should record which memory ids were recalled in job input for auditability.

## Actors

- A1. Creator: stores project preferences such as visual tone, recurring constraints, or production rules.
- A2. Agent operator: wants agent actions to reuse relevant preferences without manually repeating them.
- A3. System auditor: needs to view, disable, clear, and trace memory usage.

## Key Flows

- F1. Add project memory
  - **Trigger:** A creator stores a preference from the canvas sidebar.
  - **Outcome:** A durable memory record exists with title, content, summary, tags, scope, enabled state, and timestamps.

- F2. Recall memory during an action
  - **Trigger:** A creator submits an agent canvas action.
  - **Outcome:** Enabled memories matching the message or tags are included in the action job input by id and summary.

- F3. View, disable, and clear memory
  - **Trigger:** A creator reviews memory records.
  - **Outcome:** The UI exposes existing memories, allows disabling a memory, and can clear memory records for the project.

## Requirements

**Memory persistence**
- R1. Store agent memories in backend-owned project records, not browser-only state.
- R2. Each memory must include scope, title, content, summary, tags, source, enabled state, and timestamps.
- R3. Memory content must be returned to the frontend for review; there is no hidden prompt-only memory.

**Recall**
- R4. Agent canvas actions must recall enabled project memories using deterministic matching and record recalled ids in `GenerationJob.inputJson`.
- R5. Recall must be bounded and deterministic so tests can verify which memories are used.

**Control**
- R6. Users must be able to disable individual memories.
- R7. Users must be able to clear project memories.
- R8. Disabled memories must not be recalled by agent canvas actions.

## Acceptance Examples

- AE1. **Covers R1-R3.** Given a project, when a user creates memory "Use rainy neon palette", the backend returns a visible enabled memory record with summary and tags.
- AE2. **Covers R4-R5.** Given enabled memories tagged `style`, when a user submits an agent action mentioning rainy neon, the `agent_canvas_action` job input includes the matching memory id.
- AE3. **Covers R6-R8.** Given a memory is disabled, when the user submits a related agent action, the job input does not include that memory id.
- AE4. **Covers R7.** Given multiple project memories, when the user clears project memory, the list returns empty and subsequent recall returns no memories.

## Scope Boundaries

- No vector database, embeddings, semantic ranker, or long-term cross-project profile.
- No opaque prompt injection; memory ids and summaries must be audit-visible.
- No multi-agent identity management beyond `project` and `agent` scope fields.
- No automatic memory extraction from every action in this slice.

## Key Decisions

- Use deterministic substring/tag matching for the first implementation.
- Store a generated summary as a compact truncation of memory content until real summarization exists.
- Integrate memory recall into TF-11 agent action jobs so memory usage is traceable immediately.

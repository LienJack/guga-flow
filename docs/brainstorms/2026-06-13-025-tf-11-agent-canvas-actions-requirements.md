---
date: 2026-06-13
topic: tf-11-agent-canvas-actions
status: completed
---

# TF-11 Agent Canvas Actions Requirements

## Summary

Add a chat-style canvas action entry that lets a creator ask the system to create or modify canvas nodes while preserving the existing canvas-first architecture. Every accepted action must be recorded as a durable generation job and must mutate the same `CanvasNode` and `CanvasEdge` records used by manual workflows.

## Problem Frame

Phase 13 added a one-sentence creative entry for storyboard generation, but it explicitly deferred conversational canvas edits. TF-11 closes the next gap by adding a constrained agent action loop for direct canvas operations without turning the browser into an unsupervised graph writer or introducing opaque memory/state.

## Assumptions

- The first TF-11 slice can use a deterministic command interpreter rather than a real streaming LLM agent.
- `GenerationJob.operation=agent_canvas_action` is the right audit primitive for action history because the roadmap requires actions to land as normal project artifacts and be inspectable.
- Undo only needs to cover actions this agent created or updated in the current audit record; broad multi-step history belongs to later workflow/history work.

## Actors

- A1. Creator: asks for a scene, shot, character, location, or note-like canvas change from a chat-style prompt.
- A2. Professional editor: reviews and adjusts the resulting normal canvas nodes through existing inspector controls.
- A3. System auditor: verifies that each agent action has a persisted job record and explicit output artifact ids.

## Key Flows

- F1. Create a canvas node from chat
  - **Trigger:** A creator submits a message such as "create a shot: rain-soaked alley chase".
  - **Steps:** The backend validates the message, records a running `agent_canvas_action` job, plans a supported node creation, creates a `CanvasNode`, then marks the job succeeded with the created node id.
  - **Outcome:** The node appears on the canvas and the job history explains which message created it.

- F2. Update an existing selected node
  - **Trigger:** A creator submits a message while a canvas node is selected, such as "update title to Rain reveal".
  - **Steps:** The backend validates the target node, captures its previous snapshot, updates the normal node record, and writes the before/after ids into the action job.
  - **Outcome:** The selected node is changed through the same server boundary manual updates use.

- F3. Link supported nodes
  - **Trigger:** A creator asks to link two selected/known nodes with a supported relation.
  - **Steps:** The backend validates source and target nodes, applies the existing semantic edge rules, creates the `CanvasEdge`, and records the edge id in the job output.
  - **Outcome:** The graph gains a normal semantic edge or rejects the request with a clear error.

- F4. Undo the last supported action
  - **Trigger:** A creator clicks undo for a previously succeeded agent action.
  - **Steps:** The backend reads the job output, removes created edges/nodes or restores updated node snapshots when still safe, and marks the original job output as undone.
  - **Outcome:** The canvas returns to the pre-action state for supported actions and the audit record shows the undo.

## Requirements

**Agent action entry**
- R1. The canvas workspace must expose a compact chat-style agent action panel without replacing existing form/manual workflows.
- R2. The backend must accept project-scoped agent messages and support a small, documented command set for creating scene, shot, character, location, image, video, editor package, or note-like canvas content where allowed by existing node types.
- R3. Unsupported or ambiguous messages must fail with a readable explanation instead of guessing destructive edits.

**Durability and audit**
- R4. Every accepted agent action must create a durable `GenerationJob` with operation `agent_canvas_action`, provider `local-agent`, input message/context, status, output artifacts, and error state.
- R5. Canvas mutations must be persisted as normal `CanvasNode` and `CanvasEdge` records; the browser must not synthesize durable graph state on its own.
- R6. Successful action output must include enough artifact ids for the frontend to refresh/focus created or updated nodes.

**Undo and safety**
- R7. Undo must be limited to supported, succeeded agent jobs and must be safe when artifacts were already deleted or changed by later manual edits.
- R8. Node updates must preserve a previous snapshot in the job output so rollback does not require hidden browser state.
- R9. Edge creation must reuse the existing semantic validation rules rather than inventing agent-specific graph rules.

## Acceptance Examples

- AE1. **Covers R1-R6.** Given an empty project canvas, when a user submits `create shot: heroine sees a glowing subway entrance`, the backend creates a Shot `CanvasNode`, returns it, and writes a succeeded `agent_canvas_action` job containing the message and created node id.
- AE2. **Covers R2, R3, R4.** Given a user submits `delete everything`, the backend creates a failed action job with a readable unsupported-command error and does not delete canvas records.
- AE3. **Covers R7, R8.** Given a user updates a selected node title through the agent, when they undo that job, the node title is restored from the job snapshot and the job output records `undoneAt`.
- AE4. **Covers R5, R9.** Given a character node and a shot node, when the user asks to link them, the backend creates a `references_character` edge through the same semantic rules used by manual edge creation.
- AE5. **Covers R1, R6.** Given an agent action succeeds, the frontend refreshes the canvas and offers a focus/undo affordance without hiding the existing inspector controls.

## Scope Boundaries

- No real LLM provider, streaming token UI, autonomous multi-step planning, background agent queue, or long-term memory. TF-12 owns memory.
- No broad deletion command and no destructive bulk graph operations.
- No replacement for the storyboard import pipeline, inspector forms, or generation action buttons.
- No new hidden canvas state model; the action panel composes existing backend graph mutations.

## Key Decisions

- Use a deterministic parser for the first agent action slice so tests can verify behavior without provider variance.
- Persist audit through `GenerationJob` rather than a separate chat transcript table for TF-11. If later chat history needs richer threads, it can reference job ids.
- Implement undo against the job output snapshots, not against frontend state or tldraw undo, so recovery works after refresh.

## Dependencies / Assumptions

- Existing canvas node and edge services remain the authoritative graph mutation boundary.
- Existing generation history UI can list the new operation once shared types and Prisma enum values include it.
- Existing frontend canvas refresh/focus mechanisms can be reused after agent actions.

## Outstanding Questions

### Deferred to Planning

- Should the service live inside the canvas module or a new agent module?
- Which exact command grammar gives enough utility without encouraging unsupported destructive edits?

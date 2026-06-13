---
title: "Keep Agent Memory Visible and Traceable"
date: 2026-06-13
category: architecture-patterns
module: tf-12-agent-memory-system
problem_type: architecture_pattern
component: assistant
severity: medium
applies_when:
  - "Adding project-scoped agent memory"
  - "Recalling creator preferences during agent actions"
  - "Avoiding hidden prompt-only context"
  - "Making memory disable and clear operations auditable"
related_components:
  - backend_agents_api
  - generation_jobs
  - frontend_canvas_workspace
  - agent_canvas_actions
tags:
  - agent-memory
  - recall
  - generation-job
  - audit
  - canvas
---

# Keep Agent Memory Visible and Traceable

## Context

TF-12 adds memory after TF-11 introduced auditable canvas actions. The important boundary is not the recall algorithm; it is whether memory remains visible, controllable, and traceable when an agent action uses it.

## Guidance

Store memory as project-owned records with explicit fields:

- scope
- title
- content
- summary
- tags
- source
- enabled state

Recall should return records and ids, not anonymous prompt text. When an agent action uses memory, write the recalled memory ids and summary into the `GenerationJob.inputJson` for that action.

```text
AgentMemory -> recall(query) -> memoryIds + summary
Agent action input -> GenerationJob.inputJson.memoryIds
Canvas mutation -> CanvasNode/CanvasEdge records
```

Disabled memories must stay visible but must not be recalled. Clearing memory should be an explicit backend operation, not a browser-local reset.

For the first slice, deterministic keyword/tag recall is enough. It is bounded, testable, and does not add a vector database or ranking system before there is a concrete retrieval need.

## Why This Matters

Prompt-only memory creates hidden product state. A user cannot inspect it, disable it, or know why an agent action followed a stale preference. Recording memory ids in the job input keeps agent behavior explainable and gives future real LLM orchestration a durable audit path.

## When to Apply

- Adding memory to agent actions, chat flows, or prompt composition.
- Reviewing whether recalled context is visible to users.
- Adding disable/clear controls for project preferences.
- Preparing for later semantic recall or embeddings.

## Examples

The action input should expose recalled memory:

```ts
const recall = await agentsService.recallMemories(projectId, {
  query: message,
  limit: 5,
});

const inputJson = {
  operation: "agent_canvas_action",
  message,
  memoryIds: recall.memoryIds,
  memorySummary: recall.summary,
};
```

The recall implementation can stay simple until better evidence exists:

```ts
const terms = query.toLowerCase().split(/\W+/).filter((term) => term.length >= 2);
const matches = memories.filter((memory) =>
  terms.some((term) => `${memory.title} ${memory.content} ${memory.tags.join(" ")}`.includes(term)),
);
```

## Related

- [Record Agent Canvas Actions as Generation Job Audits](./agent-canvas-action-generation-job-audit-2026-06-13.md)
- [Model Lightweight Agent Entry as a Backend-Completed Generation Job](./light-agent-entry-generation-job-boundary-2026-06-13.md)
- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)

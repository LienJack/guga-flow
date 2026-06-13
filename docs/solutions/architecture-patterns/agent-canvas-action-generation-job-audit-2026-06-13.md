---
title: "Record Agent Canvas Actions as Generation Job Audits"
date: 2026-06-13
category: architecture-patterns
module: tf-11-agent-canvas-actions
problem_type: architecture_pattern
component: assistant
severity: medium
applies_when:
  - "Adding chat-style canvas operations"
  - "Creating or updating CanvasNode records from agent messages"
  - "Auditing agent-like side effects without a full agent runtime"
  - "Implementing undo for backend-owned canvas mutations"
related_components:
  - backend_agents_api
  - backend_canvas_api
  - generation_jobs
  - frontend_canvas_workspace
  - semantic_canvas_edges
tags:
  - agent-actions
  - generation-job
  - canvas
  - audit
  - undo
---

# Record Agent Canvas Actions as Generation Job Audits

## Context

TF-11 adds direct conversational canvas operations after the lighter Phase 13 creative-brief flow. The risk is creating a parallel agent graph model: a chat transcript says one thing, `CanvasNode`/`CanvasEdge` records say another, and undo only works in browser memory.

The safer pattern is to make each accepted agent message a normal backend action with a `GenerationJob` audit record and normal canvas mutations.

## Guidance

Treat the agent message as input to a backend-owned action interpreter. Create a running `GenerationJob` first, execute exactly one supported graph mutation, then complete or fail the job.

```text
Browser -> Backend: message, selected/source/target node ids
Backend -> GenerationJob: operation=agent_canvas_action, status=running
Backend -> CanvasService: create node, update node, or create semantic edge
Backend -> GenerationJob: status=succeeded, output={ artifact ids, snapshots }
Browser -> Backend: optional undo(jobId)
Backend -> CanvasService/Prisma: safe rollback based on job output
```

Keep the graph writes in the same services used by manual workflows. Agent-created nodes should call `CanvasService.createNode`; agent-created links should call `CanvasService.createEdge`; undo for links should call `CanvasService.deleteEdge` so denormalized Shot reference fields are cleaned up consistently.

Store enough output for review and rollback:

- created node ids, node types, and titles
- created edge ids, source/target ids, and relation
- previous node snapshots for updates
- `undoneAt` and rollback artifact ids once undo succeeds

Do not infer destructive operations from broad language. The first deterministic slice should prefer explicit, testable commands such as `create shot: ...`, `update title: ...`, and `link character`. Unsupported messages can still produce failed audit jobs, which makes user intent visible without mutating graph state.

Undo must be conservative. Delete a created node only when it still carries the original agent action metadata, still matches the recorded title/type, and has no attached edges. Restore an updated node only when its current value still matches the agent output. This avoids clobbering later manual edits.

## Why This Matters

Canvas state already has durable ownership boundaries. If agent actions bypass those boundaries, the app gets two sources of truth and future prompt composition, export packaging, and history tools become unreliable.

Using `GenerationJob` keeps action history inspectable without committing to a full chat-thread schema before TF-12 memory or later agent orchestration exists. The same job output also gives rollback a server-side source of truth that survives refresh.

## When to Apply

- Adding a chat panel that directly changes project artifacts.
- Letting an LLM or deterministic interpreter create canvas graph records.
- Adding undo for backend-owned side effects.
- Reviewing whether an agent feature is leaking durable state into frontend-only memory.

## Examples

The action lifecycle is:

```ts
const job = await prisma.generationJob.create({
  data: {
    projectId,
    operation: "agent_canvas_action",
    status: "running",
    provider: "local-agent",
    inputJson,
  },
});

try {
  const node = await canvasService.createNode(projectId, input);
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { status: "succeeded", outputJson },
  });
} catch (error) {
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { status: "failed", errorMessage: message },
  });
  throw error;
}
```

The rollback guard is:

```ts
if (
  current.title === output.createdNodes[0].title &&
  current.dataJson.agentAction?.jobId === job.id &&
  attachedEdges.length === 0
) {
  await prisma.canvasNode.deleteMany({ where: { id: current.id, projectId } });
}
```

## Related

- [Model Lightweight Agent Entry as a Backend-Completed Generation Job](./light-agent-entry-generation-job-boundary-2026-06-13.md)
- [Project Semantic Canvas Edges Into tldraw Arrows](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
- [Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)

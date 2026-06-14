---
title: "CEX-06 Node Input Slots Requirements"
type: requirements
status: completed
date: 2026-06-14
source: docs/codex-reference-long-task-execution-checklist.md#cex-06
---

# CEX-06 Node Input Slots Requirements

## Context

CEX-06 builds on CEX-04 node taxonomy and CEX-05 source media nodes. guga-flow
already has semantic canvas edges, but connections do not yet carry slot,
input-kind, role, order, or count policy metadata. That becomes ambiguous as
source media and AI generation nodes enter the graph.

## Requirements

- R1. Shared types define input kinds, input roles, slot definitions, slot
  policies, and connection validation results.
- R2. Existing source media, business, image, and video nodes can resolve
  compatible upstream references into slot metadata.
- R3. Frontend edge creation writes slot id, input kind, input role, and order
  into `CanvasEdge.dataJson` where a slot policy applies.
- R4. Backend edge creation repeats type/count validation before writing the
  edge and returns readable errors for type mismatch and count overflow.
- R5. Existing semantic character/location facts remain intact and do not get
  replaced by a generic workflow DAG.
- R6. Cross-canvas-page validation remains enforced by the backend.

## Scope Boundaries

- Do not replace `CanvasEdgeRelation`.
- Do not add AI text/audio node execution; CEX-08/CEX-09 will consume this slot
  vocabulary.
- Do not implement provider model discovery checks for every model; expose a
  place for model capability errors but keep CEX-06 validation focused on node
  type and slot counts.
- Do not migrate existing edges; new slot-aware edges can coexist with old
  semantic edges.

## Acceptance Examples

- AE1. A source image can connect to an Image node with `reference_image` slot
  metadata.
- AE2. A source audio can connect to a Video node with `reference_audio` slot
  metadata.
- AE3. A source audio cannot connect to an Image node and receives a readable
  type-mismatch error.
- AE4. A second edge into a single-connection slot is rejected before persistence.
- AE5. Existing Character -> Shot and Location -> SceneFrame semantic behavior
  still updates business facts.

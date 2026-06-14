---
title: "Make AI Text a Task-Backed Canvas Node"
date: 2026-06-14
category: architecture-patterns
module: cex-08-ai-text-node-references
problem_type: architecture_pattern
component: generation
severity: medium
applies_when:
  - "Adding LLM-backed text generation to canvas nodes"
  - "Referencing upstream canvas nodes as generation context"
  - "Persisting generated text for downstream image, video, script, or storyboard flows"
  - "Keeping provider secrets out of browser code"
related_components:
  - canvas_node_registry
  - generation_jobs
  - generation_worker
  - skill_templates
  - generation_actions
tags:
  - ai-text
  - generation-jobs
  - canvas-context
  - provider-boundary
  - prompt-presets
---

# Make AI Text a Task-Backed Canvas Node

## Context

CEX-08 adds an `ai_text` canvas node that can consume upstream text-producing
nodes and persist generated text back onto the canvas. The important product
boundary is that this is not a chat surface: the browser requests a generation
job, the backend resolves node context and provider settings, and the worker
returns deterministic text output through the same task lifecycle used by image
and video generation.

## Guidance

Represent AI Text as a first-class canvas node and generation operation:

- `ai_text` belongs to the AI generation family and produces text;
- its input slot accepts upstream prompt/context text through `derived_from`
  edges;
- `ai_text_generation` job input carries prompt, context items, provider/model,
  selected prompt preset ids, and source node trace;
- worker completion returns `AiTextGenerationJobOutput`;
- backend completion writes `outputText`, `contextSummary`, provider/model, job
  ids, input/output JSON, and source node ids back to the same node.

This keeps downstream image, video, script, storyboard, and prompt workflows
able to read a stable node data shape without scraping chat history.

## Backend Boundary

The browser may submit `textPrompt` and selected `skillTemplateIds`, but it does
not call LLM providers or send provider secrets. The backend validates the target
node, gathers upstream `derived_from` context from source text/media captions,
Shot, Character, Location, Novel, generated Image/Video, and prior AI Text
nodes, then resolves LLM provider/model from project provider management.

The worker receives only the already-resolved job input. In the MVP it returns a
deterministic mock text payload, which exercises task status, retry/cancel/fail,
and node persistence without introducing a second provider execution path.

## Why It Works

The pattern reuses the existing generation job lifecycle instead of adding a
parallel chat subsystem:

- active, failed, cancelled, retry, and queue states stay consistent with media
  generation;
- context references are explicit node ids, not hidden prompt text;
- downstream nodes can bind to `ai_text` through the shared input-slot policy;
- prompt presets travel as ids and are resolved server-side;
- provider runtime configuration remains worker-only.

## Reuse Guidance

When adding another text-producing canvas workflow:

- add node type, slots, and output kind in shared canvas contracts first;
- add a generation operation input/output pair in shared generation contracts;
- build job input from server-side canvas context, not from browser-composed
  context strings;
- persist output on a typed node data field that downstream flows can read;
- use worker success payloads that match the operation instead of overloading
  media provider outputs.

Only introduce streaming later if the UI needs progressive text display. The
task-backed contract should remain the durable persistence path.

## Verification

CEX-08 verifies this pattern with:

- shared type lint, tests, and build;
- backend generation service lint/tests for job creation and node writeback;
- worker executor/runner/client tests for AI Text completion;
- frontend node definition, toolbar, card, inspector, and generation action
  tests;
- repository-wide lint/tests and production frontend build.

## Related

- [Use SkillTemplate as the Prompt Preset Index](./skill-template-prompt-preset-index-boundary-2026-06-14.md)
- [Validate Canvas Input Slots Before Writing Semantic Edges](./canvas-input-slot-policy-boundary-2026-06-14.md)
- [Keep Canvas Node Taxonomy in a Shared Registry](./canvas-node-taxonomy-registry-2026-06-14.md)
- [CEX-08 plan](../../plans/2026-06-14-045-feat-cex-08-ai-text-node-references-plan.md)

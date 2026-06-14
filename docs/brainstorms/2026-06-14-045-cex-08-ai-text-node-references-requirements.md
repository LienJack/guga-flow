---
title: "CEX-08 AI Text Node References Requirements"
type: requirements
status: completed
date: 2026-06-14
source: docs/codex-reference-long-task-execution-checklist.md#cex-08
---

# CEX-08 AI Text Node References Requirements

## Context

guga-flow has LLM provider configuration, prompt presets, canvas source media,
and input-slot edges. It still lacks a first-class AI text canvas node that can
consume upstream node context and persist text output for later image/video,
script, storyboard, or prompt workflows.

## Requirements

- R1. Shared canvas types define an `ai_text` node with text input/output
  capability and data fields for prompt, output text, selected LLM, and source
  node trace.
- R2. Shared generation contracts define an `ai_text_generation` task input and
  text output shape that can be claimed by the worker.
- R3. Backend generation creation validates an AI Text node, gathers upstream
  text context from source text, Shot, Character, Location, Novel, and generated
  text nodes, and queues a `GenerationJob`.
- R4. Worker execution returns deterministic mock text output and persists it
  back to the AI Text node without exposing provider secrets to the browser.
- R5. Frontend canvas creation and node cards/inspector can display AI Text
  nodes and trigger text generation from the existing generation panel.

## Scope Boundaries

- Do not build a chat-only UI or multi-turn conversation product.
- Do not let the browser call LLM providers directly.
- Do not write ScriptDraft/document Asset export in this slice; persist node text
  and source trace first so later modules can project it.
- Do not implement streaming transport; use the existing GenerationJob lifecycle
  MVP.

## Acceptance Examples

- AE1. A user can add an AI Text node from the canvas toolbar.
- AE2. A source text, Shot, Character, or Location node connected upstream can
  appear in the generated task input as textual context.
- AE3. The worker completes an `ai_text_generation` job and writes output text
  plus source node ids to the target AI Text node.
- AE4. Text generation failure/retry/cancel continues through the existing
  GenerationJob status paths.
- AE5. Generation requests include selected prompt preset ids when provided, but
  raw prompt template text is resolved backend-side.

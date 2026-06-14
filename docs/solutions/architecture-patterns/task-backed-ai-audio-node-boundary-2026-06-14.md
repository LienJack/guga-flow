---
title: "Make AI Audio a Task-Backed Canvas Node"
date: 2026-06-14
category: architecture-patterns
module: cex-09-ai-audio-tts-binding
problem_type: architecture_pattern
component: generation
severity: medium
applies_when:
  - "Adding TTS or generated audio to canvas workflows"
  - "Combining upstream text context with voice or clip audio references"
  - "Persisting generated audio for Shot, Video, Character, or editor export use"
  - "Keeping audio provider execution outside browser code"
related_components:
  - canvas_node_registry
  - generation_jobs
  - generation_worker
  - asset_library
  - editor_export_manifest
tags:
  - ai-audio
  - tts
  - audio-assets
  - generation-jobs
  - editor-export
---

# Make AI Audio a Task-Backed Canvas Node

## Context

CEX-09 adds an `ai_audio` canvas node that can turn script text and upstream
voice references into a generated audio Asset. The important boundary is the
same as AI Text: the browser requests a generation job, the backend resolves
canvas context and references, the worker produces deterministic mock output,
and backend completion writes the durable result back to the canvas.

## Guidance

Represent generated audio as both a canvas node result and a normal project
Asset:

- `ai_audio` belongs to the AI generation family and produces audio;
- the default input slot accepts upstream text/prompt context, while audio
  sources resolve to the `voice_reference` slot;
- `ai_audio_generation` job input carries prompt/script text, upstream context,
  voice reference asset ids, provider/model, selected prompt preset ids, and
  source node trace;
- worker completion returns an audio-shaped media provider output;
- backend completion creates a generated audio Asset, then writes `assetId`,
  provider/model, duration, source ids, reference ids, and input/output JSON
  back to the same `ai_audio` node.

This keeps generated audio interoperable with the existing Character, Shot, and
Video audio binding fields instead of creating a second export path.

## Backend Boundary

The browser may submit `audioPrompt`, but it does not compose full canvas
context or execute a TTS provider. The backend validates the target node, gathers
upstream `derived_from` text, reads voice/audio references from Source Audio,
Character, Shot, and Video nodes, verifies referenced Assets are audio, and then
queues a resolved job input.

The first implementation is mock-first with `mock-audio` and `mock-tts-v1`.
That is deliberate: it exercises queueing, retry/fail/cancel, generated Asset
persistence, and editor export integration before introducing real TTS provider
management.

## Why It Works

The pattern extends the existing generation job lifecycle rather than adding a
parallel audio subsystem:

- generated audio uses the same active, failed, cancelled, and retry states as
  image/video/text jobs;
- voice references are explicit Asset ids with project validation;
- downstream Shot and Video nodes can bind generated audio through the existing
  `audioReferences` shape;
- editor exports already understand enriched audio references and timeline
  audio tracks;
- future real providers can replace the mock executor without changing the
  canvas data contract.

## Reuse Guidance

When adding real TTS, music, or sound-effect providers:

- keep provider credentials and runtime config worker-side;
- preserve `ai_audio_generation` input/output compatibility where possible;
- store generated results as regular audio Assets;
- bind generated audio to Shot/Video/Character nodes through existing audio
  fields for export;
- only add a dedicated audio mixing timeline when users need editing semantics,
  not merely because audio was generated.

## Verification

CEX-09 verifies this pattern with:

- shared type lint, tests, and build for node and generation contracts;
- backend generation tests for queue input and audio Asset writeback;
- worker executor tests for deterministic mock audio output;
- frontend generation action tests for AI Audio rendering and payloads;
- editor export tests for generated audio references in clip manifests.

## Related

- [Audio Asset Binding Export Manifest](./audio-asset-binding-export-manifest-2026-06-13.md)
- [Make AI Text a Task-Backed Canvas Node](./task-backed-ai-text-node-boundary-2026-06-14.md)
- [Validate Canvas Input Slots Before Writing Semantic Edges](./canvas-input-slot-policy-boundary-2026-06-14.md)
- [CEX-09 plan](../../plans/2026-06-14-046-feat-cex-09-ai-audio-tts-binding-plan.md)

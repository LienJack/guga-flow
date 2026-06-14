---
title: "CEX-09 AI Audio TTS Binding Requirements"
type: requirements
status: completed
date: 2026-06-14
source: docs/codex-reference-long-task-execution-checklist.md#cex-09
---

# CEX-09 AI Audio TTS Binding Requirements

## Context

guga-flow already has audio assets, source audio nodes, character/shot/video
audio binding fields, and editor export audio references. It still lacks a
first-class AI Audio canvas node that can generate a TTS/narration audio Asset
from text or a character voice reference and feed the same binding/export path.

## Requirements

- R1. Shared canvas types define an `ai_audio` generation node with audio
  input/output capability and data fields for prompt/script, generated asset,
  selected provider/model, source context, and voice reference trace.
- R2. Shared generation contracts define an `ai_audio_generation` task input and
  media output flow that produces an audio Asset through the worker.
- R3. Backend generation creation validates AI Audio nodes, accepts text from
  the node or upstream text context, gathers upstream audio/voice references,
  and queues a worker-owned `GenerationJob`.
- R4. Worker execution returns deterministic mock audio output without requiring
  real TTS provider credentials or browser-side provider calls.
- R5. Generated audio assets can be bound through the existing character,
  shot, and video audio-reference UI and remain visible to editor export
  packaging.
- R6. Editor export manifests continue to include shot/video/character audio
  references, including generated AI Audio assets.

## Scope Boundaries

- Do not build a complete audio editor, waveform timeline, dubbing system, or
  mixing engine.
- Do not add real third-party TTS provider management in this slice; use a
  mock-first provider contract and keep the provider-safe worker boundary.
- Do not replace existing `voiceAssetIds`, `audioAssetIds`, `voiceReferences`,
  or `audioReferences`; extend the current asset binding path.
- Do not let the browser hold audio provider keys or call TTS providers
  directly.

## Acceptance Examples

- AE1. A user can add an AI Audio node from the canvas toolbar.
- AE2. A user can enter text on an AI Audio node and queue audio generation.
- AE3. A character voice reference connected upstream can be captured as voice
  context for the AI Audio job input.
- AE4. The worker completes `ai_audio_generation`, creates an audio Asset, and
  writes the result back to the AI Audio node.
- AE5. The generated audio Asset can be selected in the existing Character,
  Shot, or Video audio binding panel.
- AE6. Editor export package inputs and timeline manifest include bound audio
  references that point at uploaded or generated audio Assets.

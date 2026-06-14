---
title: "CEX-10 AI Video Mode Matrix and Prompt Check Requirements"
date: 2026-06-14
source_modules:
  - ACP-06
  - TFR-21
status: captured
---

# CEX-10 AI Video Mode Matrix and Prompt Check Requirements

## Source Summary

ACP-06 asks for AI video node mode visibility across text-to-video,
image-to-video, first/last frame, reference video, and reference audio without
hardcoding one provider. TFR-21 asks for video prompt generation/checks that are
routed by provider/model mode, report missing inputs, and keep prompt debug
sources visible.

## Requirements

- R1. Video provider catalogs must expose enough provider/model capability data
  for the UI and backend to compute available video modes.
- R2. The video generation UI must show provider/model mode availability and
  supported reference input roles without pretending unsupported modes are
  usable.
- R3. Creating an image-to-video job must reject unsupported provider/model mode
  combinations, missing image reference, unsupported reference media roles, and
  invalid duration/resolution/aspect settings with readable errors.
- R4. If a parent Shot is present, the job input must carry a safe prompt debug
  summary that includes prompt mode, provider/model, reference roles, source
  part kinds, and missing prompt context such as missing dialogue/video prompt.
- R5. The implementation must not hardcode Toonflow prompt text or provider-only
  UI copy as the generation prompt.

## Acceptance Evidence

- AE1. Shared types include video prompt mode/check/debug summary contracts and
  tests cover the mode constants.
- AE2. Backend tests prove model-specific mode rejection, duration rejection,
  missing image rejection, and generated `ImageToVideoJobInput` debug summary.
- AE3. Frontend tests prove the selected provider/model renders different
  modes and reference inputs.
- AE4. Worker/provider tests prove the chosen video mode travels through the
  provider execution boundary.
- AE5. Repository lint/tests/build pass.

## Scope Boundaries

- No new text-to-video submission flow in this module.
- No real provider prompt-template cloning from Toonflow.
- No full AI Video node replacement for existing ImageNode-to-Video workflow.
- No provider secret handling in the browser.

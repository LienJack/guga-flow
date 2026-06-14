---
title: "Use Capability-Driven Video Prompt Checks"
date: 2026-06-14
category: architecture-patterns
module: cex-10-ai-video-mode-prompt-check
problem_type: architecture_pattern
component: generation
severity: medium
applies_when:
  - "Routing video generation by provider and model capability"
  - "Validating first frame, last frame, reference video, or reference audio inputs"
  - "Queuing video generation jobs that need prompt debug traceability"
related_components:
  - video_provider_catalog
  - generation_jobs
  - prompt_composer
  - generation_actions
  - provider_contracts
tags:
  - video-generation
  - provider-capabilities
  - prompt-check
  - reference-media
---

# Use Capability-Driven Video Prompt Checks

## Context

CEX-10 tightens the existing image-to-video generation path. The product need is
not a provider-specific prompt template clone; it is a capability matrix that
explains what the selected provider/model can do, rejects unsupported inputs,
and records enough prompt-check evidence in `GenerationJob.inputJson` to audit
why a job was allowed.

## Guidance

Keep provider mode and prompt mode separate:

- provider mode is the execution contract sent to video providers, such as
  `image_to_video` or `reference_to_video`;
- prompt mode is the audit strategy, such as `first_frame`,
  `first_last_frame`, `generic_multi_reference`, or `provider_specific`;
- model-level `modes` narrow provider-level `supportedModes`;
- typed `referenceMedia` remains the canonical place for first frame, last
  frame, reference image, reference video, and reference audio roles.

The backend should derive both modes after provider/model validation and before
queueing the job. The worker should pass the derived provider mode through to
the provider instead of hardcoding `image_to_video`.

## Prompt Debug Summary

`ImageToVideoJobInput.videoPromptDebugSummary` should stay safe and compact. It
records provider/model ids, supported modes, reference media roles, prompt debug
part kinds, missing context kinds, and check codes/messages. It intentionally
does not duplicate the full prompt text beyond the existing `prompt` field.

Missing dialogue and missing video prompt are warnings because silent or
visual-only shots can be valid. Missing image asset, invalid duration,
unsupported model mode, and unsupported reference roles remain blocking backend
errors.

## Why It Works

This keeps CEX-10 aligned with existing architecture:

- catalog metadata powers both frontend visibility and backend validation;
- model-specific capability drift is caught before queueing;
- worker/provider execution sees the same resolved mode recorded in job input;
- prompt debug evidence is audit-friendly without hardcoding Toonflow text;
- future text-to-video can reuse the same provider/model mode boundary.

## Verification

CEX-10 verifies this pattern with:

- shared type tests for video prompt mode/check/debug contracts;
- backend generation tests for debug summary and model-specific rejection;
- worker executor tests for provider mode propagation;
- frontend generation action tests for provider/model mode matrix rendering;
- repository lint/tests and production frontend build.

## Related

- [CEX-10 plan](../../plans/2026-06-14-047-feat-cex-10-ai-video-mode-prompt-check-plan.md)
- [Keep Canvas Node Taxonomy in a Shared Registry](./canvas-node-taxonomy-registry-2026-06-14.md)
- [Validate Canvas Input Slots Before Writing Semantic Edges](./canvas-input-slot-policy-boundary-2026-06-14.md)

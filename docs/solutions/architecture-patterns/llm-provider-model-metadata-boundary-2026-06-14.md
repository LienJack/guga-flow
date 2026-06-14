---
title: "Keep LLM Provider Models as Safe Project Metadata"
date: 2026-06-14
category: architecture-patterns
module: cex-02-llm-provider-model-capability
problem_type: architecture_pattern
component: provider_management
severity: medium
applies_when:
  - "Adding LLM/text providers to an existing image/video provider management surface"
  - "Letting users add or disable provider models before a dedicated model table exists"
  - "Normalizing provider failure language across text, image, and video providers"
  - "Keeping browser settings DTOs free of provider secrets and raw upstream responses"
related_components:
  - provider_catalog
  - provider_config
  - model_metadata
  - provider_errors
  - frontend_settings_console
tags:
  - llm-providers
  - model-metadata
  - provider-errors
  - secret-boundary
  - project-settings
---

# Keep LLM Provider Models as Safe Project Metadata

## Context

CEX-02 needed LLM provider management before Agent role assignment and AI text nodes exist. The repository already had a secret-safe image/video provider console, encrypted `ProviderConfig.secretJson`, project-scoped default models, model discovery, and worker-token-gated runtime config. The new risk was adding model CRUD and LLM protocols without creating a premature provider model schema or weakening the browser/backend/worker trust boundary.

## Guidance

Add LLM providers as another managed provider kind, but keep the first model-management slice inside safe project metadata:

- Static catalog entries define provider identity, protocol expectations, default model, and baseline capability metadata.
- Project overrides live in `ProviderConfig.paramsJson.models`, alongside safe protocol/base URL params.
- Browser DTOs can show model ids, display labels, enabled/disabled state, kind, modes, and capability flags.
- Browser DTOs must not include provider keys, secret headers, raw discovery bodies, or raw provider error bodies.
- Worker/runtime credential access must continue through the existing token-gated runtime config path.

Keep programmable providers scoped to image/video until there is a separate requirement and sandbox story for programmable LLM adapters.

## Implementation Notes

- `MANAGED_PROVIDER_KINDS` can include `llm` while programmable manifests remain narrowed to image/video.
- Use a generic `ProviderModelOption` base for cross-kind capability metadata, then narrow LLM/image/video catalog item model types where helpful.
- Merge project model overrides on top of catalog models by id. Preserve catalog order, append new manual models, and let project metadata override labels/capabilities.
- Treat disabled models as visible but not selectable for default/test validation.
- Add protocol-specific discovery only where it is small and explicit. Anthropic uses an API-key header plus version header; OpenAI-compatible/Ark/Gemini retain their existing endpoint/header shapes.
- Add a provider error `category` while keeping `provider`, `code`, `message`, and `retryable` intact for backward compatibility.

## Why It Works

This gives downstream Agent and text-node work a shared provider/model surface without a schema migration. The model list is editable enough for teams whose provider models differ from catalog defaults, but the metadata remains safe to return to the browser. The category field lets diagnostics group auth, quota, rate limit, bad input, unsupported model, timeout, safety, and unknown failures without parsing provider-specific messages in every feature.

## Reuse Guidance

Use this pattern when a provider domain needs user-adjustable model metadata before model ownership, audit history, or versioning justify a first-class table.

Prefer a table later when:

- multiple roles need separate model aliases and audit history;
- model definitions must be shared across projects;
- per-model pricing, ownership, or rollout state matters;
- capability metadata needs provider-sourced refresh history.

Until then, keep overrides compact, normalized, and secret-free in provider params.

## Related

- [Keep Provider Management Secret-Safe with Worker Runtime Config](./provider-management-secret-safe-runtime-config-2026-06-13.md)
- [Keep Real Image Provider Selection Secret-Safe and Backend-Persistent](./real-image-provider-secret-safe-persistence-2026-06-12.md)
- [Keep Real Video Providers as Async Tasks with Idempotent Polling](./real-video-provider-async-task-lifecycle-2026-06-12.md)

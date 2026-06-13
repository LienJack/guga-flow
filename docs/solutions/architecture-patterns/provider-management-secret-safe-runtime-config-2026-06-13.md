---
title: "Keep Provider Management Secret-Safe with Worker Runtime Config"
date: 2026-06-13
category: architecture-patterns
module: tf-09-provider-management-console
problem_type: architecture_pattern
component: provider_management
severity: medium
applies_when:
  - "Adding project-scoped provider settings for browser-facing generation workflows"
  - "Letting users submit or rotate provider credentials from a settings UI"
  - "Applying stored provider credentials during backend or worker execution"
  - "Adding provider readiness tests that must not create production media"
related_components:
  - provider_catalog
  - provider_config
  - backend_generation_api
  - worker_provider_registry
  - frontend_settings_console
tags:
  - provider-secrets
  - runtime-config
  - worker-boundary
  - credential-management
  - project-settings
---

# Keep Provider Management Secret-Safe with Worker Runtime Config

## Context

TF-09 needed a project settings console for image/video providers after real image and video adapters already existed. The risk was not model metadata; it was letting browser-facing settings mutate provider credentials and defaults without weakening the established backend/worker secret boundary.

## Guidance

Keep provider administration split into three surfaces:

- Browser-safe management DTOs: model lists, enablement, default model, disabled reason, credential presence/source, and last test summary.
- Server-only persistence: `ProviderConfig` owns project-scoped enable/default/test state plus encrypted `secretJson`.
- Trusted worker runtime config: the worker asks the backend for provider-specific env overrides after claiming a job, authenticates with `WORKER_API_TOKEN` when stored credentials are involved, then builds the provider registry for that execution.

The generation job remains a secret-free trace. `GenerationJob.inputJson` can record provider, model, params, and prompt context, but it must not carry API keys or secret headers.

## Implementation Notes

- Static provider metadata remains the source of supported models, modes, limits, and parameter definitions.
- Project-scoped catalog endpoints overlay `ProviderConfig` on the static metadata for generation panels.
- Global `/providers/image` and `/providers/video` remain env-derived and backward-compatible for health checks and older callers.
- Credential updates are write-only: a request can set or clear a key, but subsequent responses only expose `credentialConfigured` and `credentialSource`.
- Readiness tests validate project, provider kind/id, model, and credential presence. They persist safe status/message metadata and do not create `GenerationJob`, `Asset`, `CanvasNode`, or `CanvasEdge` records.
- Stored credentials supplement env keys. Env keys still support local smoke and CI-style no-config workflows.
- Runtime config calls that would return stored credentials must require a worker-only token. Without that gate, a browser-visible endpoint can become a credential exfiltration path.

## Why It Works

This keeps each trust boundary narrow:

- The browser can administer providers but cannot read secrets.
- The backend can validate and persist provider readiness without creating production media.
- The worker can execute with the right provider credentials without durable job payload leakage.
- Stored credentials are not readable from unauthenticated HTTP clients.
- Mock providers remain no-key so the repository stays usable without paid provider access.

## Reuse Guidance

Use this pattern for future provider-like configuration where project settings need to affect worker execution:

- Store secret material in a dedicated server-only field.
- Return presence and provenance, never values.
- Keep static capability metadata separate from project overrides.
- Make execution-time secret resolution a trusted backend/worker call, not a browser DTO or persisted job field.
- Treat “test” actions as readiness checks unless the user explicitly asked to create media.

Do not use this pattern as permission to add user-supplied provider code. Programmable provider adapters require the TF-10 sandbox design first.

## When to Apply

- Adding project settings that affect provider execution.
- Adding credential rotation or clear actions to a browser settings surface.
- Reviewing worker execution changes that need provider-specific env overrides.
- Adding provider readiness tests that must be safe in CI and local no-key environments.

## Examples

The safe DTO returned to the browser can include:

- provider id, kind, display name, enabled state, and disabled reason;
- safe model list and default model;
- `credentialConfigured` and `credentialSource`;
- last readiness test status, timestamp, model, and non-secret message.

The trusted runtime DTO returned to the worker can include env overrides for the selected provider only. That DTO should be fetched at execution time and should not be written to `GenerationJob.inputJson` or returned to the browser.

## Related

- [Keep Real Image Provider Selection Secret-Safe and Backend-Persistent](./real-image-provider-secret-safe-persistence-2026-06-12.md)
- [Keep Real Video Providers as Async Tasks with Idempotent Polling](./real-video-provider-async-task-lifecycle-2026-06-12.md)
- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)

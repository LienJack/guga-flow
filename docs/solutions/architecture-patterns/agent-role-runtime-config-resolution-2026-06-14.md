---
title: "Resolve Agent Roles Through Provider Management"
date: 2026-06-14
category: architecture-patterns
module: cex-03-agent-deployment-center
problem_type: architecture_pattern
component: agent_runtime_config
severity: medium
applies_when:
  - "Adding role-specific Agent model selection after shared LLM provider management exists"
  - "Needing simple inherited Agent config and advanced per-role overrides in one settings surface"
  - "Blocking Agent execution when provider/model config is invalid"
  - "Keeping Agent deployment auditable without creating Agent-specific secret storage"
related_components:
  - provider_management
  - generation_job
  - settings_center
  - prisma_agent_deployment
tags:
  - agent-deployment
  - provider-management
  - runtime-config
  - secret-boundary
  - settings-center
---

# Resolve Agent Roles Through Provider Management

## Context

CEX-03 needed an Agent deployment center after CEX-02 introduced LLM provider management. The existing Agent canvas action was intentionally local and deterministic, but future ScriptAgent, ProductionAgent, supervision, and sub-Agent flows need a shared way to resolve a role to provider/model/runtime parameters before work starts.

The risk was building an Agent-specific provider system too early. That would duplicate credentials, drift from provider health checks, and make future Agent execution less auditable.

## Guidance

Store only project-scoped Agent deployment intent:

- one `mode` value: `simple` or `advanced`;
- one primary role config for simple inheritance;
- optional per-role overrides for advanced mode;
- a monotonically increasing config `version`.

Resolve runtime provider/model settings through the provider management surface on every Agent start. Do not store or return provider secrets from Agent deployment records. Do not let Agent jobs start when the selected role has a missing provider, missing model, disabled provider, missing credential, or disabled model.

For the first slice, keep execution local if the Agent capability is still deterministic. The `GenerationJob` should record the resolved `role`, `provider`, and `model` for audit, but the parser does not need to become a real LLM Agent until a later module requires it.

## Why This Matters

Agent deployment settings are operational configuration, not a second credential vault. Reusing provider management keeps one source of truth for model availability, manual model overrides, provider enablement, and credential readiness. It also gives the UI a readable issues list before users attempt a run.

Failing before `GenerationJob.create` is important: invalid deployment config should not create noisy failed jobs, and it should not leave partially started Agent work that the user must reconcile.

## When to Apply

- Use this pattern when Agent roles need model assignment but the project already has provider management.
- Keep role config lightweight while roles are project-scoped and do not need historical version records.
- Add a first-class deployment history table only when rollback, approval, or multi-user audit becomes a real requirement.
- Keep `GenerationJob.inputJson` credential-free; role/provider/model ids are safe audit metadata, raw secrets are not.

## Examples

Simple mode:

```json
{
  "mode": "simple",
  "primary": {
    "provider": "mock-llm",
    "model": "mock-storyboard",
    "temperature": 0.2,
    "maxOutputTokens": 4096
  },
  "roles": {}
}
```

Advanced mode:

```json
{
  "mode": "advanced",
  "primary": {
    "provider": "mock-llm",
    "model": "mock-storyboard"
  },
  "roles": {
    "script": {
      "provider": "mock-llm",
      "model": "mock-storyboard",
      "temperature": 0.3,
      "inherit": false
    },
    "production": {
      "inherit": true
    }
  }
}
```

Runtime resolution should produce job input shaped like:

```json
{
  "operation": "agent_canvas_action",
  "projectId": "project_1",
  "role": "script",
  "provider": "mock-llm",
  "model": "mock-storyboard",
  "message": "create shot: neon reveal"
}
```

## Related

- [Keep LLM Provider Models as Safe Project Metadata](./llm-provider-model-metadata-boundary-2026-06-14.md)
- [Keep Provider Management Secret-Safe with Worker Runtime Config](./provider-management-secret-safe-runtime-config-2026-06-13.md)
- [Keep Light Agent Canvas Actions as Audited Generation Jobs](./agent-canvas-action-generation-job-audit-2026-06-13.md)
- [Keep Settings Center Export Validation-Only and Secret-Safe](./settings-center-safe-export-validation-2026-06-13.md)

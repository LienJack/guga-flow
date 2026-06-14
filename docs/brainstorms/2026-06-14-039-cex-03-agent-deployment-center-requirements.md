---
date: 2026-06-14
topic: cex-03-agent-deployment-center
---

# CEX-03 Agent Deployment Center Requirements

## Summary

Add a project-scoped Agent deployment center that maps production Agent roles to safe LLM provider/model runtime choices, supports simple inheritance and advanced per-role overrides, and blocks Agent execution when the selected role cannot resolve to an enabled LLM provider/model.

## Problem Frame

CEX-02 added LLM provider/model management. The current Agent canvas action service still records a hard-coded `local-agent`/`deterministic-canvas-actions-v1` model, so future ScriptAgent, ProductionAgent, supervision, and sub-agent flows have no auditable role-to-model boundary. CEX-03 should add that boundary without implementing real streaming Agent execution yet.

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- A single project-scoped deployment row is enough for the first slice; historical version records can wait until Agent execution is real.
- The existing deterministic canvas Agent may continue to parse actions locally, but it must resolve and record the configured role/provider/model before starting.
- Provider credentials remain owned by provider management; Agent deployment must reference LLM providers and models without storing secrets.

## Actors

- A1. Creator/admin: configures the default Agent model and per-role overrides.
- A2. Backend Agent runtime: resolves a role to provider/model and refuses to start on invalid config.
- A3. Future ScriptAgent/ProductionAgent: consumes the same role map instead of inventing separate model settings.

## Key Flows

- F1. Configure simple Agent deployment
  - **Trigger:** A creator chooses one LLM provider/model for all Agent roles.
  - **Outcome:** All supported roles inherit the same model and settings.
  - **Covered by:** R1, R2, R5

- F2. Configure advanced role overrides
  - **Trigger:** A creator switches to advanced mode and gives selected roles independent provider/model settings.
  - **Outcome:** Script, production, supervision, and sub-agent roles resolve independently while unspecified roles inherit the primary config.
  - **Covered by:** R1, R3, R5

- F3. Start an Agent action with role resolution
  - **Trigger:** The backend receives an Agent action request.
  - **Outcome:** The requested role resolves to an enabled LLM provider/model, is recorded in job input, or the request fails before creating a job.
  - **Covered by:** R4, R6, R7

## Requirements

- R1. Agent deployment roles must include script, production, universal, supervision, skeleton, adaptation, storyboard, asset, and video prompt.
- R2. Simple mode must let every role inherit one primary provider/model.
- R3. Advanced mode must let sub-roles override provider/model while unspecified roles inherit the primary config.
- R4. Agent runtime resolution must validate provider existence, model existence, provider enabled state, and credential readiness using the CEX-02 LLM provider management result.
- R5. Settings center must expose a compact Agent deployment panel with simple/advanced mode, primary model, role overrides, save state, and readable issues.
- R6. Agent job input must record role, resolved provider, and resolved model without credentials.
- R7. Invalid config must return a readable error before the Agent creates a `GenerationJob`.

## Acceptance Examples

- AE1. **Covers R1, R2, R5.** Given simple mode selects `mock-llm/mock-storyboard`, all roles resolve to that provider/model and settings center shows inherited roles.
- AE2. **Covers R3, R5.** Given advanced mode overrides storyboard to `gemini-llm/gemini-2.5-flash`, storyboard resolves independently while production inherits the primary model.
- AE3. **Covers R4, R7.** Given production is configured to a disabled or missing-key provider, creating a production Agent action fails with a readable configuration error before job creation.
- AE4. **Covers R6.** Given a universal Agent action succeeds, the persisted job input records `role`, `provider`, and `model` but no key-like value.

## Scope Boundaries

- Do not implement real LLM Agent reasoning or streaming.
- Do not add per-Agent secret storage.
- Do not implement RBAC, billing, quotas, or model pricing.
- Do not copy Toonflow Agent prompts, model maps, deploy UI code, or runtime orchestration internals.

## Key Decisions

- Add `AgentDeployment` as a project-scoped config row with a version counter and JSON role map.
- Reuse CEX-02 LLM provider management for validation and model options.
- Keep current deterministic Agent parser, but make role/provider/model resolution explicit and auditable.

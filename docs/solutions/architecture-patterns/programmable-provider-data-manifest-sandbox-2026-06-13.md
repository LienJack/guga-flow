---
title: "Use Data-Only Provider Manifests for Programmable Adapters"
date: 2026-06-13
module: tf-10-programmable-provider-sandbox
status: accepted
component: provider_runtime
applies_when:
  - "Letting project owners add image/video providers without editing trusted repo source"
  - "Supporting TS/JS-looking provider authoring while preserving backend/worker secret boundaries"
  - "Reviewing untrusted adapter execution or provider sandbox proposals"
tags:
  - provider-contracts
  - sandbox
  - worker-runtime
  - secret-boundary
---

# Use Data-Only Provider Manifests for Programmable Adapters

## Context

TF-10 needed the product value of user-editable providers: metadata, models, credentials, request mapping, validation, activation, rollback, and tests. The unsafe shortcut was to execute uploaded TypeScript through `node:vm` or a broad VM helper environment. That conflicts with guga-flow's server/worker-owned provider execution model and with Node's warning that `vm` is not a security boundary.

## Decision

Treat provider source as authoring syntax, not executable code. The backend parses a single `export default { ... }` manifest with the TypeScript compiler API, accepts only literal data, stores every change as a version, and activates only valid versions. The worker receives the active manifest and credentials through the token-gated runtime config path, then executes requests through trusted interpreter code in `provider-contracts`.

## Shape

- Custom provider ids use `custom:<slug>` and cannot collide with built-ins.
- Browser-facing summaries include safe metadata, version status, diagnostics, enabled state, credential presence, and last test results only.
- `ProviderConfig` remains the write-only credential/default/test store.
- Project catalogs overlay active programmable providers and carry `providerVersionId`.
- `GenerationJob.inputJson` records provider, model, params, and provider version id, never credentials or request headers.
- Worker runtime config can include the validated manifest and credential map only after `WORKER_API_TOKEN` authorization.

## Runtime Guardrails

- No imports, functions, classes, calls, `process.env`, property access, dynamic imports, filesystem, shell, browser APIs, or package installation.
- HTTPS request templates only.
- Localhost, private IP literals, non-HTTPS URLs, and dangerous headers are blocked.
- Request timeout and response-size limits are enforced.
- Provider HTTP errors and runtime failures are sanitized before persistence or browser display.

## Consequences

- Built-in providers and mock workflow remain compatible when no programmable providers exist.
- The first slice is intentionally less expressive than arbitrary adapter functions, but it is reviewable and testable.
- DNS-resolution-aware egress policy remains an operational hardening follow-up.
- If future requirements need arbitrary code, use OS/container isolation with explicit network/resource limits instead of weakening the data-only interpreter.

## Use This When

- Adding another programmable provider kind.
- Reviewing proposals to run user-supplied code inside backend or worker processes.
- Extending provider management without leaking credentials into browser APIs or durable job JSON.

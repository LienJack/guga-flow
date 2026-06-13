# Programmable Provider Sandbox Security Design

## Boundary

TF-10 v1 does not execute arbitrary uploaded JavaScript. A provider author submits TypeScript/JavaScript-style source that must export a data-only manifest. The backend parses the source into a literal object, validates it, stores a versioned manifest, and the worker executes the manifest through trusted interpreter code.

This design deliberately avoids using `node:vm` or a broad in-process VM as the trust boundary. Node documents `node:vm` as not being a security mechanism, and the Toonflow reference exposes broad helpers to uploaded vendor scripts. guga-flow borrows the author/validate/test/enable product loop, not that execution model.

## Allowed Capabilities

- Literal provider metadata: id, kind, display name, credentials, models, modes, and capability flags.
- Literal HTTP request templates for provider calls.
- Literal response mappings for generated media URLs/base64 payloads, provider task ids, task status, and provider error fields.
- Worker-side outbound HTTPS through the trusted interpreter only.
- One selected provider credential passed through the worker runtime-config path after `WORKER_API_TOKEN` authorization.

## Denied Capabilities

- Arbitrary function execution.
- Imports, dynamic imports, package installation, or access to Node built-ins.
- `process.env`, local files, shell commands, or browser APIs.
- Localhost, private IP literal, and non-HTTPS request targets.
- Raw secret-bearing logs, headers, or provider responses in browser-facing APIs.

## Runtime Controls

- Provider source is parsed with the TypeScript compiler API and converted only from literal object/array/scalar nodes.
- Executable syntax is rejected before validation.
- Worker requests are executed through an injected fetch-like capability so tests can verify behavior without live providers.
- Runtime request guards enforce HTTPS, block obvious private/local targets, cap timeout and response size, and sanitize provider errors.
- Job input/output records may include provider id, model id, version id, non-secret params, and safe trace metadata. They must not include credential values.

## Residual Risks

- TF-10 v1 blocks localhost and private IP literals but does not resolve DNS and re-check private address ranges. DNS-rebinding-resistant egress controls are follow-up operational hardening.
- Data-only manifests are intentionally less flexible than arbitrary adapter code. If future requirements need arbitrary functions, the project should add an OS/container-level sandbox with explicit resource and network isolation rather than weakening this interpreter.
- Current auth is local/single-user. Version and activation audit data should be kept so future permission checks can be added without changing the provider lifecycle.

## Required Tests

- Parser rejects imports, functions, calls, `process.env`, property access, and non-literal manifest data.
- Runtime blocks non-HTTPS, localhost, and private IP literal URLs.
- Runtime enforces timeout and response-size failures with sanitized `ProviderError`s.
- Browser-facing provider management responses do not include credentials, runtime config, raw request headers, or raw provider responses.
- Worker runtime config that contains stored credentials remains token-gated.

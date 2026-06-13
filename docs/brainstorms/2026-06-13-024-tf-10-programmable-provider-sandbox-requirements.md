---
date: 2026-06-13
topic: tf-10-programmable-provider-sandbox
status: ready_for_plan
---

# TF-10 Programmable Provider Sandbox Requirements

## Summary

TF-10 adds a controlled programmable provider path for image and video adapters: users can author, validate, version, enable, and test provider code while guga-flow preserves the server/worker secret boundary and keeps untrusted code away from browser APIs, job JSON, local files, and unrestricted runtime privileges.

---

## Problem Frame

TF-09 made static providers manageable from project settings, but every usable provider still has to be shipped as trusted repo code. Toonflow demonstrates the value of user-editable vendor scripts, model metadata, and provider tests, but its reference implementation compiles TypeScript and runs it through a broad VM environment with network, crypto, JWT, form-data, image helpers, and AI SDK factories exposed directly to the script.

guga-flow needs the product value of programmable provider onboarding without inheriting that trust model. The risk is not only whether code compiles; it is whether custom adapter code can exfiltrate secrets, read server environment, call private network targets, hang the worker, write local files, leak raw provider traces, or silently change generation semantics after a project has started using it.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input -- un-validated bets that should be reviewed before planning proceeds.*

- The first TF-10 slice should support image and video providers only, because those are the managed provider kinds currently used by generation and TF-09.
- Programmable provider definitions should be project-scoped or project-enableable, and disabled by default until validated and explicitly enabled.
- The user-facing authoring surface can be minimal and operational; a full settings-center IDE is not required in this module.
- Provider code authoring is trusted-admin functionality in the current single-user/local MVP, but the implementation should leave an audit trail so future permissions can be added.
- A provider script may need outbound HTTPS to a vendor API, but it should not get general Node, filesystem, process, environment, shell, localhost/private-network, or arbitrary import access.
- TF-10 should prove the sandbox boundary with tests before optimizing developer ergonomics.

---

## Actors

- A1. Creator/Admin: adds or edits a programmable provider, configures credentials, enables a validated version, and runs tests.
- A2. Provider authoring surface: exposes script/manifest editing, validation status, version history, and safe test controls.
- A3. Backend provider service: owns persisted provider definitions, validation records, credential metadata, activation state, and safe browser-facing DTOs.
- A4. Sandbox runner: compiles or loads custom adapter code in a restricted execution environment and exposes only approved capabilities.
- A5. Worker/provider execution: executes validated active provider versions for generation jobs without embedding secrets in browser responses or job input/output JSON.

---

## Key Flows

- F1. Add or update a programmable provider
  - **Trigger:** A creator wants to connect a provider that is not built into guga-flow.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** The creator submits a provider definition, model metadata, and adapter code. The backend validates metadata, checks the script against sandbox rules, records a new version, and marks it inactive until validation passes.
  - **Outcome:** A versioned provider definition exists with safe status and diagnostics, but it is not usable for generation until explicitly enabled.
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7

- F2. Configure, validate, and enable a provider version
  - **Trigger:** A creator wants to make a programmable provider available to a project.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** The creator enters write-only credentials, chooses a validated provider version, runs a model/provider test, reviews safe diagnostics, then enables that version for the project.
  - **Outcome:** The provider appears in project-scoped catalogs only after validation, credential readiness, and explicit enablement.
  - **Covered by:** R5, R8, R9, R10, R11, R12, R13

- F3. Generate with a programmable provider
  - **Trigger:** A generation job selects an enabled programmable image or video provider.
  - **Actors:** A3, A4, A5
  - **Steps:** Job creation records provider/model and non-secret params. The worker resolves runtime config through the trusted backend path, invokes the active provider version in the sandbox, normalizes output, and reports completion or sanitized failure.
  - **Outcome:** Generated media still becomes durable `Asset`/canvas state through existing backend side-effect paths, and secrets/custom runtime data do not enter persisted job JSON.
  - **Covered by:** R11, R12, R14, R15, R16, R17, R18

- F4. Disable or roll back a provider
  - **Trigger:** A provider version fails tests, regresses, or should no longer be used.
  - **Actors:** A1, A2, A3, A5
  - **Steps:** The creator disables the provider or selects an earlier validated version. New jobs stop using the disabled version, while existing job records remain auditable.
  - **Outcome:** Future generation is routed away from the bad version without deleting history or exposing secret material.
  - **Covered by:** R7, R10, R18, R19

---

## Requirements

**Provider definition lifecycle**

- R1. Creators can create programmable image and video provider definitions with safe metadata: id, display name, description, supported kind, models, modes, parameter hints, and credential input descriptors.
- R2. Provider ids and model ids are validated against a restricted identifier policy so custom providers cannot collide with built-in providers or break existing provider-key parsing.
- R3. Every code change creates a new version with status, timestamp, validation diagnostics, and the previous active version preserved.
- R4. A provider version is inactive by default until validation succeeds and a creator explicitly enables it for the project.
- R5. Browser-facing provider definition and version responses never include credential values, runtime env overrides, raw secret headers, or raw provider responses that may contain secrets.
- R6. Validation failures are visible with actionable non-secret diagnostics.
- R7. Creators can disable a programmable provider or roll back to a previously validated version without deleting historical versions.

**Sandbox and capability boundary**

- R8. Programmable provider code runs only inside a restricted sandbox boundary, not as unrestricted backend or worker process code.
- R9. The sandbox exposes only the capabilities required for provider calls, such as bounded outbound HTTPS and safe request/response helpers.
- R10. Sandbox code cannot access local files, shell commands, `process.env`, arbitrary Node built-ins, dynamic imports, package installation, browser APIs, or private/local network targets.
- R11. Sandbox execution enforces timeouts, bounded response/body sizes, and deterministic cancellation or failure reporting for long-running or stuck scripts.
- R12. Credentials are passed to the sandbox only for the selected provider execution and only through a server/worker runtime path that is unavailable to browser clients.
- R13. Sandbox logs, diagnostics, and normalized provider errors are sanitized before persistence or browser response.

**Generation and testing integration**

- R14. Project-scoped image/video catalogs include enabled programmable providers alongside built-in providers using the same safe catalog semantics as TF-09.
- R15. Job `inputJson` and `outputJson` can record provider id, model id, non-secret params, active version id, and safe trace metadata, but never credential values or raw secret-bearing request details.
- R16. Programmable image providers can produce normalized image outputs compatible with existing asset persistence and ImageNode completion flows.
- R17. Programmable video providers can support either immediate output or async task lifecycle compatible with existing provider-waiting, polling, cancel, retry, and asset persistence flows.
- R18. Provider tests validate metadata, credential readiness, sandbox invocation, and output normalization without creating production `GenerationJob`, `Asset`, `CanvasNode`, or `CanvasEdge` records.
- R19. Existing built-in providers, no-key mock workflow, TF-09 provider management, and global env-derived catalog behavior remain compatible when no programmable providers exist.

**Security and auditability**

- R20. The implementation includes a documented security design before executable custom provider code is accepted for generation.
- R21. The security design must explicitly address secret handling, network restrictions, dependency/import policy, resource limits, logging, version activation, rollback, and failure modes.
- R22. Sandbox boundary tests cover malicious or accidental attempts to read env vars, access files, import modules, call local/private network addresses, leak secrets through errors/logs, and run past execution limits.
- R23. Provider definition changes, activation changes, test runs, and runtime failures leave enough safe audit data for review and future permission enforcement.
- R24. The module does not weaken the backend/worker ownership of provider execution or allow browser-side provider API calls.

---

## Acceptance Examples

- AE1. **Covers R1-R7, R14.** Given a creator submits a new image provider with valid metadata and adapter code, when validation passes and the creator enables it, the provider appears in the project image catalog with safe model metadata and no secret values.
- AE2. **Covers R8-R13, R22.** Given a provider script attempts to read `process.env`, import a Node module, or call a private network address, when validation or test execution runs, the attempt fails with a sanitized diagnostic and no secret or local data is returned.
- AE3. **Covers R12, R15, R16, R17.** Given an enabled programmable provider with stored credentials, when a generation job runs, the worker can execute it through runtime config and sandbox execution while persisted job input/output JSON remains secret-free.
- AE4. **Covers R18.** Given a provider test fails because credentials are missing or the provider returns an invalid output shape, when the creator runs the test, the console shows a safe failure and no production media or graph records are created.
- AE5. **Covers R7, R19, R23.** Given an active provider version regresses, when the creator disables it or rolls back to a prior validated version, new jobs no longer use the bad version, historical records remain readable, and built-in mock generation still passes.

---

## Success Criteria

- A creator can register and test at least one programmable image or video provider through a controlled path without editing repo source files.
- The active programmable provider can be selected by generation and produces normalized outputs through the existing asset/canvas completion lifecycle.
- Security tests demonstrate that custom provider code cannot access env vars, local files, arbitrary imports, private network targets, or browser-visible secrets.
- The feature remains mock-first: the repository build, focused tests, and mock workflow pass without real provider credentials.
- Planning has enough scope clarity to choose a sandbox mechanism, persistence model, validation strategy, and UI shape without inventing product behavior.

---

## Scope Boundaries

- Do not copy Toonflow's broad `vm2` helper environment or expose general-purpose Node/runtime helpers to provider scripts.
- Do not support arbitrary npm package imports, package installation, shell execution, filesystem access, or dynamic remote code download.
- Do not run programmable provider code in the browser.
- Do not expose provider credentials, runtime env, raw request headers, or raw secret-bearing provider responses to browser-facing APIs.
- Do not build a public provider marketplace, sharing system, rating system, billing/quota management, or team approval workflow in TF-10.
- Do not add programmable LLM, editor, TTS, audio, or agent providers in the first slice unless planning proves they are required to satisfy the image/video flow.
- Do not replace built-in providers; programmable providers supplement them.
- Do not make real provider credentials required for CI, local development, or the mock workflow.

---

## Key Decisions

- Borrow Toonflow's product shape, not its execution trust model: scriptable providers, model metadata, inputs, tests, and version updates are useful; broad in-process VM privileges are not acceptable for guga-flow's server-owned secret boundary.
- Start with image/video providers: this maps to the existing generation jobs, provider management console, and worker execution paths.
- Version before activation: a custom provider must have a durable inactive version before it can become active, so validation, rollback, and auditability are first-class.
- Test without production side effects: provider readiness must prove sandbox and output compatibility without polluting the canvas or asset library.

---

## Dependencies / Assumptions

- TF-09 provider management and trusted worker runtime config are available and should be reused for safe credential presence and runtime secret resolution.
- Existing provider contracts and generation completion paths define the normalized outputs programmable providers must produce.
- Current auth is minimal/local; TF-10 should capture safe audit data but does not need to solve full multi-user permissions.
- The exact sandbox mechanism, dependency strategy, and persistence schema are planning decisions, but they must satisfy R8-R13 and R20-R22.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R8-R13, R20-R22][Needs research] Which sandbox architecture best fits this repo while satisfying the no-filesystem, no-env, no-import, no-private-network, timeout, and cancellation requirements?
- [Affects R1-R7][Technical] Should programmable provider definitions be stored as an extension of `ProviderConfig` or as separate versioned provider-definition records?
- [Affects R14-R19][Technical] How should programmable provider ids be represented in shared provider catalog types without weakening built-in provider id unions?
- [Affects R17][Technical] What is the smallest async video adapter surface that remains compatible with existing provider-waiting and polling behavior?

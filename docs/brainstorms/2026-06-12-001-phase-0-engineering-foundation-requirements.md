---
date: 2026-06-12
topic: phase-0-engineering-foundation
---

# Phase 0 Engineering Foundation Requirements

## Summary

Phase 0 will establish the guga-flow engineering foundation for the canvas-first novel-to-video MVP: a TypeScript monorepo, baseline frontend/backend/worker surfaces, shared contracts, database foundation, mock provider boundaries, and quality scripts that later roadmap modules can build on.

---

## Problem Frame

The repository currently contains product, architecture, workflow, and research documentation but no committed application code. Later roadmap phases depend on a stable local development base: developers need to install dependencies, run the app surfaces, evolve shared types, create database-backed business records, and exercise mock-first provider flows without real model keys.

Because the product direction is canvas-first, Phase 0 cannot become a generic full-stack scaffold detached from the MVP. The foundation must preserve the service boundaries and data principles from `infinite_canvas_video_prd_roadmap_v2_detailed.md` and `docs/tech-stack-text2sql-reference.md` while staying narrow enough to remain reviewable.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input -- un-validated bets that should be reviewed before planning proceeds.*

- Phase 0 should stay as one module rather than splitting into separate workspace, database, and provider modules because the repository has no code yet and a partial scaffold would not be demonstrable.
- Phase 0 should not implement user-facing Project CRUD, tldraw persistence, custom canvas shapes, or generation workflows beyond a thin mock workflow shell.
- Local Postgres and Redis may be defined as development dependencies, but real provider credentials must not be required for any Phase 0 verification.
- The initial database foundation may include core MVP model names and relationships needed by later modules, even if most user-facing behavior is deferred.

---

## Actors

- A1. Developer: installs dependencies, runs local services, starts app surfaces, and runs quality checks.
- A2. Downstream module implementer: uses the scaffold, shared contracts, database foundation, and mock providers to build later PRD phases.
- A3. Local mock runtime: exercises provider and worker boundaries without real third-party API keys.

---

## Key Flows

- F1. Local foundation bootstrap
  - **Trigger:** A1 starts from a fresh checkout with only the documented project artifacts.
  - **Actors:** A1
  - **Steps:** Install dependencies, start local infrastructure when needed, prepare environment files, generate database client artifacts, and start the development surfaces.
  - **Outcome:** Frontend, backend, and worker surfaces can run locally with mock configuration.
  - **Covered by:** R1, R2, R3, R7, R8

- F2. Mock-first provider boundary check
  - **Trigger:** A1 or A2 wants proof that provider logic is server-side and mock-first.
  - **Actors:** A1, A2, A3
  - **Steps:** Run a mock workflow command or test that reaches the shared provider contracts through backend/worker-owned code without browser-held provider keys.
  - **Outcome:** The repository demonstrates the future novel/image/video provider path as a service-side boundary, even before real providers exist.
  - **Covered by:** R4, R5, R6, R8, R9

---

## Requirements

**Workspace foundation**
- R1. The repository must provide a TypeScript monorepo foundation with app surfaces for frontend, backend, and worker development.
- R2. Shared package boundaries must exist for cross-app types and provider contracts so later modules do not duplicate DTOs or provider interfaces.
- R3. The local developer workflow must support installing dependencies, starting development surfaces, building packages, and running tests through root-level scripts.

**Database and persistence foundation**
- R4. Phase 0 must establish the database foundation for the MVP's hybrid persistence principle: canvas snapshots plus normalized business records.
- R5. The initial persistence model must leave room for Projects, NovelDocuments, CanvasDocuments, CanvasNodes, CanvasEdges, Assets, GenerationJobs, EditorExports, and provider configuration without implementing their full product behavior.
- R6. Database setup must be usable in local development and documented well enough that later phases can add migrations and data access without re-deciding the baseline.

**Mock-first provider and worker boundaries**
- R7. Mock provider contracts must exist for LLM, image, video, and editor/export-adjacent work so the MVP can progress without real provider keys.
- R8. Provider calls and sensitive configuration must be modeled as server-side responsibilities; Phase 0 must not introduce a browser-side API key pattern.
- R9. Worker responsibilities must be represented as a first-class app surface or runnable process, even if Phase 0 only verifies a small mock workflow.

**Quality and handoff**
- R10. Phase 0 must provide baseline quality scripts for build, test, and formatting or lint checks, with clear pass/fail behavior.
- R11. The scaffold must include environment examples and local development documentation for the surfaces it introduces.
- R12. The module must preserve roadmap scope: it prepares the foundation for Phase 1 and later canvas/generation modules without implementing those modules early.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R10.** Given a fresh checkout after Phase 0, when A1 installs dependencies and runs the documented root scripts, the workspace can build and run its baseline test suite.
- AE2. **Covers R4, R5, R6.** Given local database configuration, when A1 runs the documented database setup command, the repository produces usable database client artifacts for the initial MVP model foundation.
- AE3. **Covers R7, R8, R9.** Given no real provider API keys, when A1 runs the mock workflow verification, it completes through server-side provider/worker boundaries rather than requiring browser-held credentials.
- AE4. **Covers R11, R12.** Given a downstream implementer starting Phase 1, when they inspect the Phase 0 scaffold and docs, they can identify where to add Project CRUD, asset storage, and later canvas behavior without reworking the foundation.

---

## Success Criteria

- A developer can bootstrap the repo and run the baseline app surfaces locally from documented commands.
- The codebase has clear monorepo, app, shared contract, database, mock provider, and worker boundaries that match the PRD and technical architecture.
- Real provider credentials are unnecessary for Phase 0 verification.
- Downstream planning can map every Phase 0 implementation unit back to R-IDs and acceptance examples without inventing product behavior.

---

## Scope Boundaries

- Project CRUD, dashboard UI, asset upload, and asset previews belong to Phase 1.
- tldraw canvas loading, autosave, and persistence behavior belong to Phase 2.
- Custom business shapes, inspector forms, semantic edge interactions, storyboard import, prompt composition, real media generation, and editor export belong to later roadmap phases.
- Real third-party image/video/LLM provider adapters are out of scope for Phase 0.
- Reference project research is not required for Phase 0 unless planning discovers a concrete foundation question not answered by `docs/tech-stack-text2sql-reference.md`.

---

## Key Decisions

- Keep Phase 0 as one foundation module: the repo has no code yet, so workspace, database, provider contracts, worker shell, and quality scripts need to land together to be useful.
- Optimize for mock-first verification: the MVP roadmap depends on proving the service-side provider boundary before real provider adapters are introduced.
- Treat database and worker boundaries as foundation, not later polish: later phases rely on GenerationJob and worker concepts even when Phase 0 only exercises a minimal mock path.

---

## Dependencies / Assumptions

- `infinite_canvas_video_prd_roadmap_v2_detailed.md` remains the product fact source for MVP scope and acceptance.
- `docs/tech-stack-text2sql-reference.md` remains the architecture fact source for the Phase 0 technical baseline.
- Local development may assume Node.js, pnpm, Docker-compatible infrastructure, and a local database setup path.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R3, R10][Technical] Confirm exact package manager, framework versions, lint/format tooling, and test runners during `ce-plan` from current ecosystem and local constraints.
- [Affects R4, R5][Technical] Decide the precise first migration/model shape during `ce-plan` while preserving Hybrid Snapshot + Normalized Business Data.
- [Affects R7, R9][Technical] Decide whether the Phase 0 mock workflow verification is best expressed as a unit test, integration test, CLI script, or worker command.

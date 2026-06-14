---
title: feat: Complete CEX-00 reference evidence governance
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-037-cex-00-reference-evidence-governance-requirements.md
---

# feat: Complete CEX-00 Reference Evidence Governance

## Summary

Add two reusable reference coverage ledgers and index them from `docs/research/video-ref/` so later CEX cards can reuse existing Toonflow and AI-CanvasPro evidence without repeating broad reference-project scans.

---

## Assumptions

*This plan was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before implementation proceeds.*

- CEX-00 is complete when the research ledgers and index entrypoints exist; it does not require product code changes.
- The existing source contract, build status, context packs, generated graph assets, and source-module long-task documents are enough for first-pass ledgers.
- Markdown-only verification is sufficient because no runtime behavior changes in this card.

---

## Requirements

- R1. Toonflow coverage/gaps ledger in `docs/research/video-ref/`.
- R2. AI-CanvasPro coverage/gaps ledger in `docs/research/video-ref/`.
- R3. Evidence labels: `Fact`, `Inference`, and `Pending Verification`.
- R4. Research index entrypoints for the two ledgers.
- R5. Short lookup maps from CEX/TFR/ACP modules to existing evidence assets.
- R6. Explicit non-copy and safety exclusions.

**Origin actors:** A1 Codex executor, A2 human reviewer, A3 future planning agent
**Origin flows:** F1 Enter a CEX card from the checklist, F2 Review reference-project safety boundaries
**Origin acceptance examples:** AE1, AE2, AE3

---

## Scope Boundaries

- Documentation and research-index updates only.
- No product code, schema, generated migration, UI, provider, agent, worker, or test-code changes.
- No copying reference source, assets, prompts, provider scripts, desktop IPC/preload, subscription, update, branding, or license text.
- No full source audit for every future CEX module; future cards still do narrow verification when implementation depends on exact behavior.

---

## Context & Research

### Relevant Documents and Patterns

- `docs/codex-reference-long-task-execution-checklist.md`
- `docs/infinite-canvas-video-long-task-development-flow.md`
- `docs/research/video-ref/infinite-canvas-coverage-and-gaps.md`
- `docs/research/video-ref/source-contract.md`
- `docs/research/video-ref/index.md`
- `docs/research/video-ref/build-status.md`
- `docs/toonflow-reference-long-task-development-flow.md`
- `docs/ai-canvaspro-reference-long-task-development-flow.md`
- `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md`

### Institutional Learnings

- Existing long-task modules keep research assets in `docs/research/video-ref/` and architectural learnings in `docs/solutions/`.
- Existing reference ledgers use coverage status, source boundary notes, and explicit non-copy constraints.

### External References

- None. This card uses local research assets and source contracts already present in the repo.

---

## Key Technical Decisions

- Create separate ledgers for Toonflow and AI-CanvasPro instead of one combined document: future cards usually enter through one source module family, so separate files keep lookup faster.
- Keep path/version/license source authority in `docs/research/video-ref/source-contract.md`: ledgers reference it and avoid repeating non-portable local paths.
- Mark coverage judgments conservatively: source contract and generated asset existence are `Fact`; backlog coverage/routing judgments are usually `Inference`; exact source behavior not yet read at narrow slices stays `Pending Verification`.

---

## Open Questions

### Resolved During Planning

- Should CEX-00 modify product code? No. The source cards describe it as research/documentation only.
- Should ledgers replace the source long-task documents? No. They are first-pass evidence entrypoints; source documents retain full module background and scope.

### Deferred to Implementation

- Exact row wording may adjust while writing the ledgers to keep the tables readable and avoid duplicating whole source documents.

---

## Implementation Units

- U1. **Create Toonflow coverage ledger**

**Goal:** Add a Toonflow coverage/gaps document with source boundary, evidence entrypoints, coverage matrix, lookup map, and exclusion rules.

**Requirements:** R1, R3, R5, R6

**Dependencies:** None

**Files:**
- Create: `docs/research/video-ref/toonflow-coverage-and-gaps.md`

**Approach:**
- Use `docs/toonflow-reference-long-task-development-flow.md` as the source module list.
- Use `docs/research/video-ref/source-contract.md`, `docs/research/video-ref/build-status.md`, graph query files, and focused Repomix packs as evidence entrypoints.
- Label source status and generated asset existence as `Fact`; mark module routing and coverage status as `Inference` unless directly verified.

**Patterns to follow:**
- `docs/research/video-ref/infinite-canvas-coverage-and-gaps.md`

**Test scenarios:**
- Test expectation: none -- Markdown research ledger only.

**Verification:**
- The ledger includes `TFR-00` through `TFR-27`, a lookup map, evidence labels, and explicit non-copy boundaries.

---

- U2. **Create AI-CanvasPro coverage ledger**

**Goal:** Add an AI-CanvasPro coverage/gaps document with source boundary, evidence entrypoints, coverage matrix, exclusion governance, lookup map, and CEX routing.

**Requirements:** R2, R3, R5, R6

**Dependencies:** None

**Files:**
- Create: `docs/research/video-ref/ai-canvaspro-coverage-and-gaps.md`

**Approach:**
- Use `docs/ai-canvaspro-reference-long-task-development-flow.md` as the source module list.
- Use the existing AI-CanvasPro context pack, graph report/query files, focused Repomix contexts, and source contract as evidence entrypoints.
- Separate borrowable behavior from migration-constrained desktop/local capabilities and excluded subscription/update/license behavior.

**Patterns to follow:**
- `docs/research/video-ref/infinite-canvas-coverage-and-gaps.md`
- `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md`

**Test scenarios:**
- Test expectation: none -- Markdown research ledger only.

**Verification:**
- The ledger includes `ACP-00` through `ACP-25`, explicit `ACP-X-*` exclusions, evidence labels, and topic lookup paths.

---

- U3. **Index the new ledgers**

**Goal:** Update the video reference research index so future modules start from the ledgers before narrow source verification.

**Requirements:** R4, R5

**Dependencies:** U1, U2

**Files:**
- Modify: `docs/research/video-ref/index.md`

**Approach:**
- Add the new ledgers to `Start Here` and `Generated Assets`.
- Keep existing asset descriptions intact.

**Patterns to follow:**
- Existing `Infinite-Canvas coverage ledger` index row.

**Test scenarios:**
- Test expectation: none -- Markdown index update only.

**Verification:**
- The index names both ledgers and directs Toonflow/AI-CanvasPro work through them.

---

## System-Wide Impact

- **Interaction graph:** Documentation-only; no runtime callbacks, middleware, workers, or API routes are affected.
- **Error propagation:** No runtime error behavior changes.
- **State lifecycle risks:** No database, cache, asset, or filesystem runtime state changes.
- **API surface parity:** No public API changes.
- **Integration coverage:** Markdown link and content checks are sufficient for this card.
- **Unchanged invariants:** Canvas-first, worker-first, secret-safe, mock-first, typed-contract boundaries remain unchanged and are reinforced by the ledgers.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Coverage rows are mistaken for implementation truth | Label source-derived routing as `Inference` and require future cards to inspect current code/tests before implementation. |
| Future agents still open broad reference source first | Put ledgers in `docs/research/video-ref/index.md` Start Here section. |
| License/safety exclusions are missed | Repeat explicit non-copy boundaries in each ledger. |

---

## Documentation / Operational Notes

- CEX-00 completion should be recorded in the final module handoff summary.
- No dev server or browser verification is required because this card has no UI/runtime changes.

---

## Completion Log

- U1 added `docs/research/video-ref/toonflow-coverage-and-gaps.md` with source boundary, evidence assets, lookup map, `TFR-00` through `TFR-27` coverage routing, exclusions, and pending verification queue.
- U2 added `docs/research/video-ref/ai-canvaspro-coverage-and-gaps.md` with source boundary, evidence assets, lookup map, `ACP-00` through `ACP-25` coverage routing, migration constraints, exclusions, and pending verification queue.
- U3 updated `docs/research/video-ref/index.md` so Toonflow and AI-CanvasPro work starts from the new coverage ledgers.
- Compound learning captured the reference coverage ledger pattern in `docs/solutions/documentation-gaps/reference-coverage-ledger-governance-2026-06-14.md`.

## Verification Log

- `node -e "<markdown structural checks>"`: verified required CEX-00 docs exist, new Markdown files end with trailing newlines, Toonflow ledger includes `TFR-00` through `TFR-27`, and AI-CanvasPro ledger includes `ACP-00` through `ACP-25`.
- Local absolute path scan over the new CEX-00 docs: no matches; new docs do not repeat machine-specific source paths.
- `git diff --check -- <CEX-00 docs>`: no whitespace errors.
- `pnpm exec prettier --check <CEX-00 docs>` could not run because `prettier` is not installed in this workspace.

---

## Sources & References

- **Origin document:** `docs/brainstorms/2026-06-14-037-cex-00-reference-evidence-governance-requirements.md`
- CEX checklist: `docs/codex-reference-long-task-execution-checklist.md`
- Research source contract: `docs/research/video-ref/source-contract.md`
- Research index: `docs/research/video-ref/index.md`
- Research build status: `docs/research/video-ref/build-status.md`
- Toonflow source modules: `docs/toonflow-reference-long-task-development-flow.md`
- AI-CanvasPro source modules: `docs/ai-canvaspro-reference-long-task-development-flow.md`
- AI-CanvasPro context pack: `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md`

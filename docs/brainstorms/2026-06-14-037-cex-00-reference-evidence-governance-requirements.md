---
date: 2026-06-14
topic: cex-00-reference-evidence-governance
status: completed
---

# CEX-00 Reference Evidence Governance

## Summary

Create durable Toonflow and AI-CanvasPro reference coverage ledgers for the CEX backlog so later execution cards can locate evidence quickly, understand source/license boundaries, and avoid copying unsafe or out-of-scope reference project behavior.

---

## Problem Frame

The CEX backlog merges two reference-project task lists into one long-running execution queue. The repo already contains source contracts, context packs, graph assets, and reference long-task documents, but the Toonflow and AI-CanvasPro evidence is still split across several places. Without stable coverage/gaps entrypoints, later modules can repeat the same research, miss exclusion rules, or accidentally treat reference implementation details as product scope.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- CEX-00 is documentation and research governance only; it should not modify product code.
- Existing source contracts, generated graph/Repomix assets, and long-task reference documents are sufficient to create first-pass coverage ledgers.
- The coverage ledgers should use evidence strength labels rather than presenting all source-derived backlog judgments as verified implementation facts.

---

## Actors

- A1. Codex executor: resumes the long task, chooses the next CEX card, and needs a fast evidence lookup path.
- A2. Human reviewer: checks whether reference-project decisions remain license-safe, secret-safe, and aligned with guga-flow architecture.
- A3. Future planning agent: uses the coverage ledgers to create or update requirements and plans for later CEX cards.

---

## Key Flows

- F1. Enter a CEX card from the checklist
  - **Trigger:** Codex starts or resumes work on a `CEX-*` card.
  - **Actors:** A1, A3
  - **Steps:** Read the checklist card, open the matching coverage ledger, follow the topic-specific evidence entrypoint, and carry any exclusion rules into requirements/plan scope.
  - **Outcome:** The card starts from existing evidence instead of repeating broad reference-source scans.
  - **Covered by:** R1, R2, R4, R5

- F2. Review reference-project safety boundaries
  - **Trigger:** A CEX card wants to borrow a behavior from Toonflow or AI-CanvasPro.
  - **Actors:** A2, A3
  - **Steps:** Check source contract, coverage row, evidence strength, and explicit non-copy exclusions before using the behavior as product inspiration.
  - **Outcome:** Reference behavior can inform guga-flow without copying code, assets, prompts, provider scripts, desktop IPC, subscriptions, or update mechanisms.
  - **Covered by:** R2, R3, R6

---

## Requirements

**Coverage Ledgers**
- R1. Provide a Toonflow coverage/gaps ledger in `docs/research/video-ref/` that records the source contract, generated evidence assets, coverage status, and CEX routing for `TFR-*` modules.
- R2. Provide an AI-CanvasPro coverage/gaps ledger in `docs/research/video-ref/` that records the source contract, generated evidence assets, coverage status, exclusion governance, and CEX routing for `ACP-*` modules.
- R3. Both ledgers must label important statements as `Fact`, `Inference`, or `Pending Verification`.

**Lookup and Routing**
- R4. The research index must name the two new ledgers as first-pass entrypoints alongside the existing Infinite-Canvas ledger and context packs.
- R5. Each ledger must give future CEX cards a short lookup map to the relevant graph, query, Repomix, or context-pack evidence.

**Safety Boundaries**
- R6. The ledgers must explicitly exclude reference-project source copying, static asset copying, prompt copying, provider script copying, Electron IPC/preload 1:1 migration, subscription gates, auto-updaters, commercial license text, local absolute path leakage, and browser-secret exposure.

---

## Acceptance Examples

- AE1. **Covers R1, R4, R5.** Given a future executor starts CEX-03, when they open the Toonflow ledger, they can identify the Agent deploy source row and the relevant agent/provider evidence assets without scanning the whole reference project.
- AE2. **Covers R2, R3, R6.** Given a future executor starts an AI-CanvasPro desktop-related card, when they open the AI-CanvasPro ledger, they see desktop IPC and auto-update behavior marked as migration-constrained or excluded rather than implementation scope.
- AE3. **Covers R3.** Given a coverage judgment is derived from reference task consolidation rather than direct source verification, the ledger marks it as `Inference` or points to a `Pending Verification` follow-up.

---

## Success Criteria

- A future CEX planner can find Toonflow or AI-CanvasPro evidence for a module in under three minutes.
- Reviewers can see the source/license boundary and non-copy exclusions before implementation planning begins.
- CEX-00 can be marked complete without product code changes.

---

## Scope Boundaries

- Do not implement any CEX product feature in this card.
- Do not create or modify provider integrations, auth, agents, canvas nodes, task center, desktop adapters, or UI.
- Do not copy source code, prompts, provider manifests, static assets, screenshots, generated media, license text, Electron IPC, subscription gates, or update logic from reference projects.
- Do not verify every future CEX module at source-file depth; this card creates the first-pass ledger and flags where future narrow verification is required.

---

## Key Decisions

- Use coverage/gaps ledgers rather than embedding all evidence in the CEX checklist: the checklist remains an execution queue, while research ledgers are reusable evidence entrypoints.
- Keep local source paths centralized in `docs/research/video-ref/source-contract.md`: new ledgers should point to the source contract rather than repeating non-portable absolute paths.
- Treat source-derived backlog status as reviewable evidence, not product truth: later CEX cards must still read the current code and tests before implementation.

---

## Dependencies / Assumptions

- `docs/research/video-ref/source-contract.md` already records source project versions and license boundaries.
- `docs/research/video-ref/build-status.md` already records generated graph/Repomix asset status.
- `docs/toonflow-reference-long-task-development-flow.md` and `docs/ai-canvaspro-reference-long-task-development-flow.md` remain the source module lists for `TFR-*` and `ACP-*`.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R2][Needs research] Which coverage rows need a `Pending Verification` note because current evidence is graph/context-pack level rather than narrow source-file verification?

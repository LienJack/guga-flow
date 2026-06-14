---
title: "Use Reference Coverage Ledgers Before Narrow Source Verification"
date: 2026-06-14
category: documentation-gaps
module: cex-reference-evidence-governance
problem_type: documentation_gap
component: documentation
severity: medium
applies_when:
  - "Long-running CEX modules use reference projects as evidence, not implementation sources"
  - "Reference source has license, desktop, secret, or path boundaries that future agents must remember"
  - "Generated graph and Repomix assets exist, but module-level coverage is spread across multiple documents"
tags:
  - cex
  - reference-research
  - coverage-ledger
  - evidence-boundary
---

# Use Reference Coverage Ledgers Before Narrow Source Verification

## Context

CEX-00 needed to make Toonflow and AI-CanvasPro evidence reusable before the rest of the CEX queue starts opening product modules. The raw research assets already existed, but future agents still had to piece together source contracts, generated graph reports, focused Repomix packs, source-module backlogs, and safety exclusions.

## Guidance

Create one coverage ledger per reference project before implementing modules derived from that source. The ledger should not replace the source contract, context packs, or long-task source document. It should act as the first-pass entrypoint that tells future agents where to look next and which boundaries are already known.

Each ledger should include:

- Source contract boundary and a pointer to the canonical source/version/license record.
- Evidence strength labels: `Fact`, `Inference`, and `Pending Verification`.
- A three-minute lookup map from module topic to graph query, context pack, or focused Repomix asset.
- A coverage matrix that maps source module IDs to the execution backlog route.
- Explicit non-copy and safety exclusions.
- A pending verification queue for exact behavior that should wait until the relevant implementation card.

Keep local absolute paths centralized in the source contract rather than repeating them across generated docs. This keeps new ledgers portable and reduces the chance of leaking machine-specific paths into future plans.

## Why This Matters

Reference projects are useful because they compress product discovery, but they are dangerous when agents treat them like implementation sources. A coverage ledger makes the useful part easy to find while keeping license, branding, secret, desktop, and path boundaries visible at the moment planning begins.

It also prevents repeated broad source scans. Future cards can start from a small row, read the matching source-module description, then open only the narrow evidence asset needed for that module.

## When to Apply

- When a long-running backlog merges multiple reference project task lists.
- When a reference repo has generated graph/Repomix assets but no stable module-level coverage entrypoint.
- When later modules need to borrow product behavior while excluding source copying, desktop migration, provider secret leakage, or commercial gating.

## Examples

- `docs/research/video-ref/toonflow-coverage-and-gaps.md` maps `TFR-*` modules to `CEX-*` execution cards and focused Toonflow evidence assets.
- `docs/research/video-ref/ai-canvaspro-coverage-and-gaps.md` maps `ACP-*` modules to `CEX-*` cards and separates borrowable behavior from desktop/local migration constraints.
- `docs/research/video-ref/index.md` points future Toonflow and AI-CanvasPro work to the ledgers before graph/query/context-pack reads.

## Related

- `docs/brainstorms/2026-06-14-037-cex-00-reference-evidence-governance-requirements.md`
- `docs/plans/2026-06-14-037-feat-cex-00-reference-evidence-governance-plan.md`
- `docs/research/video-ref/source-contract.md`
- `docs/research/video-ref/index.md`
- `docs/research/video-ref/infinite-canvas-coverage-and-gaps.md`

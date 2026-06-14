---
date: 2026-06-14
topic: infinite-canvas-p0-provider-asset-foundation
status: completed
origin: docs/infinite-canvas-reference-long-task-development-flow.md
---

# Infinite-Canvas P0 Provider And Asset Foundation Requirements

## Summary

Complete IC-00 through IC-03 from the Infinite-Canvas reference PRD by preserving a license-safe research trail, adding generic provider protocol and model discovery support, and upgrading the project asset library with collections, tags, filtering, batch operations, and reference-aware deletion.

## Reference Baseline

Observed and documented from `/Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas/`:

- Provider behavior should be treated as product evidence, not copied implementation.
- Custom endpoints and model discovery are valuable for creator/admin workflows.
- Asset and prompt library behavior should map into guga-flow's existing project-scoped Asset, CanvasNode, GenerationJob, and ProviderConfig boundaries.
- Local platform and update behavior remain outside P0.

The license-safe source contract is maintained in `docs/research/video-ref/source-contract.md`.

## Scope Decision

Implement P0 as guga-flow-native foundations. Do not copy Infinite-Canvas source, assets, workflows, scripts, branding, or license text. P1/P2 modules are handled through split/defer decisions unless separately product-confirmed.

## Requirements

- R1. Research ledger: Infinite-Canvas source path, commit, license boundary, and non-copy rules must be documented.
- R2. Evidence pack: provider/model/workflow/asset observations must be captured with Fact/Inference/Pending Verification labels.
- R3. Provider protocol: shared contracts must represent protocol, base URL, image/video request modes, safe provider params, and temporary discovery credentials.
- R4. Generic providers: image and video registries must expose generic providers without requiring browser-held secrets.
- R5. Model discovery: backend must discover models through server-side fetch, handle mock/OpenAI-compatible/Gemini/Ark-style endpoints, and avoid persisting temporary credentials.
- R6. Friendly discovery errors: redirects, HTML pages, unauthorized keys, and failed upstream calls must return safe messages without raw secrets or raw HTML.
- R7. Settings UI: provider settings must allow protocol/base URL/default model configuration and model discovery.
- R8. Runtime config: worker-side provider execution must receive safe provider params and backend-owned credentials.
- R9. Asset taxonomy: assets must support collection and tag records with project scope.
- R10. Asset search: asset listing must support type, purpose, collection, tag, filename/storage/metadata search, and relation projection.
- R11. Batch operations: selected assets must support move collection, add/remove tags, and protected batch delete.
- R12. Reference protection: delete paths must reject assets still referenced by canvas nodes or generation jobs.

## Acceptance Examples

- AE1. **Covers R1-R2.** Infinite-Canvas research source contract and context pack exist and are linked from the research index.
- AE2. **Covers R3-R8.** A project can configure a generic provider, discover models with a temporary key, save safe params, and pass runtime params to worker provider registries.
- AE3. **Covers R5-R6.** Discovery returns safe failure objects for HTML/redirect/401-like responses and never leaks credentials.
- AE4. **Covers R9-R11.** Asset library UI can create collections/tags, filter assets, select multiple assets, and apply batch actions.
- AE5. **Covers R12.** Single and batch delete reject referenced assets before storage deletion.

## Scope Boundaries

- No ComfyUI or RunningHub workflow execution in this P0 slice.
- No asset caption/classify jobs in this P0 slice.
- No local desktop shell, updater, CLI bridge, browser extension, or local folder scanner.
- No provider key exposure to browser-safe DTOs, job payloads, or logs.
- No reference project implementation copying.

## Key Decisions

- Use existing `ProviderConfig.paramsJson` for safe protocol/base URL/provider param metadata.
- Add generic image/video provider IDs instead of making existing Image2/Seedance adapters polymorphic.
- Keep temporary discovery credentials request-local and do not persist them.
- Add dedicated `AssetCollection`, `AssetTag`, and `AssetTagAssignment` tables because project-level browsing/filtering needs queryable taxonomy.
- Implement reference protection through JSON containment scans of canvas node and generation job payloads for P0; future high-volume installs can replace this with indexed reference tables.

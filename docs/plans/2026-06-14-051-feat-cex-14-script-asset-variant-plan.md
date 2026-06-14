# CEX-14 Script Asset Extraction And Variants Plan

Date: 2026-06-14
Status: completed

## Goal

Create a ScriptDraft-to-asset extraction path and add variant-aware prompt composition for production asset nodes.

## Implementation Units

### U1 Shared Contracts

- Add script asset candidate/import result contracts.
- Add derived asset variant data and prop asset node data.
- Extend Character/Location/Prop data with variant fields and source trace.
- Make prompt composer include the selected variant asset ID.

### U2 Backend

- Add ScriptDraft asset extraction endpoint.
- Add ScriptDraft asset import endpoint that creates or merges canvas asset nodes.
- Store source trace and draft variants in node data.
- Add service tests for extract/import/merge behavior.

### U3 Frontend

- Add API helpers and request tests.
- Add candidate preview/edit/import controls inside the Script workspace.
- Allow merge target entry per candidate.

### U4 Verification

- Run targeted shared/backend/frontend tests.
- Run full lint/test/build checks.
- Commit this module once green.

## Scope Boundaries

- Do not implement actual asset image generation jobs here.
- Do not overwrite selected variants automatically.
- Do not stage unrelated `globals.css` or reference docs.

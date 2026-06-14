# CEX-28 Advanced Visual Nodes Plan

Date: 2026-06-14
Status: completed

## Goal

Complete the CEX-28 advanced visual node slice by recording the requirements,
verifying the existing scene-frame, panorama, and Three.js director work, and
adding a repeatable Playwright canvas-pixel gate.

## Implementation Units

### U1 Shared Contracts And Node Registry

- Confirm `scene_frame`, `panorama`, and `director_3d` are represented in
  shared canvas node types, family metadata, input slots, and prompt-composer
  advanced visual references.
- Confirm scene-frame extraction input/output contracts exist alongside the
  worker generation job union.
- Verification: shared type tests cover advanced visual node registry entries,
  input slots, panorama prompt context, and scene-frame extraction contracts.

### U2 Backend And Worker Scene Frames

- Confirm backend queueing validates video assets/source nodes and stores the
  typed scene-frame input inside the existing worker-claimable generation job
  operation.
- Confirm worker mock execution returns deterministic frame assets and scene
  segment summaries.
- Confirm completion creates generated frame Assets and updates source video
  metadata without local absolute paths.
- Verification: backend and worker tests cover queueing, execution, completion,
  failure, and generated frame asset metadata.

### U3 Frontend Advanced Visual Experience

- Confirm the canvas toolbar, card, inspector, and prompt composer recognize
  panorama and director 3D nodes as advanced visual references.
- Confirm panorama nodes show preview context, annotations, and linked image
  assets.
- Confirm director 3D nodes use Three.js for preview and expose snapshot
  capture that uploads a PNG Asset and writes the selected node back.
- Verification: frontend component tests cover panorama inspector output,
  director preview controls, and scene-frame extraction controls.

### U4 Browser Pixel Verification

- Add a root `verify:cex28` command that runs Playwright Chromium against a
  local fixture using the repository's `three` package.
- The fixture renders the same controlled director-scene shape used by the
  product node contract, reads WebGL pixels, verifies foreground pixels exceed
  the blank-canvas threshold, and exercises PNG capture.
- Verification: `pnpm verify:cex28` prints foreground-pixel metrics,
  capture-byte metrics, and writes a screenshot artifact under
  `.codex/verification/`.

### U5 Documentation And Handoff

- Add the CEX-28 requirements document.
- Add this completion plan.
- Add a compound architecture-pattern note for future agents.
- Update the AI-CanvasPro coverage ledger so ACP-12, ACP-13, and ACP-14 no
  longer appear as uncovered.
- Verification: the checklist scan finds requirements and plan documents for
  CEX-00 through CEX-28, and coverage rows point CEX-28 to implemented evidence.

## Scope Boundaries

- Keep the first CEX-28 slice as a controlled MVP around existing canvas,
  worker, prompt, and inspector patterns.
- Do not add a complete 3D editor, panorama authoring surface, VR player, real
  scene detector, or desktop capture adapter.
- Do not add new Prisma generation enum values for scene-frame extraction in
  this slice; keep the typed operation in job input/output where existing
  worker-claimable jobs already support it.
- Do not stage unrelated `apps/frontend/src/app/globals.css` changes as part of
  CEX-28.

## Verification

- `pnpm verify:cex28`
- `pnpm test`
- `pnpm format:check`

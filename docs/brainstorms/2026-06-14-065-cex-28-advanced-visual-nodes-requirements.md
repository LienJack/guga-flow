# CEX-28 Advanced Visual Nodes Requirements

Date: 2026-06-14
Status: completed

## Source

- Checklist item: CEX-28
- Reference modules: ACP-12, ACP-13, ACP-14

## Product Need

guga-flow already has the Web-first production chain for source media,
generation jobs, media derivatives, storyboard work, and prompt composition.
The remaining AI-CanvasPro advanced visual references need a controlled MVP so
video scene frames, 360 panorama references, and 3D director blocking can enter
the canvas without importing desktop-only behavior or unsafe capture flows.

## Required Outcomes

- Video assets can request scene/frame extraction through the worker-owned
  generation queue and write generated frame Assets back to source metadata.
- Panorama nodes are first-class advanced visual canvas nodes with image asset
  references, view state, annotations, and prompt-context contribution.
- Director 3D nodes are first-class advanced visual canvas nodes with a
  Three.js preview, controlled scene objects, prompt context, and snapshot Asset
  backflow.
- Browser verification includes a Playwright canvas-pixel check proving the 3D
  preview is nonblank and can produce a PNG capture.
- All advanced visual work stays Web/server/worker-owned and avoids copying
  AI-CanvasPro renderers, panorama source, IPC, preload, desktop capture, or
  bundled assets.

## Non-Goals

- No complete 3D modeling tool, VR player, real-time video analysis, or NLE.
- No Electron/Tauri bridge, preload, IPC, screen capture, or arbitrary local
  file access.
- No compatibility with AI-CanvasPro project JSON or node implementation.
- No raw local paths, provider secrets, or reference-project assets in browser
  DTOs, generation jobs, logs, screenshots, or verification artifacts.

## Acceptance Gates

- Shared types expose `scene_frame`, `panorama`, and `director_3d` node
  contracts and scene-frame extraction job contracts.
- Backend and worker tests cover scene-frame extraction queueing, completion,
  generated frame assets, and safe metadata updates.
- Frontend tests cover panorama and 3D director inspector rendering and
  scene-frame extraction controls.
- `pnpm verify:cex28` passes and reports nonzero foreground canvas pixels plus
  a PNG capture result.
- `pnpm test` and `pnpm format:check` pass after the CEX-28 completion docs and
  verification script are in place.

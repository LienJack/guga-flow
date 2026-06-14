# Advanced Visual Node Browser Pixel Boundary

Date: 2026-06-14
Status: accepted

## Context

CEX-28 brings AI-CanvasPro-inspired advanced visual references into guga-flow:
scene/frame extraction, 360 panorama references, and a 3D director node. The
risky part is not storing another node type; it is proving the Web MVP can
render and capture a nonblank 3D reference without copying desktop renderer
code, adding Electron IPC, or relying on screenshots that nobody can reproduce.

## Decision

- Keep advanced visuals as ordinary canvas facts: typed `CanvasNode` data,
  semantic edges, prompt-composer references, `Asset` records, and
  `GenerationJob` outputs.
- Keep scene/frame extraction worker-first. The typed
  `scene_frame_extraction` payload rides inside the existing worker job queue
  and completes by creating frame Assets plus source-node metadata.
- Keep panorama as an inspectable image-backed reference node with view state,
  annotations, and prompt context.
- Keep director 3D as a bounded Three.js preview in the inspector, with
  controlled primitive objects and PNG snapshot backflow through normal Asset
  upload and node update APIs.
- Add `pnpm verify:cex28` as the repeatable browser gate. It starts a local
  fixture, imports the repository's `three` package, renders a director scene
  in Chromium through Playwright, reads WebGL pixels, rejects blank canvases,
  and verifies PNG capture bytes.

## Consequences

- CEX-28 has real browser-level evidence instead of relying only on static
  React markup tests.
- Future 3D work can improve the scene authoring model without changing the
  proof boundary: a nonblank canvas and a PNG capture must remain verifiable.
- The fixture stays independent of external CDNs and uses the same pinned
  workspace dependency as the frontend.
- Desktop-only features remain out of scope. Browser verification is not a
  license to add silent screen capture, arbitrary file access, or Electron
  preload behavior.

## Verification

- Shared type tests cover advanced visual registry entries and prompt context.
- Backend and worker tests cover scene-frame extraction queueing, execution,
  completion, and generated frame metadata.
- Frontend tests cover panorama/director inspector rendering and scene-frame
  controls.
- `pnpm verify:cex28` confirms foreground pixels and PNG capture bytes through
  Playwright Chromium.

# AI-CanvasPro Canvas / Provider / Desktop Context Pack

> Date: 2026-06-14
> Source: `/Users/lienli/Documents/GitHub/video-ref/AI-CanvasPro`
> Source version: commit `f19df3e7b0bf3bd16e6065428f52470afd71bf4c`, package version `0.4.10`
> Use with: `reference_project_research_workflow.md`

This pack is an evidence index for AI-CanvasPro. It records behavior-level facts, architecture navigation, and guga-flow adaptation notes. Do not copy reference source, assets, branding, screenshots, bundled vendor code, generated media, binaries, or license text into guga-flow.

## Source Boundary

- Fact: `README.md` describes AI Canvas as a node-based multimodal infinite canvas editor implemented as native Web HTML/CSS/JS.
- Fact: `README.md` lists AI image, text, video, audio, 360 panorama, 3D director scene, comment, storyboard, and media-oriented nodes.
- Fact: `README.md` describes local project management, `Ctrl+S` save behavior, `user/Canvas Project/` storage, and JSON project files that can be dragged back onto the canvas.
- Fact: `package.json` sets the Electron entry to `electron/main.js` and the package version to `0.4.10`.
- Fact: `LICENSE` is a custom source-available dual license. Commercial use requires separate written authorization.
- Inference: guga-flow can borrow behavior, product shape, file-boundary ideas, and workflow vocabulary, but implementation must remain original, typed, server-side where appropriate, and license-clean.

## Generated Assets

| Asset | Path | Use |
| --- | --- | --- |
| Graphify report | `docs/research/video-ref/graphs/ai-canvaspro/GRAPH_REPORT.md` | Scope metrics, hubs, inferred bridges, suggested questions |
| Graphify graph | `docs/research/video-ref/graphs/ai-canvaspro/graph.json` | AST/code navigation over selected high-value scope |
| Graphify HTML | `docs/research/video-ref/graphs/ai-canvaspro/graph.html` | Local interactive graph inspection |
| Saved graph queries | `docs/research/video-ref/graphs/ai-canvaspro/queries/*.txt` | Canvas/node, provider/task, and project/desktop navigation |
| Token tree | `docs/research/video-ref/repomix/ai-canvaspro-token-tree.txt` | First-pass file map and token cost control |
| Base context | `docs/research/video-ref/repomix/ai-canvaspro-context.xml` | Compressed entry/API/backend/Electron/source-service index |
| Canvas context | `docs/research/video-ref/repomix/ai-canvaspro-focused-canvas-nodes.xml` | Compressed canvas/node entry index |
| Provider context | `docs/research/video-ref/repomix/ai-canvaspro-focused-provider-tasks.xml` | Compressed provider/task/error index |
| Project context | `docs/research/video-ref/repomix/ai-canvaspro-focused-project-desktop.xml` | Compressed local backend, Electron IPC, and project persistence index |

## Corpus Shape

- Fact: Full Graphify detection found 743 supported files, about 1,251,621 words, 688 code files, 9 document files, 45 image files, and 1 video file.
- Fact: The canonical Graphify graph was generated from a selected 103-file scope and produced 3,676 nodes, 7,581 edges, and 155 communities.
- Fact: The graph is AST/code-only. Semantic extraction was not run.
- Fact: The first system Graphify run failed because the system tree-sitter binding did not support JavaScript language version 15. A temporary venv at `/tmp/graphify-venv` was used successfully.
- Inference: AI-CanvasPro should be researched through token tree and topic slices. Full-context loading is wasteful because many files are minified/obfuscated single-line JavaScript.

## Architecture Map

| Area | Evidence Entry | What To Use It For |
| --- | --- | --- |
| Product overview | `README.md`, `使用说明.md` | Node taxonomy, user workflows, API key settings, project file behavior |
| App bootstrap | `main.js`, `src/modules/registry.js`, `src/modules/nodeMeta.js` | Node registration, app shell wiring, canvas entrypoints |
| Canvas and state | `src/core/stores/appStore.js`, `src/core/renderer.js`, `src/core/interaction.js` | Store, renderer, pointer interaction, graph state boundaries |
| Node classes | `src/components/*Node.js` | Per-node responsibilities; use narrow slices because many files are large |
| Provider APIs | `api/aiImageApi.js`, `api/aiVideoApi.js`, `api/aiTextApi.js`, `api/aiAudioApi.js`, `api/adapters/*.js` | Provider request construction, polling, adapters, error handling |
| Local backend | `server.py`, `backend/services/*.py` | HTTP routing, media file routes, Dreamina CLI, local processing, subscription gate |
| Desktop shell | `electron/main.js`, `electron/ipc/*.js`, `electron/projectPackageService.js` | Electron IPC, project package import/export, local file access, diagnostics |
| Project persistence | `src/services/projectService.js`, `src/services/desktopProjectService.js`, `src/services/desktopProjectFileStore.js` | Browser to desktop/server project save and load path |

## Graphify Notes

Top hubs from the scope graph:

| Hub | Why It Matters |
| --- | --- |
| `MediaClipNode` | Central media editing/timeline surface |
| `DreaminaCliService` | Local CLI integration and Dreamina generation bridge |
| `StoryboardNode` | Storyboard/grid media planning surface |
| `PanoramaSceneNode` | 360/3D scene node surface |
| `AIGenAudioNode` | Audio generation node surface |
| `MediaFileRouteService` | Backend local media persistence and output-file route handling |
| `SourceVideoNode` / `SourceImageNode` | Source media nodes and media-task recovery paths |

Notable bridge questions from Graphify:

- Why does `logDiagnosticEvent()` connect diagnostics, media task, Electron, file import, and local processing communities?
- Why does `MediaClipNode` bridge timeline/media editing communities?
- Why does `handleFileDrop()` connect file import, node creation, diagnostics, and default sizing?

## Confirmed Patterns

- Fact: AI-CanvasPro separates browser API wrappers in `api/`, Python local backend services in `backend/services/` and `server.py`, and desktop privileges in `electron/`.
- Fact: Provider-specific concerns are split between top-level modality APIs, adapters, error parsers, and model/workflow resolvers.
- Fact: Project and media persistence cross browser services, Electron IPC, local backend services, and on-disk JSON/media paths.
- Inference: guga-flow should preserve its current stronger boundary: browser state and canvas DTOs should stay typed; provider secrets and filesystem access should stay in backend/worker/desktop-trusted layers.
- Inference: AI-CanvasPro validates the product value of node-level multimodal generation, visible task recovery, local media affordances, and project-file portability.

## Borrowable Ideas

- Use a clear node taxonomy for source media, generation nodes, storyboard/script nodes, media clip nodes, panorama/3D nodes, comments, and groups.
- Keep provider adapters separate from UI nodes, with modality APIs acting as the stable layer between canvas actions and upstream providers.
- Treat local media processing, thumbnails, derivatives, and project package import/export as explicit services rather than incidental UI code.
- Save queryable diagnostics around request failures, media task failures, and local runtime failures.
- Use task-center style visibility for async generation and local processing work.

## Do Not Copy

- Do not copy code, static assets, images, cursor files, generated media, bundled vendor files, license text, branding, or packaged binaries.
- Do not mirror the large obfuscated component files as architecture. Use them only to confirm a specific behavior.
- Do not expose API keys, local paths, login artifacts, or provider credentials in browser DTOs.
- Do not adopt source-available license assumptions into guga-flow deliverables.

## Source Verification Rules

1. Start from `ai-canvaspro-token-tree.txt` to estimate cost and pick candidate files.
2. Read the matching compressed context only for navigation.
3. If the behavior matters, open the exact original file and use a narrow `rg` term or source slice.
4. Mark claims as `Fact`, `Inference`, or `Pending Verification`.
5. If the needed file is heavily obfuscated, verify by route/API names, exported symbols, tests, or runtime behavior rather than by scanning the whole file.

## Open Questions

- Pending Verification: The exact project JSON schema should be verified from concrete save/load output before designing import compatibility.
- Pending Verification: Provider polling status shapes should be verified per modality when implementing real providers.
- Pending Verification: Media clip and storyboard node behavior need topic-specific packs before borrowing timeline or grid details.
- Pending Verification: The desktop packaging/update path should only be studied when guga-flow explicitly plans local desktop distribution.

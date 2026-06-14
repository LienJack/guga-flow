# video-ref Index Build Status

Date: 2026-06-14

## Source

| Project | Commit | Version | License |
| --- | --- | --- | --- |
| Toonflow-app | `cd3e7c4e83963bea255be2e621eb78d2cd1c2188` | `1.1.8` | Apache-2.0 |
| AI-CanvasPro | `f19df3e7b0bf3bd16e6065428f52470afd71bf4c` | `0.4.10` | Custom source-available dual license; non-commercial without separate authorization |

## Graphify

| Asset | Status | Scope | Output |
| --- | --- | --- | --- |
| Graphify graph | done | full Toonflow-app repo | `docs/research/video-ref/graphs/toonflow-app/graph.json` |
| Graphify report | done | full Toonflow-app repo | `docs/research/video-ref/graphs/toonflow-app/GRAPH_REPORT.md` |
| Product flow query | done | graph query | `docs/research/video-ref/graphs/toonflow-app/queries/product-flow.txt` |
| Agent architecture query | done | graph query | `docs/research/video-ref/graphs/toonflow-app/queries/agent-architecture.txt` |
| Storyboard flow query | done | graph query | `docs/research/video-ref/graphs/toonflow-app/queries/storyboard-flow.txt` |
| Vendor system query | done | graph query | `docs/research/video-ref/graphs/toonflow-app/queries/vendor-system.txt` |

Graph metrics from `GRAPH_REPORT.md`:

- 230 files
- 626 nodes
- 757 edges
- 202 communities
- 80% extracted edges, 20% inferred edges

## Repomix

| Asset | Status | Scope | Tokens | Output |
| --- | --- | --- | --- | --- |
| Token tree | done | `README.md`, `package.json`, `src/**/*.ts`, `src/**/*.tsx` | source tree shows `src/` at 155,439 tokens | `docs/research/video-ref/repomix/toonflow-app-token-tree.txt` |
| Full context | done | `README.md`, `package.json`, `src/**/*.ts`, `src/**/*.tsx` | 210,963 | `docs/research/video-ref/repomix/toonflow-app-context.xml` |
| Focused agent context | done | agents, agent sockets, agent utils, AI helpers | 29,741 | `docs/research/video-ref/repomix/toonflow-app-focused-agent.xml` |
| Focused storyboard context | done | production routes, script routes, DB types | 39,220 | `docs/research/video-ref/repomix/toonflow-app-focused-storyboard.xml` |
| Focused assets context | done | assets, assetsGenerate, cornerScape, task/image utils | 18,798 | `docs/research/video-ref/repomix/toonflow-app-focused-assets.xml` |
| Focused vendor context | done | vendor routes/code plus `src/lib/vendor.json` | 93,086 | `docs/research/video-ref/repomix/toonflow-app-focused-vendor.xml` |
| Focused vendor code context | done | vendor routes/code without `src/lib/vendor.json` | 27,909 | `docs/research/video-ref/repomix/toonflow-app-focused-vendor-code.xml` |

## Notes

- `toonflow-app-focused-vendor.xml` is intentionally large because `src/lib/vendor.json` alone accounts for most tokens. Prefer `toonflow-app-focused-vendor-code.xml` for normal LLM reads, and use the larger pack only when vendor catalog data is needed.
- Graphify output was also generated in `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/graphify-out/`; the copied canonical research artifacts are under `docs/research/video-ref/graphs/toonflow-app/`.

## AI-CanvasPro Addendum

Generated on 2026-06-14 from `/Users/lienli/Documents/GitHub/video-ref/AI-CanvasPro`.

### Scope Notes

- Full Graphify detect over the reference repo found 743 supported files, about 1,251,621 words, 688 code files, 9 document files, 45 image files, and 1 video file. The full repo is too noisy for a first-pass semantic graph.
- Canonical Graphify output is an AST/code graph over a selected high-value scope copied to `/tmp/ai-canvaspro-graphify-scope`: entry files, API adapters, backend services, Electron IPC/project files, core canvas/node files, and task/media files. It excludes vendor bundles, images, generated assets, tests, and broad static files.
- Graphify semantic extraction was not run. The local system `graphify` first failed because its tree-sitter binding did not support JavaScript language version 15; a temporary venv at `/tmp/graphify-venv` with compatible tree-sitter was used for the successful code graph.
- AI-CanvasPro source is heavily minified/obfuscated in many large single-line JavaScript files. Treat Graphify as a navigation map and Repomix compressed contexts as entry indexes, not as complete semantic evidence.

### AI-CanvasPro Graphify

| Asset | Status | Scope | Output |
| --- | --- | --- | --- |
| Graphify graph | done | selected high-value code scope, 103 files | `docs/research/video-ref/graphs/ai-canvaspro/graph.json` |
| Graphify report | done | selected high-value code scope | `docs/research/video-ref/graphs/ai-canvaspro/GRAPH_REPORT.md` |
| Graphify HTML | done | selected high-value code scope | `docs/research/video-ref/graphs/ai-canvaspro/graph.html` |
| Canvas/node query | done | graph query | `docs/research/video-ref/graphs/ai-canvaspro/queries/canvas-node-flow.txt` |
| Provider/task query | done | graph query | `docs/research/video-ref/graphs/ai-canvaspro/queries/provider-task-flow.txt` |
| Project/desktop query | done | graph query | `docs/research/video-ref/graphs/ai-canvaspro/queries/project-desktop-flow.txt` |

Graph metrics from `GRAPH_REPORT.md`:

- 103 files
- 3,676 nodes
- 7,581 edges
- 155 communities
- 98% extracted edges, 2% inferred edges

Most connected nodes:

- `MediaClipNode`
- `DreaminaCliService`
- `StoryboardNode`
- `PanoramaSceneNode`
- `StoryboardScriptNode`
- `AIGenAudioNode`
- `MediaFileRouteService`
- `SourceVideoNode`
- `SourceImageNode`

### AI-CanvasPro Repomix

| Asset | Status | Scope | Tokens / Size | Output |
| --- | --- | --- | --- | --- |
| Token tree | done | README, package, manual, server, API, backend, Electron, src, CSS map with broad ignores | token tree shows full selected source can exceed multi-million tokens; use as file map only | `docs/research/video-ref/repomix/ai-canvaspro-token-tree.txt` |
| Token tree XML | done | same as token tree | metadata only | `docs/research/video-ref/repomix/ai-canvaspro-token-tree.xml` |
| Base context | done | compressed entry/API/backend/Electron/source-service scope | 43,692 tokens, 59 files | `docs/research/video-ref/repomix/ai-canvaspro-context.xml` |
| Focused canvas/node context | done | compressed README/manual plus canvas/node entry files | 9,150 tokens, 29 files | `docs/research/video-ref/repomix/ai-canvaspro-focused-canvas-nodes.xml` |
| Focused provider/task context | done | compressed provider APIs, adapters, errors, task runtime, task center | 2,662 tokens, 40 files | `docs/research/video-ref/repomix/ai-canvaspro-focused-provider-tasks.xml` |
| Focused project/desktop context | done | compressed local backend, Electron IPC/project package, project/file services | 22,090 tokens, 32 files | `docs/research/video-ref/repomix/ai-canvaspro-focused-project-desktop.xml` |
| AI-CanvasPro context pack | done | behavior-level facts and adoption notes | markdown | `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md` |

### AI-CanvasPro Next Steps

- Before using raw source, search `ai-canvaspro-token-tree.txt` for the target feature and then open only the candidate file block or original file.
- If a future task depends on exact UI behavior in a large obfuscated file such as `MediaClipNode.js`, `StoryboardScriptNode.js`, `src/core/renderer.js`, or `electron/main.js`, verify with precise `rg`/line slices or runtime behavior rather than relying on compressed context alone.
- If semantic graph quality is needed, run a smaller Graphify corpus around one topic after selecting 10-25 source/doc files from the token tree.

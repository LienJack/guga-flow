# video-ref Research Index

This directory stores reusable reference evidence for video-production workbench research. It currently covers Toonflow-app and AI-CanvasPro through Graphify/Repomix assets, and Infinite-Canvas through a source contract, coverage ledger, and topic context packs.

## Start Here

1. Check the source version and license boundary in `source-contract.md`.
2. For Infinite-Canvas work, start with `infinite-canvas-coverage-and-gaps.md`, then open the matching context pack in `context-packs/`.
3. For AI-CanvasPro work, start with `context-packs/ai-canvaspro-canvas-provider-desktop.md`, then use `repomix/ai-canvaspro-token-tree.txt` and `graphs/ai-canvaspro/queries/*.txt`.
4. For Toonflow-app work, use `graphs/toonflow-app/graph.json` for concept and module navigation.
5. Use token trees to find candidate files without loading source.
6. Use focused Repomix contexts for source-level verification.
7. Use full/base contexts only when focused packs miss.

## Generated Assets

| Asset | Path | Use |
| --- | --- | --- |
| Graphify graph | `graphs/toonflow-app/graph.json` | Concept/module navigation |
| Graphify report | `graphs/toonflow-app/GRAPH_REPORT.md` | Corpus metrics, communities, graph overview |
| Graphify query logs | `graphs/toonflow-app/queries/*.txt` | Saved navigation queries |
| Repomix token tree | `repomix/toonflow-app-token-tree.txt` | Token-aware file map |
| Repomix full context | `repomix/toonflow-app-context.xml` | Last-resort source verification |
| Agent focused context | `repomix/toonflow-app-focused-agent.xml` | ScriptAgent, ProductionAgent, tools, memory helpers, AI calls |
| Storyboard focused context | `repomix/toonflow-app-focused-storyboard.xml` | Production routes, script extraction, database types |
| Assets focused context | `repomix/toonflow-app-focused-assets.xml` | Assets, image generation, audio binding, task records |
| Vendor focused context | `repomix/toonflow-app-focused-vendor.xml` | Vendor code plus large `src/lib/vendor.json` |
| Vendor code context | `repomix/toonflow-app-focused-vendor-code.xml` | Vendor routes and execution code without the large vendor JSON |
| Infinite-Canvas coverage ledger | `infinite-canvas-coverage-and-gaps.md` | Coverage matrix and IC backlog |
| Infinite-Canvas provider/workflow/asset pack | `context-packs/infinite-canvas-provider-workflow-assets.md` | Provider discovery, workflow, asset, prompt, local-platform evidence |
| AI-CanvasPro Graphify graph | `graphs/ai-canvaspro/graph.json` | AST/code graph over selected high-value scope |
| AI-CanvasPro Graphify report | `graphs/ai-canvaspro/GRAPH_REPORT.md` | Scope metrics, hubs, inferred bridges, suggested questions |
| AI-CanvasPro Graphify queries | `graphs/ai-canvaspro/queries/*.txt` | Saved navigation queries for canvas, provider/task, project/desktop flows |
| AI-CanvasPro token tree | `repomix/ai-canvaspro-token-tree.txt` | Token-aware file map; use first because source is heavily minified/obfuscated |
| AI-CanvasPro base context | `repomix/ai-canvaspro-context.xml` | Compressed entry/API/backend/Electron/source-service index |
| AI-CanvasPro canvas context | `repomix/ai-canvaspro-focused-canvas-nodes.xml` | Compressed canvas/node registration and primary node entry index |
| AI-CanvasPro provider/task context | `repomix/ai-canvaspro-focused-provider-tasks.xml` | Compressed provider adapters, API task, error, and task-center index |
| AI-CanvasPro project/desktop context | `repomix/ai-canvaspro-focused-project-desktop.xml` | Compressed local backend, Electron IPC, project package, and file persistence index |
| AI-CanvasPro context pack | `context-packs/ai-canvaspro-canvas-provider-desktop.md` | Behavior-level facts, architecture map, adoption notes, and source limitations |

## Query Protocol

```bash
graphify query "<question>" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json \
  --budget 1500

rg -n "<keyword>" docs/research/video-ref/repomix/toonflow-app-token-tree.txt

rg -n "<file path=\".*<keyword>" docs/research/video-ref/repomix/toonflow-app-focused-agent.xml
```

Use Graphify for navigation, Repomix token tree for file discovery, and Repomix contexts for facts.

For AI-CanvasPro, prefer the saved query files and compressed contexts first. Many implementation files are minified/obfuscated and appear as single-line JavaScript, so raw source reads should be narrow and evidence-driven.

# video-ref Index Build Status

Date: 2026-06-12

## Source

| Project | Commit | Version | License |
| --- | --- | --- | --- |
| Toonflow-app | `cd3e7c4e83963bea255be2e621eb78d2cd1c2188` | `1.1.8` | Apache-2.0 |

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

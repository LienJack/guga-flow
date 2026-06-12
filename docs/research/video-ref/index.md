# video-ref Research Index

This directory stores Graphify and Repomix assets for researching `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app`.

## Start Here

1. Check the source version in `source-contract.md`.
2. Use `graphs/toonflow-app/graph.json` for concept and module navigation.
3. Use `repomix/toonflow-app-token-tree.txt` to find candidate files without loading source.
4. Use focused Repomix contexts for source-level verification.
5. Use `repomix/toonflow-app-context.xml` only when focused packs miss.

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

## Query Protocol

```bash
graphify query "<question>" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json \
  --budget 1500

rg -n "<keyword>" docs/research/video-ref/repomix/toonflow-app-token-tree.txt

rg -n "<file path=\".*<keyword>" docs/research/video-ref/repomix/toonflow-app-focused-agent.xml
```

Use Graphify for navigation, Repomix token tree for file discovery, and Repomix contexts for facts.

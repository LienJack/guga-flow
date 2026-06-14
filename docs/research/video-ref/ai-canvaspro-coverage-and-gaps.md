# AI-CanvasPro 参考项目覆盖度与缺口调研

> 日期：2026-06-14
> 目标项目：`guga-flow`
> 执行入口：`CEX-00` / `ACP-00`
> 交付目的：为 AI-CanvasPro-derived CEX modules 提供可复用 evidence ledger、coverage matrix、desktop/local migration boundary 和 exclusion governance。

本文把 AI-CanvasPro 相关研究资产整理成一个稳定入口。它不替代 `docs/ai-canvaspro-reference-long-task-development-flow.md` 的完整模块说明，也不授权复制参考项目实现；它只帮助后续 CEX 模块快速定位证据、识别迁移约束和避免 license/secret/path 风险。

---

## 1. Evidence Strength Legend

- `Fact`：来自 source contract、build status、context pack、生成资产清单、已存在 repo 文档或窄范围源码/上下文证据。
- `Inference`：基于 AI-CanvasPro reference flow、guga-flow current roadmap/code inventory 或 CEX 合并判断得出的覆盖/路由结论。
- `Pending Verification`：后续实现会依赖更精确行为，需要进入对应模块时再读 focused context、query result 或窄源文件切片。

---

## 2. Source Contract Boundary

| 项目 | Evidence | 结论 |
| --- | --- | --- |
| AI-CanvasPro source version | Fact: recorded in `docs/research/video-ref/source-contract.md` and `docs/research/video-ref/build-status.md` | Use the source contract as the single authority for local path, commit, package version, and license. |
| License boundary | Fact: `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md` records a custom source-available dual license with commercial authorization requirements | Borrow behavior-level ideas only; do not copy source, assets, branding, generated media, bundled vendor code, screenshots, or license text. |
| Source shape | Fact: build status and context pack note minified/obfuscated large single-line JavaScript files | Prefer graph/query/context-pack navigation, then narrow source slices only when exact behavior matters. |

This ledger intentionally does not repeat local absolute source paths. Use `docs/research/video-ref/source-contract.md` when a local reference path is required.

---

## 3. Generated Evidence Assets

| Asset | Evidence | Use |
| --- | --- | --- |
| `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md` | Fact: behavior-level context pack | Primary first-pass source for canvas, provider, project, desktop, and safety notes. |
| `docs/research/video-ref/graphs/ai-canvaspro/GRAPH_REPORT.md` | Fact: Graphify summary for selected 103-file scope | Scope metrics, hubs, inferred bridges, and graph navigation cautions. |
| `docs/research/video-ref/graphs/ai-canvaspro/graph.json` | Fact: AST/code graph | Navigation over selected high-value scope. |
| `docs/research/video-ref/graphs/ai-canvaspro/queries/canvas-node-flow.txt` | Fact: saved query | Canvas/node registration, source nodes, generation nodes, storyboard/media nodes. |
| `docs/research/video-ref/graphs/ai-canvaspro/queries/provider-task-flow.txt` | Fact: saved query | Provider APIs, task center, diagnostics, error parsing, polling. |
| `docs/research/video-ref/graphs/ai-canvaspro/queries/project-desktop-flow.txt` | Fact: saved query | Project packages, local backend, Electron bridge, file persistence. |
| `docs/research/video-ref/repomix/ai-canvaspro-token-tree.txt` | Fact: token-aware file map | First-pass file discovery and cost control. |
| `docs/research/video-ref/repomix/ai-canvaspro-context.xml` | Fact: compressed base context | Entry/API/backend/Electron/source-service index. |
| `docs/research/video-ref/repomix/ai-canvaspro-focused-canvas-nodes.xml` | Fact: focused context | Canvas/node entry points and primary node index. |
| `docs/research/video-ref/repomix/ai-canvaspro-focused-provider-tasks.xml` | Fact: focused context | Provider adapters, API task runtime, error/task-center index. |
| `docs/research/video-ref/repomix/ai-canvaspro-focused-project-desktop.xml` | Fact: focused context | Local backend, Electron IPC/project package, project/file services. |

---

## 4. Three-Minute Lookup Map

| Topic | Start Here | Then Verify With |
| --- | --- | --- |
| Node taxonomy and node registry | Context pack Architecture Map, `canvas-node-flow.txt`, canvas focused context | Current `CanvasNode` shared types, toolbar, inspector, and tldraw node components. |
| Source media drag/drop | `canvas-node-flow.txt`, canvas focused context | Current asset upload, canvas editor drag/drop, and node data contracts. |
| AI text/audio/video nodes | Canvas context plus provider/task context | Current generation service, worker, provider contracts, and prompt composer. |
| Prompt presets and skill ownership | Source module `ACP-07`, context pack Borrowable Ideas | Current `SkillTemplate`, prompt composer, settings center. |
| MediaClip/storyboard/media board | Graph hubs, canvas focused context | Current storyboard panel, EditorExport, CanvasNode/CanvasEdge schema. |
| Local media processing and derivatives | Provider/task context, project/desktop context | Current worker-first media processing, `Asset` metadata, and storage services. |
| Project package and multi-canvas pages | `project-desktop-flow.txt`, project/desktop context | Current project/canvas schema and package/export plans. |
| Diagnostics/task center/errors | `provider-task-flow.txt`, provider/task context | Current `GenerationJob`, provider errors, editor export, and settings diagnostics. |
| Desktop/local bridge | `project-desktop-flow.txt`, project/desktop context | Treat as adapter decision only; do not copy Electron IPC/preload or unsafe filesystem behavior. |
| Subscription/update/license behavior | Source module `ACP-25` | Excluded. Use only to document what not to build. |

---

## 5. Coverage Matrix

Status values are backlog coverage judgments, not shipped-feature claims. Each implementation card must still inspect the current code and tests before work begins.

| ID | Coverage Status | Evidence Strength | CEX Route | Evidence / Follow-Up |
| --- | --- | --- | --- | --- |
| ACP-00 | Covered by CEX-00 | Fact for asset existence; Inference for completion after this ledger | CEX-00 | This file plus `docs/research/video-ref/index.md`; future modules use it as the AI-CanvasPro entrypoint. |
| ACP-01 | 部分覆盖 | Inference | CEX-04 | Node taxonomy and registry; do not copy node classes/renderers/styles. |
| ACP-02 | 部分覆盖 | Inference; Pending Verification for drag/drop details | CEX-05 | Source media nodes and canvas drag/drop must create `Asset` first. |
| ACP-03 | 部分覆盖 | Inference | CEX-06 | Slot/input kind/role/order/limits extend existing semantic edges; backend must revalidate. |
| ACP-04 | 部分覆盖 | Inference | CEX-08 | AI text node should persist output as node text, ScriptDraft, document Asset, or prompt context. |
| ACP-05 | 部分覆盖 | Inference | CEX-09 | AI audio/TTS merges with TFR-18 audio binding and editor export audio references. |
| ACP-06 | 部分覆盖 | Inference; Pending Verification per provider mode | CEX-10 | Video mode matrix should derive from model capability and safe input strategy. |
| ACP-07 | 部分覆盖 | Inference | CEX-07 | Prompt preset library merges with SkillTemplate, semantic index, and Agent attribution. |
| ACP-08 | 部分覆盖 | Inference | CEX-22 | Cross-media task center merges with diagnostics center and existing GenerationJob. |
| ACP-09 | 部分覆盖 | Inference; Pending Verification for exact media operations | CEX-18 | Local media processing becomes worker-first mock/controlled service jobs, not browser ffmpeg by default. |
| ACP-10 | 部分覆盖 | Inference | CEX-17 | MediaClip merges with TFR-22 video track and EditorExport bridge; no full NLE. |
| ACP-11 | 部分覆盖 | Inference | CEX-16 | Storyboard media board is visual projection and sync surface, not replacement for Shot/Storyboard facts. |
| ACP-12 | 未覆盖 | Inference; Pending Verification for scene extraction approach | CEX-28 | Scene/frame extraction is P2 after core media operation foundation. |
| ACP-13 | 未覆盖 | Inference | CEX-28 | Panorama node is P2; must stay inspectable and prompt-context safe. |
| ACP-14 | 未覆盖 | Inference | CEX-28 | 3D director node requires Three.js plus browser/canvas-pixel verification. |
| ACP-15 | 部分覆盖 | Inference | CEX-18 | Thumbnail/display/original derivatives merge with asset media operation foundation. |
| ACP-16 | 部分覆盖 | Inference | CEX-24 | Project package is guga-flow schema only; no AI-CanvasPro JSON compatibility promise. |
| ACP-17 | 未覆盖 | Inference | CEX-24 | Multi-canvas pages need compatibility strategy for existing single canvas projects. |
| ACP-18 | 部分覆盖 | Inference | CEX-22 | Diagnostics center must omit raw secrets, default full raw prompts, full provider responses, and absolute local paths. |
| ACP-19 | 部分覆盖 | Inference | CEX-02 | Provider error taxonomy/input strategy merges with LLM provider/model capability matrix. |
| ACP-20 | 部分覆盖 | Inference | CEX-26 | Remote URL/local authorized import requires SSRF, path traversal, size, and failure tests. |
| ACP-21 | 部分覆盖 | Inference | CEX-25 | Shortcut registry and canvas preferences merge with i18n/settings work. |
| ACP-22 | 迁移约束 | Inference | CEX-27 | Desktop/local bridge is a safety decision, not Electron migration. |
| ACP-23 | 迁移约束 | Inference | CEX-27 | Secure local settings only through a future trusted adapter; Web DTO stays server-secret safe. |
| ACP-24 | 未覆盖 | Inference; Pending Verification for permission model | CEX-27 | Screenshot/web preview must be user-authorized and avoid private or access-controlled capture. |
| ACP-25 | 排除 | Fact from source scope; Inference for future enforcement | CEX-00 / CEX-27 guardrail | Subscription gate, CDKey/device gate, commercial license text, and hot update are not backlog items. |

---

## 6. Exclusions and Safety Boundaries

| Exclusion | Evidence Strength | Rule |
| --- | --- | --- |
| Source code, bundled vendor code, provider manifests | Fact from source contract/context pack | Do not copy. Recreate original typed contracts and server/worker-owned adapters. |
| Static assets, icons, branding, screenshots, generated media | Fact from source contract/context pack | Do not copy or embed. |
| Custom license text and commercial authorization language | Fact from source contract/context pack | Do not reuse in guga-flow deliverables. |
| Subscription, membership, CDKey, device binding, commercial gate | Fact from `ACP-25` | Explicitly excluded from backlog. |
| Electron auto-updater and hot-update installer | Fact from `ACP-25` | Excluded; CEX-27 may document version/build/release info only. |
| Electron IPC/preload 1:1 migration | Fact from CEX/source scope | Excluded; future local capability must be a trusted adapter design. |
| Arbitrary local folder scanning, local absolute path leakage | Fact from CEX/source scope | Excluded; imports require user authorization, allowlists, and sanitized diagnostics. |
| Browser DTOs containing provider keys or local credentials | Fact from guga-flow architecture rules | Excluded; secrets remain server/worker/trusted adapter owned. |

---

## 7. Pending Verification Queue

- Exact node registration metadata and add-node grouping should be verified during CEX-04.
- Exact file-drop behavior and default node sizing should be verified during CEX-05 only if UI acceptance examples need it.
- Exact provider polling/error shapes should be verified during CEX-02, CEX-10, and CEX-22.
- Exact MediaClip and StoryboardNode behavior should be verified during CEX-16 and CEX-17.
- Exact project package JSON and desktop persistence behavior should be verified during CEX-24/CEX-27 only for boundary decisions; no compatibility promise is implied.
- Exact subscription/update code should not be studied for implementation, only for exclusion enforcement if a plan accidentally references it.

---

## 8. Handoff Guidance

When a future CEX card cites AI-CanvasPro:

1. Read the matching row in this ledger.
2. Read the source module section in `docs/ai-canvaspro-reference-long-task-development-flow.md`.
3. Open `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md`.
4. Use the topic-specific graph query or focused Repomix context only if the card needs more detail.
5. Verify current guga-flow code and tests before declaring a gap.
6. Carry migration constraints and exclusions into requirements and plan scope.

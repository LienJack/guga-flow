# Toonflow 参考项目覆盖度与缺口调研

> 日期：2026-06-14
> 目标项目：`guga-flow`
> 执行入口：`CEX-00` / `TFR-00`
> 交付目的：为 Toonflow-derived CEX modules 提供可复用 evidence ledger、coverage matrix 和 non-copy boundary。

本文把 Toonflow 相关研究资产整理成一个稳定入口。它不替代 `docs/toonflow-reference-long-task-development-flow.md` 的完整模块说明，也不授权复制参考项目实现；它只回答后续 CEX 模块应该从哪里找证据、当前覆盖判断是什么、哪些行为必须排除。

---

## 1. Evidence Strength Legend

- `Fact`：来自 source contract、build status、生成资产清单、已存在 repo 文档或窄范围源码/上下文证据。
- `Inference`：基于 Toonflow reference flow、guga-flow current roadmap/code inventory 或 CEX 合并判断得出的覆盖/路由结论。
- `Pending Verification`：后续实现会依赖更精确行为，需要进入对应模块时再读 focused context 或窄源文件切片。

---

## 2. Source Contract Boundary

| 项目 | Evidence | 结论 |
| --- | --- | --- |
| Toonflow-app source version | Fact: recorded in `docs/research/video-ref/source-contract.md` and `docs/research/video-ref/build-status.md` | Use the source contract as the single authority for local path, commit, package version, and license. |
| Reference value | Fact: source contract describes Toonflow as an AI short-drama/video production workbench | Borrow product behavior, workflow vocabulary, and validation ideas only. |
| Non-copy boundary | Fact: CEX checklist and source documents exclude copied source, assets, prompts, provider scripts, Electron packaging, subscription/update behavior, and brand material | Keep all guga-flow implementation original, typed, server-side for secrets, and canvas-first. |

This ledger intentionally does not repeat local absolute source paths. Use `docs/research/video-ref/source-contract.md` when a local reference path is required.

---

## 3. Generated Evidence Assets

| Asset | Evidence | Use |
| --- | --- | --- |
| `docs/research/video-ref/graphs/toonflow-app/GRAPH_REPORT.md` | Fact: Graphify summary for 230 files, 626 nodes, 757 edges | Corpus overview and confidence that graph navigation is useful. |
| `docs/research/video-ref/graphs/toonflow-app/graph.json` | Fact: canonical Graphify graph | Concept/module navigation before source slices. |
| `docs/research/video-ref/graphs/toonflow-app/queries/product-flow.txt` | Fact: saved query | Product flow, production workbench, export-related navigation. |
| `docs/research/video-ref/graphs/toonflow-app/queries/agent-architecture.txt` | Fact: saved query | ScriptAgent, ProductionAgent, tools, streaming, memory. |
| `docs/research/video-ref/graphs/toonflow-app/queries/storyboard-flow.txt` | Fact: saved query | Novel, script, storyboard, production-row flow. |
| `docs/research/video-ref/graphs/toonflow-app/queries/vendor-system.txt` | Fact: saved query | Vendor/provider config, model routing, provider code boundaries. |
| `docs/research/video-ref/repomix/toonflow-app-token-tree.txt` | Fact: token-aware file map | First-pass file discovery and cost control. |
| `docs/research/video-ref/repomix/toonflow-app-focused-agent.xml` | Fact: focused Repomix context | Agent runtime, script/production agents, AI helpers, memory. |
| `docs/research/video-ref/repomix/toonflow-app-focused-storyboard.xml` | Fact: focused Repomix context | Storyboard, production routes, script extraction, database types. |
| `docs/research/video-ref/repomix/toonflow-app-focused-assets.xml` | Fact: focused Repomix context | Assets, image generation, audio binding, task/image utilities. |
| `docs/research/video-ref/repomix/toonflow-app-focused-vendor-code.xml` | Fact: focused Repomix context | Vendor routes and execution code without the large vendor catalog. |
| `docs/research/video-ref/repomix/toonflow-app-focused-vendor.xml` | Fact: focused Repomix context | Vendor routes/code plus large vendor catalog; use only when catalog details matter. |

---

## 4. Three-Minute Lookup Map

| Topic | Start Here | Then Verify With |
| --- | --- | --- |
| Auth/session | `docs/toonflow-reference-long-task-development-flow.md` `TFR-01` | Current guga-flow auth/session code and tests first; Toonflow only for product shape. |
| Agent deploy / streaming / memory | `agent-architecture.txt`, `toonflow-app-focused-agent.xml` | Narrow source slices only when event names or lifecycle behavior affect a plan. |
| Novel, event graph, script, storyboard | `storyboard-flow.txt`, `toonflow-app-focused-storyboard.xml` | Current `NovelEventGraph`, `ScriptDraft`, storyboard/canvas code. |
| Production workspace and video track | `product-flow.txt`, storyboard context | CEX-15/CEX-17 plans should verify exact projection behavior from current code. |
| Assets, image refinement, audio binding | `toonflow-app-focused-assets.xml` | Current `Asset`, generation, editor-export and canvas node behavior. |
| Provider, model CRUD, vendor errors | `vendor-system.txt`, `toonflow-app-focused-vendor-code.xml` | Avoid broad vendor catalog unless model metadata is the actual question. |
| Settings, skills, project manuals | Toonflow source flow rows `TFR-08` through `TFR-10`, `TFR-17` | Current `SkillTemplate`, settings center, provider/manual docs. |
| Deployment, desktop, updates | `TFR-04`, `TFR-27`, CEX-27 | Treat Electron/update behavior as excluded unless a future product brainstorm reopens it. |

---

## 5. Coverage Matrix

Status values are backlog coverage judgments, not shipped-feature claims. Each implementation card must still inspect the current code and tests before work begins.

| ID | Coverage Status | Evidence Strength | CEX Route | Evidence / Follow-Up |
| --- | --- | --- | --- | --- |
| TFR-00 | Covered by CEX-00 | Fact for asset existence; Inference for completion after this ledger | CEX-00 | This file plus `docs/research/video-ref/index.md`; future modules use it as the Toonflow entrypoint. |
| TFR-01 | 未覆盖 | Inference | CEX-01 | Login/session behavior belongs in auth requirements; verify current backend/frontend auth before planning. |
| TFR-02 | 未覆盖 | Inference; Pending Verification for event protocol | CEX-21 | Start with `agent-architecture.txt` and current generation events controller. |
| TFR-03 | 未覆盖 | Inference | CEX-03 | Agent role/model deploy center depends on CEX-02 provider foundation. |
| TFR-04 | 未覆盖 | Inference | CEX-27 | Version/release check only; do not copy Electron auto-update. |
| TFR-05 | 未覆盖 | Inference | CEX-26 | Controlled storage/file maintenance; no arbitrary local folder access. |
| TFR-06 | 未覆盖 | Inference | CEX-26 | Data maintenance center; no bare SQL or unsafe import. |
| TFR-07 | 未覆盖 | Inference | CEX-27 | AI debug flag limited to development/admin path and secret-safe logs. |
| TFR-08 | 部分覆盖 | Inference | CEX-07 | Reuse `SkillTemplate`; verify current skill-template settings and agent prompt injection. |
| TFR-09 | 部分覆盖 | Inference | CEX-25 | zh/en UI and shortcut work should follow existing frontend text patterns. |
| TFR-10 | 部分覆盖 | Inference | CEX-11 | Project visual/director manual has existing adjacent plan/solution; verify prompt debug integration. |
| TFR-11 | 部分覆盖 | Inference | CEX-12 | Chapter event graph has adjacent docs; verify current novel/event models. |
| TFR-12 | 部分覆盖 | Inference | CEX-13 | ScriptAgent workspace should write `ScriptDraft`-equivalent structures, not chat-only text. |
| TFR-13 | 部分覆盖 | Inference | CEX-14 | Script asset extraction and source trace should build on existing asset/canvas schema. |
| TFR-14 | 部分覆盖 | Inference; Pending Verification for tool lifecycle | CEX-20 | ProductionAgent actions must become audited business records. |
| TFR-15 | 部分覆盖 | Inference | CEX-15 | Production workspace projection must map to ScriptDraft, CanvasNode, CanvasEdge, Asset, and GenerationJob. |
| TFR-16 | 部分覆盖 | Inference | CEX-14 | Asset variants merge with script asset extraction; preserve selected version. |
| TFR-17 | 部分覆盖 | Inference | CEX-19 | Asset prompt polish should route through GenerationJob, cancellation, retry, and visible failures. |
| TFR-18 | 部分覆盖 | Inference | CEX-09 | Audio/voice binding merges with AI audio/TTS work and editor export audio references. |
| TFR-19 | 部分覆盖 | Inference | CEX-16 | Storyboard panel CRUD and ShotNode sync need current canvas/storyboard verification. |
| TFR-20 | 部分覆盖 | Inference | CEX-18 | Image edit backflow merges with media operation derivatives. |
| TFR-21 | 部分覆盖 | Inference; Pending Verification per provider mode | CEX-10 | Video prompt generation/check must rely on provider model capability, not hardcoded Toonflow prompt text. |
| TFR-22 | 部分覆盖 | Inference | CEX-17 | Video track and MediaClip merge into a lightweight production timeline. |
| TFR-23 | 部分覆盖 | Inference | CEX-02 | LLM provider management extends existing provider foundation; browser never receives keys. |
| TFR-24 | 部分覆盖 | Inference | CEX-02 | Model CRUD/capability matrix belongs with provider metadata and normalized errors. |
| TFR-25 | 部分覆盖 | Inference | CEX-23 | Agent memory upgrades require project/role isolation and user control. |
| TFR-26 | 部分覆盖 | Inference | CEX-22 | Task center merges with diagnostics center; do not duplicate GenerationJob facts. |
| TFR-27 | 部分覆盖 | Inference | CEX-27 | Deployment/web runtime docs and health checks; no Electron app migration. |

---

## 6. Exclusions and Safety Boundaries

| Exclusion | Evidence Strength | Rule |
| --- | --- | --- |
| Electron desktop client, native windows, installer, preload, IPC | Fact from CEX/source scope | Excluded from direct migration; future desktop work must be a separate adapter decision. |
| Auto-update implementation | Fact from CEX/source scope | Do not copy; CEX-27 may show version/build/release information only. |
| Toonflow prompts, skills, provider scripts, vendor code | Fact from CEX/source scope | Do not copy text or execution model; build original guga-flow prompts/contracts. |
| Branding, static assets, screenshots, generated media | Fact from CEX/source scope | Do not copy or embed. |
| Browser access to provider keys | Fact from guga-flow architecture rules | Provider secrets remain server/worker trusted only. |
| Chat-only Agent output | Fact from guga-flow architecture rules | Agent actions must land in CanvasNode, CanvasEdge, GenerationJob, ScriptDraft, or auditable records. |

---

## 7. Pending Verification Queue

- Exact streaming event protocol for ScriptAgent/ProductionAgent should be verified during CEX-21.
- Exact Agent deploy configuration fields should be verified during CEX-03 and adapted to guga-flow provider contracts.
- Exact storyboard/production route behavior should be verified during CEX-12 through CEX-17 only when needed for acceptance scenarios.
- Exact vendor/model error shapes should be verified during CEX-02 and CEX-10; do not read the large vendor catalog unless model catalog behavior is the question.
- Any deployment or desktop-related behavior should wait for CEX-27 and remain a Web/server/adapter decision, not Electron migration.

---

## 8. Handoff Guidance

When a future CEX card cites Toonflow:

1. Read the matching row in this ledger.
2. Read the source module section in `docs/toonflow-reference-long-task-development-flow.md`.
3. Open only the focused graph query or Repomix pack named by the lookup map.
4. Verify current guga-flow code and tests before declaring a gap.
5. Carry exclusions into requirements and plan scope.

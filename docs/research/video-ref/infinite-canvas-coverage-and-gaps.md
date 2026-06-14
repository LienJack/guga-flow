# Infinite-Canvas 参考项目覆盖度与缺口调研

> 日期：2026-06-14
> 调研对象：`/Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas/`
> 目标项目：`guga-flow`
> 交付目的：为 `docs/infinite-canvas-reference-long-task-development-flow.md` 提供可追溯的功能覆盖依据。

本文按项目调研流程产出：先记录来源，再建立架构心智模型，最后把参考项目能力映射到 `guga-flow` 的已实现代码、已规划模块和未覆盖清单。结论用于后续开发排期，不允许直接复制参考项目源码。

---

## 1. 来源契约

| 项目 | 来源类型 | 路径 / 版本 | 参考角色 | 约束 |
| --- | --- | --- | --- | --- |
| Infinite-Canvas | 本地参考项目 | `/Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas/`；commit `9fb9a908c78f6d9e23fcfc03b7cf5d8b77ff3e0e`；`VERSION` 为 `2026.06.12` | 主要参考：本地多供应商生成工具、ComfyUI/RunningHub 工作流、素材库、画布工具体验 | README 明确禁止未经授权商业封装与商业用途，后续只能借鉴产品形态、接口边界和验收思路，不能复制源码或静态资源 |
| guga-flow | 当前仓库 | commit `8d0bdd90871cbef2fbc8ab0768d8c28f6f35cd33`；branch `codex/phase-0-engineering-foundation`；工作区有既有未提交前端改动 | 目标实现项目：小说到视频、canvas-first、TypeScript monorepo | 以 PRD、技术架构和现有长任务流程为准，参考项目不能覆盖架构红线 |

输出语言：简体中文。交付模式：调研包 + 实施路线，不写成博客文章。

---

## 2. 研究边界

本轮覆盖：

- Infinite-Canvas 的 README、运行教程、FastAPI 路由、静态页面、核心 JS 入口和内置 workflow 文件。
- guga-flow 的 Prisma schema、共享类型、后端 controller/service、前端 canvas/settings/asset/generation/export 组件，以及现有长任务流程。
- 重点回答：参考项目能力在 guga-flow 中覆盖到什么程度，缺口怎么转成可长期执行的 Codex 任务。

本轮不覆盖：

- 不做 Infinite-Canvas 全文件逐行审计。
- 不运行真实第三方 provider。
- 不评估参考项目 UI 视觉复制。
- 不复用参考项目代码、图片、字体、工作流 JSON 或启动脚本。

Evidence strength note:

- Fact: Source contract and license boundary are recorded in `docs/research/video-ref/source-contract.md`.
- Fact: Provider/workflow/asset/local platform evidence is indexed in `docs/research/video-ref/context-packs/infinite-canvas-provider-workflow-assets.md`.
- Inference: The IC backlog maps reference behavior to guga-flow's existing canvas-first architecture and may be revised as each module reads a narrower context pack.

---

## 3. 两个项目的架构定位

### Infinite-Canvas

一句话定位：一个本地运行的多供应商 AI 生成工作台，用 Python/FastAPI 作为本地网关，用静态 HTML/JS 页面承载在线生图、智能画布、素材库、API 设置、ComfyUI 工作流和视频生成工具。

关键事实：

- README 明确支持 OpenAI 兼容、异步协议、Gemini、方舟、RunningHub、ModelScope、即梦 CLI 和局域网 ComfyUI。
- 新手教程把项目定位为本地网页应用，浏览器访问 `127.0.0.1:3000`，可在局域网访问。
- `main.py` 是单文件服务中枢，暴露 provider 配置、在线生图、画布任务、视频生成、画布 JSON、素材库、prompt library、ComfyUI workflow、更新/回滚等大量接口。
- 静态页面包括 `canvas.html`、`smart-canvas.html`、`asset-manager.html`、`api-settings.html`、`comfyui-settings.html`、`online.html`、`gpt-chat.html` 等工具页面。

### guga-flow

一句话定位：一个 TypeScript 全栈、canvas-first 的小说到视频生产图谱平台，用 tldraw 作为主画布，用 PostgreSQL/Prisma 持久化业务事实，用 Worker 承载图片、视频和剪辑包生成。

关键事实：

- 技术架构明确采用 Next.js + NestJS + Worker + PostgreSQL/Redis + shared types/provider contracts。
- Prisma schema 已包含 `CanvasDocument`、`CanvasNode`、`CanvasEdge`、`Asset`、`GenerationJob`、`EditorExport`、`ProviderConfig`、`ProgrammableProvider`、`AgentMemory`、`SkillTemplate`、`NovelEventGraph`、`ScriptDraft` 等模型。
- 后端已有项目、资产、画布、小说/分镜、prompt、生成任务、worker claim、editor export、provider management、agent memory/action、settings、skill template 等 controller。
- 前端已有 dashboard、tldraw canvas workspace、业务节点、语义边、storyboard panel、generation actions、editor export actions、settings center、provider settings 和 skill template settings。

---

## 4. 覆盖度摘要

按 Infinite-Canvas 的参考能力域粗略统计：

- **强覆盖 / 已代码落地：约 27%**
  代表能力：画布持久化、业务节点/语义边、基础项目与素材、GenerationJob、Worker、editor package export、provider safe config。
- **强覆盖 + 部分覆盖：约 73%**
  代表能力：图片/视频生成、provider 管理、prompt/skill、agent、i18n、设置中心、历史/队列、画布生产效率等在 guga-flow 中已有代码或明确 roadmap。
- **未覆盖或只适合后续评估：约 27%**
  主要缺口：ComfyUI workflow 管理、RunningHub workflow/app、即梦 CLI、本地共享文件夹/浏览器素材采集、内建图片编辑器、在线更新/回滚、桌面一键包。

这不是发布质量指标，而是用于排期的“功能域覆盖度”。两个项目的目标不同：Infinite-Canvas 更像通用生成工具箱，guga-flow 更像生产链路业务系统。

---

## 5. Infinite-Canvas 到 guga-flow 覆盖矩阵

状态说明：

- `已覆盖`：当前代码中已有可追溯实现。
- `部分覆盖`：已有基础模型、接口、UI 或计划，但体验/范围/协议不完整。
- `未覆盖`：当前代码和 roadmap 中没有明确可用能力。
- `暂不复制`：参考项目能力不符合 guga-flow 当前架构或法律/产品边界。

| ID | Infinite-Canvas 能力域 | guga-flow 覆盖状态 | 当前依据 | 缺口处理 |
| --- | --- | --- | --- | --- |
| IC-COV-01 | 本地网页应用与局域网访问 | 部分覆盖 | `docs/development.md`、`infra/docker-compose.yml` 支持本地开发；暂无面向非工程用户的一键包 | 进入 `IC-12` 桌面/本地包装评估 |
| IC-COV-02 | 多工具页面：主页、画布、智能画布、在线生图、设置、素材库、聊天 | 部分覆盖 | `apps/frontend/src/components/workbench-shell.tsx`、dashboard/canvas/settings 已有生产壳层 | 不做同款多页面工具箱；只吸收工作台信息架构 |
| IC-COV-03 | 画布 JSON 保存、列表、trash、meta、touch | 部分覆盖 | `CanvasDocument.snapshotJson` + `CanvasNode`/`CanvasEdge` 已强于单 JSON；项目删除/复制已覆盖 | trash/pin/lightweight canvas meta 可按需求补 |
| IC-COV-04 | 画布节点与连接导入导出为 workflow zip | 部分覆盖 | guga-flow 有 `EditorExport` 和 settings export；还没有通用 canvas group/workflow zip | 进入 `IC-08` 通用画布片段导入导出 |
| IC-COV-05 | Canvas-first 业务节点与语义关系 | 已覆盖 | `CanvasNodeType`、`CanvasEdgeRelation`、tldraw custom shape 和 semantic bind 已落地 | guga-flow 此域强于参考项目，继续保持业务事实双写 |
| IC-COV-06 | 基础素材上传、预览、删除 | 已覆盖 | `assets.controller.ts`、`assets.service.ts`、`Asset` 模型、前端 `AssetLibrary` | 后续只增强素材组织，不重写基础上传 |
| IC-COV-07 | 多素材库、分类、批量移动/删除/裁剪、共享文件夹、URL 导入 | 部分覆盖 | guga-flow 有 `Asset` 类型与基础库；缺 library/category/tag/shared folder/batch ops | 进入 `IC-03` 素材库增强 |
| IC-COV-08 | 本地素材 caption/classify | 未覆盖 | 当前没有通用素材 caption/classify 任务 | 进入 `IC-04`，但必须作为服务端任务写回 `Asset.metadataJson` |
| IC-COV-09 | prompt library 和系统 prompt 模板 | 部分覆盖 | guga-flow 有 `SkillTemplate`、prompt composer、settings skill panel | 进入 `IC-09`，统一 prompt/template/library 语义 |
| IC-COV-10 | Provider 设置、密钥、启停、连通性测试 | 已覆盖 | `ProviderConfig`、`ProvidersService`、settings provider panel；服务端密钥边界存在 | 继续加强测试与模型发现 |
| IC-COV-11 | OpenAI/Gemini/方舟/ModelScope/RunningHub/即梦等广泛协议 | 部分覆盖 | guga-flow 当前主要是 `mock-image`、`image2`、`banana`、`mock-video`、`seedance`、`happyhorse` 和 programmable provider | 进入 `IC-01` 和 `IC-02`，先补安全通用协议，不一次接完所有厂商 |
| IC-COV-12 | 上游模型发现、协议探测、错误提示 | 部分覆盖 | guga-flow 有 provider test summary；缺类似 `/api/providers/fetch-models` 的动态模型发现 | 进入 `IC-02` provider model discovery |
| IC-COV-13 | 在线生图画廊、历史、reuse、批量历史管理 | 部分覆盖 | guga-flow 有 GenerationJob 和 Asset；缺独立 gallery/history bulk manager | 合并到 `IC-03` 和生产工作台，不做孤立图库页 |
| IC-COV-14 | 画布异步图片任务与轮询 | 已覆盖 | guga-flow 的 `GenerationJob`、worker claim/wait/succeed/fail 更耐久 | 保持 worker-first，不采用进程内 dict 任务 |
| IC-COV-15 | 多 provider 视频生成，含图/视频/音频参考、轮询、下载 | 部分覆盖 | guga-flow 有 video provider contract、Seedance/HappyHorse 计划与音频资产绑定 | 进入 `IC-05`，扩展参考媒体与协议兼容 |
| IC-COV-16 | RunningHub workflow/app 调用与配置编辑 | 未覆盖 | 当前无 RunningHub 专用 adapter 或 workflow/app 配置 UI | 进入 `IC-07` |
| IC-COV-17 | ComfyUI 实例、workflow 上传、字段映射、预览、运行 | 未覆盖 | 当前没有 ComfyUI workflow 管理模型/API/UI | 进入 `IC-06`，先做受控 MVP |
| IC-COV-18 | 图片裁剪、遮罩、画笔、宫格切分、outpaint、360 预览截图 | 部分覆盖 | guga-flow 有 `image_refinement` 操作和图片回流方向，但没有内建编辑器 | 进入 `IC-10`，先做低风险编辑原语 |
| IC-COV-19 | GPT 对话、流式聊天、conversation 文件 | 部分覆盖 | guga-flow 有 agent canvas actions、agent memory、creative brief；无通用聊天页 | 不做 chat-only；所有 agent 动作必须落画布/任务 |
| IC-COV-20 | WebSocket stats / 新图广播 | 部分覆盖 | guga-flow 当前前端轮询 GenerationJob；未统一 SSE/WebSocket | 进入 `IC-11` 实时状态通道 |
| IC-COV-21 | 自动更新、版本检查、备份、回滚 | 未覆盖 | guga-flow 没有 app self-update | 放入 `IC-13`，Web MVP 稳定前只做决策文档 |
| IC-COV-22 | 即梦 CLI 安装/登录/积分/查询 | 未覆盖 | guga-flow 没有本地 CLI bridge | 放入 `IC-14`，需单独安全与平台兼容评估 |
| IC-COV-23 | 便携 Python、Windows/mac 一键启动脚本 | 未覆盖 | guga-flow 是 Node/pnpm monorepo，没有面向创作者的整包启动 | 放入 `IC-12`，倾向 Tauri/Electron/Web wrapper 决策 |
| IC-COV-24 | 许可证约束下的资源/代码复用 | 暂不复制 | Infinite-Canvas README 明确禁止未经授权商业封装 | 只参考行为和验收，不复制源码、资源、workflow |

---

## 6. guga-flow 到 Infinite-Canvas 反向覆盖

这组反向对照用于避免盲目“补齐参考项目”而丢掉 guga-flow 的产品中心。

| guga-flow 核心能力 | Infinite-Canvas 覆盖度 | 判断 |
| --- | --- | --- |
| 小说导入、分镜草案、故事蓝图、章节事件、剧本草案 | 低 | Infinite-Canvas 偏生成工具，不是小说到视频生产模型 |
| 业务节点类型：Novel、Scene、Shot、Character、Location、Image、Video、EditorPackage | 低到中 | 参考项目有泛化节点和连接，但缺 guga-flow 的生产语义 |
| Hybrid Snapshot + Normalized Business Data | 低 | 参考项目以画布 JSON 和文件资产为主，guga-flow 的 DB 业务事实更强 |
| GenerationJob 持久队列、Worker claim/wait/succeed/fail | 中 | 参考项目有进程内/轮询任务和历史，guga-flow 的任务模型更适合长链路 |
| Provider 管理与密钥服务端边界 | 中到高 | 两边都有，但参考项目协议广，guga-flow 边界更安全、类型更稳 |
| Editor package zip、timeline manifest、storyboard csv、local editor POST | 中 | 参考项目偏工作流/素材导出，guga-flow 更贴近剪辑包语义 |
| Agent 动作审计、撤销、记忆 | 低到中 | 参考项目有聊天和 agent 风格入口，guga-flow 已把动作落为画布/任务 |
| Mock-first MVP | 低 | Infinite-Canvas 依赖外部服务体验更多，guga-flow 的 mock-first 是架构红线 |

结论：后续补能力时，应优先借鉴 Infinite-Canvas 的“provider/workflow/素材工具深度”，不要用它替换 guga-flow 的小说到视频生产图谱。

---

## 7. 未覆盖功能清单

优先级定义：

- `P0`：会显著影响 MVP 或 provider/素材基础能力，应优先进入下一个长任务队列。
- `P1`：MVP 后提升生产可用性，适合拆成独立模块。
- `P2`：需要安全、平台、商业或产品判断，不能直接开工。

| ID | 优先级 | 缺口 | 范围边界 | 完成信号 |
| --- | --- | --- | --- | --- |
| IC-00 | P0 | 建立 Infinite-Canvas research source contract 和 evidence ledger | 只沉淀文档和证据，不改代码 | `docs/research/video-ref/` 中有可复用索引和缺口矩阵 |
| IC-01 | P0 | 通用 OpenAI-compatible/Gemini/Ark provider 协议层 | 只做服务端/worker adapter 和安全 DTO；不让浏览器直连上游 | 用户可配置兼容 endpoint，测试通过后用于 image/video job |
| IC-02 | P0 | provider 模型发现与协议探测 | 支持临时表单值和已保存 provider；返回安全模型清单与友好错误 | 设置页能拉取模型并按 image/chat/video 分组，不暴露密钥 |
| IC-03 | P0 | 素材库增强：分类、标签、搜索、批量移动/删除 | 不做本地共享文件夹，不做浏览器插件 | 资产可按库/分类/标签管理，批量操作有测试 |
| IC-04 | P1 | 素材 caption/classify 任务 | 走 GenerationJob 或等价 worker；结果写 `Asset.metadataJson` | 多张图片可生成 caption 和分类标签，失败可见 |
| IC-05 | P1 | 视频 provider 参考媒体增强 | 支持多参考图、首尾帧、参考视频、参考音频的受控 schema | image/video/audio 参考进入 worker input，并落回 `Asset` 和节点数据 |
| IC-06 | P1 | ComfyUI workflow 管理 MVP | 只支持项目级 workflow JSON、字段映射、运行测试；不做任意插件市场 | 可上传 ComfyUI API workflow、映射字段、从画布节点触发运行 |
| IC-07 | P1 | RunningHub workflow/app adapter | 基于服务端 provider 配置；不复制参考项目 workflow JSON | 可登记 RunningHub workflow/app，并作为 image/video provider 运行 |
| IC-08 | P1 | 画布片段 / workflow 导入导出 | 导出 guga-flow 自己的 schema；不兼容所有 Infinite-Canvas JSON | 选中节点可打包为 zip，导入后资源重映射，语义边保留 |
| IC-09 | P1 | Prompt library 与 skill/template 管理统一 | 复用 `SkillTemplate`，不新增任意代码执行 | 设置中心能管理 story/art/production/agent 模板和分类 |
| IC-10 | P1 | 图片编辑原语：crop、mask、grid、outpaint 回流 | 先做少量可测工具，不做完整 Photoshop | 编辑结果生成新 `Asset/ImageNode`，保留来源边 |
| IC-11 | P1 | 实时任务状态通道 | SSE 优先；不要求 WebSocket 全量同步 | 生成队列状态无需 2.5s 轮询即可更新，失败/等待状态可见 |
| IC-12 | P2 | 桌面/本地包装 | 先评估 Tauri/Electron/Web wrapper，不直接迁移 Python 便携包 | 决策文档明确平台、文件系统、更新、provider key 策略 |
| IC-13 | P2 | 版本检查、备份、回滚 | 只在桌面包装决策后推进 | 用户能看到版本，更新/回滚不破坏项目数据 |
| IC-14 | P2 | 即梦 CLI bridge | 需用户授权、平台兼容、凭证边界和安装体验设计 | CLI 状态、登录、额度、生成任务都通过服务端安全边界 |
| IC-15 | P2 | 本地共享文件夹和浏览器素材采集 | 需本地文件权限、路径白名单和隐私边界 | 可导入本地文件夹素材，不泄露任意路径 |

---

## 8. 后续研究建议

每次进入一个 `IC-*` 模块前，按以下顺序补证据：

1. 先读本文和 `docs/infinite-canvas-reference-long-task-development-flow.md`。
2. 只打开 Infinite-Canvas 中与该模块直接相关的文件片段。
3. 用 `Fact`、`Inference`、`Pending Verification` 标注结论。
4. 只要结论影响 requirements、plan 或 tests，就写入本文件或新增 `docs/research/video-ref/context-packs/infinite-canvas-<topic>.md`。
5. 如果继续读源码只是在增加参考项目细节，不会改变 guga-flow，则停止。

---

## 9. 关键证据索引

Infinite-Canvas：

- `README.md:23` 到 `README.md:30`：支持协议和功能列表。
- `新手运行与使用教程.md:3` 到 `新手运行与使用教程.md:10`：本地网页应用定位。
- `main.py:9660` 到 `main.py:9744`：provider config 和安全公共配置响应。
- `main.py:9992` 到 `main.py:10331`：provider 连接测试与模型发现。
- `main.py:10380` 到 `main.py:10509`：在线生图与画布异步图片任务。
- `main.py:10952` 起：画布视频生成 provider 分发和多媒体参考处理。
- `main.py:11510` 到 `main.py:11842`：canvas list/save/meta/assets/workflow export/import。
- `main.py:11903` 到 `main.py:12584`：asset library、prompt library、shared folders、批量素材操作。
- `main.py:12689` 到 `main.py:12870`：chat / agent / stream。
- `main.py:13397` 起：本地 ComfyUI 生成。
- `main.py:14032` 到 `main.py:14190`：ComfyUI instances/workflows/config/run。
- `static/asset-manager.html`：素材库、工作流管理、提示词库、画布资产、本地素材 tab。
- `static/comfyui-settings.html`：workflow 设置和字段暴露到画布。
- `static/smart-canvas.html`：智能画布、快捷键、图片编辑、360 全景预览、宫格切分。

guga-flow：

- `docs/infinite-canvas-video-long-task-development-flow.md:11` 到 `docs/infinite-canvas-video-long-task-development-flow.md:21`：信息源优先级和参考项目边界。
- `docs/infinite-canvas-video-long-task-development-flow.md:59` 到 `docs/infinite-canvas-video-long-task-development-flow.md:71`：不可妥协架构规则。
- `apps/backend/prisma/schema.prisma`：核心业务模型、provider config、agent memory、skill template、programmable provider。
- `apps/backend/src/*/*.controller.ts`：项目、资产、画布、小说、生成、provider、agent、settings、skills、editor export API。
- `packages/shared-types/src/domain/generation.ts`：provider、generation、editor export、agent action、creative settings 共享契约。
- `apps/backend/src/providers/providers.service.ts`：provider catalog、密钥加密、runtime config。
- `apps/backend/src/generation/generation.service.ts`：GenerationJob 创建、批量生成、重试、取消、worker runtime config。
- `apps/backend/src/editor-exports/editor-exports.service.ts`：editor export queue、timeline、local editor send。
- `apps/frontend/src/components/canvas/project-canvas-workspace.tsx`：工作台组合、任务轮询、agent/stroyboard/canvas/inspector 连接。
- `apps/frontend/src/components/canvas/canvas-editor.tsx`：tldraw 画布、business shape、semantic edge、autosave。
- `apps/frontend/src/components/projects/settings-center.tsx`：settings center、provider、skill、data export/import UI。

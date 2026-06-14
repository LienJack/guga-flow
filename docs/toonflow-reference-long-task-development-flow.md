# Toonflow 参考能力开发工作清单

> 版本：2026-06-14  
> 状态：Implementation backlog draft  
> 参考项目：`/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/`  
> 目标项目：`guga-flow`  
> 固定模块循环：`ce-brainstorm` -> `ce-plan` -> `ce-work` -> `ce-code-review` -> `ce-compound`

本文把 Toonflow-app 中对 guga-flow 有价值、但当前尚未完整覆盖的能力，转成可长期执行的 Markdown 工作清单。它与 `docs/infinite-canvas-video-long-task-development-flow.md` 和 `docs/infinite-canvas-reference-long-task-development-flow.md` 平级：前者是 guga-flow 主线操作手册，后者偏 Infinite-Canvas provider/workflow/素材工具专项，本文偏 Toonflow 的短剧生产、Agent、脚本、分镜、供应商、设置中心和生产工作台专项。

本文不是“复刻 Toonflow”的需求文档。Toonflow 只作为产品行为和工程边界参考，后续实现必须遵守 guga-flow 的 canvas-first、worker-first、secret-safe、mock-first 和 typed contracts 原则。

特别说明：**Electron 桌面客户端、Electron 安装包、原生窗口权限检查不进入本清单**。凡是 Toonflow 中依赖桌面壳的能力，本文只保留可 Web 化或服务端化的部分，例如版本信息、数据维护、受控文件管理和生产部署说明。

---

## 0. 阅读顺序

长期运行或新会话恢复时，按此顺序读：

1. `docs/infinite-canvas-video-long-task-development-flow.md`。
2. 本文。
3. `infinite_canvas_video_prd_roadmap_v2_detailed.md`。
4. `docs/tech-stack-text2sql-reference.md`。
5. 相关 `docs/research/video-ref/` 资产。
6. 当前模块对应的 `docs/brainstorms/*requirements.md` 和 `docs/plans/*plan.md`。
7. 当前代码和测试。

不得只读本文就直接开工。每个 `TFR-*` 模块必须先进入 `ce-brainstorm`，把产品行为、范围边界、验收标准和参考证据定稿，再进入 `ce-plan` 和实现。

---

## 1. 来源与当前覆盖基线

### 1.1 Toonflow 参考能力

Toonflow README 将产品定位为短剧生产 AI 工作台，主线能力包括：

- 无限画布生产工作台。
- 三层 Agent 协作体系：决策层、执行层、监督层。
- 持久化 Agent 记忆。
- 可编程供应商系统。
- 章节事件图谱驱动改编。
- Skill 文件化配置。
- 登录、设置中心、模型供应商配置。
- ScriptAgent 生成故事骨架、改编策略和结构化剧本。
- ProductionAgent 组织分镜、素材、视频节点。
- 分镜图节点化精调后回流工作台。

源码层面，Toonflow 的能力主要分布在：

- `src/routes/login/*`
- `src/routes/setting/**/*`
- `src/routes/novel/**/*`
- `src/routes/script/**/*`
- `src/routes/scriptAgent/**/*`
- `src/routes/production/**/*`
- `src/routes/assets/**/*`
- `src/routes/assetsGenerate/**/*`
- `src/routes/cornerScape/**/*`
- `src/socket/**/*`
- `src/agents/**/*`
- `src/utils/agent/**/*`
- `data/skills/**/*`
- `src/lib/initDB.ts`

### 1.2 guga-flow 已有强覆盖

当前项目已经具备这些底座，不应重复造轮子：

- Next.js + NestJS + Worker + Prisma + PostgreSQL monorepo。
- 项目、素材、画布、小说、生成任务、provider、settings、skills、workflows、editor exports、agents 等模块。
- tldraw canvas-first 工作台。
- `CanvasNode` / `CanvasEdge` 规范化业务事实。
- `Asset` / `GenerationJob` / `EditorExport` 持久化生产记录。
- `ProviderConfig`、`ProgrammableProvider`、provider discovery、provider test。
- `SkillTemplate` 版本化。
- `NovelEventGraph`、`ScriptDraft`。
- `AgentMemory` 手工记忆和有限 recall。
- 素材 collection/tag/batch 操作。
- workflow definition/run API。
- 音频 asset 类型和 editor export audio references。

### 1.3 主要差距类型

缺口不在“有没有表”这么简单，更多在产品闭环：

- 已有模型，但没有 Toonflow 等价 UI 或工作台。
- 已有单点 API，但没有完整状态流、批量流和错误流。
- 已有 mock/确定性能力，但没有真实 Agent/LLM/Socket 流式协作。
- 已有模板管理，但没有 skill index、embedding、归属和激活工具链。
- 已有 provider 管理，但 text/LLM、Agent 模型部署和 model map 不完整。

---

## 2. 产品定位

### 2.1 问题陈述

guga-flow 的主线是小说到视频生产图谱，核心闭环已经围绕画布、节点、语义边、素材、生成任务和剪辑包展开。Toonflow 的强项则是短剧生产流程的“工作台厚度”：Agent 编排、章节事件、剧本工作区、分镜面板、视频轨道、音频绑定、供应商/模型/Skill 设置中心和任务中心。

本文的目标是把这些工作台能力补成 guga-flow 自己的模块，而不是把 guga-flow 改成 Toonflow 的 Express + SQLite + Electron 架构。

### 2.2 目标

P0 目标：

- 固化 Toonflow 参考能力和差距清单。
- 补齐登录 / 鉴权 / 默认用户过渡策略。
- 补齐 LLM/text provider 与 Agent 模型部署基础。
- 建立可追溯的 ScriptAgent / ProductionAgent 工作区 requirements。
- 让分镜面板、视频 prompt、视频轨道等生产工作台能力进入可执行 backlog。

P1 目标：

- 引入流式 Agent 通道和可审计的 Agent 动作。
- 补齐章节级小说管理、剧本资产提取、flowData 工作区。
- 补齐分镜面板 CRUD、分镜图编辑回流、视频轨道工作台。
- 补齐资产 prompt 润色、衍生资产、音频自动绑定。
- 强化视觉手册、导演手册、画风库、多语言和设置中心。

P2 目标：

- 补齐 Agent 记忆、skill semantic index、任务中心、数据维护、版本信息、受控文件管理和生产部署形态。
- 在不做 Electron 的前提下，提供 Web/服务端可执行的本地化工作流能力。

### 2.3 非目标

- 不做 Electron 桌面客户端。
- 不做 Electron installer、electron-builder、原生窗口、托盘、系统权限弹窗。
- 不复制 Toonflow 的路由、SQLite 表结构、Socket 协议、内置 prompt、静态资源、品牌表达或 UI。
- 不把 provider key、agent key 或任意 secret 暴露给浏览器。
- 不允许任意 TypeScript provider / skill 直接在主进程无沙箱运行。
- 不把 Agent 对话做成 chat-only：所有生产动作必须落为 `CanvasNode`、`CanvasEdge`、`Asset`、`GenerationJob`、`ScriptDraft`、`NovelEventGraph` 或其他可审计记录。
- 不在核心闭环不稳时启动协作、市场、商业化、素材权益或完整剪辑器。

---

## 3. 全局原则

| ID | 原则 | 可执行要求 |
| --- | --- | --- |
| GP-TF-01 | Canvas-first | Agent、剧本、分镜、视频轨道和编辑结果必须能投射到画布或可审计业务记录 |
| GP-TF-02 | Agent 可审计 | Agent 的计划、工具调用、生成结果、失败和撤销必须有记录，不能只存在 Socket 消息里 |
| GP-TF-03 | Worker-first | 长耗时 LLM、图片、视频、音频、caption、导出、批量处理默认走 `GenerationJob` 或等价异步任务 |
| GP-TF-04 | Secret-safe | provider key、Agent model key、debug token、file path 授权不得进入 browser-safe DTO、job JSON 或日志 |
| GP-TF-05 | Contract-first | shared types 先行，backend/frontend/worker 复用同一 contract |
| GP-TF-06 | Mock-first | 每个模块必须有不依赖真实 provider 的 mock/demo 路径 |
| GP-TF-07 | Versioned config | Agent deploy、Skill、Provider、Workflow、Project settings 必须有版本或审计策略 |
| GP-TF-08 | Recoverable failure | 失败必须可见、可重试、可取消或可清理 |
| GP-TF-09 | Reference restraint | Toonflow 只提供行为证据，不复制源码和数据结构 |
| GP-TF-10 | No Electron dependency | 所有模块必须能在 Web/Nest/Worker 架构下成立 |

---

## 4. Release 分层

| Release | 模块 | 目标 | 完成定义 |
| --- | --- | --- | --- |
| R0 Research | TFR-00 | 固化 Toonflow 证据 | 有 research ledger 和可追溯差距矩阵 |
| R1 Admin Foundation | TFR-01, TFR-03, TFR-23, TFR-24 | 登录、Agent 模型、LLM provider、模型映射 | 设置中心能管理用户、LLM/provider/model，密钥安全 |
| R2 Script Pipeline | TFR-11, TFR-12, TFR-13 | 章节、事件、ScriptAgent、剧本资产 | 小说到剧本/资产的中间产物可编辑可追踪 |
| R3 Production Workbench | TFR-14, TFR-15, TFR-19, TFR-21, TFR-22 | ProductionAgent、flowData、分镜面板、视频 prompt、轨道 | 分镜到视频生产链路具备工作台体验 |
| R4 Asset / Media Tools | TFR-16, TFR-17, TFR-18, TFR-20 | 衍生资产、prompt 润色、音频绑定、图片编辑 | 素材和分镜图能批量生成、编辑、绑定和回流 |
| R5 Platform / Operations | TFR-02, TFR-04, TFR-05, TFR-06, TFR-07, TFR-08, TFR-09, TFR-25, TFR-26, TFR-27 | 实时通道、版本、文件、数据维护、调试、多语言、skill index、记忆、任务中心、部署 | Web/服务端生产可用性提升，不依赖 Electron |

执行建议：

1. 先做 R0，避免后续模块反复调研 Toonflow。
2. R1 和 R2 可以交错推进，但 LLM provider / Agent deploy 必须早于真实 Agent。
3. R3 是 Toonflow 化的核心生产体验，应拆小模块串行完成。
4. R4 聚焦素材与媒体工具，依赖 `GenerationJob` 和 asset 底座。
5. R5 中除实时通道和多语言外，多数属于 P2，不应阻塞 MVP。

---

## 5. 模块工作清单总览

优先级说明：

- P0：建议近期进入 requirements / plan 的基础能力。
- P1：MVP 或早期 V1 中显著提升短剧生产效率的能力。
- P2：核心闭环稳定后推进的增强能力。

状态说明：

- `未覆盖`：当前没有等价能力。
- `部分覆盖`：已有 DB/API/UI 底座，但缺完整 Toonflow 等价产品闭环。
- `迁移约束`：参考项目能力不能原样迁移，需要改成 guga-flow 架构。

| ID | 优先级 | 覆盖状态 | 任务 | 范围边界 | 完成信号 |
| --- | --- | --- | --- | --- | --- |
| TFR-00 | P0 | 未覆盖 | Toonflow research ledger | 只建证据文档，不改产品代码 | `docs/research/video-ref/` 有 Toonflow 覆盖矩阵和 context packs |
| TFR-01 | P0 | 未覆盖 | 登录 / 密码 / JWT 会话 | 单用户/默认用户过渡即可，不做 RBAC | 有登录页、session/token、受保护 API 和测试 |
| TFR-02 | P1 | 未覆盖 | 流式 Agent 通道 | SSE 或 Socket.IO 任选；必须可停止和审计 | ScriptAgent/ProductionAgent 能流式返回状态，断线可恢复或降级 |
| TFR-03 | P0 | 未覆盖 | Agent 部署中心 | 配置 Agent 与子 Agent 模型，不直接调用浏览器 key | 可给 script/production/universal/sub-agent 绑定 LLM provider/model |
| TFR-04 | P2 | 未覆盖 | 版本信息 / 发布检查 | 不做 Electron 自动更新，只做 Web/服务端版本与 release 链接 | 设置中心展示版本、构建信息、可配置 release check |
| TFR-05 | P2 | 未覆盖 | 受控文件管理入口 | 不打开原生文件夹；只管理服务器允许的项目数据目录 | 能查看 asset storage/exports/logs 概览并按权限下载/清理 |
| TFR-06 | P2 | 未覆盖 | 数据库维护中心 | 不提供危险裸 SQL；只提供导入导出、校验、清理向导 | 可导出项目数据、验证导入、查看 DB/资源统计 |
| TFR-07 | P2 | 未覆盖 | AI SDK Devtools / 调试开关 | 只面向开发环境或管理员，不泄露 secret | 可开关 AI 调试，中间件不进入生产默认路径 |
| TFR-08 | P2 | 部分覆盖 | Skill 语义索引与归属 | 复用 `SkillTemplate`，补 index/embedding/attribution | Skill 可搜索、归属到 Agent、激活并诊断状态 |
| TFR-09 | P1 | 部分覆盖 | 多语言 UI | 先 zh/en，后续语言包可扩展 | 核心 dashboard/canvas/settings/generation 文案可切换 |
| TFR-10 | P1 | 部分覆盖 | 项目视觉手册 / 导演手册 / 画风库 | 接入 prompt composer；不复制 Toonflow prompt | 项目级 manual/style 会出现在 prompt debug parts |
| TFR-11 | P1 | 部分覆盖 | 章节级小说管理 | 在 `NovelDocument` 上拆 chapter/event，不阻塞短篇导入 | 长篇可按章节查看、更新、提取事件和状态 |
| TFR-12 | P1 | 部分覆盖 | ScriptAgent 工作区 | 故事骨架、改编策略、剧本草稿可编辑 | Agent 生成的中间产物能保存、编辑、版本化、导出 |
| TFR-13 | P1 | 部分覆盖 | 剧本资产提取 | 从 script draft 提取角色/场景/道具；落画布/资产 | 提取结果可变成 Character/Location/Prop 节点并绑定来源 |
| TFR-14 | P1 | 部分覆盖 | ProductionAgent 编排 | 决策/执行/监督逻辑落为任务和业务记录 | Agent 可创建/更新分镜、资产、视频任务，动作可审计 |
| TFR-15 | P1 | 部分覆盖 | flowData 制作工作区 | 不照搬 `o_agentWorkData`，可映射到 ScriptDraft/Canvas/Job | scriptPlan/storyboardTable/storyboard 工作区可读写 |
| TFR-16 | P1 | 部分覆盖 | 衍生资产 / 状态变体 | parent-child asset 或 node version；保留用户选择 | 角色/场景/道具有变体、生成状态、错误、主版本 |
| TFR-17 | P1 | 部分覆盖 | 资产 prompt 润色 / 取消 / 轮询 | 走 `GenerationJob`，不做前端直连 LLM | 单个/批量 prompt polish 可取消、失败可见 |
| TFR-18 | P1 | 部分覆盖 | 音频自动绑定 | 角色到 voice reference，Shot/Video 到 audio reference | 可批量为角色匹配音色并写入 editor export manifest |
| TFR-19 | P1 | 部分覆盖 | 分镜面板 CRUD | 独立 panel 与 canvas 双向同步，不绕过业务事实 | 可新增/编辑/删除/批量分镜，并导入/定位画布节点 |
| TFR-20 | P1 | 部分覆盖 | 分镜图编辑流 | 节点式 image flow 或轻量编辑原语，结果回流 Asset | Image/Storyboard 可编辑、保存新版本、保留来源关系 |
| TFR-21 | P1 | 部分覆盖 | 视频 prompt 生成 / 检查 | 按 provider/model mode 路由，不硬编码单模型 | Seedance/Wan/通用多参/首尾帧 prompt 可生成与校验 |
| TFR-22 | P1 | 部分覆盖 | 视频轨道工作台 | 不做完整剪辑器；做候选视频、选择、时长、轨道 | 每个分镜轨道可有多个候选视频并选择主版本 |
| TFR-23 | P0 | 部分覆盖 | Text / LLM provider 管理 | 扩展现有 provider，不让浏览器拿 key | LLM provider 可配置、测试、用于 Agent/脚本生成 |
| TFR-24 | P1 | 部分覆盖 | Provider 模型 CRUD / model map | 与 discovery 和 programmable provider 合并设计 | 可添加/删除/启停模型，绑定 prompt/model purpose |
| TFR-25 | P2 | 部分覆盖 | Agent 记忆系统 | 从手工记忆升级到 summary/RAG；可清理可禁用 | Agent 可召回项目偏好，memory 可查看、禁用、清空 |
| TFR-26 | P2 | 部分覆盖 | 任务中心 | 不替代 GenerationJob；做跨任务分类和详情视图 | LLM/图片/视频/导出/Agent 任务可按分类查看详情 |
| TFR-27 | P2 | 部分覆盖 | 生产部署形态 | 不做 Electron；做 Docker/PM2/Vercel-like 文档和 Web 启动 | 有可执行部署说明、健康检查、数据目录和配置策略 |

排除项：

| ID | 原 Toonflow 差距 | 处理 |
| --- | --- | --- |
| TFR-X-ELECTRON | Electron 桌面客户端 / 安装包 / 原生窗口 | 不做；不得进入 plan，除非用户未来明确重新打开范围 |

---

## 6. 模块级工作清单

### TFR-00：Toonflow Research Ledger

优先级：P0  
类型：Research / Documentation

#### 背景

当前对 Toonflow 的差距分析来自本地源码、README 和路由/数据表扫描，但需要固化成可复用研究资产，避免每个模块重复打开参考项目。

#### 工作范围

- 建立 Toonflow 总覆盖矩阵。
- 记录参考项目路径、commit 或本地快照日期、license、可参考与不可复制边界。
- 按 agent、script、production、assets、vendor、setting、memory、workflow、video track 拆 context pack。
- 标注 `Fact`、`Inference`、`Pending Verification`。

#### 非目标

- 不改代码。
- 不复制 Toonflow prompt、skill、provider code 或静态资源。

#### 完成信号

- `docs/research/video-ref/` 下有 Toonflow 总入口。
- 每个后续 `TFR-*` 模块能在 3 分钟内定位对应证据。
- 文档里没有无路径证据的关键判断。

---

### TFR-01：登录 / 密码 / JWT 会话

优先级：P0  
类型：Backend / Frontend / Security

#### 背景

Toonflow 有默认 admin 登录、JWT token 和受保护 API。guga-flow 当前有 `User` 模型和默认 owner 逻辑，但没有真实登录会话。

#### 工作范围

- 增加单用户优先的 auth flow。
- 默认开发环境可 seed admin 或 default user。
- 后端 API 保护策略和前端 session 管理。
- 密码存储必须 hash，不复用 Toonflow 明文密码模式。
- 为 worker trusted token、provider secret endpoint 和普通用户 session 区分边界。

#### 非目标

- 不做 RBAC、团队权限、OAuth、组织管理。
- 不阻塞本地 mock demo；开发环境可提供清晰的 bypass/seed 策略。

#### 完成信号

- 用户能登录、退出、刷新后保持会话。
- 未登录访问项目 API 返回可预期错误。
- provider secret、worker runtime endpoint 不被普通浏览器 session 越权访问。
- 有 backend auth tests 和 frontend login/session tests。

---

### TFR-02：流式 Agent 通道

优先级：P1  
类型：Backend / Frontend / Agent runtime

#### 背景

Toonflow 通过 Socket.IO 为 ScriptAgent 和 ProductionAgent 提供流式 chat、stop、think config 和上下文更新。guga-flow 目前 Agent 是 REST 风格确定性 canvas action。

#### 工作范围

- 选择 SSE 或 Socket.IO，写入 plan 时说明取舍。
- 支持 streaming text、thinking/status events、tool event summary、stop/cancel。
- 每次 Agent session 与项目、script/canvas context 绑定。
- 关键 Agent 动作必须落库，不能只在流式消息中存在。
- 断线后前端能提示并降级到 job polling 或历史记录。

#### 非目标

- 不实现完整多人实时协作。
- 不让 Agent 直接改画布 store 而绕过后端业务事实。

#### 完成信号

- 前端可打开 ScriptAgent/ProductionAgent 面板并看到流式状态。
- 用户可停止正在运行的 Agent。
- Agent 产生的生产动作能在 `GenerationJob` 或专用审计记录中追踪。

---

### TFR-03：Agent 部署中心

优先级：P0  
类型：Settings / Provider / Agent config

#### 背景

Toonflow 的 `o_agentDeploy` 为 scriptAgent、productionAgent、universalAi 和各子 Agent 绑定模型、温度、最大输出 token，并支持简易/高级模式。guga-flow 需要对应能力来支撑真实 Agent。

#### 工作范围

- 定义 Agent roles：script, production, universal, supervision, skeleton, adaptation, storyboard, asset, video-prompt 等。
- 配置每个 role 使用的 provider/model。
- 支持简易模式：主 Agent 继承同一个模型。
- 支持高级模式：每个子 Agent 可单独配置。
- 配置项包括 temperature、max output tokens、reasoning/think 开关。
- 与 TFR-23 的 LLM provider 管理共享 provider catalog。

#### 非目标

- 不为每个 Agent 引入独立 secret 存储。
- 不在浏览器执行 provider 调用。

#### 完成信号

- 设置中心能配置 Agent model map。
- Agent runtime 能解析 role -> provider/model/runtime config。
- 配置错误时 Agent 不启动，并返回可读错误。

---

### TFR-04：版本信息 / 发布检查

优先级：P2  
类型：Settings / Operations

#### 背景

Toonflow 有 about/checkUpdate 和 downloadApp 路由。由于 Electron 不做，guga-flow 只保留 Web/服务端可用的版本与发布信息。

#### 工作范围

- 设置中心展示 app version、api version、build commit、node version。
- 可选配置 release feed URL。
- release check 只返回版本信息、下载链接或文档链接。
- 生产环境默认不自动下载、不自动替换应用。

#### 非目标

- 不做 Electron auto-updater。
- 不做下载安装包。
- 不做自更新。

#### 完成信号

- 设置中心能显示当前版本和构建信息。
- release check 失败不会影响核心生产功能。

---

### TFR-05：受控文件管理入口

优先级：P2  
类型：Backend / Settings / Storage

#### 背景

Toonflow 提供 fileManagement/openFolder 等本地入口。guga-flow 不做 Electron，因此只能提供服务器允许范围内的文件与存储管理。

#### 工作范围

- 展示 asset storage、exports、logs、temporary jobs 的摘要。
- 支持下载已授权的导出包或日志片段。
- 支持清理 orphaned temp files。
- 所有路径必须在配置的 storage root 内。

#### 非目标

- 不打开系统文件夹。
- 不扫描用户任意本地路径。
- 不暴露服务器绝对路径给普通用户。

#### 完成信号

- 用户可在设置中心看到存储占用和可清理项。
- 路径穿越和 root 外路径被拒绝。

---

### TFR-06：数据库维护中心

优先级：P2  
类型：Backend / Settings / Data safety

#### 背景

Toonflow 有 dbInfo、exportData、importData、clearTable、clearData、deleteAllData。guga-flow 需要更安全的项目级维护能力。

#### 工作范围

- 项目级数据导出和导入校验。
- 项目级资源统计和 DB 统计。
- 清理失败 job、orphaned assets、未引用 editor packages。
- 高风险操作必须二次确认。

#### 非目标

- 不提供任意清表。
- 不提供裸 SQL。
- 不提供跨项目数据破坏操作。

#### 完成信号

- 用户能导出项目数据并验证导入包。
- 清理操作有 dry run summary。
- 有 destructive action tests。

---

### TFR-07：AI SDK Devtools / 调试开关

优先级：P2  
类型：Developer Experience / Settings

#### 背景

Toonflow 有 `switchAiDevTool` 开关。guga-flow 可引入开发环境 AI 调试能力，但不能泄露 secret 或影响生产默认路径。

#### 工作范围

- 增加 dev-only AI debug flag。
- Agent/provider 调用可输出 safe trace id、model、latency、sanitized error。
- 可选接入 AI SDK devtools，仅限开发环境。

#### 非目标

- 不把 raw prompt、secret header、完整 provider response 暴露到客户端。

#### 完成信号

- 开关关闭时无额外调试中间件。
- 开关开启时能定位 Agent/provider 调用问题。

---

### TFR-08：Skill 语义索引与归属

优先级：P2  
类型：Skill / Agent / Search

#### 背景

Toonflow 有 `o_skillList`、`o_skillAttribution`、embedding、state，用于让 Agent 按描述激活 skill。guga-flow 目前有 `SkillTemplate` 版本管理，但缺 semantic index 和 attribution。

#### 工作范围

- 在 `SkillTemplate` 或新索引表上建立 description、embedding/status、attribution。
- Skill 可归属到 scriptAgent、productionAgent、universal 或子 Agent。
- Agent 可通过 `activate_skill` 工具加载完整模板。
- skill source 修改后更新 index/diagnostics。

#### 非目标

- 不执行任意代码。
- 不自动导入 Toonflow skills。

#### 完成信号

- 设置中心可搜索 skill。
- Agent prompt 中只注入匹配 skill summary，必要时通过工具加载全文。
- skill 状态可诊断：missing description、invalid source、disabled。

---

### TFR-09：多语言 UI

优先级：P1  
类型：Frontend / i18n

#### 背景

Toonflow README 显示多语言界面。guga-flow 已有 i18n 底座，但覆盖不完整。

#### 工作范围

- 先覆盖 zh/en。
- dashboard、canvas、asset library、generation、settings、provider、skills、auth 核心文案。
- 文案 keys 结构稳定。
- 后续语言包可增量添加。

#### 非目标

- 不一次性覆盖 Toonflow 的全部语言。
- 不把业务逻辑放入翻译文件。

#### 完成信号

- 用户可切换 zh/en。
- 核心页面没有混杂硬编码英文状态。
- 测试能验证关键 aria label / button text。

---

### TFR-10：项目视觉手册 / 导演手册 / 画风库

优先级：P1  
类型：Project settings / Prompt composer / Canvas

#### 背景

Toonflow 项目模型包含 artStyle、directorManual、videoRatio，并有 visual/director manual 路由和 artStyle 管理。guga-flow 已有 generation settings 和 prompt composer，但需要明确项目手册能力。

#### 工作范围

- 视觉手册字段：art style、palette、lighting、lens、composition、texture、negative style、consistency rules。
- 导演手册字段：pacing、camera language、performance、editing rhythm、audio narration、constraints。
- 画风库：可保存、选择、应用到项目。
- 手册内容进入 prompt composer debug parts。

#### 非目标

- 不复制 Toonflow art skill 文本。
- 不让手册覆盖用户锁定的节点字段。

#### 完成信号

- 设置中心可编辑项目手册。
- Shot prompt 能显示来自项目/节点的手册来源。
- 导出包可携带手册摘要。

---

### TFR-11：章节级小说管理

优先级：P1  
类型：Novel / Event graph / Frontend

#### 背景

Toonflow 将小说拆成章节，记录 chapterIndex、eventState、event、errorReason。guga-flow 有 `NovelDocument` 和 `NovelEventGraph`，但需要章节级工作台。

#### 工作范围

- 从长文本或文件导入章节。
- 章节列表、章节详情、章节状态。
- 单章/批量事件提取 job。
- 事件图与 ScriptDraft/Shot 的来源关系。

#### 非目标

- 不要求 10 万字全自动成片。
- 不阻塞短篇粘贴 -> storyboard 的轻量流程。

#### 完成信号

- 长篇小说可按章节查看。
- 每章事件提取成功/失败状态可见。
- Shot 或 ScriptDraft 可回溯到章节事件。

---

### TFR-12：ScriptAgent 工作区

优先级：P1  
类型：Agent / Script / Frontend

#### 背景

Toonflow ScriptAgent 生成故事骨架、改编策略和剧本，并通过 planData 工作区读写中间产物。guga-flow 有 `ScriptDraft`，但缺 Agent 工作区。

#### 工作范围

- 工作区字段：storySkeleton、adaptationStrategy、script。
- 支持版本、编辑、导出、从事件图生成。
- Agent 输出必须写入结构化 draft，不只返回聊天文本。
- 支持 supervision/revision。

#### 非目标

- 不要求真实 LLM 一次生成完整长剧。
- 不复制 Toonflow XML prompt 协议。

#### 完成信号

- 用户能从 Novel/EventGraph 生成 script workspace。
- 中间产物可编辑、保存、导出。
- 可选择 ScriptDraft 进入 storyboard 生成。

---

### TFR-13：剧本资产提取

优先级：P1  
类型：Script / Assets / Canvas

#### 背景

Toonflow 从剧本中提取角色、场景、道具资产，并用于后续图片生成和分镜制作。guga-flow 已有 Character/Location/Prop/Style 节点，需要从 script draft 自动生成。

#### 工作范围

- 从 ScriptDraft 提取 role、scene/location、prop。
- 生成 asset prompt、description、source trace。
- 可选择导入为 CanvasNode 或 Asset。
- 去重和人工合并。

#### 非目标

- 不覆盖用户手工维护的锁定资产。
- 不要求一次提取完全准确。

#### 完成信号

- 剧本资产提取结果可预览、编辑、导入。
- 导入后与 ScriptDraft 建立来源关系。
- Character/Location/Prop 节点可用于 Shot prompt。

---

### TFR-14：ProductionAgent 编排

优先级：P1  
类型：Agent / Canvas / Generation

#### 背景

Toonflow ProductionAgent 通过决策层、执行层、监督层调用工具，生成衍生资产、拍摄计划、分镜图、分镜面板和分镜表。guga-flow 当前 Agent 只支持有限确定性 canvas action。

#### 工作范围

- 定义 ProductionAgent 工具边界。
- 工具只能调用后端 API 或创建 job，不直接修改前端状态。
- 支持 director plan、derive assets、generate assets、storyboard panel、storyboard table、supervision。
- 每个 Agent action 写入审计记录和可撤销范围。

#### 非目标

- 不让 Agent 自由写 DB。
- 不把 Agent 结果只保存在 Socket 消息。

#### 完成信号

- ProductionAgent 能创建或更新至少一种生产产物，例如 storyboard panel 或 derived asset。
- 用户能看到工具调用摘要和失败原因。
- 关键动作可 undo 或生成修订记录。

---

### TFR-15：flowData 制作工作区

优先级：P1  
类型：Production data / Frontend

#### 背景

Toonflow 的 flowData 包含 script、scriptPlan、assets、storyboardTable、storyboard。guga-flow 需要对应的制作工作区，但应映射到现有 ScriptDraft、CanvasNode、CanvasEdge、Asset、GenerationJob。

#### 工作范围

- 定义 guga-flow production workspace projection。
- 支持读取和写入 script plan、storyboard table、storyboard items。
- 与画布节点双向同步。
- 支持 Agent 工具按 key 读取局部上下文。

#### 非目标

- 不新增一个与画布事实割裂的万能 JSON 仓库。
- 不照搬 `o_agentWorkData`。

#### 完成信号

- 前端有 production workspace panel。
- Agent 能读取当前 scriptPlan/storyboardTable/storyboard summary。
- 修改后能同步到画布或结构化记录。

---

### TFR-16：衍生资产 / 状态变体

优先级：P1  
类型：Assets / Canvas / Generation

#### 背景

Toonflow 支持资产及其 derive 变体，例如角色不同状态、服装、道具、场景变化。guga-flow 已有 `NodeVersion` 和 `Asset`，但需要产品化。

#### 工作范围

- 定义 derived asset 数据结构。
- 支持 parent asset / child variant。
- 状态：draft、queued、running、succeeded、failed、selected。
- 变体可作为 referenceAssetIds 使用。

#### 非目标

- 不删除旧变体。
- 不自动覆盖 selected version。

#### 完成信号

- Character/Location/Prop 节点可创建多个视觉变体。
- 生成结果保存为 Asset 并绑定来源。
- prompt composer 能选择当前变体。

---

### TFR-17：资产 Prompt 润色 / 取消 / 轮询

优先级：P1  
类型：Assets / Generation / Worker

#### 背景

Toonflow 有 assetsGenerate 下的 prompt polish、batch polish、generate、cancel、polling。guga-flow 已有 `GenerationJob`，需要资产级 prompt 工作流。

#### 工作范围

- 单个/批量资产 prompt polish。
- 单个/批量资产图片生成。
- cancel/retry/polling 或实时状态。
- 输出写回 asset/node metadata，不只返回文本。

#### 非目标

- 不从浏览器直接调用 LLM。
- 不为资产生成建立独立任务系统。

#### 完成信号

- 用户能选择多个资产运行 prompt polish。
- 任务可取消，失败可见。
- 成功结果可用于后续 image/video generation。

---

### TFR-18：音频自动绑定

优先级：P1  
类型：Audio / Assets / Editor export

#### 背景

Toonflow 支持为角色资产批量匹配音频/音色，并保存角色到音频关系。guga-flow 已支持 audio asset 和 editor export audio references，但缺自动绑定 UI 和 job。

#### 工作范围

- 上传和管理 voice reference、background music、shot audio。
- 角色到 voice reference 的手工绑定。
- AI 批量匹配音色，走 `GenerationJob`。
- Shot/Video audio references 进入 editor export manifest。

#### 非目标

- 不做完整配音合成系统。
- 不做完整音频编辑器。

#### 完成信号

- 用户可为角色绑定音色。
- 可批量自动匹配并人工确认。
- editor export package 中包含 audio references。

---

### TFR-19：分镜面板 CRUD

优先级：P1  
类型：Storyboard / Canvas / Frontend

#### 背景

Toonflow 的 production/storyboard 路由支持分镜新增、编辑、删除、批量新增、批量删除、预览、下载、图片生成和状态轮询。guga-flow 有 storyboard draft/import 和 canvas nodes，但缺独立分镜面板工作台。

#### 工作范围

- 分镜列表和表格。
- 新增、编辑、删除、批量新增、批量删除。
- 分镜与 ShotNode 双向同步。
- 分镜图片状态和错误显示。
- 点击分镜定位画布 ShotNode。

#### 非目标

- 不让分镜面板绕过画布事实。
- 不实现完整 timeline 编辑。

#### 完成信号

- 用户能在 panel 中编辑分镜并同步画布。
- 删除或重排分镜时 `sequence_next` 和节点数据保持一致。
- 批量导入后布局不重叠。

---

### TFR-20：分镜图编辑流

优先级：P1  
类型：Image editing / Workflow / Canvas

#### 背景

Toonflow 有 `o_imageFlow` 和 editImage 路由，用节点式 flow 保存上传图、参考图和生成图。guga-flow 已有 workflow definition/run 和 image_refinement operation，需要形成可用编辑回流。

#### 工作范围

- 支持从 ImageNode/Storyboard 打开编辑流。
- 支持上传参考图、填写 prompt、选择 provider/model。
- 生成新图片并保存为 Asset。
- 新结果可作为 ImageNode 变体或新 ImageNode。

#### 非目标

- 不做完整 Photoshop。
- 不直接兼容 Toonflow imageFlow JSON。

#### 完成信号

- ImageNode 可创建 edit job。
- 编辑结果回流画布并保留 `derived_from`。
- 用户可选择主版本。

---

### TFR-21：视频 Prompt 生成 / 检查

优先级：P1  
类型：Prompt / Provider / Generation

#### 背景

Toonflow 内置视频提示词生成 Skill，按模型和多参模式输出不同 prompt 格式。guga-flow 有 prompt composer，但视频 provider 参考媒体和模型格式需要更细。

#### 工作范围

- 定义 video prompt modes：generic multi-reference、first-frame、first-last-frame、provider-specific。
- 从 Shot、Character、Location、Style、Asset、Storyboard 组装 prompt。
- 支持 prompt check：缺参考图、缺台词、duration 不合法、provider mode 不支持。
- 与 TFR-24 provider model metadata 联动。

#### 非目标

- 不硬编码 Toonflow 的完整 prompt 文本。
- 不让用户看不到 prompt debug 来源。

#### 完成信号

- 选择不同 video provider/model 时 prompt 生成策略不同。
- 缺少必需参考时用户能看到明确错误。
- `GenerationJob.inputJson` 包含安全、可审计的 prompt debug summary。

---

### TFR-22：视频轨道工作台

优先级：P1  
类型：Video / Storyboard / Editor export

#### 背景

Toonflow 有 `o_videoTrack`、视频候选、选择视频、更新 duration、删除视频、批量生成。guga-flow 已有 VideoNode 和 editor export，但缺轨道式候选管理。

#### 工作范围

- 每个 Shot/StoryboardItem 对应一个 video track projection。
- Track 有 prompt、duration、candidate videos、selected video。
- 支持 add/delete track、select video、update prompt、update duration。
- editor export 默认使用 selected video。

#### 非目标

- 不做完整 NLE。
- 不做多轨混剪 UI。

#### 完成信号

- 每个 Shot 能看到多个候选视频。
- 用户可选择主视频，导出使用主视频。
- 未选择时有 deterministic fallback 和提示。

---

### TFR-23：Text / LLM Provider 管理

优先级：P0  
类型：Provider / Settings / Agent

#### 背景

Toonflow 的 vendor system 覆盖 text/image/video/tts，并支持 Agent role 选择模型。guga-flow 当前 provider 管理偏 image/video，需要补 LLM/text provider。

#### 工作范围

- 扩展 provider kind `llm` 的 catalog 和管理 UI。
- 支持 OpenAI-compatible、Gemini、Anthropic/Claude-like、Ark 等协议，具体 provider 需 plan 阶段查官方文档。
- 支持 text connection test。
- Agent deploy center 使用 LLM provider。

#### 非目标

- 不让浏览器直接调用 LLM。
- 不在 P0 接完所有 Toonflow vendor。

#### 完成信号

- 用户可配置一个 LLM provider 并测试。
- ScriptAgent/ProductionAgent 能引用该 provider/model。
- 无 key 时 Agent 给出可读配置错误。

---

### TFR-24：Provider 模型 CRUD / Model Map

优先级：P1  
类型：Provider / Prompt / Settings

#### 背景

Toonflow 支持 vendor model add/delete/update、model prompt binding、image/video/text test。guga-flow 有 discover-models 和 programmable provider，但缺模型映射台。

#### 工作范围

- Provider 下的模型列表可手工添加、删除、禁用、重命名 displayName。
- 模型 metadata：kind、modes、duration、ratio、reference support、prompt template binding。
- model test 分 text/image/video。
- 与 TFR-21 视频 prompt modes 联动。

#### 非目标

- 不把 discovered raw model response 直接保存为前端可见数据。
- 不允许模型配置携带 secret。

#### 完成信号

- 用户可为 provider 管理模型列表。
- 不同模型能绑定不同 prompt behavior。
- 测试失败有安全错误摘要。

---

### TFR-25：Agent 记忆系统

优先级：P2  
类型：Agent / Memory / Search

#### 背景

Toonflow 使用本地 ONNX embedding，为 Agent 提供 short-term、summary、RAG 和 deepRetrieve。guga-flow 目前有手工 `AgentMemory` 和 recall，需要升级。

#### 工作范围

- Memory types：message、summary、manual preference、tool result。
- 隔离维度：project、agent role、script/canvas context。
- summary 触发策略。
- embedding / vector search 方案，优先选与当前技术栈兼容的实现。
- 用户可查看、禁用、清空。

#### 非目标

- 不默认把所有用户输入永久记忆。
- 不把敏感 provider key 或 raw secret 写入 memory。

#### 完成信号

- Agent 能召回项目偏好和最近上下文。
- 用户能清理 memory。
- memory 注入 prompt 前有 token/安全过滤。

---

### TFR-26：任务中心

优先级：P2  
类型：Jobs / Operations / Frontend

#### 背景

Toonflow 有 `o_tasks` 记录 taskClass、relatedObjects、model、describe、state、reason。guga-flow 有 `GenerationJob`，但缺跨任务中心视图。

#### 工作范围

- 基于 `GenerationJob` 和相关记录建立 task center projection。
- 分类：LLM、image、video、asset analysis、workflow、editor export、Agent。
- 详情：输入摘要、输出摘要、关联对象、错误、耗时、重试/取消。
- 前端任务中心和画布 bottom queue 联动。

#### 非目标

- 不新增与 `GenerationJob` 平行的重复任务系统，除非 plan 证明必要。

#### 完成信号

- 用户能按项目查看所有生产任务。
- 点击任务能定位关联节点/资产/脚本。
- 失败任务有可读 reason 和可用操作。

---

### TFR-27：生产部署形态

优先级：P2  
类型：DevOps / Documentation / Runtime

#### 背景

Toonflow 支持 Docker、本地服务端口、PM2 云端部署和内置静态前端资源。guga-flow 当前主要是开发环境和 monorepo scripts。

#### 工作范围

- 明确 Web/Nest/Worker/Postgres/Redis/Nginx 的生产部署拓扑。
- Docker compose 或生产部署说明。
- 健康检查、日志、数据目录、asset storage、env var 文档。
- 静态前端和 API 路由部署边界。

#### 非目标

- 不做 Electron。
- 不做自动升级。
- 不做一键商业发行包。

#### 完成信号

- 新机器能按文档启动 Web + API + Worker + DB。
- health check 可验证核心服务。
- 数据目录、备份和恢复策略写清楚。

---

## 7. 标准模块循环

每个 `TFR-*` 模块都必须经过固定循环：

```text
ce-brainstorm -> ce-plan -> ce-work -> ce-code-review -> ce-compound
```

### 7.1 Brainstorm

输入：

- 本文对应模块。
- `docs/infinite-canvas-video-long-task-development-flow.md`。
- 相关 Toonflow context pack。
- 当前代码和测试。

输出：

- `docs/brainstorms/YYYY-MM-DD-NNN-tfr-<id>-<slug>-requirements.md`

必须包含：

- 用户故事。
- 功能需求。
- 非目标。
- 数据/API/UI 范围。
- 验收样例。
- 参考证据和不可复制边界。

### 7.2 Plan

输入：

- requirements 文档。
- 当前代码。
- 已有 shared types / services / UI patterns。

输出：

- `docs/plans/YYYY-MM-DD-NNN-feat-tfr-<id>-<slug>-plan.md`

必须包含：

- implementation units。
- 文件清单。
- 测试策略。
- 风险和回滚。
- wrong vs correct。

### 7.3 Work

执行要求：

- 先读 plan。
- 用 `update_plan` 跟踪 `U*` 单元。
- 每个行为变更都补测试。
- 涉及前端体验时启动 dev server 并做浏览器验证。
- 不修改无关文件。

### 7.4 Code Review

进入下一个模块前：

- 审查真实 diff。
- 检查 requirements completeness。
- 修复或路由 P0/P1 findings。
- 重新运行 targeted tests。

### 7.5 Compound

当模块涉及 Agent、provider、workflow、memory、画布同步、任务状态、数据迁移或安全边界时，必须写 solution 文档。

---

## 8. 全局验收门禁

每个模块最低门禁：

- shared types 更新并有类型测试或编译验证。
- backend service/controller 有 targeted tests。
- worker 行为有 mock tests。
- frontend 关键路径有 component/browser tests。
- secret 不出现在 browser-safe DTO、job JSON、日志或快照。
- `pnpm run format:check`、`pnpm run test`、`pnpm run build` 在可行时通过。

跨模块累积门禁：

- 登录后能创建项目并进入画布。
- 能配置 LLM provider 和 Agent role。
- 能导入章节、提取事件、生成 script draft。
- 能从 script draft 提取资产。
- 能通过 ProductionAgent 或 UI 生成/编辑分镜。
- 能为分镜生成图片、视频 prompt、候选视频。
- 能选择主视频并导出 editor package。
- 能查看任务中心、错误、重试和取消状态。

---

## 9. 失败路由

| 失败类型 | 路由 |
| --- | --- |
| 产品行为不清楚 | 回到 `ce-brainstorm`，更新 requirements |
| 与 guga-flow 架构冲突 | 更新 plan，必要时写 `docs/solutions/tooling-decisions/` |
| 依赖 Electron | 改写为 Web/服务端边界；无法改写则标记不做 |
| 参考项目证据不足 | 更新 research ledger 或打开 focused context |
| 外部 provider/API 不稳定 | 增加 mock path 和错误矩阵，不阻塞基础模块 |
| 涉及 secret 泄露风险 | 停止实现，先写安全设计 |
| 前端体验不可验收 | 增加 screenshot/browser verification |

---

## 10. 产物命名

使用稳定路径：

```text
docs/research/video-ref/context-packs/toonflow-<topic>.md
docs/brainstorms/YYYY-MM-DD-NNN-tfr-<id>-<slug>-requirements.md
docs/plans/YYYY-MM-DD-NNN-feat-tfr-<id>-<slug>-plan.md
docs/solutions/<category>/<learning-slug>-YYYY-MM-DD.md
```

模块交接摘要模板：

```markdown
## 模块交接摘要

- 模块：
- Requirements 文档：
- Plan 文档：
- 分支 / PR：
- 已运行测试：
- Code review：
- Compound 文档：
- 残留跟进：
- 下一模块：
```

---

## 11. 执行顺序建议

推荐第一批：

1. `TFR-00` Toonflow research ledger。
2. `TFR-23` Text / LLM provider 管理。
3. `TFR-03` Agent 部署中心。
4. `TFR-01` 登录 / 会话。
5. `TFR-11` 章节级小说管理。
6. `TFR-12` ScriptAgent 工作区。

推荐第二批：

1. `TFR-13` 剧本资产提取。
2. `TFR-19` 分镜面板 CRUD。
3. `TFR-21` 视频 prompt 生成 / 检查。
4. `TFR-22` 视频轨道工作台。
5. `TFR-14` ProductionAgent 编排。

推荐第三批：

1. `TFR-10` 项目视觉手册 / 导演手册 / 画风库。
2. `TFR-16` 衍生资产 / 状态变体。
3. `TFR-17` 资产 prompt 润色 / 取消 / 轮询。
4. `TFR-18` 音频自动绑定。
5. `TFR-20` 分镜图编辑流。

推荐第四批：

1. `TFR-02` 流式 Agent 通道。
2. `TFR-08` Skill 语义索引与归属。
3. `TFR-25` Agent 记忆系统。
4. `TFR-26` 任务中心。
5. `TFR-09` 多语言 UI。

推荐第五批：

1. `TFR-04` 版本信息 / 发布检查。
2. `TFR-05` 受控文件管理入口。
3. `TFR-06` 数据库维护中心。
4. `TFR-07` AI SDK Devtools / 调试开关。
5. `TFR-24` Provider 模型 CRUD / Model Map。
6. `TFR-27` 生产部署形态。

如果实际实现中发现依赖关系不同，以 requirements 和 plan 的本地研究为准更新本文。更新本文时要写清为什么调整顺序。

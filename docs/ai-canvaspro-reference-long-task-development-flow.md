# AI-CanvasPro 参考能力开发工作清单

> 版本：2026-06-14  
> 状态：Implementation backlog draft  
> 参考项目：`/Users/lienli/Documents/GitHub/video-ref/AI-CanvasPro/`  
> 目标项目：`guga-flow`  
> 固定模块循环：`ce-brainstorm` -> `ce-plan` -> `ce-work` -> `ce-code-review` -> `ce-compound`

本文把 AI-CanvasPro 中对 guga-flow 有价值、但当前尚未完整覆盖的能力，转成可长期执行的 Markdown 工作清单。它与 `docs/toonflow-reference-long-task-development-flow.md` 和 `docs/infinite-canvas-reference-long-task-development-flow.md` 平级：Toonflow 清单偏短剧生产 Agent/脚本/分镜专项，Infinite-Canvas 清单偏 provider/workflow/素材工具专项，本文偏 AI-CanvasPro 的多模态节点、节点连线体验、本地媒体处理、项目包、任务恢复、诊断和桌面/本地桥接专项。

本文不是“复刻 AI-CanvasPro”的需求文档。AI-CanvasPro 只作为产品行为和工程边界参考，后续实现必须遵守 guga-flow 的 canvas-first、worker-first、secret-safe、mock-first 和 typed contracts 原则。

特别说明：**AI-CanvasPro 的源码、静态资源、品牌、图片、图标、打包产物、商业授权文本、订阅门禁和内置 provider/prompt 不能复制到 guga-flow**。凡是 AI-CanvasPro 中依赖 Electron 或本地文件系统特权的能力，本文只保留可 Web 化、服务端化或单独进入桌面包装决策的部分。

---

## 0. 阅读顺序

长期运行或新会话恢复时，按此顺序读：

1. `docs/infinite-canvas-video-long-task-development-flow.md`。
2. 本文。
3. `docs/toonflow-reference-long-task-development-flow.md`。
4. `docs/infinite-canvas-reference-long-task-development-flow.md`。
5. `infinite_canvas_video_prd_roadmap_v2_detailed.md`。
6. `docs/tech-stack-text2sql-reference.md`。
7. 相关 `docs/research/video-ref/` 资产。
8. 当前模块对应的 `docs/brainstorms/*requirements.md` 和 `docs/plans/*plan.md`。
9. 当前代码和测试。

不得只读本文就直接开工。每个 `ACP-*` 模块必须先进入 `ce-brainstorm`，把产品行为、范围边界、验收标准和参考证据定稿，再进入 `ce-plan` 和实现。

---

## 1. 来源与当前覆盖基线

### 1.1 AI-CanvasPro 参考能力

AI-CanvasPro README 和使用说明将产品定位为“基于节点的 AI 多模态画布编辑器”。参考能力主要包括：

- 无限画布、小地图、网格吸附、多画布 tab、适应画布。
- 源节点：源文本、源图像、源视频、源音频。
- AI 生成节点：AI 文本、AI 图像、AI 视频、AI 音频。
- 进阶节点：注释节点、组节点、分镜节点、场景检测节点、3D 导演台、360 全景图、媒体剪辑节点。
- 节点连线：上游节点结果进入下游 AI 节点，包含图片、视频、音频、文本引用。
- 本地项目管理：`Ctrl+S` 保存、项目 JSON、本地 `output/` 媒体目录、项目文件拖回画布。
- Provider / adapter 层：image/text/video/audio API，RunningHub、Gemini、OpenAI-compatible、Dreamina CLI、错误解析和模型映射。
- 本地媒体服务：上传、远程媒体保存、缩略图/衍生图、视频裁剪、音频裁剪、音频合成、视频反转、音画分离、视频元数据、首帧、分镜帧提取。
- 桌面壳能力：项目包导入导出、恢复快照、最近项目、剪贴板、截图、web preview、诊断日志、本地任务队列、更新检查。
- 任务中心：跨 image/text/video/audio/local media 的任务可见性和恢复。

源码层面，AI-CanvasPro 的能力主要分布在：

- `README.md`
- `使用说明.md`
- `main.js`
- `src/modules/registry.js`
- `src/modules/nodeMeta.js`
- `src/core/stores/appStore.js`
- `src/core/renderer.js`
- `src/core/interaction.js`
- `src/components/*Node.js`
- `api/aiImageApi.js`
- `api/aiTextApi.js`
- `api/aiVideoApi.js`
- `api/aiAudioApi.js`
- `api/adapters/**/*`
- `api/errors/**/*`
- `src/modules/TaskCenterManager.js`
- `backend/services/media_file_route_service.py`
- `backend/services/local_media_processing_route_service.py`
- `backend/services/json_file_route_service.py`
- `backend/services/library_file_route_service.py`
- `electron/preload.cjs`
- `electron/projectPackageService.js`
- `electron/recoverySnapshot.js`
- `electron/ipc/**/*`

### 1.2 guga-flow 已有强覆盖

当前项目已经具备这些底座，不应重复造轮子：

- Next.js + NestJS + Worker + Prisma + PostgreSQL monorepo。
- tldraw canvas-first 工作台。
- `CanvasDocument` / `CanvasNode` / `CanvasEdge` 规范化业务事实。
- `Asset` / `AssetCollection` / `AssetTag` / `AssetTagAssignment` 项目级素材库底座。
- `GenerationJob` 持久化任务队列、worker claim / succeed / fail / cancel。
- `EditorExport` 和 editor package 导出。
- `ProviderConfig`、provider discovery、safe runtime config、programmable provider。
- `WorkflowDefinition` / `WorkflowDefinitionVersion` 和 mock `workflow_run`。
- `CanvasFragmentImport` 和画布片段导入导出。
- `AgentMemory`、`SkillTemplate`、`NovelEventGraph`、`ScriptDraft`。
- 图片 refinement backflow、asset caption/classification、视频参考媒体、SSE generation events。
- 前端已有 dashboard、settings center、asset library、canvas workspace、business nodes、semantic edges、generation actions、editor export actions、agent canvas actions。

### 1.3 主要差距类型

缺口不在“有没有 DB 表”这么简单，更多在 AI-CanvasPro 式的画布工作台厚度：

- 已有业务节点，但没有完整的源媒体节点 / AI 生成节点 / 进阶媒体节点 taxonomy。
- 已有语义边，但缺节点端口、输入槽、模型输入策略和连接约束。
- 已有图片、视频、音频资产，但缺本地媒体处理工作台和媒体剪辑节点。
- 已有 `GenerationJob` 和 SSE，但缺跨媒体任务中心、任务恢复和本地处理任务统一视图。
- 已有 provider 管理，但缺统一错误解析、模型能力矩阵和节点级可读失败诊断。
- 已有项目/画布持久化，但缺多画布页、项目包导入导出、恢复快照和最近项目等可迁移体验。
- 已有素材库和导入导出，但缺远程 URL 保存去重、缩略图/衍生图策略和本地路径权限边界。
- 已有 settings center，但缺用户快捷键、画布偏好、诊断中心和本地平台设置。

---

## 2. 产品定位

### 2.1 问题陈述

guga-flow 的主线是小说到视频生产图谱，核心闭环已经围绕画布、节点、语义边、素材、生成任务和剪辑包展开。AI-CanvasPro 的强项则是“节点式多模态工具台”：源媒体节点、AI 生成节点、媒体剪辑节点、3D/360 节点、项目文件迁移、本地媒体处理、任务恢复和桌面诊断。

本文的目标是把这些能力转成 guga-flow 自己的 Web/Nest/Worker 模块，而不是把 guga-flow 改成 AI-CanvasPro 的原生 JS + Python local server + Electron 架构。

### 2.2 目标

P0 目标：

- 固化 AI-CanvasPro 参考能力和差距清单。
- 明确哪些能力已被 Infinite-Canvas / Toonflow 清单覆盖，哪些是 AI-CanvasPro 新增缺口。
- 建立多模态节点 taxonomy、节点端口/输入策略、任务中心和诊断中心的 requirements 入口。
- 避免后续误把 AI-CanvasPro 的 license-sensitive 源码、资源或桌面壳直接迁入项目。

P1 目标：

- 补齐源媒体节点、AI 文本/音频节点、节点输入槽和引用附件体验。
- 补齐媒体任务中心、媒体处理 job、视频/音频剪辑基础能力。
- 补齐项目多画布页、项目包导入导出、恢复快照和最近项目体验。
- 补齐 prompt preset、模型输入策略、错误解析和节点级诊断。

P2 目标：

- 评估 360 全景、3D 导演台、web preview、截图导入、本地文件夹、桌面壳、secure local store、更新检查等平台增强。
- 在不做 Electron 复制的前提下，给本地创作者提供可控的 Web/服务端/桌面包装能力。

### 2.3 非目标

- 不复制 AI-CanvasPro 源码、静态资源、品牌、图标、图片、视频、prompt、provider manifest、打包脚本或 license 文本。
- 不把 guga-flow 改成通用 AI 工具箱。
- 不在浏览器保存或调用 provider key。
- 不让本地路径、登录 artifact、授权码、设备标识进入 browser-safe DTO、job JSON 或日志。
- 不在 P0/P1 做完整 Electron 桌面客户端、自动更新、订阅门禁、商业授权或会员体系。
- 不做任意本地文件系统扫描。
- 不把媒体处理变成不可审计的浏览器临时操作；生成或处理结果必须落为 `Asset`、`GenerationJob`、`CanvasNode`、`CanvasEdge` 或其他可审计记录。

---

## 3. 全局原则

| ID | 原则 | 可执行要求 |
| --- | --- | --- |
| GP-ACP-01 | Canvas-first | 源媒体、AI 生成、媒体剪辑、3D/360、诊断和项目包能力必须能投射到画布节点、语义边、资产或任务记录 |
| GP-ACP-02 | Node taxonomy before UI | 新节点先定义 shared type、业务数据、输入输出和失败状态，再做前端外观 |
| GP-ACP-03 | Port-aware edges | 多模态节点连线必须有输入槽、媒体类型、数量限制和错误提示，不能只靠自由边 |
| GP-ACP-04 | Worker-first media | 裁剪、合成、分离、反转、缩略图、分镜帧、provider 调用默认走 worker 或服务端任务 |
| GP-ACP-05 | Secret-safe and path-safe | provider key、本地路径、设备信息、授权信息不得进入 browser-safe DTO、job JSON 或日志 |
| GP-ACP-06 | Recoverable tasks | 所有异步任务必须可见、可重试、可取消或可清理 |
| GP-ACP-07 | Portable project packages | 项目/片段导入导出必须带 schemaVersion、source、资源引用和错误恢复策略 |
| GP-ACP-08 | Mock-first | 每个模块必须有不依赖真实 provider、ffmpeg、桌面壳或本地权限的 mock/demo 路径 |
| GP-ACP-09 | Reference restraint | AI-CanvasPro 只提供行为证据，不复制源码和数据结构 |
| GP-ACP-10 | Desktop as adapter | 桌面能力只作为可信 adapter 层评估，Web MVP 必须仍能成立 |

---

## 4. Release 分层

| Release | 模块 | 目标 | 完成定义 |
| --- | --- | --- | --- |
| R0 Research | ACP-00 | 固化 AI-CanvasPro 证据和差距矩阵 | 有 source contract、coverage matrix、context pack 索引和与 IC/TFR 的去重映射 |
| R1 Node Foundation | ACP-01, ACP-02, ACP-03, ACP-04, ACP-05, ACP-06, ACP-07 | 多模态节点、输入槽、AI 文本/音频、prompt preset | 画布能承载源媒体、AI text/audio/video 节点，并按输入策略校验连接 |
| R2 Media Operations | ACP-08, ACP-09, ACP-10, ACP-11, ACP-12, ACP-15 | 任务中心、本地媒体处理、剪辑、分镜帧、衍生图 | 媒体处理任务可见、可恢复，结果落 Asset/节点/边 |
| R3 Project Portability | ACP-16, ACP-17, ACP-20, ACP-21 | 项目包、多画布页、远程/本地素材导入、快捷键偏好 | 项目可迁移、恢复和按画布页组织，素材导入有边界 |
| R4 Advanced Canvas | ACP-13, ACP-14, ACP-24 | 360、3D 导演台、截图/web preview | 进阶节点有受控 MVP 和明确非目标 |
| R5 Platform / Operations | ACP-18, ACP-19, ACP-22, ACP-23, ACP-25 | 诊断、错误解析、桌面/本地设置、排除项治理 | 运维可见性提升，不引入 license 或 secret 风险 |

执行建议：

1. 先做 R0，避免后续模块重复研究 AI-CanvasPro。
2. R1 只补通用节点和输入策略，不急着做复杂媒体处理。
3. R2 与现有 `GenerationJob` / `Asset` / `EditorExport` 合流，不新增平行任务系统。
4. R3 的项目包和多画布页要先定 schema，不要直接兼容 AI-CanvasPro JSON。
5. R4 进阶节点必须先做受控 MVP，尤其 3D 需要独立 Three.js 验证。
6. R5 的桌面/本地能力不应阻塞 Web MVP。

---

## 5. 模块工作清单总览

优先级说明：

- P0：建议近期进入 requirements / plan 的基础能力。
- P1：MVP 或早期 V1 中显著提升多模态画布生产效率的能力。
- P2：核心闭环稳定后推进的增强能力。
- PX：明确排除，不进入 backlog，除非用户未来重新打开范围。

状态说明：

- `未覆盖`：当前没有等价能力。
- `部分覆盖`：已有 DB/API/UI 底座，但缺完整 AI-CanvasPro 等价产品闭环。
- `已有相邻覆盖`：能力已在 IC/TFR 模块中有计划或实现，本文只保留边界提醒。
- `迁移约束`：参考项目能力不能原样迁移，需要改成 guga-flow 架构。
- `排除`：明确不做。

| ID | 优先级 | 覆盖状态 | 任务 | 范围边界 | 完成信号 |
| --- | --- | --- | --- | --- | --- |
| ACP-00 | P0 | 部分覆盖 | AI-CanvasPro research ledger 和覆盖矩阵 | 只建证据文档，不改产品代码 | `docs/research/video-ref/` 有 AI-CanvasPro coverage/gaps 文档，能追溯到 context pack |
| ACP-01 | P0 | 部分覆盖 | 多模态节点 taxonomy 与节点注册规范 | 不复制 AI-CanvasPro node class；先定义 guga-flow typed node data | shared types、Inspector、toolbar 能识别 source/AI/media/advanced 节点族 |
| ACP-02 | P1 | 部分覆盖 | 源文本/图像/视频/音频节点与拖拽入画布 | 不绕过 Asset；拖拽结果必须落 Asset 和 CanvasNode | 文件拖入画布生成源节点，带预览、来源、失败提示和测试 |
| ACP-03 | P1 | 部分覆盖 | 节点端口、输入槽和连接策略 | 不替换现有语义边；在边 data 中补 slot/type/limit | 连接错误可读，AI 节点能知道上游文本/图像/视频/音频引用 |
| ACP-04 | P1 | 部分覆盖 | AI 文本节点和 `@` 节点引用 | 不做 chat-only；文本输出要可落节点/ScriptDraft/Asset | 文本节点支持流式/任务式生成，并可引用上游节点内容 |
| ACP-05 | P1 | 部分覆盖 | AI 音频 / TTS 节点 | 与 TFR-18 音频绑定合流；不浏览器直连 TTS provider | 文本/角色可生成音频 Asset，音频节点可绑定到 Shot/Video |
| ACP-06 | P1 | 部分覆盖 | AI 视频节点模式矩阵 | 与现有 video reference media 合流；不硬编码单 provider | 文生视频/图生视频/首尾帧/参考音频在节点 UI 中可见且可校验 |
| ACP-07 | P1 | 部分覆盖 | Prompt preset library：缩略图、触发模式、节点类型 | 复用 `SkillTemplate`/prompt composer，不新建任意代码执行入口 | preset 可按节点类型筛选、插入、直接触发生成，并有版本/诊断 |
| ACP-08 | P1 | 部分覆盖 | 跨媒体任务中心与任务恢复 | 不替代 `GenerationJob`；只做分类、详情、恢复入口 | LLM/图片/视频/音频/媒体处理/导出任务可集中查看、重试、取消 |
| ACP-09 | P1 | 部分覆盖 | 本地媒体处理 job 基础 | 不做浏览器 ffmpeg；先做 mock 和少量服务端可控操作 | 视频首帧、视频元数据、音频裁剪或视频裁剪至少一条链路落 Asset |
| ACP-10 | P1 | 部分覆盖 | MediaClip 节点 / 轻量时间线 | 不做完整剪辑器；与 EditorExport 和 TFR-22 视频轨道合流 | 单个节点可管理素材片段、裁剪区间、音频引用和导出候选 |
| ACP-11 | P1 | 部分覆盖 | 分镜网格 / Storyboard media board 节点 | 不替代业务 Shot；作为视觉编排和 frame board | 多张图片/视频帧可组成分镜板，并可回写 Shot/Image/Video 节点 |
| ACP-12 | P2 | 未覆盖 | 场景检测与分镜帧提取 | 先做离线/服务端任务；不要求实时视频分析 | 视频 Asset 可生成 scene/frame 列表和图片 Asset，失败可恢复 |
| ACP-13 | P2 | 未覆盖 | 360 全景节点 | 不做全景商业模型专用实现；先支持查看/引用/导出 | 全景图 Asset 可用专用节点预览、标注和进入 prompt context |
| ACP-14 | P2 | 未覆盖 | 3D 导演台节点 | 必须单独 Three.js 验证；不做完整 3D 编辑器 | 受控 3D 场景可摆放对象/相机，截图作为 Image Asset 回流画布 |
| ACP-15 | P1 | 部分覆盖 | 缩略图、衍生图、display/original asset 映射 | 与 IC image edit primitives 合流；不暴露服务器绝对路径 | 图片/视频有稳定 thumbnail/display/original 元数据和重建策略 |
| ACP-16 | P1 | 部分覆盖 | 项目包导入导出与恢复快照 | 不兼容 AI-CanvasPro JSON；定义 guga-flow project package | 项目可导出 zip/json manifest，导入可重映射资源并记录错误 |
| ACP-17 | P1 | 未覆盖 | 项目内多画布页 / canvas tabs | 不破坏现有 single CanvasDocument；需迁移/兼容策略 | 一个项目可有多个 canvas page，节点/边/资产引用边界清晰 |
| ACP-18 | P1 | 部分覆盖 | 诊断中心与安全事件日志 | 不记录 raw secret、raw prompt 默认全文或本地绝对路径 | provider/media/task/desktop-like 失败可查 trace id、分类、建议 |
| ACP-19 | P1 | 部分覆盖 | Provider 错误解析和模型输入策略矩阵 | 与 provider discovery/programmable provider 合流 | provider/model 对输入类型、数量、尺寸、错误码有统一可读解释 |
| ACP-20 | P2 | 部分覆盖 | 远程 URL 素材保存、去重和受控本地导入 | 不做全盘扫描；路径必须白名单化 | URL/本地授权目录导入为 Asset，重复保存可去重，路径不泄露 |
| ACP-21 | P2 | 部分覆盖 | 快捷键和画布偏好设置 | 不把快捷键散落在组件里；先覆盖常用画布动作 | 用户可查看/修改快捷键，设置可导出/导入且测试覆盖冲突 |
| ACP-22 | P2 | 迁移约束 | 桌面/本地包装桥接评估 | 不直接迁 Electron；接续 desktop-local-packaging 决策 | 有 AI-CanvasPro-specific 桌面能力拆分：文件、截图、项目包、更新、secure store |
| ACP-23 | P2 | 迁移约束 | Secure local settings / trusted credential store | Web 默认服务端存密钥；桌面仅作为可信 adapter | 桌面模式下 key/path 存储边界明确，Web DTO 不变 |
| ACP-24 | P2 | 未覆盖 | 截图、web preview 和网页素材采集 | 需用户授权；不抓取登录页面或任意隐私内容 | 截图/网页预览能作为 Asset 入库，有权限、来源和删除策略 |
| ACP-25 | PX | 排除 | 订阅门禁、商业授权、自动热更新复制 | 不进入 guga-flow backlog | 文档明确排除，后续 plan 不引用 AI-CanvasPro subscription/update 代码 |

排除项：

| ID | 原 AI-CanvasPro 差距 | 处理 |
| --- | --- | --- |
| ACP-X-LICENSE | Source Available / NC / 商业授权文本 | 不复制；只记录参考边界 |
| ACP-X-BRANDING | Logo、favicon、图片、演示素材、品牌表达 | 不复制 |
| ACP-X-SUBSCRIPTION | 订阅、会员、CDKey、设备授权、商业门禁 | 不做 |
| ACP-X-HOT-UPDATE | Electron auto-updater / 热更新安装 | 不做；仅可做版本信息或发布链接 |
| ACP-X-ELECTRON-1TO1 | Electron IPC、preload、主进程能力 1:1 迁移 | 不做；只能抽象为可信 adapter 决策 |
| ACP-X-UNSAFE-FS | 打开任意文件夹、扫描全盘、本地路径透传 | 不做 |

---

## 6. 模块级工作清单

### ACP-00：AI-CanvasPro Research Ledger

优先级：P0  
类型：Research / Documentation

#### 背景

当前已有 AI-CanvasPro context pack、Graphify graph、token tree 和 topic queries，但还缺一份像 Infinite-Canvas coverage/gaps 一样的总覆盖矩阵。没有这个矩阵，后续模块容易重复研究或把 IC 已覆盖能力误判为未覆盖。

#### 工作范围

- 建立 AI-CanvasPro 总覆盖矩阵。
- 记录参考项目路径、commit、package version、license 边界、可参考与不可复制边界。
- 按 node taxonomy、provider/task、local media、project package、diagnostics、desktop bridge 拆 context pack 索引。
- 标注 `Fact`、`Inference`、`Pending Verification`。
- 增加与 `IC-*`、`TFR-*`、`ACP-*` 的去重映射。

#### 非目标

- 不改代码。
- 不复制 AI-CanvasPro 源码、prompt、provider manifest、图标、图片或桌面 IPC 实现。

#### 完成信号

- `docs/research/video-ref/` 下有 AI-CanvasPro 覆盖矩阵和总入口。
- 每个后续 `ACP-*` 模块能在 3 分钟内定位对应证据。
- 关键判断都有路径证据或明确标注为推断。

---

### ACP-01：多模态节点 Taxonomy 与节点注册规范

优先级：P0  
类型：Shared Types / Canvas / Frontend Architecture

#### 背景

AI-CanvasPro 的产品认知建立在清晰节点族上：源节点、AI 生成节点、媒体编辑节点、分镜节点、3D/360 节点、注释/组节点。guga-flow 目前的 `CanvasNodeType` 更偏小说到视频业务节点，缺少节点族、能力标签和注册层。

#### 工作范围

- 定义 guga-flow 自己的节点族：business、source media、AI generation、media operation、layout/helper、advanced visual。
- 为节点定义能力标签：acceptsText、acceptsImage、acceptsVideo、acceptsAudio、producesAsset、producesText、hasPreview、hasTask。
- 扩展 toolbar / inspector / node card，让用户能按节点族添加和理解节点。
- 保留现有 `novel`、`scene`、`shot`、`character_asset`、`location_asset`、`style_asset`、`prop_asset`、`image`、`video`、`editor_package`、`note`。

#### 非目标

- 不复制 AI-CanvasPro 的 node class、renderer 或样式。
- 不一次性实现所有进阶节点。

#### 完成信号

- shared types 中能表达节点族和能力标签。
- 前端添加节点入口按业务/源媒体/AI/媒体/辅助分组。
- Inspector 能根据节点族显示基础状态和缺失能力提示。

---

### ACP-02：源文本 / 图像 / 视频 / 音频节点与拖拽入画布

优先级：P1  
类型：Canvas / Assets / Frontend / Backend

#### 背景

AI-CanvasPro 支持把图片、视频、音频文件拖进画布并自动创建源节点。guga-flow 有资产库和业务节点，但画布拖拽导入、源媒体节点和 Asset 绑定体验还不完整。

#### 工作范围

- 支持文本、图片、视频、音频拖入画布。
- 文件先入库为 `Asset`，再创建对应源节点或业务节点。
- 节点 data 记录 asset id、mime、尺寸、时长、来源和导入方式。
- 拖拽失败、重复文件、超限文件有可读提示。
- 源节点能作为 AI 节点、Shot、Character、Location 的上游引用。

#### 非目标

- 不把原始文件只存在浏览器内存。
- 不跳过后端 storage 和 Asset 权限边界。

#### 完成信号

- 用户把图片/视频/音频拖进画布后能看到源节点和预览。
- 源节点可绑定到业务节点或 AI 生成节点。
- 有 asset upload、canvas node creation 和拖拽 UI tests。

---

### ACP-03：节点端口、输入槽和连接策略

优先级：P1  
类型：Canvas / Shared Types / UX

#### 背景

AI-CanvasPro 的连线表达“上游结果进入下游节点”。guga-flow 已有语义边，但缺输入槽、媒体类型限制、数量限制和模型能力提示。随着 AI text/audio/video 节点增加，自由连线会变得含糊。

#### 工作范围

- 在 `CanvasEdge.dataJson` 或 shared edge contract 中记录 slot、input kind、input role、order 和 accepted count。
- 定义节点输入策略：哪些节点接受 text/image/video/audio，必需或可选，最大数量。
- 连接时做前端即时提示，保存时后端二次校验。
- 连接错误给出可读消息：类型不匹配、数量超限、模型不支持、跨画布页边界不允许。

#### 非目标

- 不替换现有 `CanvasEdgeRelation`。
- 不把所有连线都改成通用 workflow DAG；guga-flow 仍以业务关系为主。

#### 完成信号

- AI 图像/视频/文本/音频节点能解析上游引用。
- 错误连接不会写入坏的业务事实。
- prompt composer / generation job 能读取 slot 化引用。

---

### ACP-04：AI 文本节点和 `@` 节点引用

优先级：P1  
类型：LLM / Canvas / Frontend / Worker

#### 背景

AI-CanvasPro 的 AI 文本节点支持多轮和引用其他节点结果。guga-flow 有 ScriptDraft、Agent、prompt composer 和 LLM provider 方向，但没有通用画布 AI 文本节点。

#### 工作范围

- 创建 AI 文本节点类型或 text-generation node mode。
- 支持引用上游文本、图片 caption、Shot 描述、Character/Location metadata。
- 输出可保存为节点文本、ScriptDraft 段落、document Asset 或 prompt preset。
- 支持流式状态或 `GenerationJob` 任务式输出，按当前系统选择一种 MVP 路径。
- 失败、取消、重试进入任务中心。

#### 非目标

- 不做 chat-only 产品。
- 不让浏览器直连 LLM provider。
- 不把完整 prompt 或 secret 默认暴露到诊断 UI。

#### 完成信号

- 用户可在画布放置 AI 文本节点，从上游节点取上下文并生成文本。
- 生成结果可被下游图像/视频/脚本/分镜流程引用。
- 有 LLM provider mock、backend/worker 和 UI tests。

---

### ACP-05：AI 音频 / TTS 节点

优先级：P1  
类型：Audio / Provider / Canvas / Assets

#### 背景

AI-CanvasPro 有 AI 音频节点和源音频节点。guga-flow 已有 audio Asset 类型、voice reference、background music、shot audio 和 TFR-18 音频绑定计划，但缺通用 AI 音频生成节点。

#### 工作范围

- 定义 AI 音频节点和源音频节点的数据结构。
- 支持 text-to-speech、voice reference、background music 或 narrator audio 的 MVP 子集。
- 生成音频必须创建 `GenerationJob` 和 audio `Asset`。
- 音频结果可绑定到 Character、Shot、Video、EditorExport manifest。

#### 非目标

- 不一次性支持所有音频模型和音频编辑效果。
- 不让浏览器持有音频 provider key。

#### 完成信号

- 用户能从文本或角色语音参考生成音频。
- 音频 Asset 能在画布节点和 export manifest 中被引用。
- 失败、取消、重试路径和测试覆盖完整。

---

### ACP-06：AI 视频节点模式矩阵

优先级：P1  
类型：Video / Provider / Canvas / UX

#### 背景

AI-CanvasPro 的视频节点覆盖文生视频、图生视频、多参考输入和 provider-specific mode。guga-flow 已有视频 provider、reference media 和 video nodes，但节点 UI 上还缺统一模式矩阵和能力解释。

#### 工作范围

- 为 AI 视频节点提供模式选择：text-to-video、image-to-video、first/last frame、reference video、reference audio。
- 将 provider/model capabilities 映射为可用或禁用状态。
- 在节点中显示必需输入和缺失输入。
- 创建任务时写入 typed video reference media。

#### 非目标

- 不硬编码单个 provider 的 UI。
- 不把不支持的 provider mode 伪装成可用。

#### 完成信号

- 用户在 Video/Shot/Image 节点上能看到当前 provider 支持的生成模式。
- 任务 input 明确记录参考媒体角色。
- 不支持的组合在前端和后端都被拒绝并给出可读错误。

---

### ACP-07：Prompt Preset Library

优先级：P1  
类型：Prompt / SkillTemplate / Settings / Canvas

#### 背景

AI-CanvasPro 有按节点类型保存的 prompt preset，并支持缩略图和触发模式。guga-flow 已有 `SkillTemplate`、prompt composer 和 skill settings，但还缺面向画布节点的 preset library 体验。

#### 工作范围

- 复用 `SkillTemplate` 或明确建立 prompt preset 与 skill template 的映射。
- 支持节点类型分类：ai-image、ai-text、ai-video、ai-audio、story、production。
- 支持描述、缩略图、触发模式：insert prompt 或 direct generate。
- preset 注入 prompt composer debug parts，并记录版本。

#### 非目标

- 不新增任意代码执行。
- 不复制 AI-CanvasPro prompt 文件或缩略图。

#### 完成信号

- 用户能保存、选择、搜索 prompt preset。
- 节点生成面板可从 preset 插入或触发。
- preset 版本和诊断可见。

---

### ACP-08：跨媒体任务中心与任务恢复

优先级：P1  
类型：GenerationJob / Frontend / Operations

#### 背景

AI-CanvasPro 有 TaskCenterManager 和本地 media task queue。guga-flow 已有 `GenerationJob`、SSE 和 generation actions，但缺集中任务中心来查看 image/text/video/audio/workflow/local media/editor export。

#### 工作范围

- 建立项目级 task center UI。
- 任务分类：LLM/text、image、video、audio、workflow、local media、editor export、agent。
- 支持状态筛选、详情、错误、trace id、source node、output asset、重试、取消、清理。
- SSE 更新只作为显示通道，真实状态来自后端任务记录。

#### 非目标

- 不新增平行任务表来替代 `GenerationJob`。
- 不把 worker 内部日志全文暴露给普通用户。

#### 完成信号

- 用户可以从一个入口看到所有异步生产任务。
- 失败任务有可读原因、重试入口和关联节点定位。
- 任务中心 UI 有前端测试，后端 summary/list API 有测试。

---

### ACP-09：本地媒体处理 Job 基础

优先级：P1  
类型：Worker / Assets / Media Processing

#### 背景

AI-CanvasPro 本地服务包含视频裁剪、音频裁剪、音频合成、视频合成、视频反转、音画分离、视频元数据、视频首帧和分镜帧提取。guga-flow 当前有媒体 Asset 和 editor export，但媒体处理能力很薄。

#### 工作范围

- 定义 `local_media_processing` 或更细分的 GenerationOperation。
- 先选择少量高价值 MVP：video meta、first frame、audio cut 或 video cut。
- 处理结果写入 `Asset.metadataJson` 或创建新 Asset。
- 支持 mock executor，不让 CI 依赖真实 ffmpeg。
- 真正启用 ffmpeg 前必须有安全路径、资源限制和超时策略。

#### 非目标

- 不在浏览器运行 ffmpeg。
- 不一次性实现完整剪辑器。
- 不处理任意服务器路径。

#### 完成信号

- 至少一条媒体处理链路从 Video/Audio Asset 发起，完成后写回 Asset/节点。
- 失败有任务记录和错误信息。
- mock path 与真实 path 边界清楚。

---

### ACP-10：MediaClip 节点 / 轻量时间线

优先级：P1  
类型：Canvas / Editor Export / Media UX

#### 背景

AI-CanvasPro 的 `MediaClipNode` 是高连接度核心节点，承载素材片段、trim、音频 lane 和预览。guga-flow 已有 EditorExport 和 TFR-22 视频轨道方向，但还缺画布内轻量 MediaClip 节点。

#### 工作范围

- 定义 MediaClip node data：素材列表、片段区间、音频引用、主版本、导出状态。
- 支持选择 Video/Audio/Image Asset 加入 clip。
- 支持轻量 trim metadata，不必立即生成裁剪文件。
- 与 EditorExport timeline manifest 合流。
- 可从 Shot/Video 节点创建 MediaClip 节点。

#### 非目标

- 不做完整非线性剪辑器。
- 不做复杂转场、字幕、音频混音和逐帧编辑。

#### 完成信号

- 用户能在画布中管理一个镜头或片段的媒体组合。
- MediaClip 可导出到 editor package 或生成处理 job。
- Clip metadata 与 Asset/VideoNode/ShotNode 可追溯。

---

### ACP-11：分镜网格 / Storyboard Media Board 节点

优先级：P1  
类型：Canvas / Storyboard / Assets

#### 背景

AI-CanvasPro 有分镜节点，把多张图排成分镜或宫格。guga-flow 有 StoryboardDraft、Shot、ImageNode 和 storyboard panel，但缺画布内视觉化分镜板节点。

#### 工作范围

- 支持把多个 Shot/Image/Video frame 组织成 grid board。
- board 记录格子顺序、caption、shot id、asset id、状态。
- 可从 storyboard draft 或选中节点生成 board。
- 可把 board 调整回写到 Shot ordering 或 Canvas layout。

#### 非目标

- 不替代业务 Shot 表达。
- 不把 board 当作唯一分镜事实源。

#### 完成信号

- 用户可在画布中看到一组镜头的视觉分镜板。
- 分镜板能定位到原 Shot/Image/Video 节点。
- 导出时可包含 storyboard board 摘要或图片。

---

### ACP-12：场景检测与分镜帧提取

优先级：P2  
类型：Worker / Video Analysis / Assets

#### 背景

AI-CanvasPro 的本地媒体服务能从视频中提取 storyboard frames，并有 scene detection node。guga-flow 目前没有视频镜头检测或帧提取工作流。

#### 工作范围

- 从 Video Asset 创建 scene/frame extraction job。
- 输出 frame Assets、scene segment metadata 和可选 Storyboard board。
- 支持 exact count、auto count 或 scene-based 三种策略中的 MVP 子集。
- 记录源视频、时间戳、帧文件、失败原因。

#### 非目标

- 不做实时视频分析。
- 不强依赖 pySceneDetect 或特定库，plan 阶段再定技术选择。

#### 完成信号

- 用户能从视频生成分镜帧 Asset。
- 帧可以进入画布、prompt context 或 editor export。
- 边界条件：超短视频、无视频流、超大文件、失败重试都有策略。

---

### ACP-13：360 全景节点

优先级：P2  
类型：Canvas / Advanced Visual

#### 背景

AI-CanvasPro 有 360 全景图节点，用于生成或查看沉浸式全景图像。guga-flow 当前没有全景节点。

#### 工作范围

- 定义 panorama node data 和 Asset purpose/metadata。
- 支持全景图预览、基本视角记录、注释、导出。
- 可作为 Shot/Location 的参考素材。
- 如果涉及 360 生成 provider，必须走 provider capability 和 `GenerationJob`。

#### 非目标

- 不做全景商业模型专用协议。
- 不做 VR 播放器或复杂全景编辑。

#### 完成信号

- 全景 Asset 可在画布中以专用节点查看和引用。
- 节点记录视角、来源和绑定关系。

---

### ACP-14：3D 导演台节点

优先级：P2  
类型：Three.js / Canvas / Advanced Visual

#### 背景

AI-CanvasPro 有 3D 导演台节点，支持场景布局和截图。guga-flow 可借鉴“用 3D 场景辅助镜头构图”的产品行为，但必须用独立实现。

#### 工作范围

- 单独规划 Three.js 受控 MVP。
- 支持基础对象、相机、光源、背景、截图。
- 截图写入 Image Asset 并回流 ImageNode / Shot reference。
- 场景 JSON 必须 versioned，并有大小限制。

#### 非目标

- 不做完整 3D 建模器。
- 不导入不受控脚本或任意外部模型格式，除非后续单独评估。

#### 完成信号

- 3D 节点能在桌面和移动 viewport 非空渲染并可截图。
- 截图作为 Asset 入库，保留来源 3D scene id。
- 有 Playwright 截图和 canvas pixel 非空验证。

---

### ACP-15：缩略图、衍生图和 Original / Display 映射

优先级：P1  
类型：Assets / Storage / Frontend

#### 背景

AI-CanvasPro 的 media file service 会生成 image derivative、thumbnail、display/original local path。guga-flow 已有 Asset metadata 和部分 image edit primitive，但缩略图/显示图/原图策略还不系统。

#### 工作范围

- 为 Asset metadata 定义 original、display、thumbnail、derivatives。
- 图片/视频上传或生成后可异步生成缩略图。
- 衍生图必须记录来源、尺寸、格式和重建策略。
- 前端 asset library、canvas node preview 和 export 使用统一 preview resolver。

#### 非目标

- 不暴露服务器绝对路径。
- 不把缩略图当作唯一原始资产。

#### 完成信号

- 大图/视频在列表和画布中有稳定缩略图。
- 原图缺失、衍生图缺失、重建失败有可恢复提示。
- Asset tests 覆盖 derivative metadata。

---

### ACP-16：项目包导入导出与恢复快照

优先级：P1  
类型：Project / Canvas / Import Export / Recovery

#### 背景

AI-CanvasPro 支持项目 JSON、项目包、恢复快照和最近项目。guga-flow 已有项目、画布片段和 export package，但缺完整项目级迁移包和恢复快照。

#### 工作范围

- 定义 guga-flow project package schema：project metadata、canvas pages、nodes、edges、assets manifest、settings、skills/workflows references。
- 支持导出 zip/json manifest 和导入验证。
- 支持 recovery snapshot：未保存画布状态、最近成功 autosave、导入失败恢复点。
- 最近项目在 Web 中可解释为最近打开/最近编辑项目列表。

#### 非目标

- 不兼容 AI-CanvasPro JSON。
- 不打包 secret、provider key 或本地绝对路径。

#### 完成信号

- 项目包可导出、导入到新项目并重映射资源。
- 导入失败不创建半坏项目。
- 恢复快照能帮助用户找回未完成编辑。

---

### ACP-17：项目内多画布页 / Canvas Tabs

优先级：P1  
类型：Canvas / Data Model / Frontend

#### 背景

AI-CanvasPro 一个项目可以有多个画布页面，适合把人物设定、场景设定、视频生成等内容分开。guga-flow 当前 `CanvasDocument` 对 project 是 unique，天然偏单画布。

#### 工作范围

- 评估从 single CanvasDocument 到 multi-page 的迁移路径。
- 定义 page title、sort order、active page、跨页引用规则。
- 保留老项目兼容：默认 page 等价现有画布。
- 前端支持 canvas tabs 和 page-level autosave。

#### 非目标

- 不做多人实时协作。
- 不允许跨页语义边在没有清楚 UX 的情况下静默创建。

#### 完成信号

- 一个项目可创建多页画布。
- 旧项目打开后自动进入默认页。
- 节点、边、asset 引用和导出行为有明确 page 边界。

---

### ACP-18：诊断中心与安全事件日志

优先级：P1  
类型：Observability / Settings / Backend

#### 背景

AI-CanvasPro 把 request failure、media task failure、Electron diagnostics 串到 `logDiagnosticEvent`。guga-flow 目前有 provider/programmable diagnostics，但缺跨 provider/media/task 的用户可见诊断中心。

#### 工作范围

- 定义安全诊断事件：trace id、project id、task id、surface、category、severity、safe message、timestamp。
- 记录 provider failure、media processing failure、workflow validation failure、import failure、desktop adapter failure。
- 设置中心提供诊断列表、详情和复制 safe report。
- 默认不记录 raw prompt、secret header、完整 provider response、本地绝对路径。

#### 非目标

- 不替代服务端日志系统。
- 不把敏感调试内容暴露给普通用户。

#### 完成信号

- 用户能定位“哪个任务、哪个 provider、为什么失败、下一步怎么办”。
- 诊断事件可按 trace id 关联到任务中心。
- 安全快照测试证明 secret/path 不泄露。

---

### ACP-19：Provider 错误解析和模型输入策略矩阵

优先级：P1  
类型：Provider / Shared Contracts / UX

#### 背景

AI-CanvasPro 有 provider-specific error parser、model registry、model input policy 和能力判断。guga-flow 已有 provider discovery 和 programmable provider，但还需要统一错误解析和输入策略来支撑多模态节点。

#### 工作范围

- 定义 provider error taxonomy：auth、quota、rate limit、bad input、unsupported model、upstream timeout、safety block、unknown。
- provider adapters 输出 normalized error。
- model capability matrix 描述输入类型、数量、尺寸、时长、输出类型、异步/同步。
- 节点生成 UI 根据 matrix 禁用不可用模式。

#### 非目标

- 不复制 AI-CanvasPro error parser 源码。
- 不要求一次覆盖所有第三方 provider。

#### 完成信号

- 常见 provider 失败能转成用户可读错误。
- 不支持的 input combination 在发起任务前被提示。
- backend/provider-contract/frontend tests 覆盖 good/bad cases。

---

### ACP-20：远程 URL 素材保存、去重和受控本地导入

优先级：P2  
类型：Assets / Storage / Security

#### 背景

AI-CanvasPro 支持保存远程输出、本地 uploads/assets/output 路径、URL 去重和本地媒体导入。guga-flow 当前更偏普通上传和生成结果保存，远程 URL 保存和本地路径授权还需单独设计。

#### 工作范围

- 支持从远程 URL 保存素材，后端下载并写入 Asset。
- 基于 hash 或 canonical URL 做去重。
- 本地导入仅限用户授权目录或 server configured storage roots。
- 记录来源 URL、导入时间、mime、大小、hash 和安全扫描结果。

#### 非目标

- 不做浏览器插件。
- 不扫描用户任意本地路径。
- 不把 URL 或路径中的 token 暴露到 UI 或日志。

#### 完成信号

- URL 导入和本地授权导入都能创建 Asset。
- 重复导入返回已有 Asset 或明确策略。
- SSRF、路径穿越、超大文件和下载失败有测试。

---

### ACP-21：快捷键和画布偏好设置

优先级：P2  
类型：Frontend / Settings / UX

#### 背景

AI-CanvasPro 支持用户快捷键配置，使用说明中列出 `Ctrl+S`、撤销/重做、删除、适应画布等常用操作。guga-flow 已有部分快捷键和 productivity controls，但缺统一设置和冲突管理。

#### 工作范围

- 建立 shortcut registry。
- 设置中心显示和修改常用快捷键。
- 支持冲突检测、恢复默认、导出/导入。
- 画布偏好包括网格、吸附、小地图、默认缩放或节点默认尺寸等。

#### 非目标

- 不让快捷键配置影响输入框、contenteditable 或系统保留快捷键。
- 不一次性覆盖所有编辑器动作。

#### 完成信号

- 用户能查看/修改常用画布快捷键。
- 快捷键冲突可见。
- 核心快捷键有测试。

---

### ACP-22：桌面 / 本地包装桥接评估

优先级：P2  
类型：Architecture Decision / Desktop Adapter

#### 背景

AI-CanvasPro 的桌面壳提供项目包、本地文件、截图、剪贴板、web preview、更新和 secure settings。guga-flow 已有 `docs/plans/2026-06-13-033-feat-desktop-local-packaging-decision-plan.md` 与 Infinite-Canvas local platform 决策，但还需要把 AI-CanvasPro 的桌面能力拆成独立 adapter 候选。

#### 工作范围

- 梳理 desktop-only 能力：项目包、恢复快照、文件选择、截图、剪贴板、web preview、secure settings、通知、更新。
- 分类为 Web 可做、服务端可做、桌面 adapter 可做、明确不做。
- 明确 Tauri/Electron/Web wrapper 的安全边界和数据流。
- 与 ACP-16、ACP-20、ACP-23、ACP-24 对齐。

#### 非目标

- 不直接创建 Electron app。
- 不复制 AI-CanvasPro IPC 或 preload。

#### 完成信号

- 有 AI-CanvasPro-specific desktop bridge 决策文档。
- 每项桌面能力都有 owner 模块和进入/排除理由。

---

### ACP-23：Secure Local Settings / Trusted Credential Store

优先级：P2  
类型：Security / Desktop Adapter / Settings

#### 背景

AI-CanvasPro 桌面壳有 secure settings IPC。guga-flow 当前 Web 架构应继续由服务端保存 provider secrets，但未来桌面包装可能需要可信本地凭证存储。

#### 工作范围

- 明确 Web 模式和 desktop 模式的 secret boundary。
- 如果进入桌面 adapter，设计 trusted credential store 抽象。
- Secret 不进入 renderer state、browser DTO、job JSON、日志。
- 支持迁移、删除、测试连接和 safe mask。

#### 非目标

- 不在普通 Web localStorage 保存 provider key。
- 不允许 renderer 直接读取明文 key。

#### 完成信号

- Web 模式 secret 边界不变。
- 桌面模式若启用，有独立 threat model 和测试。

---

### ACP-24：截图、Web Preview 和网页素材采集

优先级：P2  
类型：Desktop Adapter / Browser Capture / Assets

#### 背景

AI-CanvasPro 桌面壳暴露截图、web preview、capture display、remote asset import 等能力。guga-flow 当前没有这类素材采集入口。

#### 工作范围

- 评估是否需要网页预览节点或截图导入。
- 用户授权后截图或网页预览输出为 Asset。
- 记录来源、时间、权限和删除策略。
- 高风险场景如登录页面、隐私内容、跨域内容必须有限制和提示。

#### 非目标

- 不做静默屏幕录制。
- 不抓取用户未授权网页。
- 不绕过网站访问控制。

#### 完成信号

- 截图/预览素材能进入 Asset 和画布节点。
- 权限和来源信息可见。
- 失败和撤销路径可用。

---

### ACP-25：订阅门禁、商业授权和自动热更新排除治理

优先级：PX  
类型：Scope Governance

#### 背景

AI-CanvasPro 包含订阅 gate、CDKey、设备标识、更新检查和下载安装相关代码。guga-flow 当前产品目标不包含这些能力，且复制会带来 license、隐私和平台风险。

#### 工作范围

- 在本文和后续 requirements 中明确排除订阅/会员/商业门禁。
- 自动更新仅允许作为版本信息或发布链接讨论，不做自更新。
- 若未来用户明确要求商业化或桌面更新，必须另开 product brainstorm。

#### 非目标

- 不实现 subscription client、device id、CDKey、hot update。
- 不复制 update installer 或商业授权文本。

#### 完成信号

- 后续 `ACP-*` plan 不引用 subscription/update 源码。
- 桌面/本地包装文档明确只讨论安全 adapter，不讨论商业 gate 迁移。

---

## 7. 与已有 IC / TFR 模块的去重映射

| AI-CanvasPro 任务 | 已有相邻模块 | 去重处理 |
| --- | --- | --- |
| ACP-07 Prompt preset library | IC-09、TFR-08 | 复用 `SkillTemplate`，只补缩略图、触发模式、节点类型入口 |
| ACP-09 本地媒体处理 | IC-10、TFR-20 | IC-10 只覆盖图片编辑原语；ACP-09 专注视频/音频处理 job |
| ACP-10 MediaClip 节点 | TFR-22、Phase 11 EditorExport | 不做完整剪辑器；只做画布片段组织和 export manifest 桥接 |
| ACP-11 分镜网格节点 | TFR-19、storyboard panel | 不替代 Shot/StoryboardDraft；只做视觉 board |
| ACP-15 缩略图/衍生图 | IC-03、IC-10 | 补 Asset preview resolver 和 derivative metadata，不重复素材标签/批量操作 |
| ACP-16 项目包 | IC-08、EditorExport | IC-08 是 canvas fragment；ACP-16 是 project package/recovery |
| ACP-18 诊断中心 | provider diagnostics、programmable provider | 扩展为跨 provider/media/import/desktop-like 诊断，不替代 service logs |
| ACP-19 错误解析/输入策略 | IC-01、IC-02、programmable provider | 补 normalized error taxonomy 和 model input policy |
| ACP-22 桌面桥接 | TFR-27、IC-12/13/14/15 | 只补 AI-CanvasPro 桌面能力拆分，不直接实现 Electron |

---

## 8. 后续研究建议

每次进入一个 `ACP-*` 模块前，按以下顺序补证据：

1. 先读本文和 `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md`。
2. 再读 `docs/research/video-ref/repomix/ai-canvaspro-token-tree.txt` 判断成本。
3. 根据模块选择 topic pack：
   - 节点/画布：`docs/research/video-ref/repomix/ai-canvaspro-focused-canvas-nodes.xml`
   - provider/task：`docs/research/video-ref/repomix/ai-canvaspro-focused-provider-tasks.xml`
   - project/desktop：`docs/research/video-ref/repomix/ai-canvaspro-focused-project-desktop.xml`
4. 如果行为会进入 requirements、plan 或 tests，再打开 AI-CanvasPro 原始文件的窄片段验证。
5. 用 `Fact`、`Inference`、`Pending Verification` 标注结论。
6. 如果继续读源码只是在增加参考项目细节，不会改变 guga-flow，则停止。

---

## 9. 关键证据索引

AI-CanvasPro：

- `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md`：source boundary、architecture map、borrowable ideas、do-not-copy。
- `docs/research/video-ref/graphs/ai-canvaspro/GRAPH_REPORT.md`：Graphify corpus、god nodes、surprising connections。
- `docs/research/video-ref/graphs/ai-canvaspro/queries/canvas-node-flow.txt`：MediaClip、registry、renderer、project lifecycle 导航。
- `docs/research/video-ref/graphs/ai-canvaspro/queries/provider-task-flow.txt`：provider API、Dreamina、diagnostics、media task 导航。
- `docs/research/video-ref/graphs/ai-canvaspro/queries/project-desktop-flow.txt`：project desktop、media file、recovery、package 导航。
- `docs/research/video-ref/repomix/ai-canvaspro-token-tree.txt`：文件规模和 topic slice 成本。
- `docs/research/video-ref/repomix/ai-canvaspro-focused-canvas-nodes.xml`：README、使用说明、节点类型、项目保存、基础操作。
- `docs/research/video-ref/repomix/ai-canvaspro-focused-provider-tasks.xml`：provider/task/error/task center 入口索引。
- `docs/research/video-ref/repomix/ai-canvaspro-focused-project-desktop.xml`：project package、Electron preload、local file、recovery、desktop service 入口。

guga-flow：

- `docs/infinite-canvas-video-long-task-development-flow.md`：全局流程、信息源优先级和架构红线。
- `docs/infinite-canvas-reference-long-task-development-flow.md`：Infinite-Canvas provider/workflow/素材专项清单。
- `docs/toonflow-reference-long-task-development-flow.md`：Toonflow Agent/脚本/分镜/设置专项清单。
- `apps/backend/prisma/schema.prisma`：核心业务模型、provider/workflow/asset/canvas/job/export/skill/agent memory。
- `packages/shared-types/src/domain/canvas.ts`：canvas node/edge shared contract。
- `packages/shared-types/src/domain/generation.ts`：generation/provider/editor export shared contract。
- `packages/shared-types/src/domain/assets.ts`：Asset 相关 shared contract。
- `apps/backend/src/generation/generation.service.ts`：GenerationJob 创建、完成、失败、重试和 graph side effects。
- `apps/backend/src/assets/assets.service.ts`：Asset、collection、tag、batch、edit primitive。
- `apps/backend/src/editor-exports/editor-exports.service.ts`：editor package workflow。
- `apps/backend/src/workflows/workflows.service.ts`：workflow definition/version/run。
- `apps/frontend/src/components/canvas/project-canvas-workspace.tsx`：画布工作台组合。
- `apps/frontend/src/components/canvas/generation-actions.tsx`：节点生成动作。
- `apps/frontend/src/components/projects/asset-library.tsx`：素材库 UI。
- `apps/frontend/src/components/projects/settings-center.tsx`：settings center。


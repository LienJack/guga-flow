# Codex 参考项目长任务执行清单

> 版本：2026-06-14  
> 状态：completed  
> 输入来源：`docs/toonflow-reference-long-task-development-flow.md`、`docs/ai-canvaspro-reference-long-task-development-flow.md`  
> 目标项目：`guga-flow`  
> 固定模块循环：`ce-brainstorm` -> `ce-plan` -> `ce-work` -> `ce-code-review` -> `ce-compound`

本文把 Toonflow 和 AI-CanvasPro 两份参考能力清单合并为一条给 Codex 长期执行的队列。它不替代两份源文档；源文档继续保存完整背景、范围边界和证据索引。本文只负责回答一个问题：**Codex 下一步应该按什么顺序把这些缺口变成可执行模块，并避免重复开工。**

---

## 0. 使用方式

每次恢复长任务时，Codex 按这个顺序读：

1. `docs/infinite-canvas-video-long-task-development-flow.md`
2. 本文
3. 当前 `CEX-*` 执行卡引用的源模块：
   - `docs/toonflow-reference-long-task-development-flow.md`
   - `docs/ai-canvaspro-reference-long-task-development-flow.md`
4. 相关 `docs/research/video-ref/` context pack
5. 现有 `docs/brainstorms/*requirements.md`
6. 现有 `docs/plans/*plan.md`
7. 当前代码和测试

执行规则：

- 一次只执行一个 `CEX-*` 执行卡，除非卡内明确要求拆成多个子模块。
- 每个 `CEX-*` 必须先查找是否已有对应 requirements / plan。已有且仍匹配时，更新或继续；没有时，新建。
- 每个 `CEX-*` 都必须经过固定循环：`ce-brainstorm` -> `ce-plan` -> `ce-work` -> `ce-code-review` -> `ce-compound`。
- 源文档中的 `TFR-*`、`ACP-*` 是产品范围来源；本文中的 `CEX-*` 是执行编排来源。
- 不复制 Toonflow 或 AI-CanvasPro 的源码、素材、prompt、品牌、license 文本、Electron IPC、订阅门禁、自动更新实现。
- 所有实现继续遵守 guga-flow 的 canvas-first、worker-first、secret-safe、mock-first、typed contracts 原则。

命名建议：

```text
docs/brainstorms/YYYY-MM-DD-NNN-cex-<id>-<slug>-requirements.md
docs/plans/YYYY-MM-DD-NNN-feat-cex-<id>-<slug>-plan.md
docs/solutions/<category>/<learning-slug>-YYYY-MM-DD.md
```

如果某个 `CEX-*` 更适合沿用已有 `TFR-*` 或 `ACP-*` 文件名，可以沿用已有命名，但 requirements / plan 中必须反向引用本文对应的 `CEX-*`。

---

## 1. 合并原则

| 原则 | 执行要求 |
| --- | --- |
| 先底座后体验 | Auth、LLM provider、Agent deploy、node taxonomy、input slots 先于真实 Agent 和复杂媒体节点 |
| 去重合并 | `TFR-26` 和 `ACP-08` 任务中心合并；`TFR-22` 和 `ACP-10` 视频轨道/MediaClip 合并；类似项不重复开工 |
| 业务事实优先 | 新 UI 不能绕过 `CanvasNode`、`CanvasEdge`、`Asset`、`GenerationJob`、`ScriptDraft`、`NovelEventGraph` |
| 源参考分工 | Toonflow 提供短剧生产和 Agent 工作台证据；AI-CanvasPro 提供多模态节点、本地媒体、项目包和诊断证据 |
| 平台能力后置 | 桌面、本地文件、截图、web preview、secure local store、3D/360 放到 P2，不能阻塞 Web MVP |
| 安全不让步 | provider key、Agent key、本地路径、授权码、设备标识、raw secret 不进入浏览器 DTO、job JSON、日志或测试快照 |

---

## 2. 总体执行波次

| 波次 | 目标 | 执行卡 | 进入下一波的门禁 |
| --- | --- | --- | --- |
| Wave 0 | 证据与边界 | CEX-00 | 参考项目 coverage、license、安全排除项清楚 |
| Wave 1 | 管理与 provider 基础 | CEX-01, CEX-02, CEX-03 | 能登录，能配置 LLM provider，能为 Agent role 解析模型 |
| Wave 2 | 画布多模态基础 | CEX-04, CEX-05, CEX-06, CEX-07, CEX-08, CEX-09, CEX-10 | 源媒体、AI text/audio/video、prompt preset、输入槽可用 |
| Wave 3 | 小说到剧本链路 | CEX-11, CEX-12, CEX-13, CEX-14 | 章节、事件、ScriptAgent 工作区、剧本资产可追踪 |
| Wave 4 | 分镜到视频生产工作台 | CEX-15, CEX-16, CEX-17, CEX-18, CEX-19, CEX-20 | 分镜、视频 prompt、视频轨道、MediaClip、图片/媒体处理闭环可用 |
| Wave 5 | Agent 与任务可见性 | CEX-21, CEX-22, CEX-23 | Agent 流式状态、任务中心、诊断、记忆有可见闭环 |
| Wave 6 | 项目可迁移与设置体验 | CEX-24, CEX-25, CEX-26 | 项目包、多画布页、i18n、快捷键、维护入口稳定 |
| Wave 7 | 平台与高级能力 | CEX-27, CEX-28 | 部署/桌面桥接决策清楚，高级节点有受控 MVP 或明确 defer |

---

## 3. P0 / P1 推荐起跑队列

如果 Codex 需要从今天直接开始，优先执行：

1. `CEX-00` 参考证据与排除项治理
2. `CEX-02` LLM provider、模型能力和错误矩阵
3. `CEX-03` Agent 部署中心
4. `CEX-01` 登录 / 会话
5. `CEX-04` 多模态节点 taxonomy
6. `CEX-06` 节点端口与输入槽
7. `CEX-12` 章节级小说和事件图工作台
8. `CEX-13` ScriptAgent 工作区
9. `CEX-16` 分镜面板和分镜板
10. `CEX-10` AI 视频模式和视频 prompt
11. `CEX-17` 视频轨道和 MediaClip
12. `CEX-22` 任务中心和诊断中心

理由：这条路径先补真实 LLM/Agent 配置，再补画布输入语义，随后把小说、脚本、分镜、视频和任务可见性串起来，最接近 guga-flow 的小说到视频核心闭环。

---

## 4. 执行卡

### CEX-00：参考证据与排除项治理

优先级：P0  
合并来源：`TFR-00`、`ACP-00`、`ACP-25`

#### 目标

把 Toonflow 和 AI-CanvasPro 的参考边界、license 风险、可借鉴行为、不可复制内容和覆盖矩阵固化，避免后续模块重复调研或误复制参考项目实现。

#### Codex 入口

- 源文档：`docs/toonflow-reference-long-task-development-flow.md`、`docs/ai-canvaspro-reference-long-task-development-flow.md`
- 研究入口：`docs/research/video-ref/index.md`、`docs/research/video-ref/source-contract.md`
- AI-CanvasPro context：`docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md`
- Toonflow graph/context：`docs/research/video-ref/graphs/toonflow-app/GRAPH_REPORT.md`

#### 完成门禁

- 有 Toonflow coverage/gaps 文档。
- 有 AI-CanvasPro coverage/gaps 文档。
- 两份 coverage 都标注 `Fact`、`Inference`、`Pending Verification`。
- 明确排除 Electron 1:1 迁移、订阅门禁、自动更新复制、品牌/资源/prompt 复制。

---

### CEX-01：登录、会话与用户边界

优先级：P0  
合并来源：`TFR-01`

#### 目标

补齐单用户优先的登录、密码 hash、JWT/session、受保护 API 和 worker/provider secret 边界，让后续 provider、Agent、项目包和维护入口有安全身份基础。

#### Codex 入口

- 源模块：`TFR-01`
- 相关代码：`apps/backend/prisma/schema.prisma`、`apps/backend/src/projects/*`、`apps/frontend/src/app/*`
- 相关测试目标：backend auth/session tests、frontend login/session tests

#### 完成门禁

- 用户可登录、退出、刷新后保持会话。
- 未登录访问项目 API 返回可预期错误。
- worker trusted token、provider secret endpoint 和普通用户 session 权限分离。
- 不做 RBAC、OAuth、组织管理。

---

### CEX-02：LLM Provider、模型 CRUD、能力矩阵和错误解析

优先级：P0  
合并来源：`TFR-23`、`TFR-24`、`ACP-19`

#### 目标

把 provider 管理从 image/video 扩展到 LLM/text，并建立模型列表、模型能力、输入策略、prompt behavior 绑定和 normalized error taxonomy。

#### Codex 入口

- 源模块：`TFR-23`、`TFR-24`、`ACP-19`
- 已有相邻能力：provider discovery、programmable provider、safe runtime config
- 相关代码：`apps/backend/src/providers/*`、`packages/shared-types/src/domain/generation.ts`、`packages/provider-contracts/src/*`、`apps/frontend/src/components/projects/provider-settings-panel.tsx`

#### 完成门禁

- 用户可配置并测试一个 LLM provider。
- Provider model 可手工添加、删除、禁用、重命名 display name。
- 模型 metadata 能表达 kind、modes、duration、ratio、reference support、prompt template binding。
- Provider 失败统一归类为 auth、quota、rate limit、bad input、unsupported model、timeout、safety block 或 unknown。
- 浏览器 DTO、job JSON、日志不泄露 key 或 raw upstream response。

---

### CEX-03：Agent 部署中心

优先级：P0  
合并来源：`TFR-03`

#### 目标

建立 Agent role 到 provider/model/runtime config 的可审计配置中心，为 ScriptAgent、ProductionAgent、supervision 和子 Agent 提供模型解析能力。

#### Codex 入口

- 源模块：`TFR-03`
- 依赖：`CEX-02`
- 相关代码：`apps/backend/src/agents/*`、`apps/backend/src/providers/*`、`apps/frontend/src/components/projects/settings-center.tsx`

#### 完成门禁

- 设置中心能配置 script、production、universal、supervision、skeleton、adaptation、storyboard、asset、video-prompt 等 role。
- 简易模式支持主 Agent 继承同一模型。
- 高级模式支持子 Agent 独立配置。
- 配置错误时 Agent 不启动，并返回可读错误。

---

### CEX-04：多模态节点 Taxonomy 与节点注册规范

优先级：P0  
合并来源：`ACP-01`

#### 目标

定义 guga-flow 自己的节点族和能力标签，为源媒体节点、AI 生成节点、媒体操作节点、分镜板、MediaClip、3D/360 等后续功能提供 typed foundation。

#### Codex 入口

- 源模块：`ACP-01`
- 相关代码：`packages/shared-types/src/domain/canvas.ts`、`apps/frontend/src/components/canvas/business-node-data.ts`、`apps/frontend/src/components/canvas/business-node-toolbar.tsx`

#### 完成门禁

- shared types 能表达 business、source media、AI generation、media operation、layout/helper、advanced visual。
- 节点能力标签能表达 accepts/producers/preview/task。
- 添加节点入口按节点族分组。
- 不复制 AI-CanvasPro node class、renderer 或样式。

---

### CEX-05：源媒体节点与拖拽入画布

优先级：P1  
合并来源：`ACP-02`

#### 目标

支持文本、图片、视频、音频拖入画布，先入库为 `Asset`，再创建源节点，让上游素材能进入 AI 节点、业务节点和 prompt context。

#### Codex 入口

- 源模块：`ACP-02`
- 依赖：`CEX-04`
- 相关代码：`apps/backend/src/assets/*`、`apps/backend/src/canvas/*`、`apps/frontend/src/components/canvas/canvas-editor.tsx`、`apps/frontend/src/components/projects/asset-library.tsx`

#### 完成门禁

- 文件拖入画布后生成 Asset 和源节点。
- 节点 data 记录 asset id、mime、尺寸、时长、来源和导入方式。
- 拖拽失败、重复文件、超限文件有可读提示。
- 不把原始文件只存在浏览器内存。

---

### CEX-06：节点端口、输入槽和连接策略

优先级：P1  
合并来源：`ACP-03`

#### 目标

在现有语义边基础上补 slot、input kind、input role、order 和数量限制，让多模态节点连接可校验、可解释、可用于 generation input。

#### Codex 入口

- 源模块：`ACP-03`
- 依赖：`CEX-04`、`CEX-05`
- 相关代码：`packages/shared-types/src/domain/canvas.ts`、`apps/backend/src/canvas/*`、`apps/frontend/src/components/canvas/canvas-edge-data.ts`、`apps/frontend/src/components/canvas/semantic-bind-*`

#### 完成门禁

- AI 图像/视频/文本/音频节点能解析上游引用。
- 类型不匹配、数量超限、模型不支持、跨画布页不允许都有可读错误。
- 后端保存时二次校验，错误连接不写入坏业务事实。

---

### CEX-07：Prompt Preset、Skill 索引与归属

优先级：P1  
合并来源：`ACP-07`、`TFR-08`

#### 目标

统一 prompt preset、SkillTemplate、semantic index、Agent attribution 和节点触发模式，避免 prompt library、skill file、Agent skill 注入出现三套系统。

#### Codex 入口

- 源模块：`ACP-07`、`TFR-08`
- 相关代码：`apps/backend/src/skill-templates/*`、`packages/shared-types/src/domain/skills.ts`、`apps/frontend/src/components/projects/skill-template-settings-panel.tsx`

#### 完成门禁

- Preset 可按 ai-image、ai-text、ai-video、ai-audio、story、production、agent 分类。
- Skill 可搜索、归属到 Agent role、启用/禁用并诊断状态。
- Agent prompt 默认只注入匹配 skill summary，必要时通过工具加载全文。
- 不执行任意代码，不复制参考项目 prompt 文件。

---

### CEX-08：AI 文本节点与节点引用

优先级：P1  
合并来源：`ACP-04`

#### 目标

提供画布 AI 文本节点，支持引用上游节点内容，生成结果可作为节点文本、ScriptDraft 段落、document Asset 或后续 prompt context。

#### Codex 入口

- 源模块：`ACP-04`
- 依赖：`CEX-02`、`CEX-04`、`CEX-06`
- 相关代码：`apps/backend/src/generation/*`、`apps/worker/src/*`、`packages/shared-types/src/domain/generation.ts`、`apps/frontend/src/components/canvas/generation-actions.tsx`

#### 完成门禁

- AI 文本节点能从上游 text/caption/Shot/Character/Location 取上下文。
- 输出可持久化并被下游图像、视频、脚本、分镜流程引用。
- 不做 chat-only，不让浏览器直连 LLM provider。

---

### CEX-09：AI 音频 / TTS 与音频自动绑定

优先级：P1  
合并来源：`ACP-05`、`TFR-18`

#### 目标

补齐 AI 音频节点、TTS、voice reference、background music、shot audio 和角色音色自动绑定，使音频进入画布和 editor export manifest。

#### Codex 入口

- 源模块：`ACP-05`、`TFR-18`
- 依赖：`CEX-02`、`CEX-04`
- 相关代码：`packages/shared-types/src/domain/assets.ts`、`apps/backend/src/assets/*`、`apps/backend/src/generation/*`、`apps/backend/src/editor-exports/*`、`apps/frontend/src/components/canvas/node-audio-assets.tsx`

#### 完成门禁

- 用户能上传 voice reference、background music、shot audio。
- 用户能从文本或角色语音参考生成音频 Asset。
- 角色可绑定音色，Shot/Video 可绑定 audio reference。
- Editor export package 包含 audio references。

---

### CEX-10：AI 视频模式矩阵与视频 Prompt 检查

优先级：P1  
合并来源：`ACP-06`、`TFR-21`

#### 目标

统一 AI 视频节点模式、provider/model capability、视频 prompt 生成和 prompt check，让不同模型的 text-to-video、image-to-video、first/last frame、reference audio/video 都有明确输入策略。

#### Codex 入口

- 源模块：`ACP-06`、`TFR-21`
- 依赖：`CEX-02`、`CEX-06`
- 相关代码：`packages/shared-types/src/domain/generation.ts`、`packages/provider-contracts/src/*`、`apps/backend/src/prompt/*`、`apps/frontend/src/components/canvas/generation-actions.tsx`、`apps/frontend/src/components/canvas/shot-prompt-preview.tsx`

#### 完成门禁

- 不同 provider/model 显示不同可用视频模式。
- 缺参考图、缺台词、duration 不合法、mode 不支持时有明确错误。
- `GenerationJob.inputJson` 包含安全、可审计的 prompt debug summary。
- 不硬编码 Toonflow prompt 文本。

---

### CEX-11：项目视觉手册、导演手册和画风库

优先级：P1  
合并来源：`TFR-10`

#### 目标

把项目级视觉手册、导演手册和画风库接入 prompt composer，让项目风格、镜头语言、音频叙事和一致性规则能进入图片/视频/分镜生成。

#### Codex 入口

- 源模块：`TFR-10`
- 相关代码：`apps/backend/src/project-settings/*`、`apps/backend/src/prompt/*`、`apps/frontend/src/components/projects/settings-center.tsx`、`apps/frontend/src/components/canvas/shot-prompt-preview.tsx`

#### 完成门禁

- 设置中心可编辑项目视觉/导演手册。
- Shot prompt 能显示项目、节点和素材来源。
- 导出包可携带手册摘要。

---

### CEX-12：章节级小说管理和事件图工作台

优先级：P1  
合并来源：`TFR-11`

#### 目标

把长篇小说拆成章节，提供章节列表、章节状态、单章/批量事件提取和事件到 ScriptDraft/Shot 的来源关系。

#### Codex 入口

- 源模块：`TFR-11`
- 相关代码：`apps/backend/src/novels/*`、`packages/shared-types/src/domain/novel-events.ts`、`apps/frontend/src/components/novels/*`

#### 完成门禁

- 长篇小说可按章节查看、更新和提取事件。
- 每章事件提取成功/失败状态可见。
- Shot 或 ScriptDraft 可回溯到章节事件。

---

### CEX-13：ScriptAgent 工作区

优先级：P1  
合并来源：`TFR-12`

#### 目标

建立故事骨架、改编策略、剧本草稿的结构化 ScriptAgent 工作区，Agent 输出必须写入 `ScriptDraft` 或等价结构，而不是只返回聊天文本。

#### Codex 入口

- 源模块：`TFR-12`
- 依赖：`CEX-02`、`CEX-03`、`CEX-12`
- 相关代码：`apps/backend/src/agents/*`、`apps/backend/src/novels/*`、`packages/shared-types/src/domain/script.ts`、`apps/frontend/src/components/novels/*`

#### 完成门禁

- 用户能从 Novel/EventGraph 生成 script workspace。
- storySkeleton、adaptationStrategy、script 可编辑、保存、导出和版本化。
- 可选择 ScriptDraft 进入 storyboard 生成。

---

### CEX-14：剧本资产提取和衍生资产变体

优先级：P1  
合并来源：`TFR-13`、`TFR-16`

#### 目标

从 ScriptDraft 提取角色、场景、道具资产，并支持 parent/child variant、状态变体、selected version 和 prompt composer 选择。

#### Codex 入口

- 源模块：`TFR-13`、`TFR-16`
- 依赖：`CEX-13`
- 相关代码：`apps/backend/src/assets/*`、`apps/backend/src/canvas/*`、`packages/shared-types/src/domain/canvas.ts`、`packages/shared-types/src/domain/assets.ts`

#### 完成门禁

- 提取结果可预览、编辑、去重、合并、导入。
- 导入后与 ScriptDraft 建立来源关系。
- Character/Location/Prop 节点可创建多个视觉变体。
- prompt composer 能选择当前变体。

---

### CEX-15：Production Workspace / flowData 投影

优先级：P1  
合并来源：`TFR-15`

#### 目标

定义 guga-flow production workspace projection，让 script plan、storyboard table、storyboard items、assets 能映射到现有 ScriptDraft、CanvasNode、CanvasEdge、Asset 和 GenerationJob。

#### Codex 入口

- 源模块：`TFR-15`
- 依赖：`CEX-13`、`CEX-14`
- 相关代码：`apps/backend/src/agents/*`、`apps/backend/src/canvas/*`、`apps/frontend/src/components/canvas/project-canvas-workspace.tsx`

#### 完成门禁

- 前端有 production workspace panel。
- Agent 能读取当前 scriptPlan/storyboardTable/storyboard summary。
- 修改后能同步到画布或结构化记录。
- 不新增与画布事实割裂的万能 JSON 仓库。

---

### CEX-16：分镜面板 CRUD 和分镜板节点

优先级：P1  
合并来源：`TFR-19`、`ACP-11`

#### 目标

建立独立分镜面板和画布内 Storyboard Media Board，让 Shot 列表、图片/视频帧、分镜网格、批量编辑和画布定位形成双向同步。

#### Codex 入口

- 源模块：`TFR-19`、`ACP-11`
- 依赖：`CEX-12`、`CEX-15`
- 相关代码：`apps/frontend/src/components/novels/storyboard-editor.tsx`、`apps/frontend/src/components/canvas/project-canvas-workspace.tsx`、`apps/backend/src/canvas/*`

#### 完成门禁

- 用户能在 panel 中新增、编辑、删除、批量新增、批量删除分镜。
- 分镜与 ShotNode 双向同步。
- 删除或重排时 `sequence_next` 和节点数据保持一致。
- 分镜板能定位到原 Shot/Image/Video 节点。

---

### CEX-17：视频轨道工作台和 MediaClip 节点

优先级：P1  
合并来源：`TFR-22`、`ACP-10`

#### 目标

为每个 Shot/StoryboardItem 提供 video track projection，同时提供画布内 MediaClip 节点管理素材片段、候选视频、主版本、duration、音频引用和 editor export 桥接。

#### Codex 入口

- 源模块：`TFR-22`、`ACP-10`
- 依赖：`CEX-10`、`CEX-16`
- 相关代码：`apps/backend/src/editor-exports/*`、`apps/frontend/src/components/canvas/editor-export-actions.tsx`、`packages/shared-types/src/domain/generation.ts`、`packages/shared-types/src/domain/canvas.ts`

#### 完成门禁

- 每个 Shot 能看到多个候选视频。
- 用户可选择主视频，editor export 默认使用主视频。
- MediaClip 可管理素材片段、裁剪区间、音频引用和导出候选。
- 不做完整非线性剪辑器。

---

### CEX-18：分镜图编辑、媒体处理基础和缩略图衍生

优先级：P1  
合并来源：`TFR-20`、`ACP-09`、`ACP-15`

#### 目标

把图片编辑回流、视频/音频本地媒体处理基础、thumbnail/display/original/derivatives 统一为 worker-first 的媒体操作能力。

#### Codex 入口

- 源模块：`TFR-20`、`ACP-09`、`ACP-15`
- 相关代码：`apps/backend/src/assets/*`、`apps/backend/src/generation/*`、`apps/worker/src/*`、`packages/shared-types/src/domain/assets.ts`

#### 完成门禁

- ImageNode 可创建 edit job，结果回流画布并保留 `derived_from`。
- 至少一条媒体处理链路从 Video/Audio Asset 发起，完成后写回 Asset/节点。
- 图片/视频有稳定 thumbnail/display/original metadata。
- 超短视频、无音频流、超大文件、失败重试有策略。

---

### CEX-19：资产 Prompt 润色和资产级生成

优先级：P1  
合并来源：`TFR-17`

#### 目标

支持单个/批量资产 prompt polish、资产图片生成、取消、重试、状态更新和结果写回，避免资产生产只靠手工 prompt。

#### Codex 入口

- 源模块：`TFR-17`
- 依赖：`CEX-02`、`CEX-14`
- 相关代码：`apps/backend/src/generation/*`、`apps/backend/src/assets/*`、`apps/frontend/src/components/projects/asset-library.tsx`

#### 完成门禁

- 用户能选择多个资产运行 prompt polish。
- 任务可取消，失败可见。
- 成功结果可用于后续 image/video generation。

---

### CEX-20：ProductionAgent 编排

优先级：P1  
合并来源：`TFR-14`

#### 目标

让 ProductionAgent 通过受控工具创建或更新 storyboard panel、derived asset、video prompt、generation job 等生产产物，动作可审计、可失败、可撤销或生成修订记录。

#### Codex 入口

- 源模块：`TFR-14`
- 依赖：`CEX-03`、`CEX-15`、`CEX-16`、`CEX-17`
- 相关代码：`apps/backend/src/agents/*`、`apps/backend/src/generation/*`、`apps/backend/src/canvas/*`、`apps/frontend/src/components/canvas/agent-canvas-actions-panel.tsx`

#### 完成门禁

- ProductionAgent 能创建或更新至少一种生产产物。
- 用户能看到工具调用摘要和失败原因。
- 关键动作可 undo 或生成修订记录。
- Agent 不自由写 DB，不直接修改前端状态。

---

### CEX-21：流式 Agent 通道

优先级：P1  
合并来源：`TFR-02`

#### 目标

为 ScriptAgent 和 ProductionAgent 提供流式状态、thinking/status events、tool event summary、stop/cancel 和断线降级能力。

#### Codex 入口

- 源模块：`TFR-02`
- 依赖：`CEX-03`、`CEX-13`、`CEX-20`
- 相关代码：`apps/backend/src/agents/*`、`apps/frontend/src/components/canvas/agent-canvas-actions-panel.tsx`、`apps/backend/src/generation/generation-events.controller.ts`

#### 完成门禁

- 前端可看到 ScriptAgent/ProductionAgent 流式状态。
- 用户可停止正在运行的 Agent。
- 关键 Agent 动作落库，不能只存在流式消息里。
- 断线后能提示并降级到 job polling 或历史记录。

---

### CEX-22：任务中心和安全诊断中心

优先级：P1  
合并来源：`TFR-26`、`ACP-08`、`ACP-18`

#### 目标

建立项目级 task center 和 diagnostics center，集中展示 LLM、image、video、audio、asset analysis、workflow、editor export、Agent、media processing 的状态、错误、trace 和恢复入口。

#### Codex 入口

- 源模块：`TFR-26`、`ACP-08`、`ACP-18`
- 相关代码：`apps/backend/src/generation/*`、`apps/backend/src/editor-exports/*`、`apps/frontend/src/components/canvas/project-canvas-workspace.tsx`、`apps/frontend/src/components/projects/settings-center.tsx`

#### 完成门禁

- 用户能按项目查看所有生产任务。
- 点击任务能定位关联节点/资产/脚本。
- 失败任务有可读 reason、trace id、重试/取消/清理操作。
- 诊断事件不记录 raw secret、raw prompt 默认全文、完整 provider response 或本地绝对路径。

---

### CEX-23：Agent 记忆系统升级

优先级：P2  
合并来源：`TFR-25`

#### 目标

把手工 AgentMemory 升级到 message、summary、manual preference、tool result 等类型，并提供 project/role/context 隔离、summary 策略和可查看/禁用/清空能力。

#### Codex 入口

- 源模块：`TFR-25`
- 依赖：`CEX-20`、`CEX-21`
- 相关代码：`apps/backend/src/agents/*`、`apps/backend/prisma/schema.prisma`、`apps/frontend/src/components/canvas/agent-canvas-actions-panel.tsx`

#### 完成门禁

- Agent 能召回项目偏好和最近上下文。
- 用户能查看、禁用、清空 memory。
- memory 注入 prompt 前有 token 和安全过滤。
- 不默认把所有用户输入永久记忆。

---

### CEX-24：项目包、多画布页和恢复快照

优先级：P1  
合并来源：`ACP-16`、`ACP-17`

#### 目标

定义 guga-flow project package、multi canvas pages、recovery snapshot 和最近项目体验，让项目可以迁移、恢复并按人物设定、场景设定、视频生成等页面组织。

#### Codex 入口

- 源模块：`ACP-16`、`ACP-17`
- 相关代码：`apps/backend/src/projects/*`、`apps/backend/src/canvas/*`、`packages/shared-types/src/domain/canvas-fragments.ts`、`apps/frontend/src/components/canvas/project-canvas-workspace.tsx`

#### 完成门禁

- 项目包可导出、导入到新项目并重映射资源。
- 导入失败不创建半坏项目。
- 一个项目可创建多个 canvas page。
- 旧项目打开后自动进入默认页。
- 不兼容 AI-CanvasPro JSON，不打包 secret/provider key/本地绝对路径。

---

### CEX-25：多语言 UI、快捷键和画布偏好

优先级：P1 / P2  
合并来源：`TFR-09`、`ACP-21`

#### 目标

补齐 zh/en 核心 UI 文案、shortcut registry、快捷键冲突检测、恢复默认、导出/导入和画布偏好设置。

#### Codex 入口

- 源模块：`TFR-09`、`ACP-21`
- 相关代码：`apps/frontend/src/components/*`、`apps/frontend/src/app/*`

#### 完成门禁

- 用户可切换 zh/en。
- dashboard、canvas、asset library、generation、settings、provider、skills、auth 核心文案可切换。
- 用户能查看/修改常用画布快捷键。
- 快捷键冲突可见，输入框和 contenteditable 不受干扰。

---

### CEX-26：存储、数据维护和受控导入

优先级：P2  
合并来源：`TFR-05`、`TFR-06`、`ACP-20`

#### 目标

建立安全的数据维护、项目导出/导入校验、资源统计、orphan cleanup、远程 URL 保存、去重和受控本地导入能力。

#### Codex 入口

- 源模块：`TFR-05`、`TFR-06`、`ACP-20`
- 相关代码：`apps/backend/src/assets/*`、`apps/backend/src/storage/*`、`apps/backend/src/project-settings/*`、`apps/frontend/src/components/projects/settings-center.tsx`

#### 完成门禁

- 用户能导出项目数据并验证导入包。
- 清理操作有 dry run summary 和二次确认。
- URL/本地授权目录导入可创建 Asset。
- SSRF、路径穿越、超大文件和下载失败有测试。
- 不提供裸 SQL，不扫描用户任意路径，不暴露服务器绝对路径。

---

### CEX-27：版本、调试、部署和桌面桥接决策

优先级：P2  
合并来源：`TFR-04`、`TFR-07`、`TFR-27`、`ACP-22`、`ACP-23`、`ACP-24`

#### 目标

把版本信息、AI debug flag、生产部署、桌面/本地包装桥接、secure local settings、截图/web preview 等平台能力拆成安全决策和后续实现入口。

#### Codex 入口

- 源模块：`TFR-04`、`TFR-07`、`TFR-27`、`ACP-22`、`ACP-23`、`ACP-24`
- 相关文档：`docs/plans/2026-06-13-033-feat-desktop-local-packaging-decision-plan.md`、`docs/solutions/tooling-decisions/infinite-canvas-local-platform-decisions-2026-06-14.md`
- 相关代码：`apps/backend/src/health/*`、`apps/backend/src/config/app-config.ts`、`infra/*`

#### 完成门禁

- 设置中心能显示 app/api/build/runtime version。
- AI debug 开关只在开发环境或管理员路径可用，不泄露 secret。
- 有 Web/Nest/Worker/Postgres/Redis 生产部署拓扑、health check、日志、数据目录、asset storage、env var 文档。
- 桌面能力被分类为 Web 可做、服务端可做、桌面 adapter 可做或不做。
- 不直接创建 Electron app，不复制 AI-CanvasPro IPC/preload。

---

### CEX-28：高级节点：场景检测、360 全景和 3D 导演台

优先级：P2  
合并来源：`ACP-12`、`ACP-13`、`ACP-14`

#### 目标

在核心闭环稳定后，规划并实现受控的 scene/frame extraction、panorama node 和 Three.js 3D director node MVP。

#### Codex 入口

- 源模块：`ACP-12`、`ACP-13`、`ACP-14`
- 依赖：`CEX-04`、`CEX-18`
- 相关代码：`apps/frontend/src/components/canvas/*`、`apps/backend/src/generation/*`、`apps/worker/src/*`

#### 完成门禁

- 视频可生成 scene/frame 列表和 frame Assets。
- 全景 Asset 可用专用节点预览、标注和进入 prompt context。
- 3D 节点使用 Three.js，有非空渲染、截图回流 Asset 和 Playwright/canvas pixel 验证。
- 不做完整 3D 建模器、VR 播放器或实时视频分析。

---

## 5. 去重映射

| 合并任务 | 覆盖源模块 | 去重说明 |
| --- | --- | --- |
| CEX-02 | TFR-23, TFR-24, ACP-19 | provider、模型 CRUD、能力矩阵、错误解析统一设计 |
| CEX-07 | ACP-07, TFR-08 | Prompt preset 与 SkillTemplate/Agent skill index 合并 |
| CEX-09 | ACP-05, TFR-18 | AI 音频节点和角色音频绑定同一音频资产链路 |
| CEX-10 | ACP-06, TFR-21 | 视频模式矩阵和视频 prompt 检查同一 provider capability 链路 |
| CEX-14 | TFR-13, TFR-16 | 剧本资产提取和衍生资产变体同一资产生命周期 |
| CEX-16 | TFR-19, ACP-11 | 分镜面板和画布分镜板双向同步 |
| CEX-17 | TFR-22, ACP-10 | 视频轨道和 MediaClip 合并为轻量 production timeline |
| CEX-18 | TFR-20, ACP-09, ACP-15 | 图片回流、本地媒体处理基础、缩略图衍生同属 media operation |
| CEX-22 | TFR-26, ACP-08, ACP-18 | 任务中心和诊断中心合并，避免两套状态 UI |
| CEX-24 | ACP-16, ACP-17 | 项目包和多画布页需要同一 project/canvas schema 决策 |
| CEX-27 | TFR-04, TFR-07, TFR-27, ACP-22, ACP-23, ACP-24 | 平台、部署、桌面 adapter、调试能力统一后置 |

---

## 6. 每个执行卡的 Codex 操作模板

```markdown
## 模块交接摘要

- 执行卡：
- 源模块：
- Requirements 文档：
- Plan 文档：
- Branch / PR：
- 已实现 Implementation Units：
- 已运行测试：
- Browser / visual verification：
- Code review：
- Compound 文档：
- 残留跟进：
- 下一执行卡：
```

进入一个 `CEX-*` 时：

1. 读本文当前执行卡。
2. 读对应 `TFR-*` / `ACP-*` 源模块完整章节。
3. 查找已有 requirements / plan，优先复用仍然准确的文档。
4. 如果产品行为仍不清楚，先运行 `ce-brainstorm` 并写 requirements。
5. 基于 requirements 运行 `ce-plan`，plan 必须有 implementation units、文件清单、测试策略、风险和 source references。
6. 基于 plan 运行 `ce-work`，按 `U*` 单元执行。
7. 运行 targeted tests。涉及前端体验时启动 dev server 并做浏览器验证。
8. 运行 `ce-code-review`，修复 P0/P1 findings。
9. 涉及可复用架构经验时运行 `ce-compound` 并写入 `docs/solutions/`。
10. 更新模块交接摘要。

---

## 7. 全局完成门禁

第一阶段 MVP 门禁：

- 用户能登录并进入项目画布。
- 用户能配置 LLM provider、模型能力和 Agent role。
- 用户能导入章节、提取事件、生成 ScriptAgent 工作区。
- 用户能从 script draft 提取角色、场景、道具并形成画布节点。
- 用户能编辑分镜面板并同步画布 Shot。
- 用户能生成视频 prompt，创建候选视频，选择主视频。
- 用户能通过任务中心查看失败、重试、取消和诊断。
- 用户能导出 editor package。

第二阶段生产力门禁：

- 源媒体节点、AI text/audio/video 节点、输入槽和 prompt preset 可用。
- 视频轨道、MediaClip、分镜板、图片编辑回流和媒体处理 job 可用。
- 项目包、多画布页、恢复快照和基础 i18n 可用。

第三阶段平台门禁：

- 存储维护、数据导入校验、版本信息、部署说明和安全调试可用。
- 桌面/本地桥接有明确决策和可控 adapter 边界。
- 高级 360/3D/scene detection 只在核心闭环稳定后进入。

---

## 8. 失败路由

| 失败类型 | 处理 |
| --- | --- |
| 产品行为不清楚 | 回到 `ce-brainstorm`，更新 requirements |
| 与 guga-flow 架构冲突 | 更新 plan，必要时写 `docs/solutions/tooling-decisions/` |
| 与源文档冲突 | 以 `docs/infinite-canvas-video-long-task-development-flow.md` 和当前代码架构红线为准 |
| 发现源模块已实现 | 更新对应 requirements/plan 状态，记录 evidence，不重复实现 |
| 参考项目证据不足 | 更新 research ledger 或打开 focused context pack |
| 外部 provider/API 不稳定 | 增加 mock path 和错误矩阵，不阻塞基础模块 |
| 涉及 secret/path 泄露风险 | 停止实现，先写安全设计 |
| 依赖 Electron 或桌面特权 | 改写为 Web/服务端/adapter 边界；无法改写则 defer 或标记不做 |
| 前端体验不可验收 | 增加 browser verification、截图或可访问性测试 |

---

## 9. 源文档

- `docs/toonflow-reference-long-task-development-flow.md`
- `docs/ai-canvaspro-reference-long-task-development-flow.md`
- `docs/infinite-canvas-reference-long-task-development-flow.md`
- `docs/infinite-canvas-video-long-task-development-flow.md`
- `docs/research/video-ref/context-packs/ai-canvaspro-canvas-provider-desktop.md`
- `docs/research/video-ref/index.md`
- `docs/research/video-ref/source-contract.md`

---

## 10. 执行完成摘要

截至 2026-06-14，`CEX-00` 到 `CEX-28` 均已有对应 requirements、plan、实现证据、测试覆盖或明确的安全决策文档：

- Requirements：`docs/brainstorms/2026-06-14-037-cex-00-*` 到 `docs/brainstorms/2026-06-14-065-cex-28-*`。
- Plans：`docs/plans/2026-06-14-037-feat-cex-00-*` 到 `docs/plans/2026-06-14-065-feat-cex-28-*`，状态均为 completed。
- Compound notes：对应架构经验已沉淀到 `docs/solutions/architecture-patterns/`、`docs/solutions/documentation-gaps/` 和 `docs/solutions/tooling-decisions/`。
- Reference coverage：Toonflow 与 AI-CanvasPro coverage/gaps 文档已更新，并保留 `Fact`、`Inference`、`Pending Verification` 证据标注。
- Verification：最终完成以 `pnpm test`、`pnpm format:check` 和 `pnpm verify:cex28` 通过为准。

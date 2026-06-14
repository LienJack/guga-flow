# Infinite-Canvas 参考能力开发 PRD 与长期执行流程

> 版本：2026-06-14
> 状态：Implementation PRD draft
> 参考项目：`/Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas/`
> 目标项目：`guga-flow`
> 固定模块循环：`ce-brainstorm` -> `ce-plan` -> `ce-work` -> `ce-code-review` -> `ce-compound`

本文是 `docs/infinite-canvas-video-long-task-development-flow.md` 的专项开发 PRD，用于把 Infinite-Canvas 中对 guga-flow 有价值的 provider、workflow、素材、画布工具和本地包装能力，转成可长期运行的 Codex 开发队列。

它不是“照抄参考项目”的需求文档。Infinite-Canvas README 明确包含商业封装限制，后续实现只能借鉴产品行为、边界和验收思路，不能复制源码、静态资源、字体、图片、workflow JSON、启动脚本或品牌表达。

---

## 0. 阅读顺序

长期运行或新会话恢复时，按此顺序读：

1. 本文。
2. `docs/research/video-ref/infinite-canvas-coverage-and-gaps.md`。
3. `docs/infinite-canvas-video-long-task-development-flow.md`。
4. `docs/tech-stack-text2sql-reference.md`。
5. 当前模块的 `docs/brainstorms/*ic-*requirements.md` 和 `docs/plans/*ic-*plan.md`。
6. 当前代码和测试。

不得只读本文就直接开工。如果当前模块涉及第三方 API、SDK、ComfyUI、RunningHub、Electron/Tauri、SSE 或浏览器能力，必须在 plan 阶段查官方最新文档或本地可验证源码。

---

## 1. 产品定位

### 1.1 问题陈述

guga-flow 已具备小说到视频生产图谱的核心骨架：项目、素材、画布、业务节点、语义边、生成任务、provider 配置、worker、剪辑包导出等能力。但相比 Infinite-Canvas 这类本地多供应商生成工作台，guga-flow 仍缺少几个会直接影响生产效率的工具层能力：

- 广泛 provider 协议、动态模型发现和可读错误。
- 素材库分类、搜索、批量管理和素材理解。
- ComfyUI / RunningHub workflow 这类外部工作流接入。
- 多参考媒体的视频生成能力。
- 画布片段导入导出和 prompt/template 体系。
- 图片编辑回流和实时任务状态。
- 桌面、本地文件、CLI bridge、更新回滚等平台能力评估。

这些能力应服务 guga-flow 的主线：把小说、分镜、角色、场景、图片、视频、剪辑包都作为可追溯生产节点组织在无限画布上。

### 1.2 目标

P0 目标：

- 建立可追溯的 Infinite-Canvas 参考能力 research ledger。
- 补齐安全的通用 provider 协议层。
- 补齐 provider 模型发现、协议探测、友好错误和默认模型配置。
- 增强项目级素材库的分类、标签、搜索和批量操作。

P1 目标：

- 让素材能被 caption/classify，并能参与 prompt 和搜索。
- 扩展视频生成的参考媒体输入，包括首帧、尾帧、多参考图、参考视频、参考音频。
- 建立受控 ComfyUI workflow 和 RunningHub workflow/app 接入。
- 支持画布片段导入导出、prompt library/skill template 统一、图片编辑回流和实时任务状态。

P2 目标：

- 在 Web MVP 稳定后评估桌面/本地包装、更新回滚、即梦 CLI、本地共享文件夹和浏览器素材采集。

### 1.3 非目标

- 不把 guga-flow 改成通用 AI 工具箱。
- 不做 Infinite-Canvas UI、页面、路由、数据模型或 workflow 格式的 1:1 复刻。
- 不复制参考项目源码、静态资源、内置工作流、启动脚本或品牌内容。
- 不让浏览器直连第三方 provider 或持有 provider key。
- 不让 workflow / provider / skill 变成任意代码执行入口。
- 不在 P0/P1 阶段做完整桌面壳、自动更新系统、浏览器插件或本地全盘扫描。

### 1.4 成功指标

产品可用性指标：

- 创作者能在不打开 `.env` 的情况下配置和测试常见 provider。
- 创作者能在素材库内用分类、标签、caption 搜索图片、视频、音频和文档。
- 创作者能把 ComfyUI 或 RunningHub workflow 作为画布生成动作使用。
- 创作者能从 Shot/Image 节点发起带参考媒体的视频生成，并看到可恢复失败状态。
- 创作者能导出/导入画布片段，且语义边和资源引用不丢失。

工程指标：

- provider secret 不出现在 browser-safe DTO、job input/output、日志或测试快照中。
- 所有外部调用结果都必须落为 `Asset`、`GenerationJob` 或可审计业务记录。
- 每个 P0/P1 模块至少有 shared type/backend/worker/frontend 中相关层的 targeted tests。
- 所有跨层 contract 有错误矩阵和 good/base/bad cases。

---

## 2. 用户与使用场景

### 2.1 用户角色

| 角色 | 目标 | 典型行为 |
| --- | --- | --- |
| Creator / 编导 | 从小说、剧本或创意生成可剪辑的视频素材 | 导入小说、生成分镜、绑定角色/场景、生成图片和视频、导出剪辑包 |
| Visual Director / 视觉导演 | 保持风格、角色、场景和参考图一致 | 管理素材库、设置 prompt 模板、选择 workflow、维护参考图 |
| Provider Admin / 技术配置者 | 配置模型供应商和本地工作流 | 设置 endpoint/key、探测模型、启停 provider、测试 ComfyUI/RunningHub |
| Local Power User / 本地高级用户 | 使用本地 GPU、CLI、本地文件夹或桌面包装 | 配置 ComfyUI、本地路径、CLI bridge、局域网访问 |
| Codex Agent / 长任务执行者 | 按模块安全开发和验证 | 阅读 PRD、写 requirements、plan、代码、review、solution |

### 2.2 核心用户旅程

Journey A：配置 provider 并生成图片

1. 用户进入项目设置。
2. 新增或启用一个 image provider。
3. 填写 endpoint、protocol、credential 和默认模型。
4. 点击测试连接和拉取模型。
5. 回到画布，选择 ShotNode。
6. 点击生成图片。
7. 系统创建 `GenerationJob`，worker 调用 provider，下载输出为 `Asset`，创建 ImageNode 和语义边。

Journey B：素材组织与检索

1. 用户上传一批角色参考图和场景图。
2. 用户把素材移动到集合、打标签，或运行 caption/classify。
3. 用户在画布 inspector 或素材面板中搜索“夜景”“主角侧脸”“城市场景”。
4. 用户把素材绑定到 ShotNode、CharacterNode 或 LocationNode。
5. 后续 prompt composer 能引用这些素材摘要和绑定关系。

Journey C：ComfyUI / RunningHub workflow 生成

1. 用户在设置中登记 workflow。
2. 用户映射 prompt、image、seed、aspectRatio、output 等字段。
3. 用户运行测试，确认输出能保存为 Asset。
4. 用户在画布选择 ShotNode/ImageNode，选择 workflow 生成。
5. 系统创建 job，worker 执行 workflow，结果回流画布。

Journey D：画布片段复用

1. 用户选中某个场景下的 SceneFrame、Shot、Image、Video 和相关边。
2. 用户导出 guga-flow canvas fragment zip。
3. 另一个项目导入该 zip。
4. 系统重写 id、复制或重映射资源、恢复业务节点和语义边。
5. 如果资源缺失，导入给出可恢复错误，不创建半坏图谱。

---

## 3. 全局产品原则

| ID | 原则 | 可执行要求 |
| --- | --- | --- |
| GP-01 | Canvas-first | 新增生成、分析、导入和编辑能力必须能落回画布节点、语义边、资产或任务记录 |
| GP-02 | Secret-safe | provider key、CLI token、workflow secret、local path 授权不得出现在浏览器响应、job JSON、日志或快照中 |
| GP-03 | Worker-first | 外部 provider 调用、workflow 运行、caption/classify、导出、批量处理默认走 worker 或等价异步抽象 |
| GP-04 | Mock-first | 每个模块必须有无真实 key 的 mock 路径，CI 不依赖真实 provider |
| GP-05 | Typed contracts | shared types 先行，后端、worker、前端都复用同一 contract |
| GP-06 | Import/export versioning | 任何 zip/json 导入导出都必须带 `schemaVersion` 和 `source` |
| GP-07 | Recoverable failure | 失败必须可见、可重试、可取消或可清理，不能静默丢失 |
| GP-08 | Reference restraint | 参考项目只提供启发，不复制源码或资源，不改变 guga-flow 主线 |

---

## 4. 信息架构与页面范围

### 4.1 Settings Center

设置中心承载项目级配置：

- Providers：image/video/LLM/editor provider。
- Workflows：ComfyUI、RunningHub、未来 declarative provider workflow。
- Prompt & Skills：story/art/production/agent 模板。
- Assets：集合、标签、批处理策略。
- Data：项目设置导出、导入校验、画布片段导入导出入口。
- Local & Desktop：P2 阶段才出现，默认 hidden/disabled。

### 4.2 Canvas Workspace

画布工作台承载生产动作：

- 左侧：小说/分镜/Agent/生产导航。
- 中央：tldraw 画布、业务节点、语义边。
- 右侧：Inspector、素材、prompt preview、generation queue。
- 节点动作：生成图、生成视频、编辑图片、导出片段、绑定参考素材。

### 4.3 Asset Library

资产库承载项目级素材：

- 资产上传、预览、删除。
- 集合、分类、标签、搜索。
- 批量移动、批量删除、批量 caption/classify。
- 引用状态：被哪些节点或任务引用。

不做独立“在线生图画廊”作为主入口。生成历史应投射到 Asset、GenerationJob、ImageNode、VideoNode。

---

## 5. 全局系统合同

### 5.1 Scope / Trigger

本 PRD 涉及跨层合同：

- DB schema：provider、workflow、asset library、caption、canvas fragment、event stream。
- Backend API：settings、provider discovery、workflow management、asset batch、fragment import/export、events。
- Worker API：claim、runtime config、external provider/workflow execution、asset analysis。
- Frontend UI：settings center、canvas action panel、asset library、queue state。
- Security：secret、local file path、third-party raw payload、zip import validation。

因此每个模块必须达到 code-spec 深度：签名、字段、错误矩阵、good/base/bad cases、测试点和 wrong vs correct。

### 5.2 共享实体与建议 schema

现有核心实体继续保留：

- `Project`
- `CanvasDocument`
- `CanvasNode`
- `CanvasEdge`
- `Asset`
- `GenerationJob`
- `EditorExport`
- `ProviderConfig`
- `ProgrammableProvider`
- `SkillTemplate`
- `AgentMemory`

建议新增或扩展的实体：

| 实体 | 模块 | 目的 | 最小字段 |
| --- | --- | --- | --- |
| `AssetCollection` | IC-03 | 项目级素材集合/分类 | `id`, `projectId`, `name`, `parentId`, `kind`, `sortOrder`, `createdAt`, `updatedAt` |
| `AssetTag` | IC-03 | 项目级标签 | `id`, `projectId`, `name`, `color`, `createdAt` |
| `AssetTagAssignment` | IC-03 | 资产标签关系 | `assetId`, `tagId` |
| `WorkflowDefinition` | IC-06/IC-07 | 声明式 workflow 配置 | `id`, `projectId`, `kind`, `provider`, `displayName`, `status`, `activeVersionId` |
| `WorkflowDefinitionVersion` | IC-06/IC-07 | workflow JSON 和字段映射版本 | `id`, `workflowDefinitionId`, `version`, `sourceJson`, `mappingJson`, `diagnosticsJson`, `createdAt` |
| `CanvasFragmentImport` | IC-08 | 导入审计 | `id`, `projectId`, `schemaVersion`, `status`, `summaryJson`, `errorMessage`, `createdAt` |

如果实现阶段选择复用 `ProviderConfig.paramsJson`、`SkillTemplate` 或 `Asset.metadataJson` 而不是新增表，必须在 plan 中写明原因、索引影响和迁移策略。

### 5.3 标准状态模型

外部执行类状态统一使用：

```text
draft -> queued -> running -> provider_waiting -> succeeded
                              -> failed
                              -> cancelled
```

要求：

- `queued`：用户动作已落库，worker 尚未 claim。
- `running`：worker 已开始本地处理或正在提交上游。
- `provider_waiting`：上游已有 task id，正在轮询。
- `succeeded`：输出已保存为 `Asset`，画布事实已更新。
- `failed`：错误可读，可重试或可清理。
- `cancelled`：用户或系统取消，不能误报成功。

### 5.4 Provider 安全合同

浏览器可见：

- provider id、displayName、kind、enabled、disabledReason。
- model list、defaultModel、capabilities、parameter schema。
- credentialConfigured、credentialSource。
- lastTestStatus、lastTestMessage、lastTestedAt。

浏览器不可见：

- API key、token、secret headers。
- 解密后的 runtime config。
- 包含签名 URL 的 raw provider response。
- 本地路径白名单外路径。

Worker 可见：

- 通过 backend trusted endpoint 获取 runtime config。
- 仅在执行时短暂持有 secret。
- 不把 secret 写入 `GenerationJob.inputJson/outputJson`。

### 5.5 Asset 写入合同

任何外部生成或编辑结果必须：

1. 下载或保存为 `Asset`。
2. 写入 `type`、`purpose`、`mimeType`、`storageKey`。
3. 能预览或返回清晰失败。
4. 如果回流画布，创建或更新对应 `CanvasNode`。
5. 创建语义边，例如 `generated_image`、`generated_video`、`derived_from`、`references_character`。

禁止只保存远程临时 URL。

### 5.6 标准错误矩阵

| 场景 | HTTP / 状态 | 用户可见文案 | 系统动作 | 测试点 |
| --- | --- | --- | --- | --- |
| provider 未启用 | 400 | Provider disabled 或中文等价文案 | 不创建 job 或 job failed | service test |
| key 缺失 | 400 | server-side key is not configured | 不泄露 key name 以外 secret | serialization test |
| endpoint 非 http(s) | 400 | Endpoint must start with http:// or https:// | 不请求上游 | validation test |
| 上游 401/403 | failed | API Key 无效或无权限 | job failed，保存 safe summary | worker/backend test |
| 上游 HTML/跳转 | failed | Base URL 可能不是 API 地址 | 不保存 raw HTML 全量 | provider discovery test |
| provider timeout | provider_waiting 或 failed | 上游超时，可重试 | 保存 task id 或 error code | worker test |
| 输出为空 | failed | Provider did not return media | 不创建 ImageNode/VideoNode | integration test |
| 资源下载失败 | failed | 输出下载失败 | 保留 job 和 safe raw id | asset test |
| workflow schema 无效 | 400 | Workflow JSON invalid | 不保存 active version | schema test |
| zip 导入缺资源 | 422 | 资源缺失，可重新上传 | 不创建半坏图谱 | import test |
| SSE 断线 | fallback | 实时连接断开，轮询恢复 | 前端启用 polling | frontend test |

### 5.7 Good / Base / Bad Cases

Good case：

- 用户配置 provider，发现模型，设置默认模型。
- 在画布选择 ShotNode，提交生成。
- worker 获取 runtime config，调用 provider。
- 输出保存为 Asset，创建 ImageNode/VideoNode 和语义边。
- UI 通过 SSE 或 polling 显示成功。

Base case：

- 没有真实 key，mock provider 可完整跑通。
- 模型发现失败但手工模型仍可保存。
- 外部 workflow 不可用时，普通 mock generation 不受影响。

Bad case：

- 用户填错 endpoint 或 key。
- 上游返回 HTML、跳转、空输出、超时。
- 导入 zip 缺资源或 schemaVersion 不兼容。
- worker 处理中断。

每个模块的测试必须至少覆盖一个 good、一个 base、一个 bad。

### 5.8 Wrong vs Correct

Wrong：

```text
前端直接保存 API key，并从浏览器 fetch 第三方生图接口。
```

Correct：

```text
前端只提交 provider 配置更新请求。后端加密保存 credential。worker 通过 trusted backend endpoint 获取 runtime config 后调用 provider。
```

Wrong：

```text
provider 返回远程图片 URL 后，直接把 URL 写到 ImageNode.dataJson。
```

Correct：

```text
worker 下载媒体，创建 Asset，再把 assetId 写入 ImageNode.dataJson，并创建 generated_image 语义边。
```

Wrong：

```text
导入 canvas fragment 时先创建节点，遇到资源缺失再报错。
```

Correct：

```text
先 validate manifest、schemaVersion、resource map 和 id rewrite plan，全部通过后在事务中创建节点、边和资产引用。
```

---

## 6. Release 分层

| Release | 模块 | 目标 | 完成定义 |
| --- | --- | --- | --- |
| R0 Research | IC-00 | 固化参考证据 | 文档可追溯，后续模块无需重复调研 |
| R1 Provider Foundation | IC-01, IC-02 | 通用 provider 和模型发现 | 可配置兼容 endpoint，可安全测试和生成 |
| R2 Asset Foundation | IC-03, IC-04 | 素材组织与素材理解 | 可分类、搜索、批量处理、caption/classify |
| R3 Workflow Generation | IC-05, IC-06, IC-07 | 视频参考媒体、ComfyUI、RunningHub | 外部 workflow 通过 worker 回流 Asset/节点 |
| R4 Canvas Productivity | IC-08, IC-09, IC-10, IC-11 | 画布片段、prompt、编辑、实时状态 | 生产效率提升且不破坏主线 |
| R5 Local Platform Decisions | IC-12, IC-13, IC-14, IC-15 | 桌面、本地、CLI、更新评估 | 决策文档和后续拆分模块 |

---

## 7. 模块级开发 PRD

### IC-00：Infinite-Canvas 研究资产固化

优先级：P0
类型：Research / Documentation

#### 背景

当前已有覆盖度调研，但后续模块需要按主题快速定位证据，避免每次重新打开参考项目的大文件。

#### 用户故事

- 作为 Codex Agent，我需要一份按主题组织的证据索引，以便实现 provider、workflow、asset 等模块时能快速定位参考行为。
- 作为 Reviewer，我需要知道某个需求来自参考项目事实、推断还是产品取舍。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC00-FR1 | 维护 `docs/research/video-ref/infinite-canvas-coverage-and-gaps.md` 作为总入口 |
| IC00-FR2 | 为 provider/workflow/assets/canvas/prompt/local platform 建立可选 context pack |
| IC00-FR3 | 每条关键结论标注 `Fact`、`Inference` 或 `Pending Verification` |
| IC00-FR4 | 记录参考项目 commit、version、license 和不可复制边界 |
| IC00-FR5 | 当后续模块修正调研结论时，同步更新本研究资产 |

#### 验收标准

- 后续任一 `IC-*` 模块能在 3 分钟内定位相关证据入口。
- 文档中没有“参考项目说了”但无路径证据的关键判断。
- license 和不可复制边界在文档中可见。

#### 测试与检查

- Markdown 链接和路径存在。
- `rg -n "Pending Verification|Fact|Inference" docs/research/video-ref` 能找到标注。
- `git diff --check` 通过。

---

### IC-01：通用 Provider 协议层

优先级：P0
类型：Shared types / Backend / Worker / Frontend settings

#### 背景

Infinite-Canvas 的强项之一是广泛 provider 协议支持。guga-flow 需要吸收这部分能力，但必须保留服务端密钥、typed provider contract、worker-first 的架构。

#### 用户故事

- 作为 Provider Admin，我可以添加 OpenAI-compatible / Gemini-compatible / Ark-compatible endpoint，并配置默认模型。
- 作为 Creator，我在画布生成时只看到可用 provider，不需要理解密钥细节。
- 作为 Worker，我可以安全获取 runtime config 并执行 provider 调用。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC01-FR1 | shared types 增加 `ProviderProtocol`，至少包括 `openai_compatible`、`gemini`、`ark`、`mock` |
| IC01-FR2 | provider config 支持 `baseUrl`、`protocol`、`defaultModel`、`safeParams`、`credentialConfigured` |
| IC01-FR3 | credentials write-only，浏览器响应只返回 presence 和 source |
| IC01-FR4 | 后端能组合 static catalog、project config、env config 和 programmable provider |
| IC01-FR5 | worker 通过 trusted endpoint 获取 runtime config，禁止从 job JSON 读取 secret |
| IC01-FR6 | image/video provider registry 支持 generic adapter skeleton |
| IC01-FR7 | mock provider 路径不受真实 provider 配置影响 |

#### 数据合同

建议 `ProviderConfig.paramsJson`：

```json
{
  "protocol": "openai_compatible",
  "baseUrl": "https://example.com/v1",
  "imageRequestMode": "openai",
  "videoRequestMode": "task",
  "safeParams": {
    "quality": "medium"
  }
}
```

禁止出现在 `paramsJson` 中：

- `apiKey`
- `authorization`
- `secret`
- `cookie`
- 私有本地路径

#### API 合同

现有 project-scoped provider API 继续使用，必要时扩展：

```text
GET    /api/v1/projects/:projectId/providers
PATCH  /api/v1/projects/:projectId/providers/:kind/:provider
POST   /api/v1/projects/:projectId/providers/:kind/:provider/test
POST   /api/v1/worker/generation/providers/runtime
```

`PATCH` request 最小字段：

```json
{
  "enabled": true,
  "defaultModel": "model-id",
  "params": {
    "protocol": "openai_compatible",
    "baseUrl": "https://example.com/v1"
  },
  "credential": {
    "action": "set",
    "value": "write-only-secret"
  }
}
```

`PATCH` response 不得包含 `credential.value`。

#### 验收标准

- 设置页可以启用一个 generic image provider。
- 无 key 时 provider disabled，错误可读。
- worker 能执行 mock generic provider 流程。
- `GenerationJob.inputJson/outputJson` 中不含 credential。

#### 测试点

- shared type serialization test：credential 不进入 response。
- backend service test：env credential 和 stored credential 优先级。
- worker test：runtime config 只通过 trusted API 获取。
- frontend test：credential input 保存后清空，不回显 secret。

---

### IC-02：Provider 模型发现与协议探测

优先级：P0
类型：Backend / Frontend settings / Provider diagnostics

#### 背景

参考项目提供 `/api/providers/test-connection` 和 `/api/providers/fetch-models`，能检测 endpoint、拉取模型并给出友好错误。guga-flow 需要类似能力来降低 provider 配置成本。

#### 用户故事

- 作为 Provider Admin，我可以在保存前测试 endpoint 和 key。
- 作为 Provider Admin，我可以拉取模型列表，并把模型分成 image/video/chat。
- 作为 Creator，我看到 provider disabled reason 时能知道要修什么。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC02-FR1 | 支持对未保存表单值进行一次性 model discovery |
| IC02-FR2 | 支持对已保存 provider 进行 model discovery |
| IC02-FR3 | 返回 `detectedProtocol`、`modelGroups`、`rawCount`、`safeMessage` |
| IC02-FR4 | 识别常见错误：401/403、HTML 响应、redirect、timeout、empty models |
| IC02-FR5 | 允许用户把 discovery 结果应用为 provider model list 或 default model |
| IC02-FR6 | discovery 不创建生产媒体、不创建 GenerationJob |

#### API 合同

```text
POST /api/v1/projects/:projectId/providers/discover-models
```

Request：

```json
{
  "kind": "image",
  "provider": "custom:my-provider",
  "protocol": "openai_compatible",
  "baseUrl": "https://example.com/v1",
  "credential": {
    "source": "temporary",
    "value": "write-only"
  }
}
```

Response：

```json
{
  "ok": true,
  "detectedProtocol": "openai_compatible",
  "message": "Model endpoint reachable",
  "modelGroups": {
    "image": ["image-model"],
    "video": [],
    "chat": ["chat-model"]
  },
  "rawCount": 2
}
```

#### 验收标准

- 正确 endpoint 能返回分组模型。
- 错误 endpoint 能显示友好错误。
- HTML 登录页响应不会被当作成功。
- discovery response 不含 key、headers、完整 raw body。

#### 测试点

- `401/403` mapped to credential error。
- `text/html` mapped to base URL error。
- `302` mapped to redirect error。
- empty list returns `ok: true` with warning or `ok: false`，由 plan 决定并测试。

---

### IC-03：素材库增强

优先级：P0
类型：DB / Backend / Frontend asset library

#### 背景

Infinite-Canvas 的素材库支持素材、workflow、prompt、本地素材等多 tab 管理。guga-flow 需要更贴合生产图谱的项目级素材组织能力。

#### 用户故事

- 作为 Visual Director，我能把素材按角色、场景、风格、参考图集合组织。
- 作为 Creator，我能搜索素材并拖入画布绑定节点。
- 作为 Reviewer，我能知道某个素材是否仍被节点引用。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC03-FR1 | 支持项目级 asset collection |
| IC03-FR2 | 支持项目级 asset tag |
| IC03-FR3 | 支持 asset list 按 type、purpose、collection、tag、query 过滤 |
| IC03-FR4 | 支持批量移动、批量打标签、批量删除 |
| IC03-FR5 | 删除被引用资产时必须提示引用节点或拒绝删除 |
| IC03-FR6 | 画布右侧资源面板复用同一筛选 contract |

#### 建议 API

```text
GET    /api/v1/projects/:projectId/assets?query=&type=&collectionId=&tagIds=
POST   /api/v1/projects/:projectId/asset-collections
PATCH  /api/v1/projects/:projectId/asset-collections/:collectionId
DELETE /api/v1/projects/:projectId/asset-collections/:collectionId
POST   /api/v1/projects/:projectId/assets/batch
```

Batch request：

```json
{
  "assetIds": ["asset_1", "asset_2"],
  "action": "add_tags",
  "tagIds": ["tag_1"]
}
```

#### 验收标准

- 用户能创建集合和标签。
- 用户能按 tag/query 搜索资产。
- 批量删除不会删除仍被画布节点引用的资产，除非后续明确设计 force 模式。
- 资产库 UI 在空状态、加载、失败、批量选择状态下可用。

#### 测试点

- backend asset filtering service tests。
- delete referenced asset bad case。
- frontend asset library render/search/batch tests。
- migration 和 Prisma generate。

---

### IC-04：素材 Caption / Classify 任务

优先级：P1
类型：Worker / Asset analysis / Search

#### 背景

参考项目支持本地素材 caption/classify。guga-flow 需要把素材理解结果写回 `Asset.metadataJson`，服务 prompt、搜索和参考绑定。

#### 用户故事

- 作为 Visual Director，我可以批量给图片生成描述和标签。
- 作为 Creator，我可以通过描述搜索素材。
- 作为 Worker，我可以在无真实 provider 时使用 mock caption。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC04-FR1 | 新增 asset analysis job operation，例如 `asset_caption`、`asset_classification` |
| IC04-FR2 | 支持单 asset 和批量 asset |
| IC04-FR3 | 输出写入 `Asset.metadataJson.caption`、`classifications`、`analysisProvider` |
| IC04-FR4 | 支持失败重试，不覆盖用户手工 caption，除非用户选择 overwrite |
| IC04-FR5 | asset search 可命中 caption 和 classifications |

#### Job input

```json
{
  "operation": "asset_caption",
  "assetIds": ["asset_1"],
  "provider": "mock-llm",
  "model": "mock-vision-v1",
  "overwrite": false,
  "prompt": "描述图片中可用于分镜生成的主体、场景、风格"
}
```

#### 验收标准

- 批量 caption 生成后，资产列表显示摘要。
- caption 失败时对应 job failed，其他资产不受影响。
- 搜索 caption 能找到资产。

---

### IC-05：视频 Provider 参考媒体增强

优先级：P1
类型：Provider contracts / Generation / Worker / Canvas

#### 背景

Infinite-Canvas 的视频生成支持图片、视频、音频等参考输入。guga-flow 已有视频 provider contract 和音频资产方向，需要补齐 typed reference media。

#### 用户故事

- 作为 Creator，我可以用 ImageNode 作为首帧生成视频。
- 作为 Visual Director，我可以添加尾帧、参考视频或音频来控制连续性。
- 作为系统，我能根据 provider capability 禁用不支持的输入。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC05-FR1 | `VideoGenerationInput` 支持 typed reference media roles |
| IC05-FR2 | roles 至少包括 `first_frame`、`last_frame`、`reference_image`、`reference_video`、`reference_audio` |
| IC05-FR3 | provider catalog 声明各 role 的支持情况和数量上限 |
| IC05-FR4 | UI 对不支持 role 的 provider 显示 disabled state 和原因 |
| IC05-FR5 | worker 只接受已有 `Asset` 或节点引用，不接受任意远程 URL |
| IC05-FR6 | 成功后创建 VideoNode、Asset、`generated_video` 边，并保留 source references |

#### Shared type 示例

```ts
interface VideoReferenceMediaInput {
  assetId: string;
  role: "first_frame" | "last_frame" | "reference_image" | "reference_video" | "reference_audio";
  sourceNodeId?: string;
}
```

#### 验收标准

- ImageNode -> VideoNode 可带首帧。
- 不支持音频的 provider 不会提交含音频的 job。
- provider_waiting 状态保存 providerTaskId。
- 失败时不创建空 VideoNode。

---

### IC-06：ComfyUI Workflow 管理 MVP

优先级：P1
类型：Workflow provider / Settings / Worker / Canvas

#### 背景

Infinite-Canvas 提供 ComfyUI instance、workflow 上传、字段映射和运行。guga-flow 需要把它变成项目级、受控、worker-first 的 workflow provider。

#### 用户故事

- 作为 Local Power User，我能配置本地或局域网 ComfyUI endpoint。
- 作为 Visual Director，我能上传一个 ComfyUI API workflow 并映射字段。
- 作为 Creator，我能在 Shot/Image 节点上选择 workflow 生成。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC06-FR1 | 支持项目级 ComfyUI endpoint 配置和连通性测试 |
| IC06-FR2 | 支持上传 ComfyUI API workflow JSON |
| IC06-FR3 | workflow version 保存 source JSON、field mapping、diagnostics |
| IC06-FR4 | field mapping 支持 text、number、boolean、image、video、audio、select |
| IC06-FR5 | workflow test run 不创建生产节点，但可创建临时或测试 Asset，具体由 plan 决定 |
| IC06-FR6 | canvas generation action 可选择 workflow，创建 GenerationJob |
| IC06-FR7 | worker 运行 ComfyUI prompt，下载输出为 Asset |

#### Workflow mapping 示例

```json
{
  "fields": [
    {
      "id": "prompt",
      "nodeId": "6",
      "input": "text",
      "type": "text",
      "source": "shot.imagePrompt",
      "required": true
    },
    {
      "id": "referenceImage",
      "nodeId": "12",
      "input": "image",
      "type": "image",
      "source": "selectedNode.assetId",
      "required": false
    }
  ],
  "outputs": [
    {
      "nodeId": "24",
      "kind": "image"
    }
  ]
}
```

#### 验收标准

- 无效 workflow JSON 不能激活。
- 用户能映射 prompt 和 image 字段。
- mock Comfy run 或本地测试 run 能产生 Asset。
- 浏览器不直接访问 ComfyUI endpoint。

---

### IC-07：RunningHub Workflow / App Adapter

优先级：P1
类型：Workflow provider / Provider config / Worker

#### 背景

参考项目支持 RunningHub workflow/app/收费模型。guga-flow 需要先做安全登记和运行 adapter，不复制参考项目内置配置。

#### 用户故事

- 作为 Provider Admin，我能登记 RunningHub workflow/app id 和字段映射。
- 作为 Creator，我能把 RunningHub workflow 当作 image/video generation source。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC07-FR1 | RunningHub credential 复用 provider secret-safe 机制 |
| IC07-FR2 | 支持 workflow/app id、displayName、kind、field mapping |
| IC07-FR3 | 支持 test connection 和 dry-run validation |
| IC07-FR4 | worker 提交 RunningHub task 并轮询 |
| IC07-FR5 | 输出下载为 Asset，raw response 只保存 safe summary |

#### 验收标准

- 可登记一个 RunningHub workflow。
- 可在 provider catalog 中看到该 workflow。
- 失败时保留 task id 和 safe error。

---

### IC-08：画布片段与 Workflow 导入导出

优先级：P1
类型：Canvas / Assets / Import-export

#### 背景

参考项目支持 canvas workflow zip。guga-flow 需要自己的 canvas fragment 格式，以便复用生产图谱片段。

#### 用户故事

- 作为 Creator，我能导出一个场景的节点、边和引用素材。
- 作为 Creator，我能把片段导入另一个项目并继续编辑。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC08-FR1 | 支持导出选中 `CanvasNode`、`CanvasEdge` 和引用 `Asset` |
| IC08-FR2 | zip 内必须包含 `manifest.json` 和 `resources/` |
| IC08-FR3 | manifest 带 `schemaVersion`、`sourceProjectId`、`exportedAt` |
| IC08-FR4 | 导入前 validate schema、资源、id rewrite plan |
| IC08-FR5 | 导入事务中创建节点、边和资源引用 |
| IC08-FR6 | 不宣称兼容 Infinite-Canvas JSON |

#### Manifest 示例

```json
{
  "format": "guga-flow-canvas-fragment",
  "schemaVersion": 1,
  "exportedAt": "2026-06-14T00:00:00.000Z",
  "nodes": [],
  "edges": [],
  "assets": []
}
```

#### 验收标准

- 导出 zip 可被重新导入。
- 导入后节点 id、shape id、edge id 不与现有项目冲突。
- 缺资源或版本不兼容时不创建半成品。

---

### IC-09：Prompt Library 与 Skill Template 统一

优先级：P1
类型：Prompt / Skill / Settings

#### 背景

参考项目有 prompt library 和系统 prompt 模板。guga-flow 已有 `SkillTemplate`，应继续收敛到一个模板体系。

#### 用户故事

- 作为 Visual Director，我能编辑 art/story/production/agent 模板。
- 作为 Creator，我能知道某次 prompt compose 使用了哪个模板版本。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC09-FR1 | SkillTemplate 支持分类、搜索和版本比较 |
| IC09-FR2 | Prompt composer 输出 debug parts 包含 template kind/slug/version |
| IC09-FR3 | 模板 invalid 时不能激活 |
| IC09-FR4 | 支持回滚到旧版本 |
| IC09-FR5 | 不支持任意代码执行 |

#### 验收标准

- 设置中心可编辑模板并激活版本。
- Shot prompt preview 能显示模板来源。
- invalid 模板给出 diagnostics。

---

### IC-10：图片编辑原语与回流

优先级：P1
类型：Frontend / Backend assets / Generation

#### 背景

Infinite-Canvas 智能画布包含 crop、mask、brush、grid、outpaint、360 preview。guga-flow 先做低风险、可测试、可回流的编辑原语。

#### 用户故事

- 作为 Creator，我能裁剪 ImageNode 并生成新版本。
- 作为 Visual Director，我能把一张参考图切分成多个素材。
- 作为 Creator，我能提交 mask/outpaint 任务并看到失败状态。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC10-FR1 | ImageNode 支持 crop action，结果为新 Asset |
| IC10-FR2 | 支持 grid split，产生多个 Asset |
| IC10-FR3 | 支持 mask upload，作为 image_refinement job input |
| IC10-FR4 | 每次编辑保留 `derived_from` 或 `sourceNodeIds` |
| IC10-FR5 | 不做完整画笔编辑器，不做复杂 Photoshop |

#### 验收标准

- crop 后原 Asset 保留，新 Asset 可预览。
- grid split 可选择部分回流画布。
- mask/outpaint 失败不破坏原节点。

---

### IC-11：实时任务状态通道

优先级：P1
类型：Backend events / Frontend queue / Worker updates

#### 背景

当前工作台主要通过轮询刷新 generation jobs。参考项目有 WebSocket stats 和新图广播。guga-flow 应优先做 SSE，保留 polling fallback。

#### 用户故事

- 作为 Creator，我希望生成状态几乎实时更新。
- 作为系统，我希望断线后能自动回退轮询。

#### 功能需求

| ID | 需求 |
| --- | --- |
| IC11-FR1 | 提供 project-scoped SSE endpoint |
| IC11-FR2 | 事件类型包括 `job.created`、`job.updated`、`asset.created`、`canvas.updated` |
| IC11-FR3 | 事件 payload 不含 secret 和大 raw response |
| IC11-FR4 | 前端断线后 fallback 到 polling |
| IC11-FR5 | worker succeed/fail/wait/cancel 能触发或被 backend 转发事件 |

#### Event 示例

```json
{
  "type": "job.updated",
  "projectId": "project_1",
  "jobId": "job_1",
  "status": "provider_waiting",
  "updatedAt": "2026-06-14T00:00:00.000Z"
}
```

#### 验收标准

- job 状态变化能实时更新 queue。
- SSE 断线不影响生成流程。
- fallback polling 可恢复。

---

### IC-12：桌面 / 本地包装评估

优先级：P2
类型：Decision PRD / Tooling

#### 背景

Infinite-Canvas 的一键启动和本地网页定位降低了非工程用户门槛。guga-flow 需要先评估，不直接实现。

#### 决策问题

- 继续 Web-only，还是使用 Tauri/Electron？
- 本地文件访问由浏览器上传、桌面壳授权，还是后端路径白名单？
- provider key 存在 DB、系统钥匙串，还是 `.env`？
- 自动更新如何不破坏数据库迁移和用户项目？

#### 交付物

- `docs/solutions/tooling-decisions/guga-flow-desktop-local-packaging-YYYY-MM-DD.md`
- 决策矩阵：Web-only / Tauri / Electron / Docker Desktop / pnpm wrapper。
- 后续实现模块拆分建议。

---

### IC-13：版本检查、备份、回滚

优先级：P2
类型：Platform decision / Data safety

#### 功能方向

- 版本信息展示。
- 项目数据备份。
- 设置导出和导入校验。
- 更新前备份和失败回滚。

#### 非目标

- Web MVP 阶段不做 self-update。
- 不覆盖用户项目数据。
- 不绕过迁移测试。

---

### IC-14：即梦 CLI Bridge

优先级：P2
类型：Provider bridge / Local platform

#### 功能方向

- CLI 安装状态检测。
- 登录状态检测。
- 额度/帮助信息展示。
- 后续作为 provider adapter 运行。

#### 安全要求

- 必须用户显式授权。
- CLI 路径和 token 不进入浏览器。
- 真实生成另开模块并走 `GenerationJob`。

---

### IC-15：共享文件夹与浏览器素材采集

优先级：P2
类型：Local file / Extension / Security decision

#### 功能方向

- 本地文件夹导入。
- 路径白名单。
- 手动重新扫描。
- 浏览器素材采集插件评估。

#### 安全要求

- Web-only 模式不读取任意本地路径。
- 所有授权可撤销。
- 不默认扫描用户目录。

---

## 8. 推荐执行顺序

1. `IC-00`：固化研究资产。
2. `IC-01` + `IC-02`：先做 provider foundation。
3. `IC-03`：做素材库增强。
4. `IC-04` + `IC-05`：做素材理解和视频参考媒体。
5. `IC-06`：做 ComfyUI workflow MVP。
6. `IC-07`：做 RunningHub adapter。
7. `IC-08` + `IC-09`：做画布片段和 prompt/template。
8. `IC-10` + `IC-11`：做图片编辑回流和实时状态。
9. `IC-12` 到 `IC-15`：Web MVP 稳定后评估。

任何模块如果预计触及超过 10 个实现文件，必须回到 `ce-brainstorm` 拆分。

---

## 9. 每个模块的固定执行协议

### 9.1 Brainstorm

输出：

- `docs/brainstorms/YYYY-MM-DD-NNN-ic-<module>-requirements.md`

必须包含：

- 背景和目标。
- Actor 和用户流程。
- Functional requirements，使用 `ICxx-FR*`。
- Non-goals。
- Acceptance examples，使用 `ICxx-AE*`。
- 参考能力：`borrow`、`adapt`、`reject`。
- 未解决问题。

退出门禁：

- 不需要在 plan 阶段发明产品行为。
- 不触碰架构红线。

### 9.2 Plan

输出：

- `docs/plans/YYYY-MM-DD-NNN-feat-ic-<module>-plan.md`

必须包含：

- Requirements trace。
- Implementation units，使用 `U1`、`U2`。
- 文件列表。
- API/DB/shared type 变更。
- 测试矩阵。
- 风险和回滚策略。

退出门禁：

- 每个行为变化有测试策略。
- 高风险外部调用有 mock 和失败路径。

### 9.3 Work

执行顺序：

1. shared types 和测试。
2. Prisma/schema 和 migrations。
3. backend service/controller 和测试。
4. worker executor/client 和测试。
5. frontend API wrapper/components 和测试。
6. browser verification。
7. docs/solutions 或 research 更新。

### 9.4 Code Review

必须检查：

- secrets 是否外泄。
- job input/output 是否含不该含的 raw data。
- worker 是否幂等。
- import/export 是否先 validate 再 write。
- 前端 disabled/loading/error 状态是否完整。
- tests 是否覆盖 good/base/bad。

### 9.5 Compound

以下情况必须沉淀 solution：

- provider adapter 或 secret boundary。
- workflow schema 或 import/export schema。
- worker 幂等或状态机。
- local file / CLI / desktop 安全决策。
- 图片编辑回流和资产 lineage。

---

## 10. 验证门禁

最低命令：

```bash
pnpm --filter "./packages/*" run build
pnpm run db:generate
```

按模块追加：

| 模块类型 | 必跑测试 |
| --- | --- |
| shared types | `pnpm --filter @guga-flow/shared-types test` |
| provider contracts | `pnpm --filter @guga-flow/provider-contracts test` |
| backend | `pnpm --filter @guga-flow/backend test` 或 targeted service spec |
| worker | `pnpm --filter @guga-flow/worker test` 或 targeted worker spec |
| frontend | `pnpm --filter @guga-flow/frontend test -- <files>` |
| canvas UI | Browser verification desktop + narrow |
| full cross-layer | `pnpm run test`、`pnpm run build`、`pnpm run format:check` |

文档-only 模块：

```bash
git diff --check
```

---

## 11. 恢复协议

长期运行或上下文恢复时：

1. 阅读本文。
2. 阅读当前 `IC-*` requirements 和 plan。
3. 阅读 `docs/research/video-ref/infinite-canvas-coverage-and-gaps.md` 对应覆盖项。
4. 检查 `git status --short`、branch、近期 commits。
5. 搜索 `docs/solutions/` 中相关经验。
6. 从未完成的 CE stage 继续。

如果无法识别活跃模块：

- 根据 branch 名、最新 `docs/plans/*ic*`、git diff、最近 solution 文档恢复。
- 如果代码已偏离 plan，先做 mini review，再决定回 plan 还是继续 work。

---

## 12. 下一模块 Codex Prompt 模板

```text
请按照 docs/infinite-canvas-reference-long-task-development-flow.md 执行 guga-flow 的下一个 Infinite-Canvas 参考能力模块。

当前模块：
- 模块 ID：
- Release：
- 优先级：
- 目标：
- 范围边界：
- 相关覆盖项：
- 相关研究资产：
- 相关现有 plan / solution：

严格执行：
1. ce-brainstorm
2. ce-plan
3. ce-work
4. ce-code-review
5. ce-compound

要求：
- 不复制 Infinite-Canvas 源码、资源、workflow JSON 或启动脚本。
- 保持 canvas-first、mock-first、worker-first、secret-safe。
- 每个生成、分析、导入或编辑结果都必须落回 CanvasNode / CanvasEdge / Asset / GenerationJob / EditorExport 中的合适位置。
- shared types 先行，后端、worker、前端复用同一 contract。
- 每完成一个 implementation unit 就运行 targeted tests 并更新 plan 状态。
- 所有产物使用 repo-relative 路径。
```

---

## 13. 完成规则

本专项不以“把 Infinite-Canvas 所有功能做一遍”为完成标准。完成条件：

- P0 模块全部通过 CE 循环并有测试。
- P1 模块中被产品确认需要的能力均完成或明确 defer。
- P2 模块至少有决策文档和后续拆分计划。
- 所有 provider、workflow、local-file 能力没有破坏 secret-safe 和 worker-first。
- guga-flow 的小说到视频 MVP 闭环仍是第一主线。
- 参考项目结论、架构取舍和踩坑都沉淀为 Markdown，而不是只留在聊天记录里。

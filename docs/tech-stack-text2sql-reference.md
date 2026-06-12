# guga-flow 技术架构方案

> 版本：2026-06-12  
> 产品依据：`/Users/lienli/Documents/GitHub/guga-flow/infinite_canvas_video_prd_roadmap_v2_detailed.md`  
> 工程参考：`/Users/lienli/Documents/GitHub/text2sql/`

本文不是单纯罗列前后端技术栈，而是把 text2sql 的工程底座改造成适合 guga-flow 的“小说到视频无限画布生产平台”架构。核心原则沿用 PRD：**无限画布是主工作台，AI 生成只是画布上的动作，不是产品本体。**

## 1. 架构结论

guga-flow 推荐采用 **TypeScript 全栈 monorepo + Canvas-first 架构**：

```text
用户
  ↓
Next.js Web 工作台
  ├─ tldraw 无限画布
  ├─ LeftSidebar：小说 / 场景 / 人物 / 场地 / 素材 / 队列
  ├─ Inspector：节点详情 / Prompt / 生成参数 / 任务日志
  └─ BottomJobQueue：生成任务状态
  ↓
NestJS Backend API
  ├─ Project / Canvas / Asset / Novel / Storyboard
  ├─ Prompt Composer / Provider Registry
  ├─ GenerationJob / EditorExport
  └─ SSE / polling 状态查询
  ↓
Worker
  ├─ mock / real LLM
  ├─ ImageProvider
  ├─ VideoProvider
  └─ EditorBridge zip/export
  ↓
PostgreSQL + Redis + Local Storage
```

推荐仓库结构：

```text
guga-flow/
├── apps/
│   ├── frontend/          Next.js + React + tldraw 工作台
│   ├── backend/           NestJS API + Prisma 数据层 + Agent 编排
│   └── worker/            图片/视频/剪辑包异步任务
├── packages/
│   ├── shared-types/      DTO、zod schema、画布节点、任务事件
│   ├── provider-contracts/LLM/Image/Video/Editor Provider 接口
│   └── ui/                可选，共享 UI 组件
├── infra/
│   ├── docker-compose.yml PostgreSQL / Redis / Nginx
│   └── nginx/
└── docs/
```

技术选型：

| 层级 | 采用技术 | 来自 text2sql | guga-flow 关键补充 |
| --- | --- | --- | --- |
| Monorepo | pnpm workspace | 已验证 | 增加 worker、provider contracts、ui 包 |
| 前端 | Next.js 14 + React 18 + TypeScript | 已验证 | tldraw 作为主画布 |
| UI | Tailwind CSS v4 + shadcn-ui + lucide-react | 已验证 | 影视生产工作台布局，不做 landing page |
| 服务端 | NestJS 10 + ValidationPipe + Config | 已验证 | Project/Canvas/Asset/Generation/Export 模块 |
| 数据库 | PostgreSQL + Prisma 7 | 已验证 | Hybrid Snapshot + Normalized Business Data |
| 队列/缓存 | Redis | 已验证 | 任务队列、进度 pub/sub、SSE 状态 |
| AI 编排 | LangGraph / AI SDK / OpenAI-compatible | 已验证 | 小说解析、分镜、Prompt Composer、画布 Agent |
| 生成任务 | 独立 Worker | text2sql 未独立拆分 | 图片、视频、剪辑包必须异步化 |
| 网关 | Nginx dev gateway | 已验证 | 统一入口 + SSE/媒体路径代理 |
| 测试 | Vitest / Playwright / Jest | 部分已验证 | 增加画布、任务、导出端到端验收 |

## 2. 产品闭环决定架构

PRD 的 MVP 闭环是：

```text
Project
→ NovelDocument
→ StoryboardResult
→ CanvasDocument snapshot
→ CanvasNode / CanvasEdge
→ Asset references
→ Prompt Composer
→ GenerationJob
→ ImageNode
→ VideoNode
→ EditorPackageNode
→ timeline.json zip
```

因此架构必须满足四个约束：

1. **所有生成结果都必须落成画布节点和语义边**  
   Shot 生成图片必须创建 ImageNode 和 `generated_image` 边；Image 生成视频必须创建 VideoNode 和 `generated_video` 边；导出剪辑包必须创建 EditorPackageNode 和 `sent_to_editor` 边。

2. **画布视觉状态和业务事实必须双写**  
   tldraw snapshot 负责快速恢复视觉状态；CanvasNode / CanvasEdge / Asset / GenerationJob 负责业务查询、生成、导出和回溯。

3. **AI 与 Provider 调用只能在服务端执行**  
   浏览器不保存、不直连第三方模型 API key。前端只创建任务和展示状态。

4. **MVP 必须能在无真实 API key 时完整跑通**  
   mock LLM、mock image、mock video、mock editor export 是第一优先级，不是临时玩具。

## 3. 与 text2sql 的继承和替换

继承 text2sql：

- pnpm monorepo：`apps/*` + `packages/*`
- Next.js + React + Tailwind v4 + shadcn-ui
- NestJS + TypeScript + ConfigModule + ValidationPipe
- Prisma + PostgreSQL 的业务持久化
- Redis 的短期状态和缓冲能力
- Nginx 统一入口：`3000 -> frontend 3001 / backend 3002`
- 前后端共享类型包
- LLM gateway / provider router / health check 的思路
- lint / test / build / Prisma generate 的质量门禁

替换 text2sql：

| text2sql 概念 | guga-flow 概念 |
| --- | --- |
| Session / Message / SqlRun | Project / AgentRun / GenerationJob / GenerationRun |
| Datasource / Table Permission | Asset / CanvasNode / CanvasEdge / Project owner |
| SQL 生成与执行 | Novel parse / Storyboard / Prompt compose / Image / Video / Export |
| Chat-first UI | Canvas-first 工作台，聊天或 Agent 面板只是辅助入口 |
| SQL 安全检查 | Provider 安全、任务幂等、成本控制、素材下载入库 |

## 4. 前端架构

### 4.1 应用结构

前端是产品主体，不是表单壳。页面建议：

```text
/projects
/projects/:projectId/canvas
/projects/:projectId/assets
/projects/:projectId/export
/settings/providers
```

`/projects/:projectId/canvas` 是主工作台：

```text
TopBar
  项目名 / 保存状态 / 生成分镜 / 批量生成 / 导出剪辑包 / 设置

LeftSidebar
  小说 / 场景 / 人物 / 场地 / 素材 / 生成队列

CanvasViewport
  tldraw infinite canvas
  custom business shapes
  semantic arrows / bindings
  SceneFrames

Inspector
  节点详情 / Prompt / 生成参数 / 历史版本 / 任务日志

BottomJobQueue
  queued / running / provider_waiting / failed / succeeded
```

### 4.2 前端依赖

基础依赖：

- `next`
- `react`
- `typescript`
- `tailwindcss`
- `shadcn`
- `radix-ui` / `@base-ui/react`
- `lucide-react`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `sonner`

guga-flow 增补：

- `tldraw`：MVP 主画布。
- `@tanstack/react-query`：API 查询、任务轮询、缓存失效。
- `zustand`：画布 UI 局部状态，如选区、面板展开、批量操作草稿。
- `react-dropzone`：小说、图片、视频、参考图上传。
- `zod`：前端表单和 StoryboardResult 校验复用。
- `playwright`：E2E 验证画布工作流。

### 4.3 tldraw 与业务节点映射

每个 custom shape 的 props 只保存渲染摘要，不保存大文本或完整业务事实：

```ts
interface BusinessShapeProps {
  nodeId: string;
  nodeType: CanvasNodeType;
  w: number;
  h: number;
  title?: string;
  status?: NodeStatus;
  collapsed?: boolean;
  previewAssetId?: string;
}
```

业务事实保存在 `CanvasNode.dataJson`：

```text
NovelNode
SceneFrame
SceneNode
ShotNode
CharacterAssetNode
LocationAssetNode
ImageNode
VideoNode
EditorPackageNode
```

语义关系保存在 `CanvasEdge.relation`：

```text
derived_from
belongs_to_scene
references_character
references_location
references_style
references_prop
generated_image
generated_video
first_frame_for
selected_version_for
sent_to_editor
sequence_next
```

关键规则：

- 移动、缩放节点：更新 tldraw snapshot，必要时批量同步 `CanvasNode.x/y/width/height`。
- 编辑节点业务字段：先 PATCH `CanvasNode.dataJson`，再更新 shape props 摘要。
- 创建/删除连线：同时创建/删除 tldraw arrow 和 `CanvasEdge`。
- 删除业务节点：删除 shape、CanvasNode、相关 CanvasEdge；不自动删除已生成 Asset。

### 4.4 自动保存

保存粒度：

| 数据 | 保存策略 |
| --- | --- |
| `CanvasDocument.snapshotJson` | debounce 500-1000ms |
| `CanvasNode` geometry | debounce 500ms 批量保存 |
| `CanvasNode.dataJson` | blur / submit 即保存 |
| `CanvasEdge` | 创建/删除时立即保存 |
| `Asset` | 上传或生成完成时立即保存 |
| `GenerationJob` | 状态变化时立即保存 |

保存状态必须出现在 TopBar：保存中、已保存、保存失败、点击重试。

### 4.5 画布性能边界

MVP 性能目标：

- 300 个业务节点项目打开小于 3 秒。
- 300 个节点拖拽无明显卡顿。
- 1000 个节点可打开和缩放，复杂媒体节点可降级为缩略卡。
- 单项目 snapshotJson 超过 20MB 时提示拆章节。

设计策略：

- Shape 卡片只展示摘要。
- 大文本只在 Inspector 拉取。
- ImageNode / VideoNode 默认缩略图，视频不自动播放。
- 画布外媒体节点不加载大预览。
- 批量任务只更新状态 badge，不重绘整张画布。

## 5. 后端架构

### 5.1 Backend 模块

`apps/backend` 使用 NestJS，模块边界如下：

| 模块 | 职责 |
| --- | --- |
| `project` | 项目 CRUD、复制、默认用户归属、默认画幅 |
| `novel` | 粘贴文本、txt/md 上传、NovelDocument 管理 |
| `storyboard` | StoryboardResult schema、mock/real LLM 生成、预览草稿 |
| `canvas` | CanvasDocument、CanvasNode、CanvasEdge、导入布局、自动保存 |
| `asset` | 上传、缩略图信息、StorageProvider、本地/远程下载入库 |
| `prompt` | Image / Video Prompt Composer，输出 debugParts |
| `generation` | GenerationJob 创建、查询、retry、cancel、状态事件 |
| `provider` | LLM/Image/Video/Editor provider registry、配置和健康检查 |
| `export` | EditorExport、timeline manifest、storyboard.csv、zip 任务创建 |
| `system` | health、依赖状态、mock/real provider 可用性 |

### 5.2 Server-side Prompt Composer

前端可以预览 prompt，但最终任务必须由服务端重新合成：

```text
全局风格
+ Scene mood / timeOfDay
+ Location locationPrompt
+ Character identityPrompt
+ Shot visualDescription / action / cameraMovement
+ 模型特定后缀
+ negativePrompt
```

`GenerationJob.inputJson` 必须保存：

- 最终 prompt
- negativePrompt
- referenceAssetIds
- provider 参数
- debugParts
- sourceNodeId / targetNodeId

这样才能复现一次生成结果，也方便 Inspector 展示“这段 prompt 来自哪个节点”。

### 5.3 Provider Registry

Provider 配置分三层：

```text
.env                    API key 和敏感配置
providers.config.ts      静态注册、能力声明、默认参数
ProviderConfig 表         enabled、displayName、defaultModel、paramsJson
```

原则：

- 浏览器永不接触 provider API key。
- 未配置 key 时 provider 显示 disabled，但 mock provider 始终可用。
- 真实 provider 返回远程文件 URL 时，服务端必须下载到 StorageProvider，再创建 Asset，不能只引用临时 URL。
- Provider 错误必须标准化，返回可读 `errorMessage`。

## 6. Worker 与异步任务

### 6.1 为什么必须有 Worker

PRD 中图片、视频和剪辑包生成都不是普通 HTTP 请求：

- 视频 provider 通常需要 `createTask -> provider_waiting -> poll -> succeeded`。
- 批量 Shot 到图片、批量 Image 到视频需要并发控制。
- zip 打包需要读本地文件和生成 manifest。
- 失败 retry 要保留原 Job，不能覆盖历史。

因此 `apps/worker` 是架构边界，不是后期优化。

### 6.2 队列策略

MVP 可用 DB-backed queue 起步：

```text
GenerationJob.status = queued
worker polling queued jobs
worker mark running
provider returns immediate result or providerTaskId
worker mark provider_waiting
worker polling provider task
worker mark succeeded / failed / cancelled
```

后续任务量上来再切 BullMQ / PGMQ。即使切队列库，`GenerationJob` 仍是最终事实来源。

默认并发：

```ts
const WORKER_LIMITS = {
  imageConcurrency: 3,
  videoConcurrency: 2,
  pollIntervalMs: 5000,
};
```

### 6.3 Job Executor

每种 operation 一个 executor：

```ts
type GenerationOperation =
  | "novel_to_storyboard"
  | "shot_to_image"
  | "character_to_image"
  | "location_to_image"
  | "image_to_video"
  | "shot_to_video"
  | "batch_shots_to_images"
  | "batch_images_to_videos"
  | "editor_export";
```

Worker 成功后的副作用：

| Operation | 成功后创建/更新 |
| --- | --- |
| `novel_to_storyboard` | `GenerationJob.outputJson` 保存 StoryboardResult |
| `shot_to_image` | Asset + ImageNode + `generated_image` edge |
| `image_to_video` | Asset + VideoNode + `generated_video` edge |
| `editor_export` | EditorExport + package Asset + EditorPackageNode + `sent_to_editor` edges |

失败规则：

- failed 后不删除 target node。
- retry 创建新 Job，原 Job 保留。
- provider_waiting 不得重复提交 provider task。
- cancel 如果 provider 支持则调用 `cancelTask`。

## 7. 数据架构

### 7.1 Hybrid Snapshot + Normalized Business Data

这是 guga-flow 最重要的数据原则：

```text
CanvasDocument.snapshotJson
  用于恢复 tldraw 视觉状态、撤销重做、复制粘贴、viewport

CanvasNode / CanvasEdge / Asset / GenerationJob
  用于业务查询、生成任务、导出、统计、回溯、换画布引擎
```

不要只存 snapshot，也不要只存业务表。

### 7.2 核心模型

MVP 数据模型以 PRD schema 为准，后端 Prisma 先落这些表：

```text
User
Project
NovelDocument
CanvasDocument
CanvasNode
CanvasEdge
Asset
GenerationJob
EditorExport
NodeVersion
ProviderConfig
```

补充建议：

- `User` MVP 只需要默认用户和 `Project.ownerUserId`，不做 RBAC。
- Character / Location / Shot / Image / Video 都是 `CanvasNode.type + dataJson`，不要过早拆成多张强类型表。
- `NodeVersion` 用于 V1.5 之后的变体、历史生成结果和回滚。
- `ProviderConfig` 可以在 Phase 9/10 前加入，Phase 0-8 先由 `.env + providers.config.ts` 支撑。

### 7.3 StorageProvider

MVP 使用 local storage：

```text
data/uploads/:projectId/...
data/assets/:projectId/...
data/exports/:projectId/...
```

抽象接口：

```ts
interface StorageProvider {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  getPublicUrl(storageKey: string): string;
  deleteObject(storageKey: string): Promise<void>;
}
```

后续可替换为 S3 / R2 / OSS / Supabase Storage，不影响 Asset 表和 Worker。

## 8. API 架构

建议保持 `/api/v1` 前缀，兼容 text2sql 的版本化习惯。

### Project

```http
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId
POST   /api/v1/projects/:projectId/duplicate
```

### Novel / Storyboard

```http
POST   /api/v1/projects/:projectId/novels
GET    /api/v1/projects/:projectId/novels
GET    /api/v1/projects/:projectId/novels/:novelId
PATCH  /api/v1/projects/:projectId/novels/:novelId
DELETE /api/v1/projects/:projectId/novels/:novelId
POST   /api/v1/projects/:projectId/novels/:novelId/generate-storyboard
```

### Canvas

```http
GET    /api/v1/projects/:projectId/canvas
PATCH  /api/v1/projects/:projectId/canvas/snapshot
POST   /api/v1/projects/:projectId/canvas/import-storyboard
POST   /api/v1/projects/:projectId/canvas/nodes
PATCH  /api/v1/projects/:projectId/canvas/nodes/:nodeId
PATCH  /api/v1/projects/:projectId/canvas/nodes/batch
DELETE /api/v1/projects/:projectId/canvas/nodes/:nodeId
POST   /api/v1/projects/:projectId/canvas/edges
DELETE /api/v1/projects/:projectId/canvas/edges/:edgeId
POST   /api/v1/projects/:projectId/canvas/layout
```

### Asset

```http
POST   /api/v1/projects/:projectId/assets/upload
GET    /api/v1/projects/:projectId/assets
GET    /api/v1/projects/:projectId/assets/:assetId
PATCH  /api/v1/projects/:projectId/assets/:assetId
DELETE /api/v1/projects/:projectId/assets/:assetId
```

### Generation

```http
POST   /api/v1/projects/:projectId/generation/jobs
GET    /api/v1/projects/:projectId/generation/jobs
GET    /api/v1/projects/:projectId/generation/jobs/:jobId
POST   /api/v1/projects/:projectId/generation/jobs/:jobId/retry
POST   /api/v1/projects/:projectId/generation/jobs/:jobId/cancel
GET    /api/v1/projects/:projectId/generation/events
```

`generation/events` 可用 SSE；MVP 也可以先用 polling，但事件结构要提前稳定：

```ts
interface GenerationEvent {
  type:
    | "job-created"
    | "job-started"
    | "progress"
    | "provider-poll"
    | "asset-created"
    | "canvas-node-created"
    | "job-succeeded"
    | "job-failed"
    | "job-cancelled";
  projectId: string;
  jobId: string;
  at: string;
  data: Record<string, unknown>;
}
```

### Editor Export

```http
POST   /api/v1/projects/:projectId/editor-exports
GET    /api/v1/projects/:projectId/editor-exports
GET    /api/v1/projects/:projectId/editor-exports/:exportId
POST   /api/v1/projects/:projectId/editor-exports/:exportId/send
GET    /api/v1/projects/:projectId/editor-exports/:exportId/download
```

## 9. 本地开发架构

端口：

```text
3000  Nginx 统一入口
3001  frontend 内部端口
3002  backend 内部端口
3003  worker health/debug，可选
5432  PostgreSQL
6379  Redis
```

脚本：

```json
{
  "scripts": {
    "dev": "pnpm --parallel --filter \"./apps/*\" run dev",
    "worker": "pnpm --filter @guga-flow/worker run dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "format:check": "pnpm -r lint",
    "db:migrate": "pnpm --filter @guga-flow/backend run prisma:migrate",
    "db:studio": "pnpm --filter @guga-flow/backend run prisma:studio"
  }
}
```

启动：

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
cp apps/worker/.env.example apps/worker/.env
pnpm --filter @guga-flow/backend run prisma:generate
pnpm dev
```

环境变量：

```text
PORT=3002
CORS_ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql://admin:admin@localhost:5432/guga_flow
REDIS_URL=redis://localhost:6379
ASSET_STORAGE_DIR=data/assets
UPLOAD_STORAGE_DIR=data/uploads
EXPORT_STORAGE_DIR=data/exports

LLM_PROVIDER=mock
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=mock-storyboard

IMAGE_PROVIDER=mock-image
VIDEO_PROVIDER=mock-video
LOCAL_EDITOR_URL=

WORKER_CONCURRENCY=2
```

## 10. 实施路线

结合 PRD Roadmap，工程实现顺序建议如下：

| Phase | 目标 | 架构产物 |
| --- | --- | --- |
| 0 | 仓库与工程基础 | pnpm workspace、Next.js、NestJS、Prisma、mock providers、CI |
| 1 | 项目管理 + 资产库 | Project CRUD、Asset upload、local StorageProvider |
| 2 | tldraw 画布与持久化 | CanvasDocument、snapshot autosave、保存状态 |
| 3 | 业务 Custom Shapes + Inspector | CanvasNode CRUD、ShapeUtil、Inspector 表单 |
| 4 | 语义边与资产绑定 | CanvasEdge、arrow/binding、Character/Location drop |
| 5 | 小说导入 + Storyboard JSON | NovelDocument、StoryboardResult zod、mock LLM |
| 6 | Storyboard 导入画布 | 自动布局、批量 node/edge/shape 创建、fit-to-content |
| 7 | Prompt Composer | Character/Location 增强、server-side prompt debugParts |
| 8 | GenerationJob + Worker mock | DB-backed queue、mock image/video、节点状态同步 |
| 9 | 真实图片 Provider | ImageProvider registry、远程图片下载入库、多图输出 |
| 10 | 真实视频 Provider | VideoProvider polling、cancel、并发控制、批量图生视频 |
| 11 | EditorBridge | timeline.json、storyboard.csv、zip、LOCAL_EDITOR_URL |
| 12 | 画布效率增强 | 批量生成、搜索、MiniMap、SceneFrame 折叠、NodeVersion |

## 11. 质量门禁

基础门禁：

```bash
pnpm run format:check
pnpm run test
pnpm run build
```

前端：

```bash
pnpm --filter @guga-flow/frontend run lint
pnpm --filter @guga-flow/frontend run test
pnpm --filter @guga-flow/frontend run build
pnpm --filter @guga-flow/frontend run e2e
```

后端：

```bash
pnpm --filter @guga-flow/backend run lint
pnpm --filter @guga-flow/backend run test
pnpm --filter @guga-flow/backend run build
pnpm --filter @guga-flow/backend run prisma:generate
```

Worker：

```bash
pnpm --filter @guga-flow/worker run lint
pnpm --filter @guga-flow/worker run test
pnpm --filter @guga-flow/worker run build
```

必须覆盖的测试：

- Storyboard zod schema。
- Prompt composer。
- Storyboard import layout。
- CanvasEdge relation sync。
- Provider adapter input normalization。
- Timeline manifest builder。
- Novel -> Storyboard -> Canvas import。
- Shot -> mock Image -> ImageNode。
- Image -> mock Video -> VideoNode。
- VideoNodes -> EditorPackage zip。

MVP E2E：

```text
1. 创建项目。
2. 粘贴小说。
3. 生成 mock storyboard。
4. 导入画布。
5. 拖人物到 Shot。
6. 生成图片。
7. 生成视频。
8. 导出剪辑包。
9. 刷新页面，确认节点、边、状态仍存在。
```

## 12. 架构取舍

| 问题 | MVP 决策 | 后续演进 |
| --- | --- | --- |
| 画布引擎 | tldraw | React Flow 只作为任务图/debug graph |
| 业务节点建模 | `CanvasNode.type + dataJson` | 稳定后再拆强类型表 |
| 画布持久化 | snapshot + normalized tables | 多人协作前再考虑 CRDT |
| 队列 | DB-backed queue | 任务量上来切 BullMQ/PGMQ |
| 存储 | local StorageProvider | 部署/协作时切对象存储 |
| 用户系统 | 默认用户 + Project owner | V2 多人协作再做 RBAC |
| Provider | mock-first | Phase 9/10 接真实 image/video |
| 剪辑器 | zip + LOCAL_EDITOR_URL | 后续 iframe/postMessage 或内置轻量时间线 |

## 13. 架构红线

1. 不做 chat-only 产品；所有 AI 结果必须回到画布节点。
2. 不把 provider API key 放到浏览器。
3. 不只存 tldraw snapshot；业务事实必须进入 CanvasNode / CanvasEdge / Asset / GenerationJob。
4. 不让 Worker 成功只返回 URL；生成媒体必须下载入库并创建 Asset。
5. 不在失败时悄悄删除节点；失败应体现为 Job 和节点状态。
6. 不把 MVP 绑死在真实模型；mock workflow 必须完整可演示。

## 14. 一句话原则

guga-flow 的技术架构要继承 text2sql 的 **TypeScript 全栈工程纪律**，但所有模块都要服从 PRD 的核心叙事：**小说、分镜、人物、场地、图片、视频和剪辑包都在无限画布中成为可追踪、可编辑、可重试、可导出的生产节点。**

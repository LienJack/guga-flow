# guga-flow

guga-flow 是一个面向“小说到视频”生产流程的无限画布工作台。项目把小说文本、分镜、角色、地点、参考素材、AI 生成图片、AI 生成视频和剪辑导出包都建模为可追踪的生产节点，让创作者可以在同一个画布里完成素材管理、叙事拆解、节点编排、生成任务和导出交付。

当前版本以 mock-first 为主，默认不依赖真实 AI Provider 密钥，适合本地开发、流程验证和后续功能迭代。

## 简单架构

这是一个 pnpm TypeScript monorepo，核心目录如下：

```text
guga-flow/
├── apps/
│   ├── frontend/          # Next.js 前端，项目看板、画布工作台、设置中心
│   ├── backend/           # NestJS API，项目、资产、画布、生成、导出等业务接口
│   └── worker/            # 生成任务 Worker，支持 mock 工作流和队列轮询
├── packages/
│   ├── shared-types/      # 前后端共享领域类型
│   └── provider-contracts/ # LLM/Image/Video Provider 抽象与 mock provider
├── infra/                 # 本地 Postgres、Redis、Nginx 开发网关
├── docs/                  # 研发计划、开发说明、部署拓扑等文档
└── data/                  # 本地上传、资产、导出文件目录
```

运行时关系：

```text
Browser
  │
  ▼
Next.js frontend :3001
  │  REST API
  ▼
NestJS backend :3002  ── PostgreSQL :5432
  │                   └─ Redis :6379
  │
  ▼
Worker process

Nginx dev gateway :3000 可作为本地网关入口。
```

主要技术栈：

- 前端：Next.js 16、React 19、tldraw、Tailwind CSS、lucide-react
- 后端：NestJS 11、Prisma 7、PostgreSQL、Redis
- Worker：TypeScript、tsx、mock generation workflow
- 共享包：`@guga-flow/shared-types`、`@guga-flow/provider-contracts`

## 功能

### 项目与资产

- 项目列表、创建、打开、编辑、删除和复制
- 项目维度的图片、视频、音频、文本、Markdown 素材上传
- 素材列表、详情、预览和删除
- 后端托管本地上传路径，浏览器不直接接触 Provider 密钥

### 无限画布工作台

- 项目级 tldraw 画布，支持快照保存和恢复
- 业务节点：Novel、Scene Frame、Scene、Shot、Character、Location、Image、Video、Editor Package
- 节点 Inspector，支持镜头、角色、地点等类型化字段编辑
- 画布自动保存、保存状态提示、Fit to content
- 节点位置和尺寸同步到后端规范化数据

### 语义关系与生产编排

- Character / Location / Shot / SceneFrame 之间的语义绑定
- 语义边以规范化 `CanvasEdge` 保存，并在画布中投影为连接线
- 选择连接线后可查看关系信息并删除绑定
- Location 到 SceneFrame 的批量应用，可影响框内 Shot 节点

### 小说、分镜与提示词

- 小说和分镜相关面板
- Shot 提示词预览与资产引用
- 角色、地点、参考图、音频等生产上下文绑定
- 项目级技能模板、Provider 设置、快捷键偏好和数据维护入口

### 生成与导出

- mock LLM / Image / Video Provider
- 生成任务 API 与 Worker 队列处理入口
- 本地 mock media workflow 验证
- Editor Export Package 生成，包含时间线、素材引用和音频轨道清单

### Agent 辅助

- 画布 Agent Action：创建节点、更新标题、建立语义链接
- 可撤销的确定性画布操作
- 项目级 Agent memory 记录与 recall
- 生产工作流、技能模板和 Provider 配置的基础管理能力

## 启动

### 环境要求

- Node.js >= 26.3.0
- pnpm >= 10.0.0
- Docker 或兼容的本地容器运行时

仓库内已提供 `.nvmrc` 和 `.node-version`，推荐先切到项目指定 Node 版本：

```bash
nvm use
```

### 安装依赖

```bash
pnpm install
```

### 准备环境变量

```bash
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env
cp apps/worker/.env.example apps/worker/.env
```

默认配置使用 mock provider：

```text
LLM_PROVIDER=mock
IMAGE_PROVIDER=mock-image
VIDEO_PROVIDER=mock-video
```

### 启动本地基础设施

```bash
docker compose -f infra/docker-compose.yml up -d
```

默认端口：

- `3000`：Nginx 开发网关
- `3001`：前端
- `3002`：后端 API
- `5432`：PostgreSQL
- `6379`：Redis

### 初始化数据库

```bash
pnpm run db:generate
pnpm run db:migrate
```

### 启动开发服务

```bash
pnpm run dev
```

启动后访问：

- 前端项目看板：`http://localhost:3001`
- 后端 API 前缀：`http://localhost:3002/api/v1`
- Nginx 本地网关：`http://localhost:3000`

默认开发账号：

- 账号：`admin`
- 密码：`admin`

首页是项目看板。创建或打开项目后，会进入 `/projects/:projectId/canvas` 画布工作台。

### Worker 与 mock 工作流

运行一次本地 mock workflow：

```bash
pnpm run mock:workflow
```

以队列模式启动 Worker：

```bash
pnpm --filter @guga-flow/worker run dev
```

只处理一个生成任务：

```bash
pnpm --filter @guga-flow/worker run worker:once
```

## 常用命令

```bash
pnpm run format:check
pnpm run test
pnpm run build
pnpm run db:studio
```

更多本地开发说明见 [docs/development.md](docs/development.md)。

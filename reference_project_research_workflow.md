# video-ref 参考项目研究工作流

本文用于指导如何研究 `/Users/lienli/Documents/GitHub/video-ref/` 下的视频生产类参考项目，并把结论沉淀为可复用的 Markdown 文档。

当前参考项目：

- `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app`

`Toonflow-app` 是一个 TypeScript / Node.js / Electron 项目，定位为 AI 短剧、漫剧生产工作台，覆盖小说导入、剧本改编、角色与分镜、素材生成、视频节点、Agent 协作、记忆和模型供应商配置等流程。

## 适用场景

当问题涉及视频生产、AI 短剧工作台、无限画布、素材生成、剧本改编或 Agent 化创作流程时，使用本流程研究 `video-ref`。

典型问题：

- Toonflow 如何组织“小说 → 剧本 → 分镜 → 素材 → 视频”的生产链路。
- ScriptAgent 和 ProductionAgent 分别承担什么职责。
- 项目如何设计模型供应商、AI 调用、记忆、Skill、工具和任务记录。
- 无限画布或分镜数据如何保存、读取和回流。
- 素材生成、图片生成、音频绑定、视频节点等模块如何拆分。
- 当前项目要借鉴 video-ref 的哪些产品流程、数据模型或工程边界。

## 核心原则

1. 先定义视频生产问题，再定位 Toonflow 模块。
2. 先读 README、package、路由和目录结构，再读具体源码。
3. 优先从产品流程和数据流理解系统，不从单个函数开始。
4. 源码用于验证关键事实，不做无目的全仓库浏览。
5. 每个结论标注证据强度，并写入 Markdown，避免只留在聊天记录。

## 研究范围

默认参考根目录：

```text
/Users/lienli/Documents/GitHub/video-ref/
```

当前重点项目：

```text
/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/
```

重点入口：

| 入口 | 用途 |
| --- | --- |
| `README.md` | 产品定位、主流程、功能清单、使用方式 |
| `package.json` | 技术栈、运行脚本、依赖、构建方式 |
| `src/app.ts` | 服务启动入口 |
| `src/router.ts` | API 路由聚合入口 |
| `src/core.ts` | 核心初始化或全局能力入口 |
| `src/agents/` | ScriptAgent、ProductionAgent 和工具定义 |
| `src/routes/` | 小说、项目、剧本、素材、生成、分镜、设置等业务接口 |
| `src/socket/` | 实时 Agent 交互和 WebSocket 生产链路 |
| `src/utils/agent/` | 记忆、embedding、skill/tool 辅助能力 |
| `src/utils/ai.ts` | AI 调用封装 |
| `src/utils/vendor.ts`、`src/lib/vendor.json` | 模型供应商配置 |
| `src/types/database.d.ts` | 数据库结构和核心实体类型 |

## 研究漏斗

video-ref 当前以原始参考仓库为主，但研究时应先把原始仓库加工成 Graphify 和 Repomix 资产，再采用下面的 7 层漏斗：

```text
第 1 层：README / docs / package.json     产品定位、技术栈、主流程
   ↓ miss
第 2 层：Graphify graph.json             概念图，定位模块关系和候选节点
   ↓ miss
第 3 层：Repomix token tree              带 token 成本的文件地图
   ↓ miss
第 4 层：Route / socket / file map        用户动作到文件的映射
   ↓ miss
第 5 层：Repomix focused context         按主题打包的小型源码包
   ↓ miss
第 6 层：Repomix full context            源码级确认，只抽取命中文件块
   ↓ miss
第 7 层：Raw video-ref repo              最后手段，只打开特定文件
```

关键原则：不要一开始全量阅读 `src/`。Graphify 负责找路，Repomix token tree 负责控 token，focused context 负责给 LLM 小范围源码，原始仓库只做最后验证。

## Graphify + Repomix 流程

`guga-agent` 中真正省 token 的核心，不是直接让 LLM 读仓库，而是先把参考项目加工成两类中间资产：

- **Graphify 图谱**：回答“概念、模块、文件之间有什么关系，应该先看哪里”。
- **Repomix token tree / packed context**：回答“候选文件在哪里，需要抽取哪些源码块验证事实”。

迁移到 `video-ref` 时，推荐先为 `Toonflow-app` 建立 Graphify 图和 Repomix 快照，再按查询问题逐层使用。

### 目标形态

把 `Toonflow-app` 从“一个需要临时翻源码的大仓库”变成：

- 有入口索引：LLM 能先知道该从哪里开始。
- 有主题路由：按“剧本、分镜、素材、Agent、供应商、记忆”等主题找文件。
- 有小型上下文包：高频问题不必每次重新读 README 和源码。
- 有证据清单：结论能回到具体文件、路由、类型或函数。
- 有建设状态：知道哪些主题已经整理过，哪些仍待验证。

### 推荐目录结构

在当前项目中沉淀 `video-ref` 研究材料时，建议使用：

```text
docs/research/video-ref/
  index.md                       # 总入口：从这里开始
  build-status.md                # 索引和 context pack 建设状态
  source-contract.md             # 参考项目版本、路径、commit、license
  graphs/
    toonflow-app/
      graph.json                 # Graphify 图谱
      GRAPH_REPORT.md            # Graphify 聚类/关键节点报告
  repomix/
    toonflow-app-token-tree.txt  # 带 token 计数的文件地图
    toonflow-app-context.xml     # 基础 packed context
    toonflow-app-focused-*.xml   # 按主题抽取的小型源码包
  file-map.md                    # 目录结构和模块说明
  route-map.md                   # HTTP 路由、socket 事件、用户动作映射
  data-model-map.md              # 核心表、实体、状态字段
  evidence-ledger.md             # 关键事实与证据索引
  context-packs/
    product-flow.md
    agent-architecture.md
    storyboard-flow.md
    assets-generation.md
    vendor-system.md
    memory-skill.md
```

如果不想马上创建目录，也可以先把这些章节集中写在单个研究文档中；等内容变多后再拆分。

### Phase 0：记录来源版本

先记录 Toonflow 的版本锚点：

```bash
git -C /Users/lienli/Documents/GitHub/video-ref/Toonflow-app rev-parse HEAD
node -p "require('/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/package.json').version"
```

写入：

```text
docs/research/video-ref/source-contract.md
```

模板：

```markdown
# video-ref Source Contract

| 项目 | 本地路径 | Commit / Version | License | 参考价值 | 风险 |
| --- | --- | --- | --- | --- | --- |
| Toonflow-app | `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app` | `<commit>` / `<version>` | Apache-2.0 | AI 短剧生产工作台 | 前端消费逻辑可能不在当前源码范围内 |
```

### Phase 1：生成 Repomix Token Tree

Token tree 是第一层文件地图，用来判断哪些文件值得读，不直接加载源码。

推荐输出：

```text
docs/research/video-ref/repomix/toonflow-app-token-tree.txt
```

命令：

```bash
mkdir -p docs/research/video-ref/repomix

npx repomix@latest /Users/lienli/Documents/GitHub/video-ref/Toonflow-app \
  --token-count-tree 50 \
  --no-files \
  --include "README.md,package.json,src/**/*.ts,src/**/*.tsx" \
  --ignore "data/**,docs/screenshot/**,docs/**/*.png,docs/**/*.jpg,yarn.lock" \
  --output docs/research/video-ref/repomix/toonflow-app-token-tree.xml \
  | tee docs/research/video-ref/repomix/toonflow-app-token-tree.txt
```

使用规则：

```bash
rg -n "scriptAgent|productionAgent|storyboard|flow|vendor|memory|embedding|assets" \
  docs/research/video-ref/repomix/toonflow-app-token-tree.txt
```

如果 `token-tree.txt` 中没有足够信息，再看 `toonflow-app-token-tree.xml` 的目录结构和摘要。不要直接进入完整 packed context。

### Phase 2：生成 Repomix 基础 Packed Context

基础 context 用于源码级确认，但仍要控制范围。不要把截图、视频、锁文件、构建产物打进去。

推荐输出：

```text
docs/research/video-ref/repomix/toonflow-app-context.xml
```

命令：

```bash
npx repomix@latest /Users/lienli/Documents/GitHub/video-ref/Toonflow-app \
  --style xml \
  --output docs/research/video-ref/repomix/toonflow-app-context.xml \
  --include "README.md,package.json,src/**/*.ts,src/**/*.tsx" \
  --ignore "data/**,docs/screenshot/**,docs/**/*.png,docs/**/*.jpg,yarn.lock" \
  --output-show-line-numbers \
  --truncate-base64
```

查询方式：

```bash
rg -n "<file path=\".*(scriptAgent|productionAgent|saveFlowData|getFlowData|vendor|memory)" \
  docs/research/video-ref/repomix/toonflow-app-context.xml
```

只抽取命中的 `<file path="...">` 文件块。不要把整个 XML 塞进上下文。

### Phase 3：生成主题 Focused Context

当某个主题会反复研究时，用 Repomix 生成小型 focused context。

#### Agent 架构

```bash
npx repomix@latest /Users/lienli/Documents/GitHub/video-ref/Toonflow-app \
  --style xml \
  --output docs/research/video-ref/repomix/toonflow-app-focused-agent.xml \
  --include "src/agents/**/*.ts,src/socket/routes/*Agent.ts,src/utils/agent/**/*.ts,src/utils/ai.ts,src/utils/getPrompts.ts" \
  --output-show-line-numbers \
  --truncate-base64
```

#### 分镜 / 画布

```bash
npx repomix@latest /Users/lienli/Documents/GitHub/video-ref/Toonflow-app \
  --style xml \
  --output docs/research/video-ref/repomix/toonflow-app-focused-storyboard.xml \
  --include "src/routes/production/**/*.ts,src/routes/script/**/*.ts,src/types/database.d.ts,src/utils/db.ts" \
  --output-show-line-numbers \
  --truncate-base64
```

#### 素材生成

```bash
npx repomix@latest /Users/lienli/Documents/GitHub/video-ref/Toonflow-app \
  --style xml \
  --output docs/research/video-ref/repomix/toonflow-app-focused-assets.xml \
  --include "src/routes/assets/**/*.ts,src/routes/assetsGenerate/**/*.ts,src/routes/cornerScape/**/*.ts,src/utils/taskRecord.ts,src/utils/image.ts" \
  --output-show-line-numbers \
  --truncate-base64
```

#### 模型供应商

```bash
npx repomix@latest /Users/lienli/Documents/GitHub/video-ref/Toonflow-app \
  --style xml \
  --output docs/research/video-ref/repomix/toonflow-app-focused-vendor.xml \
  --include "src/routes/modelSelect/**/*.ts,src/routes/setting/**/*.ts,src/utils/vendor.ts,src/utils/vm.ts,src/utils/ai.ts,src/lib/vendor.json" \
  --output-show-line-numbers \
  --truncate-base64
```

### Phase 4：生成 Graphify 图谱

Graphify 用来回答“我应该看哪些模块”和“概念之间如何连接”。它先做导航，不替代源码证据。

推荐在参考仓库内生成，再把结果复制到当前项目研究目录：

```bash
cd /Users/lienli/Documents/GitHub/video-ref/Toonflow-app
graphify update .
mkdir -p /Users/lienli/Documents/GitHub/guga-flow/docs/research/video-ref/graphs/toonflow-app
cp graphify-out/graph.json /Users/lienli/Documents/GitHub/guga-flow/docs/research/video-ref/graphs/toonflow-app/graph.json
cp graphify-out/GRAPH_REPORT.md /Users/lienli/Documents/GitHub/guga-flow/docs/research/video-ref/graphs/toonflow-app/GRAPH_REPORT.md
```

如果全仓建图太慢，先对高价值子目录建图：

```bash
cd /Users/lienli/Documents/GitHub/video-ref/Toonflow-app
graphify update src
```

### Phase 5：Graphify 查询

查询时优先用问题驱动，而不是按文件名乱翻。

```bash
graphify query "How does Toonflow turn a novel into script, storyboard, assets, and video?" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json \
  --budget 1800

graphify query "How do ScriptAgent and ProductionAgent use tools, memory, and socket events?" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json \
  --budget 1800

graphify query "Where is storyboard or flow data saved and loaded?" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json \
  --budget 1500

graphify query "How are model vendors configured and executed?" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json \
  --budget 1500
```

查到候选节点后，再用：

```bash
graphify explain "ProductionAgent" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json

graphify path "ScriptAgent" "saveFlowData" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json
```

### Phase 6：Graphify → Repomix → 源码验证

标准查询顺序：

1. 用 Graphify query 找概念、节点和候选文件。
2. 用 Repomix token tree 搜候选关键词，确认文件路径和 token 成本。
3. 用 focused context 或 full context 抽取具体 `<file path="...">` 源码块。
4. 只在 packed context 缺失或需要运行验证时，才打开原始 `video-ref/Toonflow-app` 文件。
5. 把结论写入 `evidence-ledger.md` 或对应 context pack。

示例：

```bash
# 1. 找候选区域
graphify query "How is memory used by Toonflow agents?" \
  --graph docs/research/video-ref/graphs/toonflow-app/graph.json \
  --budget 1500

# 2. 在 token tree 中确认文件
rg -n "memory|embedding|getMemory|clearMemory" \
  docs/research/video-ref/repomix/toonflow-app-token-tree.txt

# 3. 在 focused/full context 中定位源码块
rg -n "<file path=\".*(memory|embedding|getMemory|clearMemory)" \
  docs/research/video-ref/repomix/toonflow-app-context.xml
```

### Phase 7：更新建设状态

每次生成或刷新图谱/context 后，更新：

```text
docs/research/video-ref/build-status.md
```

模板：

```markdown
# video-ref Index Build Status

| 资产 | 状态 | 覆盖范围 | 生成命令 | 下一步 |
| --- | --- | --- | --- | --- |
| Graphify graph | done/todo | Toonflow `src` / full repo | `graphify update src` | 查询关键主题 |
| Repomix token tree | done/todo | README + package + src | `npx repomix --token-count-tree` | 补 file-map |
| Repomix full context | done/todo | README + package + src | `npx repomix --style xml` | 只用于源码验证 |
| focused-agent context | done/todo | agents/socket/utils | `npx repomix --include ...` | 写 agent pack |
| focused-storyboard context | done/todo | production/script/types | `npx repomix --include ...` | 写 storyboard pack |
```

### 索引优先

LLM 友好的第一步不是总结所有源码，而是写一个“从这里开始”的索引。建议 `docs/research/video-ref/index.md` 包含：

```markdown
# video-ref Research Index

## Start Here

- 产品主流程：`context-packs/product-flow.md`
- Agent 架构：`context-packs/agent-architecture.md`
- 分镜和画布：`context-packs/storyboard-flow.md`
- 素材生成：`context-packs/assets-generation.md`
- 模型供应商：`context-packs/vendor-system.md`
- 记忆和 Skill：`context-packs/memory-skill.md`

## Source Entrypoints

| 主题 | 必读文件 | 说明 |
| --- | --- | --- |

## Query Rules

1. 先读本索引。
2. 再读对应 context pack。
3. 需要源码验证时，只打开 pack 中列出的文件。
4. 新发现必须补回 evidence ledger。
```

### Source Contract

为参考项目建立稳定版本锚点，避免下次研究时不知道参考的是哪个状态：

```markdown
# video-ref Source Contract

| 项目 | 本地路径 | Commit / Version | License | 参考价值 | 风险 |
| --- | --- | --- | --- | --- | --- |
| Toonflow-app | `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app` | `<git rev-parse HEAD>` / `package.json version` | Apache-2.0 | AI 短剧生产工作台 | 前端消费逻辑可能不在当前源码范围内 |
```

建议每次开始深度研究前记录：

```bash
git -C /Users/lienli/Documents/GitHub/video-ref/Toonflow-app rev-parse HEAD
node -p "require('/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/package.json').version"
```

### File Map

`file-map.md` 是给 LLM 的源码地图。它不需要解释每一行代码，只记录“文件负责什么、什么时候读”：

```markdown
# Toonflow File Map

| File / Directory | 角色 | 适合回答的问题 |
| --- | --- | --- |
| `src/router.ts` | API 聚合入口 | 哪些业务模块暴露成 HTTP 路由 |
| `src/socket/routes/scriptAgent.ts` | ScriptAgent 实时链路 | 剧本 Agent 如何流式交互 |
| `src/routes/production/saveFlowData.ts` | 画布数据保存 | 无限画布如何持久化 |
```

生成第一版 file map 时可以先用：

```bash
find /Users/lienli/Documents/GitHub/video-ref/Toonflow-app/src -maxdepth 3 -type f | sort
```

然后只人工补充高价值文件，不必把所有文件都写满。

### Route Map

视频生产项目的研究经常从“用户动作”开始。建议维护 `route-map.md`：

```markdown
# Toonflow Route Map

| 用户动作 | HTTP 路由 / Socket 事件 | 关键文件 | 数据实体 | 备注 |
| --- | --- | --- | --- | --- |
| 保存画布 | production save flow | `src/routes/production/saveFlowData.ts` | flow data | 待确认前端结构 |
| 获取分镜 | production storyboard | `src/routes/production/getStoryboardData.ts` | storyboard | 需要结合数据库类型 |
```

路由初筛命令：

```bash
rg -n "router\\.|app\\.|socket|emit|on\\(" /Users/lienli/Documents/GitHub/video-ref/Toonflow-app/src
```

### Context Pack

Context pack 是最重要的 LLM 友好层。每个 pack 控制在 4k-12k tokens，聚焦一个高频主题。

模板：

```markdown
# <Topic> Context Pack

## 问题边界

## 参考版本

## 必读文件

| File | Why |
| --- | --- |

## 产品流程

## 关键抽象

## 已确认事实

## 可借鉴设计

## 不建议照搬

## 待验证问题
```

`video-ref` 推荐先做 6 个 pack：

| Pack | 回答的问题 |
| --- | --- |
| `product-flow.md` | 从小说到视频的端到端生产链路 |
| `agent-architecture.md` | ScriptAgent、ProductionAgent、工具和 socket 的分工 |
| `storyboard-flow.md` | 分镜、画布、节点和保存/读取链路 |
| `assets-generation.md` | 图片、音频、素材生成任务和轮询 |
| `vendor-system.md` | 模型供应商、动态逻辑、AI SDK/provider 接入 |
| `memory-skill.md` | Agent 记忆、embedding、Skill/Prompt 文件化 |

### Evidence Ledger

为了避免“看起来像事实”的总结污染后续设计，建议维护证据账本：

```markdown
# video-ref Evidence Ledger

| Claim | Strength | Evidence | Notes |
| --- | --- | --- | --- |
| Toonflow 主流程是导入原著、生成剧本、进入 ProductionAgent、组织分镜素材并导出视频 | Fact | `README.md` 使用指南 | 产品级事实 |
| 当前项目应借鉴剧本/分镜/素材/视频节点拆分，而非照搬路由结构 | Inference | `README.md`, `src/routes/*`, `src/agents/*` | 架构迁移判断 |
| 画布数据结构需要结合前端确认 | Pending Verification | `src/routes/production/saveFlowData.ts` | 后续验证 |
```

### Build Status

`build-status.md` 记录哪些 LLM 友好资产已经完成，避免重复劳动：

```markdown
# video-ref Index Build Status

| 资产 | 状态 | 覆盖范围 | 下一步 |
| --- | --- | --- | --- |
| source-contract | todo | Toonflow-app | 写 commit/version/license |
| file-map | todo | `src/` maxdepth 3 | 补业务说明 |
| route-map | todo | HTTP + socket | 关联用户动作 |
| product-flow pack | todo | README + routes | 补证据 |
| agent-architecture pack | todo | `src/agents`, `src/socket` | 追踪工具调用 |
```

### 文档写作规则

为了让文档对 LLM 和人都好用：

- 每篇文档开头写“适合回答什么问题”。
- 每个主题给 3-8 个“必读文件”，不要列几十个。
- 表格优先于长段落，用于模块、路由、实体、证据。
- Mermaid 图保持小而稳定，超过 12 个节点就拆成多个图。
- 代码片段只保留关键 10-40 行，并标出文件路径。
- 所有设计判断都回到 `Fact / Inference / Pending Verification`。
- 新研究要补回 `index.md`、`build-status.md` 或对应 context pack。

## 默认执行步骤

### 1. 定义研究问题

每次研究先写清楚：

```text
子系统：<小说导入 / 剧本生成 / 分镜 / 素材生成 / 视频节点 / Agent / 记忆 / 模型供应商 / 无限画布 / ...>
输出：<流程总结 / 架构分析 / 数据模型 / 可借鉴设计 / 实现计划>
范围：<只看 Toonflow-app / 允许补充联网资料 / 需要和当前项目对比>
```

### 2. 建立产品和技术上下文

固定先读：

```bash
sed -n '1,220p' /Users/lienli/Documents/GitHub/video-ref/Toonflow-app/README.md
sed -n '1,220p' /Users/lienli/Documents/GitHub/video-ref/Toonflow-app/package.json
```

需要快速掌握模块地图时：

```bash
find /Users/lienli/Documents/GitHub/video-ref/Toonflow-app/src -maxdepth 3 -type f | sort
```

### 3. 按主题路由文件

| 研究主题 | 优先查看文件 |
| --- | --- |
| 应用启动和后端框架 | `src/app.ts`, `src/core.ts`, `src/router.ts`, `src/middleware/` |
| ScriptAgent 剧本改编 | `src/agents/scriptAgent/`, `src/socket/routes/scriptAgent.ts`, `src/routes/scriptAgent/` |
| ProductionAgent 生产执行 | `src/agents/productionAgent/`, `src/socket/routes/productionAgent.ts`, `src/routes/production/` |
| 小说导入与事件状态 | `src/routes/novel/`, `src/utils/cleanNovel.ts` |
| 剧本管理与素材提取 | `src/routes/script/`, `src/routes/script/extractAssets.ts` |
| 素材库与生成任务 | `src/routes/assets/`, `src/routes/assetsGenerate/`, `src/utils/taskRecord.ts` |
| 分镜和画布数据 | `src/routes/production/getFlowData.ts`, `src/routes/production/saveFlowData.ts`, `src/routes/production/getStoryboardData.ts` |
| 项目和手册配置 | `src/routes/project/`, `src/routes/general/` |
| 模型供应商系统 | `src/routes/modelSelect/`, `src/routes/setting/`, `src/utils/vendor.ts`, `src/lib/vendor.json` |
| AI 调用封装 | `src/utils/ai.ts`, `src/utils/vm.ts` |
| Agent 记忆 | `src/utils/agent/memory.ts`, `src/utils/agent/embedding.ts`, `src/routes/agents/` |
| Skill 和提示词工具 | `src/utils/agent/skillsTools.ts`, `src/utils/getPrompts.ts` |
| 数据库类型 | `src/types/database.d.ts`, `src/utils/db.ts`, `src/lib/initDB.ts` |

### 4. 用搜索定位候选实现

优先用 `rg` 搜索业务词、路由名、实体名和函数名：

```bash
rg -n "ScriptAgent|ProductionAgent|storyboard|flow|asset|vendor|memory|embedding|skill" \
  /Users/lienli/Documents/GitHub/video-ref/Toonflow-app/src
```

如果要从路由反推业务链路：

```bash
rg -n "router\\.|app\\.|socket|emit|on\\(" \
  /Users/lienli/Documents/GitHub/video-ref/Toonflow-app/src
```

如果要从数据表或实体反推模块：

```bash
rg -n "interface|type|CREATE TABLE|knex|sqlite|better-sqlite3" \
  /Users/lienli/Documents/GitHub/video-ref/Toonflow-app/src
```

### 5. 抽取最小源码证据

源码验证只回答具体问题：

- 用户动作对应哪个路由或 socket 事件。
- 数据如何从 API 进入数据库或文件系统。
- Agent 如何组织工具、提示词、记忆和模型调用。
- 素材生成任务如何创建、轮询、取消和保存。
- 分镜或画布数据如何序列化。
- 模型供应商逻辑如何配置、加载和执行。

不要因为打开了一个大文件就继续沿着所有 import 扩散。只追踪和当前问题有关的路径。

### 6. 产出横向结论

输出不要写成“我读了哪些文件”的流水账，要围绕设计问题组织：

```markdown
## 一句话结论

## Toonflow 的实现方式

## 可借鉴模式

## 不建议照搬

## 当前项目落点

## 证据
```

如果是在写架构方案，使用：

```markdown
## 问题框架

## 产品流程

## 模块边界

## 数据流

## 可复用设计

## 迁移边界

## 风险与测试

## 证据索引
```

## 证据强度标记

每个关键结论标注：

- `Fact`：有 README、package、文件路径、源码或类型定义支撑。
- `Inference`：基于多个模块关系推导出的设计判断。
- `Pending Verification`：方向合理，但仍需运行、调试或进一步源码确认。

示例：

```markdown
- `Fact`：Toonflow 在 `README.md` 中把主流程描述为导入原著、生成剧本、进入 ProductionAgent、组织分镜和素材、导出视频。
- `Fact`：`package.json` 显示项目使用 Electron、Express、Socket.IO、SQLite、AI SDK 和多个模型 provider。
- `Inference`：当前项目若要借鉴 Toonflow，应优先借鉴“剧本/分镜/素材/视频节点”的工作流拆分，而不是直接照搬具体路由结构。
- `Pending Verification`：无限画布数据结构需要结合 `saveFlowData.ts`、`getFlowData.ts` 和前端消费方式进一步确认。
```

## 快速模式

适合普通问答，目标 3-8 分钟：

1. 读 `README.md` 和 `package.json`。
2. 用 `find src -maxdepth 3` 建立模块地图。
3. 按主题打开 2-4 个候选入口文件。
4. 用 `rg` 定位关键实体、路由或函数。
5. 抽取最多 3 个源码证据。
6. 输出流程总结、可借鉴点和证据。

## 深度模式

适合架构方案或实现计划，目标 20-60 分钟：

1. 完成快速模式。
2. 追踪一条完整用户链路，例如“导入小说 → 生成剧本 → 提取素材 → 保存分镜 → 生成视频”。
3. 绘制模块边界和数据流。
4. 对关键数据结构、任务状态、AI 调用和持久化做源码确认。
5. 输出带证据索引的方案。

## 建议沉淀的研究文档

如果频繁参考 video-ref，建议按主题沉淀：

```text
docs/research/video-ref/index.md
docs/research/video-ref/build-status.md
docs/research/video-ref/source-contract.md
docs/research/video-ref/file-map.md
docs/research/video-ref/route-map.md
docs/research/video-ref/data-model-map.md
docs/research/video-ref/evidence-ledger.md
docs/research/video-ref/context-packs/product-flow.md
docs/research/video-ref/context-packs/agent-architecture.md
docs/research/video-ref/context-packs/storyboard-flow.md
docs/research/video-ref/context-packs/assets-generation.md
docs/research/video-ref/context-packs/vendor-system.md
docs/research/video-ref/context-packs/memory-skill.md
```

每份 context pack 建议结构：

```markdown
# Research: <topic>

- **Reference**: `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app`
- **Scope**: <product flow / agent / data model / route / socket / persistence>
- **Date**: <YYYY-MM-DD>

## 问题

## 结论

## 产品流程

## 关键文件

| File Path | 用途 |
| --- | --- |

## 数据流 / 调用链

## 可借鉴设计

## 不建议照搬

## 待验证问题
```

## 停止标准

满足任一条件即可停止继续下钻：

- 已能用 README、入口文件和 2-3 个源码证据解释目标设计。
- 已经定位到当前项目可以借鉴的产品流程或模块边界。
- 继续阅读只会增加 Toonflow 的实现细节，不会改变当前项目的架构判断。
- 可以明确标注为 `Pending Verification`，等真正实现或运行时再验证。

## 常见反模式

- 直接全量阅读 `src/`，没有先建立产品流程。
- 只看 Agent 文件，忽略路由、socket、数据库和素材任务。
- 只总结 Toonflow 做了什么，没有说明当前项目如何借鉴。
- 把 README 的产品描述当作源码事实，不做关键路径验证。
- 没有记录文件路径和证据强度。
- 研究只停留在聊天里，没有写入 Markdown。

## 最小可执行清单

每次研究 video-ref，至少完成：

1. 写清楚研究主题、输出形态和范围。
2. 读取 `README.md`、`package.json` 或对应入口文件。
3. 用目录结构和 `rg` 定位候选模块。
4. 抽取必要源码证据。
5. 输出当前项目可借鉴和不建议照搬的内容。
6. 标注 `Fact`、`Inference`、`Pending Verification`。
7. 把结论持久化为 Markdown 文件。

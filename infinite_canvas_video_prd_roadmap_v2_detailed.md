# 小说到视频无限画布平台 PRD + 技术设计 + Roadmap V2

> 版本：V2 / Canvas-first 详细版  
> 目标读者：Codex / 工程团队 / 产品负责人  
> 核心原则：**无限画布是主工作台，AI 生成只是画布上的动作，不是产品本体。**

---

## 1. 项目一句话定义

做一个 **小说视频化的无限画布生产平台**：用户输入小说内容，系统先生成结构化分镜脚本，然后把小说、场景、人物、场地、镜头、参考图、生成图、生成视频和剪辑包全部组织在一个无限画布里。用户可以在画布上拖拽人物资产和场地资产到分镜节点，批量生成图片和视频，最后把选中的视频节点导出给本地 Web 剪辑器。

最小闭环：

```text
小说文本
→ 小说解析 / 事件图
→ 场景与分镜脚本
→ 无限画布节点
→ 人物 / 场地资产绑定
→ Shot 生成 Image
→ Image 生成 Video
→ 选择 Video 生成剪辑包
→ 本地 Web 剪辑器
```

---

## 2. 参考项目与工程启发

### 2.1 画布引擎 / 白板类参考

| 项目 | 参考点 | 对本项目的启发 |
|---|---|---|
| tldraw | React infinite canvas SDK；支持自定义 shapes、tools、bindings、UI；内置选择、缩放、拖拽、复制粘贴、撤销重做、数据 store、持久化思路 | 作为第一版主画布引擎。用 custom shape 承载 Novel / Scene / Shot / Character / Location / Image / Video 节点；用 bindings / arrows 表示引用关系 |
| React Flow | 节点、边、分组、sub flow、DAG 场景成熟 | 不作为主自由画布，但可作为后续“依赖图 / 任务流图 / Debug Graph”视图；React Flow 的 group/subflow 思路可参考 SceneFrame |
| Excalidraw | 轻量手绘白板，reusable libraries 思路好 | 不做主引擎，但借鉴“组件库 / 模板库 / 快速添加图元”的产品体验 |
| AFFiNE / BlockSuite | 文档 + 白板 + 数据库的统一 workspace | 借鉴“小说文档和无限画布互相链接”：NovelDocument 中选中文段可定位到画布节点，画布节点也能回溯原文 |
| Toonflow | 小说/剧本到短剧，脚本、角色、分镜、素材、视频节点放在无限画布式生产工作台；支持章节事件图、Provider 系统、Skill 文件 | 这是最贴近目标产品的参考。重点借鉴“章节事件图驱动改编”和“制作节点可回溯、可并行生产” |

参考资料：

- tldraw SDK: https://tldraw.dev/
- tldraw persistence: https://tldraw.dev/sdk-features/persistence
- tldraw assets: https://tldraw.dev/sdk-features/assets
- tldraw bindings release note: https://tldraw.dev/releases/v2.2.0
- React Flow: https://reactflow.dev/
- React Flow Sub Flow: https://reactflow.dev/examples/grouping/sub-flows
- React Flow Performance: https://reactflow.dev/learn/advanced-use/performance
- Excalidraw: https://github.com/excalidraw/excalidraw
- AFFiNE: https://affine.pro/
- Toonflow: https://github.com/HBAI-Ltd/Toonflow-app

### 2.2 AI 媒体画布类参考

| 项目 | 参考点 | 对本项目的启发 |
|---|---|---|
| Jaaz | 无限画布 + 视觉分镜 + 本地/云模型 + 多角色一致性 | 本项目也要把多角色一致性做成资产引用，而不是每个 shot 独立 prompt |
| Livepeer Storyboard | Agent 在画布上生成可拖拽卡片，并用依赖箭头连接结果 | 生成动作必须落成节点和边，而不是只在聊天里返回文本 |
| Infinite Canvas AI Omnigen | Next.js + React Konva + AI 图片/视频处理 + ffmpeg.wasm | 可借鉴视频抽帧/裁剪，但不能照搬客户端 API key 模式；生产环境必须后端代理 |
| Loomic | Next.js + Fastify + Worker + Supabase + Excalidraw + LangGraph + 多模型 Provider | 架构上可借鉴“Web/API/Worker 分离、Provider 层、Job Queue、画布上下文 Agent” |

参考资料：

- Jaaz: https://github.com/11cafe/jaaz
- Livepeer Storyboard: https://github.com/livepeer/storyboard
- Infinite Canvas AI Omnigen: https://github.com/SparkSylva/Infinite-Canvas-AI-Omnigen
- Loomic: https://github.com/fancyboi999/Loomic

---

## 3. 产品范围

### 3.1 MVP 必须做

1. 用户系统：无权限系统，只需默认用户 / 单用户归属。
2. 项目管理：项目创建、打开、删除、复制、设置默认画幅。
3. 小说导入：粘贴文本、上传 txt/md。
4. 小说解析：生成事件、人物、场地、场景、分镜脚本。
5. 无限画布：自定义业务节点、自动布局、保存、刷新恢复、节点连线、Inspector。
6. 人物资产：自动创建、手动创建、上传参考图、拖到 Shot。
7. 场地资产：自动创建、手动创建、上传参考图、拖到 Shot。
8. Prompt 合成：Shot + Character + Location + Style → Image Prompt / Video Prompt。
9. 图片生成：ImageProvider 接口 + mock provider + image2/banana adapter stub。
10. 视频生成：VideoProvider 接口 + mock provider + seedance/happyhorse adapter。
11. 异步任务：GenerationJob、队列、Worker、状态更新、失败重试。
12. 剪辑桥接：选中视频节点 → timeline manifest + zip → 本地 Web 剪辑器 URL 或下载。

### 3.2 V1.5 做

1. 批量生成关键帧。
2. 批量图生视频。
3. 画布 MiniMap / Outline。
4. SceneFrame 折叠 / 展开。
5. 节点版本管理。
6. 节点搜索。
7. 导出 storyboard.csv / srt。
8. 画布性能优化：节点虚拟化、缩略节点、懒加载媒体。

### 3.3 V2 做

1. 多人协作。
2. Agent 对话式画布操作。
3. Skill / 工作流模板。
4. 长篇小说章节事件图。
5. 镜头连续性审查。
6. 自动补镜头 / 自动检查人物一致性。
7. 内置轻量时间线。
8. 发布平台适配。

### 3.4 明确不做

MVP 不做：

- RBAC / 团队权限。
- 完整剪辑器。
- 支付系统。
- 社区模板市场。
- 多人实时协作。
- 完全自动 10 万字长篇成片。
- 在浏览器直接保存第三方模型 API Key。

---

## 4. 核心用户流程

### 4.1 小说导入到画布

```text
用户创建项目
→ 粘贴小说文本
→ 点击“生成分镜”
→ LLM 生成 Storyboard JSON
→ 用户预览 / 编辑分镜
→ 点击“导入画布”
→ 系统创建 NovelNode / SceneFrame / SceneNode / CharacterAssetNode / LocationAssetNode / ShotNode
→ 自动布局到无限画布
```

验收标准：

- 输入一段 1000–3000 字小说文本，mock 模式下 5 秒内生成结构化 storyboard。
- 导入画布后至少出现：1 个 NovelNode、2 个 SceneFrame、2 个 SceneNode、2 个 CharacterAssetNode、1 个 LocationAssetNode、6 个 ShotNode。
- 每个 ShotNode 包含 imagePrompt、videoPrompt、durationSec、characterAssetIds、locationAssetId。
- 刷新页面后，所有节点位置、节点数据和连线不丢失。

### 4.2 画布资产绑定

```text
用户在左侧人物资产库拖动“女主”
→ 拖到 ShotNode 上
→ ShotNode 高亮可投放状态
→ 松手后创建 references_character 边
→ ShotNode.data.characterAssetIds 增加该人物
→ Inspector 更新
```

验收标准：

- CharacterAssetNode 能拖放到一个或多个 ShotNode。
- LocationAssetNode 能拖放到 ShotNode 或 SceneFrame。
- 拖放到 SceneFrame 时，可以选择“应用到该场景所有镜头”。
- 删除边后，ShotNode.data 中对应 assetId 同步移除。

### 4.3 Shot 生成图片

```text
用户选择 ShotNode
→ 点击“生成图片”
→ 系统合成 prompt
→ 创建 GenerationJob(type=image)
→ Worker 调用 ImageProvider
→ 输出图片保存为 Asset
→ 画布创建 ImageNode
→ 创建 generated_image 边
```

验收标准：

- mock-image provider 下，点击生成后能创建一个占位图片 Asset 和 ImageNode。
- ImageNode 与源 ShotNode 自动连线。
- ImageNode 记录 provider、model、prompt、inputJson、outputJson。
- Job 状态从 queued → running → succeeded / failed。
- 失败状态可 retry，retry 会创建新的 GenerationJob。

### 4.4 Image 生成视频

```text
用户选择 ImageNode
→ 点击“生成视频”
→ 系统找到父级 ShotNode
→ 合成 videoPrompt
→ 创建 GenerationJob(type=video)
→ Worker 调用 VideoProvider
→ 输出视频保存为 Asset
→ 画布创建 VideoNode
→ 创建 generated_video 边
```

验收标准：

- mock-video provider 下，点击生成后能创建一个占位视频 Asset 和 VideoNode。
- 如果 ImageNode 来源于 ShotNode，则视频生成自动继承 Shot.durationSec、aspectRatio、character/location references。
- 视频任务支持 provider polling。
- 任务失败时 VideoNode 不应误标为 done。

### 4.5 发送到本地 Web 剪辑器

```text
用户框选多个 VideoNode
→ 点击“发送到剪辑器”
→ 系统根据画布 x 坐标或用户排序生成 timeline
→ 生成 EditorPackageNode
→ 生成 timeline.json / storyboard.csv / clips
→ 如果 LOCAL_EDITOR_URL 存在，则 POST manifest
→ 否则下载 zip
```

验收标准：

- 至少 3 个 VideoNode 可生成剪辑包。
- zip 中必须包含 timeline.json、storyboard.csv、clips 目录。
- timeline.json 中每个 item 都有 assetId、startMs、durationMs、sourceNodeId。
- 配置 LOCAL_EDITOR_URL 时，系统发送 POST 请求并显示成功/失败。
- 未配置 LOCAL_EDITOR_URL 时，提供 zip 下载。

---

## 5. 画布信息架构

### 5.1 页面布局

```text
┌──────────────────────────────────────────────────────────────┐
│ TopBar                                                       │
│ 项目名 / 保存状态 / 生成分镜 / 批量生成 / 导出剪辑包 / 设置       │
├───────────────┬──────────────────────────────┬───────────────┤
│ LeftSidebar   │ CanvasViewport               │ Inspector     │
│ - 小说文档     │ - tldraw infinite canvas      │ - 节点详情      │
│ - 场景列表     │ - custom business shapes      │ - Prompt       │
│ - 人物资产     │ - semantic arrows/bindings    │ - 生成参数      │
│ - 场地资产     │ - SceneFrames                 │ - 历史版本      │
│ - 媒体资产     │                              │ - 任务日志      │
├───────────────┴──────────────────────────────┴───────────────┤
│ BottomJobQueue                                                │
│ queued / running / provider_waiting / failed / done            │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 左侧 Sidebar

Tabs：

1. **小说**：NovelDocument 列表、章节、原文片段。
2. **场景**：Scene 列表，点击定位 SceneFrame。
3. **人物**：CharacterAsset 列表，支持拖到画布 / Shot。
4. **场地**：LocationAsset 列表，支持拖到画布 / Shot / SceneFrame。
5. **素材**：Image / Video / Package 资产。
6. **生成队列**：当前项目任务。

### 5.3 右侧 Inspector

Inspector 根据选中节点类型切换：

- 未选中：显示项目设置。
- 单选节点：显示该节点的业务字段、prompt、生成操作、版本、关联边。
- 多选节点：显示批量操作。
- 选中边：显示 relation、source、target、删除边。
- 选中 SceneFrame：显示场景批量操作。

### 5.4 画布模式

| 模式 | 目标 | 主要操作 |
|---|---|---|
| Select Mode | 默认操作 | 框选、拖动、连线、打开 Inspector |
| Storyboard Mode | 组织分镜 | 创建 SceneFrame、ShotNode、排序、自动布局 |
| Asset Binding Mode | 绑定人物/场地 | 拖资产到 Shot / SceneFrame，创建引用边 |
| Generation Mode | 批量生产 | 多选 Shot/Image，批量生成图片/视频 |
| Review Mode | 审片 | 预览视频、比较变体、选择 selectedImage/selectedVideo |

MVP 可以先做 Select Mode + Asset Binding + Generation Mode，其他模式通过 Toolbar 按钮和上下文菜单逐步补齐。

---

## 6. 画布技术设计

### 6.1 画布引擎选择

MVP 推荐：**tldraw**。

理由：

1. 它是 React infinite canvas SDK，能减少选择、拖拽、缩放、撤销、复制粘贴、快捷键、框选等基础成本。
2. 支持自定义 shape，我们可以把每个业务节点实现为 `ShapeUtil`。
3. 支持 bindings / arrows，适合表达“人物引用 Shot”“Shot 生成 Image”“Image 生成 Video”这类关系。
4. 支持 assets 思路，图片、视频、bookmark 等媒体可以以 asset record 被 shape 引用；本项目再映射到自己的 Asset 表。
5. UI slot / actions 可覆盖，方便把默认白板 UI 改成影视生产工具 UI。

备选：

- 如果第一版工程师更熟 React Flow，也可以用 React Flow 快速实现 DAG 型画布，但自由画布体验会更像流程图，而不是生产空间。
- Excalidraw 更适合轻量手绘白板，不适合作为富业务节点 + 多媒体生产工作台的主引擎。

### 6.2 持久化策略：Hybrid Snapshot + Normalized Business Data

不要只存 tldraw snapshot，也不要只存业务表。推荐双层结构：

```text
CanvasDocument.snapshotJson
  = tldraw 完整画布状态，用于快速恢复画布视觉状态

CanvasNode / CanvasEdge / Asset / GenerationJob
  = 业务数据，用于查询、任务、生成、导出、调试
```

#### 数据流

```text
用户移动节点
→ tldraw store 变化
→ debounce 500ms 保存 snapshotJson
→ 如果变化影响业务节点 geometry，同步更新 CanvasNode.x/y/w/h

用户编辑 ShotNode 字段
→ 更新 CanvasNode.dataJson
→ 更新 tldraw shape.props.preview 字段
→ snapshotJson debounce 保存

用户创建引用边
→ 创建 tldraw arrow/binding
→ 创建 CanvasEdge(relation=references_character)
→ 更新 ShotNode.data.characterAssetIds
```

#### 为什么这样做

- tldraw snapshot 适合恢复视觉状态、撤销重做、复制粘贴。
- 业务表适合 API 查询、生成任务、导出、统计、回溯。
- 如果未来换画布引擎，业务表仍可保留。

### 6.3 Shape 与 Business Node 映射

每个 tldraw custom shape 的 props 必须包含：

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

业务节点表：

```ts
interface CanvasNodeRecord {
  id: string;
  projectId: string;
  canvasDocumentId: string;
  tldrawShapeId: string;
  type: CanvasNodeType;
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  status: NodeStatus;
  dataJson: unknown;
  createdAt: string;
  updatedAt: string;
}
```

### 6.4 Canvas Edge 映射

CanvasEdge 既有业务关系，也可映射到 tldraw arrow shape。

```ts
interface CanvasEdgeRecord {
  id: string;
  projectId: string;
  canvasDocumentId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceShapeId?: string;
  targetShapeId?: string;
  visualArrowShapeId?: string;
  relation: CanvasEdgeRelation;
  dataJson?: unknown;
  createdAt: string;
}
```

关系枚举：

```ts
type CanvasEdgeRelation =
  | 'derived_from'
  | 'belongs_to_scene'
  | 'references_character'
  | 'references_location'
  | 'references_style'
  | 'references_prop'
  | 'generated_image'
  | 'generated_video'
  | 'first_frame_for'
  | 'selected_version_for'
  | 'sent_to_editor'
  | 'sequence_next';
```

### 6.5 自动保存设计

#### 保存粒度

| 数据 | 保存策略 |
|---|---|
| tldraw snapshot | debounce 500–1000ms |
| CanvasNode geometry | debounce 500ms 批量保存 |
| CanvasNode dataJson | 用户提交 / blur 即保存 |
| CanvasEdge | 创建/删除时立即保存 |
| Asset | 上传/生成完成时立即保存 |
| GenerationJob | 状态变化时立即保存 |

#### API

```http
GET    /api/projects/:projectId/canvas
PATCH  /api/projects/:projectId/canvas/snapshot
PATCH  /api/projects/:projectId/canvas/nodes/batch
POST   /api/projects/:projectId/canvas/nodes
PATCH  /api/projects/:projectId/canvas/nodes/:nodeId
DELETE /api/projects/:projectId/canvas/nodes/:nodeId
POST   /api/projects/:projectId/canvas/edges
DELETE /api/projects/:projectId/canvas/edges/:edgeId
```

#### 保存状态 UI

TopBar 显示：

- 已保存
- 保存中
- 保存失败，点击重试
- 离线，仅本地缓存，V1.5 做

### 6.6 画布性能设计

MVP 性能目标：

- 300 个业务节点可流畅拖拽。
- 1000 个节点可打开和缩放，但允许复杂媒体节点降级为缩略卡。
- 单个项目 snapshotJson 不超过 20MB；超过提醒拆章节。

策略：

1. 画布节点卡片默认只展示摘要，不展示完整长文。
2. ImageNode / VideoNode 使用缩略图，视频不在画布中自动播放。
3. 画布外节点进入 culled 状态时不加载媒体预览。
4. Inspector 才加载完整 dataJson 和大文本。
5. 大章节按 CanvasPage / SceneGroup 分页。
6. 批量生成时只更新节点状态 badge，不重渲染整张画布。

---

## 7. 业务节点设计

### 7.1 CanvasNodeType

```ts
type CanvasNodeType =
  | 'novel'
  | 'scene_frame'
  | 'scene'
  | 'shot'
  | 'character_asset'
  | 'location_asset'
  | 'style_asset'
  | 'prop_asset'
  | 'image'
  | 'video'
  | 'editor_package'
  | 'note';
```

### 7.2 NovelNode

用途：承载小说原文片段，作为后续场景和分镜的来源。

卡片展示：

- 小说标题
- 字数
- 章节 / 文段范围
- 摘要
- “重新生成分镜”按钮

数据：

```ts
interface NovelNodeData {
  novelDocumentId: string;
  title: string;
  chapterTitle?: string;
  excerptStart?: number;
  excerptEnd?: number;
  excerptText: string;
  summary?: string;
  extractedEventIds?: string[];
}
```

交互：

- 双击打开原文详情。
- 右键：生成场景、生成分镜、复制原文、定位文档。
- 从 NovelNode 拖箭头到 SceneNode 表示 derived_from。

验收：

- NovelNode 创建后能在 Inspector 看到完整原文。
- 点击“定位文档”能在左侧小说面板高亮对应文本。
- 删除 NovelNode 不删除 NovelDocument，只删除画布展示节点。

### 7.3 SceneFrame

用途：在画布上包住一个场景的所有节点。

卡片展示：

- 场景名
- 场景编号
- 镜头数量
- 场地标签
- 完成度：图片完成数 / 视频完成数

数据：

```ts
interface SceneFrameData {
  sceneId: string;
  sceneIndex: number;
  title: string;
  summary: string;
  mood?: string;
  locationAssetId?: string;
  shotNodeIds: string[];
  collapsed: boolean;
}
```

交互：

- 折叠 / 展开。
- 拖动 SceneFrame 时，子节点一起移动。
- 场地资产拖到 SceneFrame：应用到全部 Shot。
- 右键：批量生成图片、批量生成视频、重新布局本场景。

验收：

- 导入 storyboard 时，每个 Scene 生成一个 SceneFrame。
- SceneFrame 内的 ShotNode 按 shotIndex 从左到右排列。
- 场地拖到 SceneFrame 后，所有内部 ShotNode 的 locationAssetId 更新。

### 7.4 SceneNode

用途：场景摘要卡，表达场景级信息。

数据：

```ts
interface SceneNodeData {
  sceneId: string;
  sceneIndex: number;
  title: string;
  sourceExcerpt: string;
  summary: string;
  mood: string;
  timeOfDay?: string;
  characterAssetIds: string[];
  locationAssetId?: string;
}
```

验收：

- SceneNode 与 NovelNode 通过 derived_from 边连接。
- SceneNode 与该场景内 ShotNode 通过 belongs_to_scene 边连接。
- 修改 SceneNode 的 mood 后，重新合成 Shot prompt 时会继承该 mood。

### 7.5 ShotNode

用途：最核心的生产节点。一个 ShotNode 对应一个镜头，可生成关键帧和视频。

卡片展示：

- `S01-03` 镜头编号。
- 标题。
- 时长。
- 画面描述前 80 字。
- 人物头像小列表。
- 场地标签。
- 生成状态：image / video。
- 快捷按钮：生成图片、生成视频、变体、加入剪辑包。

数据：

```ts
interface ShotNodeData {
  sceneId: string;
  shotIndex: number;
  title: string;
  durationSec: number;

  sourceExcerpt?: string;
  visualDescription: string;
  action: string;
  cameraMovement: string;
  lens?: string;
  lighting?: string;
  mood?: string;

  dialogue?: string;
  narration?: string;
  soundEffect?: string;

  characterAssetIds: string[];
  locationAssetId?: string;
  propAssetIds?: string[];
  styleAssetId?: string;

  imagePrompt: string;
  videoPrompt: string;
  negativePrompt?: string;

  selectedImageAssetId?: string;
  selectedVideoAssetId?: string;
  imageNodeIds?: string[];
  videoNodeIds?: string[];

  generationDefaults?: {
    imageProvider?: string;
    imageModel?: string;
    videoProvider?: string;
    videoModel?: string;
    durationSec?: number;
    resolution?: '720p' | '1080p';
    aspectRatio?: '9:16' | '16:9' | '1:1';
  };
}
```

交互：

- 双击：打开详细编辑。
- 拖人物资产到 Shot：添加角色引用。
- 拖场地资产到 Shot：设置场地引用。
- 拖图片到 Shot：设为参考图 / 首帧。
- 右键：生成图片、生成 4 张图片、图生视频、复制 Prompt、创建变体、加入剪辑包、重新生成该 Shot 脚本。

验收：

- ShotNode 必须能独立生成图片。
- ShotNode 必须能基于 selectedImage 生成视频。
- ShotNode 的 prompt composer 必须包含 character/location/style 信息。
- ShotNode 删除时，生成的 ImageNode / VideoNode 不自动删除，但边关系删除。

### 7.6 CharacterAssetNode

用途：角色一致性资产。

数据：

```ts
interface CharacterAssetData {
  name: string;
  role: string;
  gender?: string;
  ageRange?: string;
  appearance: string;
  personality?: string;
  costume?: string;
  hairstyle?: string;

  identityPrompt: string;
  negativeIdentityPrompt?: string;

  referenceAssetIds: string[];
  portraitAssetId?: string;
  expressionSheetAssetId?: string;
  turnAroundAssetId?: string;

  aliases?: string[];
  locked?: boolean;
}
```

交互：

- 上传参考图。
- 生成角色设定图。
- 生成表情表。
- 拖到 ShotNode 创建 references_character。
- 锁定角色，防止自动解析覆盖。

验收：

- 从 storyboard 导入时自动创建 CharacterAssetNode。
- 用户手动修改 appearance 后，后续 prompt composer 使用修改后的描述。
- CharacterAssetNode 可以连接多个 ShotNode。
- 如果角色 locked=true，重新解析小说时不覆盖该角色字段。

### 7.7 LocationAssetNode

用途：场地一致性资产。

数据：

```ts
interface LocationAssetData {
  name: string;
  type: 'interior' | 'exterior' | 'fantasy' | 'virtual';
  description: string;
  era?: string;
  timeOfDay?: string;
  lighting?: string;
  atmosphere?: string;
  geography?: string;

  referenceAssetIds: string[];
  locationPrompt: string;
  negativePrompt?: string;
  locked?: boolean;
}
```

交互：

- 上传场地参考图。
- 生成场地设定图。
- 拖到 ShotNode。
- 拖到 SceneFrame，批量应用。

验收：

- LocationAssetNode 能作为 ImageProvider referenceImages。
- 批量应用到 SceneFrame 后，所有 Shot 的 locationAssetId 一致。
- 删除 LocationAssetNode 时，引用它的 ShotNode 应提示“清理引用 / 保留已生成结果”。

### 7.8 ImageNode

用途：关键帧、角色图、场地图、参考图。

数据：

```ts
interface ImageNodeData {
  assetId: string;
  sourceNodeId?: string;
  sourceJobId?: string;
  purpose: 'shot_keyframe' | 'character_reference' | 'location_reference' | 'style_reference' | 'uploaded' | 'variant';
  prompt?: string;
  negativePrompt?: string;
  provider?: string;
  model?: string;
  seed?: number;
  width?: number;
  height?: number;
  selectedForShotNodeId?: string;
}
```

交互：

- 预览大图。
- 设为 Shot selectedImage。
- 设为角色参考图。
- 设为场地参考图。
- 生成视频。
- 生成变体。

验收：

- ImageNode 与 Asset 绑定。
- ImageNode 能被设置为某个 Shot 的 selectedImageAssetId。
- ImageNode 生成视频时能找到父 Shot 或要求用户选择 Shot。

### 7.9 VideoNode

用途：生成视频片段或上传视频。

数据：

```ts
interface VideoNodeData {
  assetId: string;
  sourceNodeId?: string;
  sourceImageNodeId?: string;
  sourceShotNodeId?: string;
  sourceJobId?: string;
  purpose: 'shot_clip' | 'uploaded' | 'variant' | 'edited';
  prompt?: string;
  provider?: string;
  model?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  selectedForShotNodeId?: string;
}
```

交互：

- hover 预览，默认静音。
- 双击大预览。
- 设为 Shot selectedVideo。
- 加入剪辑包。
- 下载。
- 重新生成。

验收：

- VideoNode 必须有 assetId。
- VideoNode 可被加入 EditorPackage。
- 如果多个 VideoNode 属于同一 Shot，用户可以选择 selectedVideo。

### 7.10 EditorPackageNode

用途：表示一次发送到剪辑器的产物。

数据：

```ts
interface EditorPackageNodeData {
  editorExportId: string;
  packageAssetId?: string;
  manifestAssetId?: string;
  videoNodeIds: string[];
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  editorUrl?: string;
  errorMessage?: string;
}
```

验收：

- 生成成功后能下载 zip。
- 如果 local editor 返回 URL，节点显示“打开剪辑器”。
- 与所有 source VideoNode 创建 sent_to_editor 边。

---

## 8. 小说解析与分镜脚本设计

### 8.1 NovelDocument

```ts
interface NovelDocument {
  id: string;
  projectId: string;
  title: string;
  content: string;
  sourceType: 'paste' | 'txt' | 'md';
  wordCount: number;
  language: 'zh' | 'en' | 'ja' | 'other';
  createdAt: string;
  updatedAt: string;
}
```

### 8.2 EventGraph

MVP 可以先生成 scenes/shots；V1.5 引入 EventGraph。

```ts
interface StoryEvent {
  id: string;
  projectId: string;
  novelDocumentId: string;
  chapterIndex?: number;
  orderIndex: number;
  sourceExcerpt: string;
  summary: string;
  characters: string[];
  locationName?: string;
  emotion?: string;
  conflict?: string;
  result?: string;
}
```

用途：

- 长篇小说分章解析。
- 分镜生成时只召回相关事件。
- 修改分镜时可回溯原文。

### 8.3 Storyboard JSON Schema

```ts
interface StoryboardResult {
  title: string;
  logline: string;
  characters: CharacterDraft[];
  locations: LocationDraft[];
  scenes: SceneDraft[];
}

interface CharacterDraft {
  tempId: string;
  name: string;
  role: string;
  appearance: string;
  personality: string;
  costume?: string;
  identityPrompt: string;
}

interface LocationDraft {
  tempId: string;
  name: string;
  type: 'interior' | 'exterior' | 'fantasy' | 'virtual';
  description: string;
  lighting: string;
  atmosphere: string;
  locationPrompt: string;
}

interface SceneDraft {
  tempId: string;
  title: string;
  sourceExcerpt: string;
  summary: string;
  mood: string;
  timeOfDay?: string;
  characterTempIds: string[];
  locationTempId?: string;
  shots: ShotDraft[];
}

interface ShotDraft {
  tempId: string;
  shotIndex: number;
  title: string;
  sourceExcerpt?: string;
  durationSec: number;
  visualDescription: string;
  action: string;
  cameraMovement: string;
  lens?: string;
  lighting?: string;
  mood?: string;
  dialogue?: string;
  narration?: string;
  soundEffect?: string;
  characterTempIds: string[];
  locationTempId?: string;
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt?: string;
}
```

### 8.4 分镜导入画布布局算法

输入：StoryboardResult  
输出：CanvasNode[] + CanvasEdge[] + tldraw shapes

默认布局：

```text
x=0      NovelNode
x=450    CharacterAssetNodes / LocationAssetNodes
x=900    SceneFrame 01
           SceneNode
           ShotNode 1, ShotNode 2, ShotNode 3
x=900    SceneFrame 02
           SceneNode
           ShotNode 4, ShotNode 5, ShotNode 6
```

布局规则：

```ts
const COLUMN = {
  NOVEL: 0,
  ASSET: 460,
  SCENE: 960,
};

const NODE = {
  NOVEL_W: 360,
  NOVEL_H: 260,
  ASSET_W: 260,
  ASSET_H: 180,
  SHOT_W: 320,
  SHOT_H: 220,
  SCENE_HEADER_H: 120,
  GAP_X: 32,
  GAP_Y: 32,
};
```

每个 SceneFrame 高度：

```ts
sceneFrameHeight = SCENE_HEADER_H + rowsOfShots * (SHOT_H + GAP_Y) + 80;
```

验收：

- 6 个 Shot 应按 shotIndex 排序。
- 不同 SceneFrame 不重叠。
- Character / Location 节点只创建一次，多个 Shot 通过边引用。
- 导入后自动 fit-to-content。

---

## 9. Prompt Composer 设计

### 9.1 合成原则

不要让用户手动拼很长 prompt。Shot 生成图片/视频时，系统自动合成：

```text
全局风格
+ 场景 mood / timeOfDay
+ 场地 locationPrompt
+ 人物 identityPrompt
+ Shot visualDescription / action / cameraMovement
+ 模型特定后缀
+ negativePrompt
```

### 9.2 Image Prompt Composer

```ts
interface ComposeImagePromptInput {
  project: Project;
  shot: ShotNodeData;
  scene?: SceneNodeData;
  characters: CharacterAssetData[];
  location?: LocationAssetData;
  style?: StyleAssetData;
}

interface ComposedPrompt {
  prompt: string;
  negativePrompt?: string;
  referenceAssetIds: string[];
  debugParts: Array<{
    label: string;
    text: string;
  }>;
}
```

输出示例结构：

```text
[Style]
竖屏电影感，冷色调，高对比，浅景深

[Characters]
林晚：二十岁出头，黑色短发，白色风衣，神情警惕...

[Location]
雨夜旧城区巷口，霓虹招牌反射在积水中...

[Shot]
中景，林晚停在巷口回头，远处有红色机械眼闪过，镜头缓慢推近...

[Camera]
slow dolly in, 50mm lens, cinematic lighting
```

### 9.3 Video Prompt Composer

视频 prompt 比图片 prompt 更重动作和运镜：

```text
角色一致性描述
+ 场地连续性描述
+ 初始画面
+ 动作过程
+ 镜头运动
+ 时长
+ 禁止事项
```

验收：

- Inspector 有“查看合成 Prompt”面板。
- prompt debugParts 能显示每一段来自哪个节点。
- 修改 Character / Location 后，重新打开 Shot 的合成 Prompt 会更新。
- 生成任务 inputJson 必须保存最终 prompt 和 debugParts。

---

## 10. 图片 / 视频 Provider 技术设计

### 10.1 Provider 配置

```ts
interface ProviderConfig {
  id: string;
  type: 'llm' | 'image' | 'video' | 'editor';
  displayName: string;
  enabled: boolean;
  baseUrl?: string;
  apiKeyEnv?: string;
  defaultModel?: string;
  paramsJson?: Record<string, unknown>;
}
```

配置来源：

- `.env`：API key。
- `providers.config.ts`：provider 注册。
- 数据库 ProviderConfig：是否启用、默认模型、默认参数。

不要把 provider API key 存在浏览器。

### 10.2 ImageProvider

```ts
interface AssetRef {
  assetId: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  role?: 'character' | 'location' | 'style' | 'first_frame' | 'last_frame' | 'mask';
}

interface ImageGenerationInput {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  referenceImages?: AssetRef[];
  maskImage?: AssetRef;
  seed?: number;
  count?: number;
  providerParams?: Record<string, unknown>;
}

interface ProviderTaskResult {
  providerTaskId?: string;
  status: 'queued' | 'running' | 'provider_waiting' | 'succeeded' | 'failed';
  outputUrls?: string[];
  errorMessage?: string;
  raw?: unknown;
}

interface ImageProvider {
  id: string;
  displayName: string;
  capabilities: {
    textToImage: boolean;
    imageToImage: boolean;
    multiReference: boolean;
    inpainting: boolean;
    batch: boolean;
  };
  generate(input: ImageGenerationInput): Promise<ProviderTaskResult>;
  getTask?(providerTaskId: string): Promise<ProviderTaskResult>;
}
```

MVP provider：

- `mock-image`
- `image2` stub
- `banana` stub

### 10.3 VideoProvider

```ts
interface VideoGenerationInput {
  mode: 'text_to_video' | 'image_to_video' | 'reference_to_video' | 'video_edit';
  prompt: string;
  negativePrompt?: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  durationSec: number;
  resolution: '720p' | '1080p';
  firstFrame?: AssetRef;
  lastFrame?: AssetRef;
  referenceImages?: AssetRef[];
  referenceVideo?: AssetRef;
  seed?: number;
  providerParams?: Record<string, unknown>;
}

interface VideoProvider {
  id: string;
  displayName: string;
  capabilities: {
    textToVideo: boolean;
    imageToVideo: boolean;
    referenceToVideo: boolean;
    videoEdit: boolean;
    audioGeneration: boolean;
    maxDurationSec: number;
    resolutions: string[];
  };
  createTask(input: VideoGenerationInput): Promise<ProviderTaskResult>;
  getTask(providerTaskId: string): Promise<ProviderTaskResult>;
  cancelTask?(providerTaskId: string): Promise<void>;
}
```

MVP provider：

- `mock-video`
- `seedance`
- `happyhorse`

### 10.4 GenerationJob

```ts
interface GenerationJob {
  id: string;
  projectId: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  type: 'storyboard' | 'image' | 'video' | 'editor_export';
  provider: string;
  model?: string;
  operation: string;
  status: 'queued' | 'running' | 'provider_waiting' | 'succeeded' | 'failed' | 'cancelled';
  inputJson: unknown;
  providerTaskId?: string;
  outputJson?: unknown;
  errorMessage?: string;
  costCredits?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 10.5 Worker 状态机

```text
queued
→ running
→ provider_waiting    // 外部视频任务已提交，等待轮询
→ succeeded

queued
→ running
→ failed

provider_waiting
→ cancelled
```

Worker 规则：

- LLM / image 如果是同步 provider，可 running → succeeded。
- 视频 provider 通常是异步：running → provider_waiting → poll → succeeded。
- 每次状态变化写入 GenerationJob。
- Job failed 后不删除 targetNode，只把状态标记为 failed。
- retry 创建新 Job，原 Job 保留。

---

## 11. 本地 Web 剪辑器桥接设计

### 11.1 EditorBridge

```ts
interface EditorBridge {
  id: string;
  displayName: string;
  mode: 'download_zip' | 'local_http' | 'iframe_post_message';
  exportPackage(input: EditorExportInput): Promise<EditorExportResult>;
  sendToEditor?(manifestUrl: string): Promise<void>;
}

interface EditorExportInput {
  projectId: string;
  videoNodeIds: string[];
  includeSubtitles: boolean;
  includeStoryboardCsv: boolean;
  sortMode: 'canvas_x' | 'shot_index' | 'manual';
}

interface EditorExportResult {
  editorExportId: string;
  packageAssetId: string;
  manifestAssetId: string;
  editorUrl?: string;
}
```

### 11.2 Timeline Manifest

```ts
interface TimelineManifest {
  version: '1.0';
  projectId: string;
  title: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  fps: 24 | 25 | 30;
  tracks: TimelineTrack[];
  assets: TimelineAsset[];
}

interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'subtitle' | 'image';
  items: TimelineItem[];
}

interface TimelineItem {
  id: string;
  assetId: string;
  sourceNodeId: string;
  startMs: number;
  durationMs: number;
  trimStartMs?: number;
  trimEndMs?: number;
  text?: string;
  metadata?: Record<string, unknown>;
}

interface TimelineAsset {
  id: string;
  type: 'video' | 'image' | 'audio' | 'subtitle';
  url: string;
  localPath?: string;
  mimeType?: string;
  durationMs?: number;
  width?: number;
  height?: number;
}
```

### 11.3 zip 结构

```text
project-export.zip
├── timeline.json
├── storyboard.csv
├── clips/
│   ├── shot_001.mp4
│   ├── shot_002.mp4
│   └── shot_003.mp4
├── images/
│   ├── shot_001_keyframe.png
│   └── shot_002_keyframe.png
└── subtitles/
    └── subtitles.srt
```

验收：

- zip 解压后，timeline.json 中引用的文件路径全部存在。
- storyboard.csv 包含 shotIndex、title、duration、dialogue、videoFile。
- 本地剪辑器 POST 失败时，EditorPackageNode 显示 failed，并允许下载 zip。

---

## 12. 数据库 Schema 草案

```prisma
model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects Project[]
}

model Project {
  id             String   @id @default(cuid())
  ownerUserId    String
  title          String
  description    String?
  aspectRatio    String   @default("9:16")
  coverAssetId   String?
  defaultStyleId String?
  status         String   @default("active")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  owner           User             @relation(fields: [ownerUserId], references: [id])
  documents       NovelDocument[]
  canvasDocuments CanvasDocument[]
  nodes           CanvasNode[]
  edges           CanvasEdge[]
  assets          Asset[]
  jobs            GenerationJob[]
  editorExports   EditorExport[]
}

model NovelDocument {
  id           String   @id @default(cuid())
  projectId    String
  title        String
  content      String
  sourceType   String   @default("paste")
  wordCount    Int      @default(0)
  language     String   @default("zh")
  metadataJson Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id])
}

model CanvasDocument {
  id           String   @id @default(cuid())
  projectId    String
  title        String   @default("Main Canvas")
  snapshotJson Json?
  schemaVersion Int    @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id])
}

model Asset {
  id           String   @id @default(cuid())
  projectId    String
  type         String   // image, video, audio, text, package, manifest
  title        String?
  storageKey   String
  url          String
  mimeType     String?
  width        Int?
  height       Int?
  durationMs   Int?
  sizeBytes    Int?
  metadataJson Json?
  createdAt    DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id])
}

model CanvasNode {
  id               String   @id @default(cuid())
  projectId        String
  canvasDocumentId String?
  tldrawShapeId    String?
  type             String
  title            String?
  x                Float
  y                Float
  width            Float
  height           Float
  zIndex           Int      @default(0)
  status           String   @default("idle")
  dataJson         Json
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id])

  @@index([projectId, type])
  @@index([tldrawShapeId])
}

model CanvasEdge {
  id                 String   @id @default(cuid())
  projectId          String
  canvasDocumentId   String?
  sourceNodeId       String
  targetNodeId       String
  sourceShapeId      String?
  targetShapeId      String?
  visualArrowShapeId String?
  relation           String
  dataJson           Json?
  createdAt          DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id])

  @@index([projectId, relation])
  @@index([sourceNodeId])
  @@index([targetNodeId])
}

model GenerationJob {
  id             String   @id @default(cuid())
  projectId      String
  sourceNodeId   String?
  targetNodeId   String?
  type           String
  provider       String
  model          String?
  operation      String
  status         String   @default("queued")
  inputJson      Json
  providerTaskId String?
  outputJson     Json?
  errorMessage   String?
  costCredits    Float?
  startedAt      DateTime?
  completedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id])

  @@index([projectId, status])
  @@index([providerTaskId])
}

model EditorExport {
  id              String   @id @default(cuid())
  projectId       String
  title           String
  status          String   @default("queued")
  manifestJson    Json
  packageAssetId  String?
  manifestAssetId String?
  errorMessage    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id])
}

model NodeVersion {
  id        String   @id @default(cuid())
  projectId String
  nodeId    String
  type      String
  dataJson  Json
  assetId   String?
  jobId     String?
  createdAt DateTime @default(now())

  @@index([nodeId])
}
```

---

## 13. API 设计

### 13.1 Project

```http
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
POST   /api/projects/:projectId/duplicate
```

### 13.2 Novel

```http
POST   /api/projects/:projectId/novels
GET    /api/projects/:projectId/novels
GET    /api/projects/:projectId/novels/:novelId
PATCH  /api/projects/:projectId/novels/:novelId
DELETE /api/projects/:projectId/novels/:novelId
POST   /api/projects/:projectId/novels/:novelId/generate-storyboard
```

### 13.3 Canvas

```http
GET    /api/projects/:projectId/canvas
PATCH  /api/projects/:projectId/canvas/snapshot
POST   /api/projects/:projectId/canvas/import-storyboard
POST   /api/projects/:projectId/canvas/nodes
PATCH  /api/projects/:projectId/canvas/nodes/:nodeId
PATCH  /api/projects/:projectId/canvas/nodes/batch
DELETE /api/projects/:projectId/canvas/nodes/:nodeId
POST   /api/projects/:projectId/canvas/edges
DELETE /api/projects/:projectId/canvas/edges/:edgeId
POST   /api/projects/:projectId/canvas/layout
```

### 13.4 Asset

```http
POST   /api/projects/:projectId/assets/upload
GET    /api/projects/:projectId/assets
GET    /api/projects/:projectId/assets/:assetId
PATCH  /api/projects/:projectId/assets/:assetId
DELETE /api/projects/:projectId/assets/:assetId
```

### 13.5 Generation

```http
POST   /api/projects/:projectId/generation/jobs
GET    /api/projects/:projectId/generation/jobs
GET    /api/projects/:projectId/generation/jobs/:jobId
POST   /api/projects/:projectId/generation/jobs/:jobId/retry
POST   /api/projects/:projectId/generation/jobs/:jobId/cancel
```

Generation operations：

```ts
type GenerationOperation =
  | 'novel_to_storyboard'
  | 'shot_to_image'
  | 'character_to_image'
  | 'location_to_image'
  | 'image_to_video'
  | 'shot_to_video'
  | 'batch_shots_to_images'
  | 'batch_images_to_videos'
  | 'editor_export';
```

### 13.6 Editor Export

```http
POST   /api/projects/:projectId/editor-exports
GET    /api/projects/:projectId/editor-exports
GET    /api/projects/:projectId/editor-exports/:exportId
POST   /api/projects/:projectId/editor-exports/:exportId/send
GET    /api/projects/:projectId/editor-exports/:exportId/download
```

---

## 14. 前端组件设计

### 14.1 目录结构建议

```text
apps/web/src/
├── app/
│   ├── page.tsx
│   ├── projects/page.tsx
│   └── projects/[projectId]/canvas/page.tsx
├── components/
│   ├── app-shell/
│   ├── canvas/
│   │   ├── CanvasEditor.tsx
│   │   ├── CanvasTopBar.tsx
│   │   ├── CanvasLeftSidebar.tsx
│   │   ├── CanvasInspector.tsx
│   │   ├── CanvasBottomJobQueue.tsx
│   │   ├── shapes/
│   │   │   ├── NovelShapeUtil.tsx
│   │   │   ├── SceneFrameShapeUtil.tsx
│   │   │   ├── SceneShapeUtil.tsx
│   │   │   ├── ShotShapeUtil.tsx
│   │   │   ├── CharacterAssetShapeUtil.tsx
│   │   │   ├── LocationAssetShapeUtil.tsx
│   │   │   ├── ImageShapeUtil.tsx
│   │   │   ├── VideoShapeUtil.tsx
│   │   │   └── EditorPackageShapeUtil.tsx
│   │   ├── hooks/
│   │   │   ├── useCanvasAutosave.ts
│   │   │   ├── useSelectedBusinessNodes.ts
│   │   │   ├── useCanvasDropHandlers.ts
│   │   │   └── useCanvasActions.ts
│   │   └── utils/
│   │       ├── layoutStoryboard.ts
│   │       ├── shapeMapping.ts
│   │       └── canvasEdgeMapping.ts
│   ├── assets/
│   ├── novels/
│   ├── generation/
│   └── editor-export/
├── lib/
│   ├── api-client.ts
│   ├── zod-schemas.ts
│   └── storage-client.ts
└── styles/
```

### 14.2 CanvasEditor

职责：

- 加载 canvas snapshot。
- 注册 custom shape utils。
- 注册 custom actions。
- 监听 selection。
- 监听 store changes，触发 autosave。
- 处理拖放。
- 处理节点右键菜单。

验收：

- CanvasEditor 首次打开没有 snapshot 时创建空画布。
- 有 snapshot 时恢复视图。
- `shapeUtils` 注册后，业务节点能正常渲染。
- 画布加载失败时展示错误和重试按钮。

### 14.3 Shape Component 通用 UI

每个业务节点统一卡片结构：

```text
┌──────────────────────────┐
│ Header: icon title status│
├──────────────────────────┤
│ Body: preview / summary  │
├──────────────────────────┤
│ Footer: actions chips    │
└──────────────────────────┘
```

状态 badge：

- idle: 灰色
- queued: 蓝灰
- running: 蓝色 + spinner
- provider_waiting: 紫色
- done: 绿色
- failed: 红色

### 14.4 Inspector 组件

```text
CanvasInspector
├── EmptyInspector
├── MultiSelectionInspector
├── EdgeInspector
├── NovelInspector
├── SceneInspector
├── ShotInspector
├── CharacterInspector
├── LocationInspector
├── ImageInspector
├── VideoInspector
└── EditorPackageInspector
```

ShotInspector tabs：

1. 内容：画面、动作、台词、运镜。
2. 资产：人物、场地、风格、参考图。
3. Prompt：合成 Prompt、debug parts。
4. 生成：provider、model、分辨率、时长。
5. 版本：图片版本、视频版本。
6. 日志：GenerationJob。

验收：

- 选中 ShotNode，Inspector 能编辑所有关键字段。
- 修改字段后自动保存到 CanvasNode.dataJson。
- 点击“查看合成 Prompt”显示 prompt parts。
- 点击“生成图片”走 GenerationJob。

---

## 15. Roadmap 详细版

### Roadmap 执行与调整原则

Roadmap 是实现顺序的当前最佳判断，不是冻结清单。后续 Codex / 工程团队可以根据实际实现、代码审查、测试反馈和参考项目研究调整 phase 边界、拆分顺序和局部技术落点，只要保持产品方向不偏离：

- **保持核心闭环不变**：小说文本 → Storyboard → 无限画布节点/语义边 → 图片 → 视频 → 剪辑包。
- **保持 Canvas-first 不变**：AI 生成必须落回画布节点和业务关系，不能改成 chat-only 或 form-only。
- **保持 Mock-first 不变**：真实 provider 接入前，MVP 必须先用 mock provider 跑通完整链路。
- **保持服务端 Provider 边界不变**：浏览器不能保存或直连第三方模型 API key。
- **保持 Hybrid Snapshot + Normalized Business Data 不变**：不能只存 tldraw snapshot 而丢掉业务事实。
- **允许拆分 phase**：当单个 phase 太大、跨多层或无法清晰 review 时，拆成多个 requirements / plan / PR。
- **允许合并小模块**：当单独模块没有可演示价值或测试意义时，可以和相邻模块合并。
- **允许重排局部顺序**：如果实现发现依赖关系不同，可以先做支撑模块，再回到用户流程模块。
- **允许替换局部技术细节**：如果调研证明更简单、更可靠的实现方式可行，可以更新 plan；但不能违反本文架构红线。
- **所有调整必须留痕**：重要调整写入模块 requirements、plan、code review summary 或 `docs/solutions/`，避免只留在聊天上下文里。

推荐执行流程见 `docs/infinite-canvas-video-long-task-development-flow.md`。每个模块默认按 `ce-brainstorm` → `ce-plan` → `ce-work` → `ce-code-review` → `ce-compound` 运行。

## Phase 0：仓库与工程基础

目标：让 Codex 能稳定迭代，先搭好类型、测试、目录和 mock。

### 需求

- Next.js + TypeScript + Tailwind + shadcn/ui。
- Prisma + PostgreSQL。
- 本地默认用户。
- local storage abstraction。
- mock LLM / Image / Video provider。
- Vitest + Playwright。
- ESLint/Biome。
- `.env.example`。

### 技术设计

```text
apps/web      Next.js 前端和 API route
apps/worker   Node worker，可选，MVP 也可用 npm script 跑
packages/shared  类型、zod schema、provider interface
packages/ui      共享 UI
```

### 验收标准

- `pnpm install` 成功。
- `pnpm db:migrate` 成功。
- `pnpm dev` 打开首页。
- `pnpm test` 通过。
- 无真实模型 API key 时，mock workflow 可运行。

### Codex Issues

1. 初始化 monorepo。
2. 添加 Prisma schema 初版。
3. 添加默认用户 `getCurrentUser()`。
4. 添加 shared types 和 zod schemas。
5. 添加 mock providers。
6. 添加 CI 脚本。

---

## Phase 1：项目管理 + 资产库

### 需求

- 项目列表。
- 新建项目。
- 项目详情。
- 删除项目。
- 复制项目。
- 上传图片、视频、txt/md。
- 资产列表、缩略图、详情。

### 技术设计

- `Project.ownerUserId` 关联默认用户。
- 文件先支持 local storage：`/public/uploads/:projectId/...`。
- 抽象 StorageProvider，后续切 S3/R2/Supabase。

```ts
interface StorageProvider {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  getPublicUrl(storageKey: string): string;
  deleteObject(storageKey: string): Promise<void>;
}
```

### 验收标准

- 创建项目后进入 `/projects/:id/canvas`。
- 上传图片后 Asset 表有记录，页面可预览。
- 上传视频后可播放预览。
- 删除项目时提示确认。
- 复制项目时复制基础 metadata，不必复制所有资产文件，MVP 可复用 asset URL。

### Codex Issues

1. Project CRUD API。
2. Project dashboard UI。
3. StorageProvider local 实现。
4. Asset upload API。
5. Asset sidebar UI。
6. Asset preview components。

---

## Phase 2：tldraw 无限画布集成与持久化

### 需求

- Canvas 页面嵌入 tldraw。
- 支持 pan / zoom / select / move。
- 支持空画布和 snapshot 恢复。
- 支持 debounce autosave。
- 支持保存状态显示。
- 支持 viewport fit-to-content。

### 技术设计

- CanvasDocument 保存 snapshotJson。
- `useCanvasAutosave` 监听 editor store。
- 首版单用户，不做 CRDT。
- snapshot 保存失败时保留本地 last snapshot，提示重试。

```ts
interface CanvasLoadResult {
  canvasDocument: CanvasDocument;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  assets: AssetRecord[];
}
```

### 验收标准

- 在画布上画默认矩形 / 文本，刷新后仍存在。
- 移动 shape，刷新后位置恢复。
- 保存中/已保存/失败状态正确显示。
- 页面初次打开如果无 CanvasDocument，自动创建。

### Codex Issues

1. CanvasDocument model + API。
2. CanvasEditor 页面。
3. tldraw snapshot load/save。
4. `useCanvasAutosave`。
5. 保存状态 UI。
6. 空画布初始化。

---

## Phase 3：业务 Custom Shapes 与 Inspector

### 需求

实现业务节点：

- NovelNode
- SceneFrame
- SceneNode
- ShotNode
- CharacterAssetNode
- LocationAssetNode
- ImageNode
- VideoNode
- EditorPackageNode

实现 Inspector：

- 根据选中节点切换。
- 修改 dataJson。
- 修改 title/status。
- 显示关联资产和关联边。

### 技术设计

- 每种节点一个 ShapeUtil。
- Shape props 只存渲染摘要和 nodeId，不存完整大文本。
- Inspector 通过 nodeId 从业务 API 拉完整 dataJson。
- 编辑后 PATCH CanvasNode，再更新 shape props。

### 验收标准

- Toolbar 可手动创建每种业务节点。
- 节点能拖动、缩放、删除、复制。
- 选中节点后 Inspector 显示类型对应表单。
- 编辑 Shot 的 visualDescription 后刷新不丢。
- 删除业务节点时同时删除对应 tldraw shape 和业务 CanvasNode。

### Codex Issues

1. CanvasNode CRUD。
2. 通用 BusinessNodeCard。
3. NovelShapeUtil。
4. SceneFrameShapeUtil。
5. SceneShapeUtil。
6. ShotShapeUtil。
7. CharacterAssetShapeUtil。
8. LocationAssetShapeUtil。
9. ImageShapeUtil。
10. VideoShapeUtil。
11. EditorPackageShapeUtil。
12. Inspector framework。
13. ShotInspector。
14. CharacterInspector。
15. LocationInspector。

---

## Phase 4：CanvasEdge / 资产拖拽 / 语义绑定

### 需求

- 支持节点之间连线。
- 连线有 relation。
- 支持资产拖到 ShotNode。
- Character → Shot 创建 references_character。
- Location → Shot 创建 references_location。
- Location → SceneFrame 批量应用。
- Shot → Image 创建 generated_image。
- Image → Video 创建 generated_video。

### 技术设计

- 使用 tldraw arrow shape 做视觉连接。
- 业务上用 CanvasEdge 记录语义关系。
- 建立 `shapeId → nodeId` 映射。
- DropHandler 判断 drop target 的 nodeType。

```ts
interface CreateSemanticEdgeInput {
  sourceNodeId: string;
  targetNodeId: string;
  relation: CanvasEdgeRelation;
  createVisualArrow?: boolean;
}
```

### 验收标准

- 人物资产拖到 ShotNode 后出现连线。
- ShotNode.data.characterAssetIds 更新。
- 删除 references_character 边后，ShotNode.data.characterAssetIds 同步移除。
- 场地拖到 SceneFrame 后，该 frame 内所有 ShotNode 都更新 locationAssetId。
- 生成的边刷新后仍显示。

### Codex Issues

1. CanvasEdge API。
2. tldraw arrow/binding helper。
3. Asset drag source。
4. Shot drop target。
5. SceneFrame drop target。
6. EdgeInspector。
7. Edge delete sync business data。

---

## Phase 5：小说导入 + Storyboard JSON 生成

### 需求

- 粘贴小说文本。
- 上传 txt/md。
- 点击生成分镜。
- mock LLM 返回严格 Storyboard JSON。
- 真实 LLM provider stub。
- 结果预览。
- 用户可编辑 StoryboardResult。

### 技术设计

- zod 校验 StoryboardResult。
- LLM 输出不合法时自动修复一次。
- NovelDocument 保存全文。
- StoryboardResult 暂存到 GenerationJob.outputJson 或 StoryboardDraft 表。MVP 可用 Job output。

### 验收标准

- 粘贴文本后能保存 NovelDocument。
- mock 生成结果通过 zod 校验。
- 分镜预览页显示 characters、locations、scenes、shots。
- 用户能编辑 Shot 标题/描述后再导入画布。

### Codex Issues

1. NovelDocument API。
2. Novel input UI。
3. StoryboardResult zod schema。
4. mock novel-to-storyboard provider。
5. Storyboard preview UI。
6. Storyboard edit form。

---

## Phase 6：Storyboard 导入画布与自动布局

### 需求

- 一键导入画布。
- 自动创建业务节点。
- 自动创建 tldraw shapes。
- 自动创建语义边。
- 自动布局。
- 支持重复导入策略。

重复导入策略：

- 如果项目没有相关节点：直接导入。
- 如果已存在 storyboard 节点：提示“覆盖 / 新建版本 / 取消”。
- MVP 默认新建版本，不覆盖。

### 技术设计

- `importStoryboardToCanvas(storyboard, options)`。
- tempId → nodeId 映射。
- Character / Location 去重：按 name + role / name + type。
- 创建 SceneFrame 包裹 SceneNode + Shots。

### 验收标准

- 导入 2 个场景、6 个镜头时布局不重叠。
- 人物/场地节点只创建一次。
- ShotNode 与 Character/Location 有语义边。
- ShotNode 与 SceneNode/SceneFrame 有 belongs_to_scene。
- 导入完成后自动 fit-to-content。

### Codex Issues

1. tempId mapper。
2. Storyboard import service。
3. Auto layout utility。
4. Business node batch creation。
5. Shape batch creation。
6. Edge batch creation。
7. Duplicate import modal。

---

## Phase 7：Prompt Composer + 人物/场地资产增强

### 需求

- 人物资产创建/编辑。
- 场地资产创建/编辑。
- 上传人物参考图。
- 上传场地参考图。
- Shot prompt composer。
- Inspector 查看合成 prompt。

### 技术设计

- Character/Location 本质仍是 CanvasNode，但也可以在 sidebar 中按 type 查询。
- referenceAssetIds 存在 node.dataJson。
- Prompt composer 在 server 端和 client 端都可调用；最终任务以 server 端合成为准。

### 验收标准

- Shot 合成 prompt 包含关联人物 identityPrompt。
- Shot 合成 prompt 包含关联场地 locationPrompt。
- 上传参考图后，生成图片 inputJson.referenceImages 包含该 Asset。
- 修改人物描述后，Shot prompt 立即更新。

### Codex Issues

1. Character asset form。
2. Location asset form。
3. Reference image upload binding。
4. Prompt composer service。
5. Prompt debug panel。
6. Shot generation settings UI。

---

## Phase 8：GenerationJob + Worker + mock 图片/视频生成

### 需求

- 创建 GenerationJob。
- Worker 消费 job。
- mock-image 生成占位图。
- mock-video 生成占位视频。
- job status UI。
- 节点状态同步。
- 失败 retry。

### 技术设计

- MVP 可先用 DB polling queue；后续换 BullMQ/PGMQ。
- Worker 独立进程：`pnpm worker`。
- 每种 operation 一个 executor。

```ts
interface JobExecutor {
  operation: GenerationOperation;
  run(job: GenerationJob): Promise<JobExecutionResult>;
}
```

### 验收标准

- 从 ShotNode 点击生成图片，创建 job。
- Worker 执行后创建 Asset + ImageNode + Edge。
- 从 ImageNode 点击生成视频，创建 job。
- Worker 执行后创建 Asset + VideoNode + Edge。
- Job queue UI 实时刷新，至少支持 polling。
- retry 创建新 job。

### Codex Issues

1. GenerationJob API。
2. DB-backed queue。
3. Worker bootstrap。
4. Job executor registry。
5. mock image executor。
6. mock video executor。
7. Job queue UI。
8. Node status sync。
9. Retry action。

---

## Phase 9：真实图片 Provider 接入

### 需求

- ImageProvider interface。
- image2 adapter。
- banana adapter。
- provider config。
- provider 参数 UI。
- 图片结果下载到本地 storage。

### 技术设计

- 真实 provider 可能返回 URL，需要 server 下载并保存为 Asset。
- 所有 provider 错误标准化。
- 多图生成 count>1 时创建多个 ImageNode。

### 验收标准

- 未配置 key 时，UI 显示 provider disabled。
- 配置 key 后，可调用真实 provider。
- provider 返回远程图片后，系统保存到本地 storage，而不是只引用远程临时 URL。
- 失败错误可读。

### Codex Issues

1. ImageProvider registry。
2. Provider config loader。
3. image2 adapter stub + implementation placeholder。
4. banana adapter stub + implementation placeholder。
5. Remote asset downloader。
6. Multi-output ImageNode creation。
7. Provider settings UI。

---

## Phase 10：真实视频 Provider 接入

### 需求

- VideoProvider interface。
- seedance adapter。
- happyhorse adapter。
- provider polling。
- cancel job。
- 视频结果保存为 Asset。
- 批量 Image → Video。

### 技术设计

- 视频 provider 统一走 createTask + getTask。
- Job.status `provider_waiting` 时定时轮询。
- Worker 并发控制：视频任务并发默认 2。

```ts
const WORKER_LIMITS = {
  imageConcurrency: 3,
  videoConcurrency: 2,
  pollIntervalMs: 5000,
};
```

### 验收标准

- mock 和真实 provider 使用同一接口。
- provider_waiting 任务不会重复提交 provider task。
- cancel 后如果 provider 支持 cancel，则调用 cancelTask。
- 视频保存到 storage，VideoNode 可预览。
- 批量生成时，底部队列显示每个子任务。

### Codex Issues

1. VideoProvider registry。
2. seedance adapter。
3. happyhorse adapter。
4. provider polling loop。
5. cancel job。
6. video remote downloader。
7. batch image-to-video operation。
8. worker concurrency limit。

---

## Phase 11：EditorBridge / 剪辑包

### 需求

- 多选 VideoNode。
- 按 shot_index/canvas_x/manual 排序。
- 生成 timeline manifest。
- 生成 storyboard.csv。
- 打包 zip。
- 创建 EditorPackageNode。
- 发送到 LOCAL_EDITOR_URL。

### 技术设计

- Export 也是 GenerationJob(type=editor_export)。
- zip 生成在 worker。
- clips 文件从 Asset storage 读取。
- local_http 使用 server-side fetch POST。

### 验收标准

- 多选 3 个 VideoNode 可以导出 zip。
- zip 文件结构正确。
- EditorPackageNode 创建并连接所有 VideoNode。
- LOCAL_EDITOR_URL POST 成功时显示打开链接。
- POST 失败时仍可下载 zip。

### Codex Issues

1. EditorExport model/API。
2. collect selected VideoNodes。
3. timeline manifest builder。
4. storyboard.csv builder。
5. zip packager。
6. EditorPackageNode creation。
7. local editor POST。
8. export status UI。

---

## Phase 12：画布增强与生产效率

### 需求

- 批量生成图片。
- 批量生成视频。
- 节点搜索。
- MiniMap。
- SceneFrame 折叠。
- 节点版本管理。
- 节点复制为变体。
- 画布导出 PNG。
- 快捷键。

### 技术设计

- 多选 Inspector 显示 batch actions。
- NodeVersion 保存每次生成结果。
- 变体节点通过 derived_from 连接。

### 验收标准

- 多选 6 个 ShotNode，一键创建 6 个 image jobs。
- 多选 6 个 ImageNode，一键创建 6 个 video jobs。
- 搜索人物名能定位相关节点。
- SceneFrame 折叠后只显示摘要，不删除子节点。
- 每个 Shot 能选择 selectedImage / selectedVideo。

### Codex Issues

1. MultiSelectionInspector。
2. Batch image generation。
3. Batch video generation。
4. Node search panel。
5. MiniMap。
6. SceneFrame collapse。
7. NodeVersion model/UI。
8. Duplicate as variant。
9. Keyboard shortcuts。

---

## 16. 测试策略

### 16.1 Unit Tests

覆盖：

- Storyboard zod schema。
- Prompt composer。
- layoutStoryboard。
- CanvasEdge relation sync。
- Provider adapter input normalization。
- Timeline manifest builder。

### 16.2 Integration Tests

覆盖：

- Novel → Storyboard → Canvas import。
- Shot → mock Image → ImageNode。
- Image → mock Video → VideoNode。
- VideoNodes → EditorPackage zip。

### 16.3 E2E Tests

Playwright 流程：

1. 创建项目。
2. 粘贴小说。
3. 生成 mock storyboard。
4. 导入画布。
5. 拖人物到 Shot。
6. 生成图片。
7. 生成视频。
8. 导出剪辑包。
9. 刷新页面，确认节点仍存在。

### 16.4 性能验收

- 300 个节点项目打开 < 3 秒，mock 数据本地环境。
- 300 个节点拖拽平均无明显卡顿。
- 1000 个节点打开后可缩放和平移。
- 批量状态更新不导致全画布明显闪烁。

---

## 17. 给 Codex 的顶层实现提示词

```text
Build a canvas-first AI video production platform for adapting novels into storyboarded video clips.

The infinite canvas is the core product. AI generation actions must create or update canvas nodes and semantic edges. Do not build a chat-only or form-only workflow.

Use:
- Next.js + React + TypeScript + Tailwind + shadcn/ui
- tldraw for infinite canvas
- Prisma + PostgreSQL
- local storage abstraction first, S3-compatible later
- async GenerationJob worker
- provider adapters for LLM/Image/Video
- mock providers first

Core workflow:
1. User creates a project.
2. User pastes novel text.
3. System generates StoryboardResult JSON with characters, locations, scenes, and shots.
4. User imports storyboard into the tldraw infinite canvas.
5. Canvas creates custom business shapes: NovelNode, SceneFrame, SceneNode, ShotNode, CharacterAssetNode, LocationAssetNode, ImageNode, VideoNode, EditorPackageNode.
6. User drags character/location assets onto ShotNode or SceneFrame to create semantic edges.
7. ShotNode generates ImageNode via ImageProvider.
8. ImageNode generates VideoNode via VideoProvider.
9. Selected VideoNodes are exported as an editor package with timeline.json, storyboard.csv, and clips.

Important architecture:
- Store tldraw snapshotJson for visual restoration.
- Store normalized CanvasNode and CanvasEdge records for business logic.
- Each custom shape props must include nodeId and nodeType.
- Business node data lives in CanvasNode.dataJson.
- Semantic relations live in CanvasEdge.
- All generation calls run server-side through provider adapters.
- Never expose provider API keys in the browser.
- User system has no RBAC. Use Project.ownerUserId only.
- First version must run fully with mock providers and no paid keys.

Acceptance criteria for MVP:
- Create project.
- Upload assets.
- Open persistent infinite canvas.
- Paste novel.
- Generate mock storyboard JSON.
- Import storyboard into canvas.
- Refresh page and keep nodes/edges/positions.
- Drag character/location to ShotNode and update edge + dataJson.
- Generate mock ImageNode from ShotNode.
- Generate mock VideoNode from ImageNode.
- Export selected VideoNodes to editor package zip.
```

---

## 18. MVP Definition of Done

MVP 完成不是“视频效果多好”，而是以下工程闭环全部跑通：

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

最终验收 Demo：

1. 新建项目《雨夜追踪》。
2. 粘贴 1500 字小说片段。
3. 点击生成分镜。
4. 预览 2 个场景、6 个镜头、2 个人物、1 个场地。
5. 点击导入画布。
6. 在无限画布中看到完整结构。
7. 把“女主”拖到一个 Shot 上，看到引用边。
8. 点击该 Shot 生成图片，出现 ImageNode。
9. 点击 ImageNode 生成视频，出现 VideoNode。
10. 多选 3 个 VideoNode，导出剪辑包。
11. 下载 zip，里面有 timeline.json、storyboard.csv、clips。
12. 刷新页面，所有节点、连线、状态仍然存在。

这就是第一版产品的核心胜利条件。

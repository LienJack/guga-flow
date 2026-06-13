# 无限画布视频项目超长任务开发流程

> 版本：2026-06-12  
> 目标：通过小模块、可审查、可恢复的方式实现 `infinite_canvas_video_prd_roadmap_v2_detailed.md`。  
> 每个模块必须执行的固定循环：`ce-brainstorm` -> `ce-plan` -> `ce-work` -> `ce-code-review` -> `ce-compound`。

本文是 guga-flow 全量实现的操作手册。这个项目故意不能当作一次性的大实现任务处理。应把 PRD 作为产品事实源，拆成可独立验收的模块切片，然后对每个切片重复执行同一套 Compound Engineering 流程。

---

## 信息源优先级

当信息源之间出现冲突时，按以下顺序处理：

1. `infinite_canvas_video_prd_roadmap_v2_detailed.md`：产品范围、用户流程、Roadmap Phase、验收标准、MVP Definition of Done。
2. `docs/tech-stack-text2sql-reference.md`：目标技术架构、模块布局、本地开发假设、质量门禁、架构红线。
3. `reference_project_research_workflow.md` 和 `docs/research/video-ref/`：研究 Toonflow 等视频生产参考项目的方法与证据资产。
4. 当前仓库代码和测试；实现开始后以真实代码为准。
5. 外部框架文档；仅在本地模式不足、高风险或可能过期时使用。

参考项目只提供证据和启发，不覆盖 PRD 或 guga-flow 已选定的架构。

---

## Roadmap 与流程变更治理

Roadmap 和本流程都允许根据实际执行、测试、code review 和参考项目研究持续修正。目标是保持方向正确，而不是机械执行一份过早写死的清单。

允许调整：

- 拆分或合并 PRD phase，让每个模块变得更可审查、更可验证。
- 调整局部执行顺序，先补依赖能力，再回到用户流程。
- 根据实现发现更新 plan 的 implementation units、测试策略或风险缓解。
- 根据参考项目研究更新模块边界、数据流说明或实现策略。
- 根据 code review 反馈补充质量门禁、失败路由或后续模块约束。
- 当本文流程本身不够清楚时，直接更新本文，避免同一类问题反复出现。

不能擅自改变：

- 小说到视频的 MVP 核心闭环。
- Canvas-first 产品方向。
- Mock-first MVP 路线。
- 服务端 provider/key 边界。
- Hybrid Snapshot + Normalized Business Data 的持久化原则。
- `ce-brainstorm` -> `ce-plan` -> `ce-work` -> `ce-code-review` -> `ce-compound` 的模块循环。

变更留痕规则：

- 产品行为或范围变化：更新对应 `docs/brainstorms/` requirements 文档，必要时同步 PRD roadmap。
- 实现策略变化：更新对应 `docs/plans/` plan 文档。
- 执行中发现的可复用经验：写入 `docs/solutions/`。
- 参考项目结论变化：更新 `docs/research/video-ref/` 的 context pack 或 evidence ledger。
- 流程规则变化：更新本文，并在模块交接摘要中说明原因。

如果调整会触碰“不能擅自改变”的条目，先停下来，把问题带回 `ce-brainstorm` 或人工确认，不要在实现中悄悄改方向。

---

## 不可妥协的架构规则

以下规则必须贯穿每次 brainstorm、plan、work 和 review：

- Canvas-first：AI 动作必须创建或更新画布节点与语义边。不要漂移成 chat-only 或 form-only 产品。
- TypeScript 全栈 monorepo：`apps/frontend`、`apps/backend`、`apps/worker`，并用共享包承载类型、provider contracts 和 UI。
- MVP 的无限画布引擎采用 tldraw。
- 同时持久化视觉状态和业务事实：`CanvasDocument.snapshotJson` 加上规范化的 `CanvasNode`、`CanvasEdge`、`Asset`、`GenerationJob`。
- Provider key 不能进入浏览器。LLM、图片、视频、EditorBridge 调用都必须在服务端执行。
- Mock-first 是硬要求。MVP 必须能用 mock LLM、mock image、mock video 和本地导出完整跑通。
- 长耗时操作优先走 Worker。图片、视频、剪辑包导出必须通过 `GenerationJob` 或等价 worker 抽象流转。
- 生成媒体必须下载或保存为 `Asset` 记录，不能只保留远程临时 URL。
- 失败必须成为可见状态。不要静默删除失败节点，也不要把 provider 失败标记为完成。

---

## 模块定义

模块是能通过完整 CE 循环、并让仓库变得更可用的最小产品或架构切片。

默认以 PRD Roadmap 的一个 phase 作为模块边界；必要时再拆细。

满足以下情况时拆分 phase：

- 包含多个彼此独立的用户流程。
- 预计触及约 8-10 个以上实现文件。
- 需要不同研究轨道，例如画布持久化和 provider adapter。
- 一个 PR 无法清晰审查。
- 需要多组互不相关的测试套件才能验证。

满足以下情况时可以合并切片：

- 单独切出来无法演示。
- 没有相邻能力时测试基本都是假的。
- 只生成脚手架，没有下一步能力就没有产品意义。

每个模块必须具备：

- 一个用户或系统层面的结果。
- 明确的 PRD phase 或 requirement trace。
- 窄范围边界。
- 测试策略。
- 可代码审查的 diff。
- 通过 `ce-compound` 判断是否需要沉淀学习。

---

## 标准模块循环

### 1. Brainstorm：定义本模块必须证明什么

先对模块运行 `ce-brainstorm`，再进入实现计划。

输入：

- `infinite_canvas_video_prd_roadmap_v2_detailed.md` 中相关章节。
- `docs/tech-stack-text2sql-reference.md` 中的架构约束。
- 当前实现状态。
- `docs/research/video-ref/` 中的相关研究资产。
- 通过 `reference_project_research_workflow.md` 新得到的参考项目结论。

执行要求：

- 判断范围是 Lightweight、Standard 还是 Deep。大多数 roadmap phase 是 Standard；画布持久化、生成任务、provider 集成、剪辑导出等跨层能力通常是 Deep。
- 保留 PRD 定义的产品行为。不要在 plan 或 work 阶段发明新产品范围。
- 只询问或解决会影响行为、范围、成功标准的产品问题。
- 如果需要参考项目研究，先按研究流程完成，再定稿 requirements。
- 按技能要求在写 requirements 前输出 synthesis。
- 默认每个 roadmap 模块都在 `docs/brainstorms/` 下写持久化 requirements 文档；除非该模块真的非常轻量。

Requirements 文档要求：

- 只使用 repo-relative 路径。
- 需要时使用稳定 ID，例如 `R1`、`F1`、`AE1`。
- 明确 scope boundaries 和 non-goals。
- 明确 assumptions 和 deferred questions。
- Acceptance examples 必须能映射回 PRD。

退出门禁：

- 没有未解决的产品阻塞问题。
- 模块有足够验收标准，`ce-plan` 不需要发明产品行为。

### 2. Plan：定义本模块如何构建

基于模块 requirements 文档运行 `ce-plan`。

输入：

- `docs/brainstorms/` 下的模块 requirements 文档。
- PRD 章节和 roadmap phase。
- `docs/tech-stack-text2sql-reference.md` 中的架构参考。
- 当前代码和测试。
- 已存在的 `docs/solutions/` 学习文档。
- 相关 `docs/research/video-ref/` context pack。

执行要求：

- 把 requirements 文档作为主要事实源。
- 先做本地研究，再拆 implementation units。
- 当本地模式不足、高风险或缺失时，使用外部或参考项目研究。
- 架构决策放在 plan，不放在 requirements。
- 将 plan 写入 `docs/plans/`。
- 使用稳定的 `U1`、`U2` 等 implementation-unit ID。
- 每个 feature-bearing unit 必须写明文件、测试、测试场景、依赖、参考模式和验证结果。
- 当图表或决策矩阵能降低歧义时，应加入文档。
- 执行该技能要求的 confidence/deepening 和 document-review 步骤。

Plan 文档要求：

- 只使用 repo-relative 路径。
- 从 `R` / `F` / `AE` ID 清晰追踪到 implementation units。
- 行为型单元必须明确测试文件。
- 明确 deferred implementation unknowns。
- 不写 git 命令流程，不写可复制粘贴的实现代码。

退出门禁：

- 不需要重新打开产品范围即可执行。
- 每个 implementation unit 都有验证策略。
- 高风险区域有风险缓解和集成覆盖。

### 3. Work：执行计划

对 plan 文件运行 `ce-work`。

输入：

- `docs/plans/` 中的 active plan。
- 当前 branch / worktree 状态。
- 模块 requirements 和 PRD trace。
- 本地代码和测试。

执行要求：

- 编辑代码前完整阅读 plan。
- 创建或继续有意义的 feature branch；避免直接提交到默认分支。
- 用 `update_plan` 跟踪实现任务，并保留 `U` ID。
- 实现前先阅读 plan 引用的模式文件。
- 遵守 plan 中的 execution posture，例如 test-first 或 characterization-first。
- 按逻辑单元实现，不按任意时间段切分。
- 修改行为型文件前执行 test discovery。
- 为新增或变更行为添加或更新测试。
- 每个有意义变更后运行 targeted tests。
- 涉及 callbacks、状态生命周期、错误传播、接口 parity 时执行 system-wide test check。
- 需要提交时，只提交完整且有意义的单元。

并行规则：

- implementation units 共享文件或互相依赖时，优先串行执行。
- 仅当单元独立且当前环境支持安全隔离时，使用 worktree-isolated parallel subagents。
- shared-directory fallback 下，subagent 不能 stage、commit 或运行完整测试套件；由 orchestrator 负责 staging、测试和提交。

退出门禁：

- 计划中的 implementation units 全部完成，或以明确理由显式 defer。
- 相关测试通过。
- 模块能按 acceptance examples 演示。
- working tree 只包含本模块有意变更。

### 4. Code Review：进入下一模块前审查 diff

实现后、模块完成前运行 `ce-code-review`。

模块工作推荐调用形态：

```text
the ce-code-review skill base:<resolved-base-ref> plan:<docs/plans/...-plan.md>
```

仅在必须只读时使用 report-only mode。仅当上层编排流程会处理残留问题时，使用 headless 或 autofix mode。

执行要求：

- 基于真实 diff base 审查，不只看 unstaged changes。
- 带上 plan path，让 review 能检查 requirements completeness。
- 检查 untracked files；需要纳入审查的文件要先有意 stage。
- 根据变更行为选择 reviewer，而不是只看文件扩展名。
- 将 `docs/brainstorms/`、`docs/plans/`、`docs/solutions/` 视为受保护产物。
- 进入下一模块前修复或路由所有 P0/P1 finding。
- 修复后重新运行 targeted tests。

模块 review 完成条件：

- requirements completeness 已处理。
- 没有阻塞 finding。
- 若应用 safe auto-fixes，必须已验证。
- residual advisory items 已记录在 handoff summary 或 follow-up list。

### 5. Compound：沉淀本模块学到的东西

模块解决并审查后运行 `ce-compound`。

当模块涉及非平凡架构、调试、provider 行为、画布持久化、worker 状态、测试策略或参考项目适配时，使用 Full mode。只有简单、清晰、低价值的文档捕获才使用 Lightweight。

出现以下情况时应写 solution document：

- 非显然的架构决策。
- 调试经验。
- 可复用实现模式。
- provider 或 worker 集成坑点。
- 未来模块应复用的测试策略。
- 参考项目适配规则。
- 需要跨上下文保留的约定。

本项目高频类别：

- `architecture-patterns/`
- `tooling-decisions/`
- `workflow-issues/`
- `developer-experience/`
- `documentation-gaps/`
- `integration-issues/`
- `ui-bugs/`
- `database-issues/`
- `performance-issues/`

退出门禁：

- 必要时已在 `docs/solutions/` 下新增或更新学习文档。
- 已按技能规则检查 discoverability。
- 已标记需要刷新的旧研究或架构文档。

---

## 参考项目研究协议

当模块涉及视频生产、分镜流程、素材、provider 系统、agent workflow、memory 或类画布生产数据时，使用 `reference_project_research_workflow.md`。

默认研究顺序：

1. 用当前 guga-flow 模块语言定义研究问题。
2. 查看 `docs/research/video-ref/source-contract.md`，确认参考版本。
3. 使用 `docs/research/video-ref/index.md` 选择正确资产。
4. 使用 Graphify 做导航：

```text
docs/research/video-ref/graphs/toonflow-app/graph.json
docs/research/video-ref/graphs/toonflow-app/queries/*.txt
```

5. 使用 Repomix token tree 做文件发现：

```text
docs/research/video-ref/repomix/toonflow-app-token-tree.txt
```

6. 使用 focused contexts 做源码级验证：

```text
docs/research/video-ref/repomix/toonflow-app-focused-agent.xml
docs/research/video-ref/repomix/toonflow-app-focused-storyboard.xml
docs/research/video-ref/repomix/toonflow-app-focused-assets.xml
docs/research/video-ref/repomix/toonflow-app-focused-vendor-code.xml
```

7. 只有当准备好的研究资产无法回答精确问题时，才打开原始参考仓库。
8. 将结论标注为 `Fact`、`Inference` 或 `Pending Verification`。
9. 当结论会再次影响后续模块时，写入 research context pack 或 evidence ledger。

研究停止规则：

- 当答案已经改变当前模块的 requirements、plan、risk mitigation 或 tests 时停止。
- 当继续阅读只会增加参考项目细节、不会改变 guga-flow 时停止。

研究反模式：

- 没有问题就通读参考项目源代码树。
- 直接复制 Toonflow 的 routes 或数据模型。
- 把 README 说法当作实现事实，但不验证关键路径。
- 有用研究只留在聊天里，不写入 Markdown。

---

## Roadmap 模块队列

除非明确拆分成更小模块，否则下表每一行都必须通过完整模块循环。

| PRD 阶段 | 默认模块边界 | 拆分建议 | 参考研究触发条件 | 完成信号 |
| --- | --- | --- | --- | --- |
| Phase 0：仓库与工程基础 | Monorepo、基础 apps、shared packages、Prisma、mock providers、test/CI scripts | 需要时拆成 workspace 脚手架、数据库/schema 基础、provider/test 基础 | 主要参考 text2sql 架构；通常不需要 video-ref | `pnpm install`、迁移、dev server、测试和 mock workflow shell run 可用 |
| Phase 1：项目管理 + 资产库 | Project CRUD、dashboard、local storage、asset upload 和 preview | diff 变大时拆 Project CRUD 与 Asset/Storage | 上传/生成边界不清时研究 Toonflow assets | 项目创建/打开/删除/复制和资产预览可用 |
| Phase 2：tldraw 画布 + 持久化 | CanvasDocument、tldraw load/save、autosave、save status | 除非后端持久化和前端集成需要分 PR，否则作为一个 Deep module | 现有研究资产不足时研究 canvas persistence | shape 刷新后仍存在，保存状态可见 |
| Phase 3：业务 Custom Shapes + Inspector | Business node CRUD、ShapeUtils、Inspector framework 和类型表单 | 必要时拆通用框架和所有 node types | tldraw docs；只有生产节点语义不清时用 video-ref | 所有 MVP 节点类型可创建、编辑、删除、恢复 |
| Phase 4：语义边 + 资产拖拽绑定 | CanvasEdge、visual arrows、Character/Location drop、edge-data sync | 必要时拆 edge API 和 drag/drop UI | 语义不清时使用 storyboard/canvas focused context | asset drop 创建语义边，业务数据保持同步 |
| Phase 5：小说导入 + Storyboard JSON | NovelDocument、mock LLM、zod schema、preview/edit | 必要时拆 NovelDocument/upload 与 generation/preview | Toonflow script/storyboard flow | mock storyboard 可校验，并可编辑后导入 |
| Phase 6：Storyboard 导入画布 + 布局 | 批量 node/shape/edge 创建、auto layout、duplicate import policy | 通常是 Deep；必要时拆 layout 和 import | Toonflow production/storyboard flow | 2 个场景和 6 个镜头导入后不重叠，且有语义边 |
| Phase 7：Prompt Composer + 资产增强 | Character/Location forms、reference images、prompt composer/debug panel | 必要时拆 prompt composer 与 reference-image upload | Toonflow assets 和 provider flow | Shot prompt 反映已关联人物/场地 |
| Phase 8：GenerationJob + worker + mock media | Queue、worker、mock image/video executors、node status sync、retry | 必要时拆 queue/worker 基础和 image/video execution | Toonflow task record/assets generation | Shot -> ImageNode 与 ImageNode -> VideoNode 在 mock provider 下可用 |
| Phase 9：真实图片 Provider | ImageProvider registry、adapters、config UI、remote asset download、multi-output | 必要时拆 provider registry 和单个 adapter | Vendor focused context 加当前 provider docs | 无 key 时 provider disabled；配置后输出保存为 Asset |
| Phase 10：真实视频 Provider | VideoProvider polling、cancel、remote download、batch image-to-video、concurrency | 必要时拆 polling/cancel 和 provider adapters | Vendor focused context 加当前 provider docs | provider_waiting 不重复提交，视频持久化为 Asset |
| Phase 11：EditorBridge/export | Selected VideoNodes、timeline manifest、storyboard.csv、zip、EditorPackageNode、local POST | 保持 Deep module；必要时拆 worker packaging | export 语义不清时研究 Toonflow export/product-flow | 3 个选中视频可生成有效 zip 或 local editor POST |
| Phase 12：画布生产效率 | 批量生成、搜索、MiniMap、折叠、版本、变体、快捷键 | 拆成小 UI/productivity modules | 仅针对具体模式研究 | 批量操作和导航改善生产流，且不破坏 MVP |
| Phase 13：小云雀式轻量 Agent 入口 | 一句话创意入口、分层交互、新手流/专业流、创意到剧本/分镜草案再到画布；覆盖 XQ-01、XQ-12 | 拆为信息架构、Agent action 落库、前端入口 | 小云雀智能生视频/短剧 Agent；必要时补公开功能研究 | 用户输入一句创意后得到可编辑 storyboard/canvas draft，所有动作落为 CanvasNode、CanvasEdge 或 GenerationJob |
| Phase 14：故事蓝图与角色生命周期 | 长剧本故事蓝图、世界观、时间线、人物关系、角色生命周期字段；覆盖 XQ-02、XQ-03，并承接 TF-14/TF-15 | 拆为剧本解析、角色 schema、回溯 UI、prompt 接入 | 小云雀短剧漫剧 Agent 剧本解析和全局角色管理 | 镜头可回溯故事蓝图/事件/角色阶段，角色年龄、服饰、面部特征不会被生成流随意覆盖 |
| Phase 15：生成参数与成片包装 | 画风、画幅、旁白语言、口音、画面包装、字幕/BGM/转场/style-pack manifest；覆盖 XQ-04、XQ-06 | 拆为参数 schema/UI、prompt composer 接入、export manifest 扩展 | 小云雀智能生视频参数、一键成片包装、剪映导出语义 | 生成前可设置项目级/镜头级参数，导出包携带字幕、BGM、转场和包装引用 |
| Phase 16：参考图驱动故事生成 | Asset/ImageNode 作为故事种子，围绕参考主体生成角色、场景、分镜草案和视频；覆盖 XQ-07 | 拆为参考图导入、故事草案生成、source edge 绑定、provider 生成 | 小云雀参考图生视频；必要时结合图生视频 provider docs | 上传或选择参考图后可生成可编辑故事草案，并在画布保留来源关系 |
| Phase 17：爆款复刻、连续性与营销素材 | 爆款结构参考、连续转场/一镜到底、数字人/照片口播、封面/海报/营销成片；覆盖 XQ-08 到 XQ-11 | 拆成 P2/P3 子模块；先做合规 research/import，不直接爬平台 | 小云雀爆款复刻、一镜到底、营销成片、数字人/照片会说话 | 有合规输入方式和最小可用模块；能力不阻塞小说到剪辑包 MVP |
| Phase 18：协作、多端与导出预设 | 多端同步、团队协作、创作记录、历史二次编辑、导出 presets/GIF/image/HD；覆盖 XQ-13、XQ-14 | Web MVP 稳定后评估；协作、版本、导出格式分开做 | 小云雀多端协同、创作记录、导出格式；必要时研究协作架构 | 有单人到协作的演进决策，导出 preset 写入 manifest，历史作品可二次编辑 |

---

## Toonflow 覆盖差距后续任务清单

以下清单来自对 `docs/research/video-ref/` 与本地 Toonflow-app 的功能对照。它不是要求复制参考项目，而是把 Toonflow 已验证有价值、但 guga-flow 尚未完整覆盖的能力转成后续可排期模块。执行时仍以 PRD、当前代码和架构红线为准；每个任务都必须先进入 `ce-brainstorm`，再按标准模块循环推进。

优先级说明：

- P0：完成 MVP 闭环前必须处理。
- P1：MVP 后最能提高生产可用性的 Toonflow 差距。
- P2：V1.5/V2 或产品增强项，只有在核心闭环稳定后推进。

| ID | 优先级 | 任务 | 范围边界 | 参考研究触发 | 完成信号 |
| --- | --- | --- | --- | --- | --- |
| TF-01 | P0 | 完成 Phase 11 剪辑包前端闭环 | 多选 VideoNode、创建 export、显示状态、下载 zip、可选 local editor send；不做时间线编辑器 | `product-flow` / export 相关研究；必要时看 Toonflow workbench/export 路径 | 用户在画布框选 3 个 VideoNode 后可拿到有效 zip，刷新后有 EditorPackageNode 和 `sent_to_editor` 边 |
| TF-02 | P1 | 补齐批量关键帧生成 | 多选 ShotNode 批量创建 image jobs；保留单 Shot 生成路径；不引入新 provider | Toonflow `assetsGenerate`、`production/storyboard/batchGenerateImage` | 多选 ShotNode 可批量生成 ImageNode，失败/跳过项可见 |
| TF-03 | P1 | 增强批量视频生产工作台 | 基于已有 batch Image -> Video，补队列分组、跳过原因、批量取消/重试；不做轨道编辑 | Toonflow `production/workbench/batchGenerateVideo`、task routes | 批量生成时每个子任务可追踪、可取消、失败可重试 |
| TF-04 | P1 | 增加画布生产效率模块 | MiniMap/Outline、节点搜索、SceneFrame 折叠、快捷键、fit selection；不要影响 tldraw 原生交互 | Toonflow 画布/工作台体验只作参考，优先用 tldraw docs | 300 节点项目能快速定位场景/Shot，折叠后仍保留业务边和生成动作 |
| TF-05 | P1 | 节点版本与变体管理 | Image/Video/Shot 变体、selectedImage/selectedVideo、版本历史；不删除旧生成结果 | Toonflow 分镜/视频选择、`selectVideo`、`checkVideoStateList` | 同一 Shot 多个 Image/Video 可选择主版本，剪辑导出使用 selectedVideo |
| TF-06 | P1 | 图片精修与回流 | 上传图、局部重生成/图像编辑 flow、结果回流 ImageNode；不做复杂 Photoshop 式编辑器 | Toonflow `production/editImage/*` | ImageNode 可进入编辑流，保存新 Asset/ImageNode，并保留来源关系 |
| TF-07 | P1 | 角色/场地设定图与一致性资产生成 | 从 Character/Location 节点生成设定图、表情表/场景参考图；支持 locked 字段；不覆盖用户锁定内容 | Toonflow `assetsGenerate/*`、art skills | Character/Location 节点能生成参考图并自动绑定到 `referenceAssetIds` |
| TF-08 | P1 | 项目视觉手册与导演手册 | Art style、visual manual、director manual CRUD，并接入 prompt composer；不照搬 Toonflow 数据表 | Toonflow `project/*Manual*`、`artStyle/*` | 项目级风格/导演信息会进入 Shot prompt debug parts |
| TF-09 | P1 | Provider 管理控制台 | 服务端安全保存 provider 配置、模型列表、连通性测试、默认模型；暂不支持任意 TS 执行 | Toonflow `setting/vendorConfig/*`、`modelSelect/*` | 用户可在设置里启停 provider、测试模型；浏览器仍不接触密钥 |
| TF-10 | P2 | 可编程供应商沙箱 | 受控 TypeScript/JS provider adapter 编辑、校验、版本化；必须先做安全设计，不直接复用 vm 方案 | Toonflow `src/utils/vendor.ts` 和 vendor focused context | 新 provider 可通过受限沙箱注册并通过测试，不破坏 secret/server 边界 |
| TF-11 | P2 | Agent 对话式画布操作 | ScriptAgent/ProductionAgent 风格的对话入口，可创建/修改画布节点；不替代表单工作流 | Toonflow `scriptAgent`、`productionAgent`、socket routes | Agent 每次动作都落为 CanvasNode/CanvasEdge/GenerationJob，可撤销或审计 |
| TF-12 | P2 | Agent 记忆系统 | 项目级/Agent级短期记忆、摘要、语义召回；先用服务端抽象，不把记忆写入 prompt 黑盒 | Toonflow `utils/agent/memory.ts` | Agent 能召回项目偏好，记忆可清理、可查看、可禁用 |
| TF-13 | P2 | Skill 文件化配置与管理 | Story/art/production skill 模板、在线编辑、版本回滚；不把 skill 当作任意代码执行 | Toonflow `data/skills/*`、`setting/skillManagement/*` | Prompt/Agent 模板可在设置中编辑并影响后续生成 |
| TF-14 | P2 | 长篇章节事件图谱 | Novel chapter import、event extraction、event-to-shot trace；不要阻塞短篇 MVP storyboard | Toonflow `novel/event/*`、章节事件研究 | 长篇小说可按章节提取事件，并在 Shot 上回溯事件/原文 |
| TF-15 | P2 | 编剧工作台 | 故事骨架、改编策略、剧本版本、script export；保持 canvas-first import 入口 | Toonflow `script/*`、`scriptAgent` | 用户可从小说生成多个 script draft，并选择一个导入 storyboard/canvas |
| TF-16 | P2 | 音频和配音资产绑定 | Audio asset 类型、角色配音绑定、Shot/Video 音频引用；不做完整 DAW | Toonflow `cornerScape/*`、`assets/addAudioAssets` | 角色或镜头可绑定音频，editor export 可在 manifest 中携带音频引用 |
| TF-17 | P2 | 设置中心整合 | Prompt 管理、模型映射、数据库导入导出、文件管理、版本信息；拆成多个小模块 | Toonflow `setting/*` | 常用配置不再依赖 `.env` 或手工 DB 操作，且有测试覆盖 |
| TF-18 | P2 | 多语言 UI | i18n framework、中文/英文基础文案、后续语言包；不把产品逻辑塞进翻译文件 | Toonflow README 多语言支持 | 用户可切换至少 zh/en，核心 canvas/generation/export 文案覆盖 |
| TF-19 | P2 | 桌面/本地应用包装评估 | 评估 Electron/Tauri 或保持 Web；只在 Web MVP 稳定后执行 | Toonflow Electron scripts 和安装体验 | 有明确决策文档：是否做桌面壳、如何处理本地文件和更新 |

执行顺序建议：

1. 先完成 TF-01，确保 MVP 从小说到剪辑包闭环成立。
2. 再做 TF-02 到 TF-06，把已有画布生成能力变成更接近 Toonflow 的高频生产体验。
3. 然后做 TF-08 和 TF-09，补足项目风格与 provider 管理，减少依赖手工配置。
4. 最后按产品方向选择 Agent/Skill/EventGraph/桌面化等 P2 模块，不要在核心闭环不稳时同时启动。

---

## Toonflow 化前端体验任务清单

本清单专门约束“前端页面更偏向 Toonflow”的视觉与交互推进方式。它不是立即写代码的指令，也不是要求复制 Toonflow 的路由、数据模型、品牌或素材；它的目标是把 Toonflow 已经验证有效的短剧生产工作台气质，转成 guga-flow 自己的前端体验任务。

执行原则：

- 先补 requirements 和视觉验收，再进入实现；不要直接凭感觉改 CSS。
- 参考 Toonflow 的“桌面生产工具”结构：浅灰应用背景、白色工作区、左侧窄图标栏、顶部轻量 chrome、中央画布/生产区、右侧检查器或资源面板。
- 保留 guga-flow 的 canvas-first 和 tldraw MVP 方向，不为了视觉相似破坏画布交互。
- 先统一全局壳层、tokens 和核心布局，再细化卡片、节点、面板和状态。
- 每个 UI 任务必须有 desktop 与窄屏验收截图；文本不能溢出，按钮/卡片/工具条不能互相遮挡。

| ID | 优先级 | 任务 | 范围边界 | 参考研究触发 | 完成信号 |
| --- | --- | --- | --- | --- | --- |
| UI-TF-01 | P0 | 建立 Toonflow 前端参考基线 | 从 Toonflow 截图和本地参考项目整理 dashboard、production/workbench、settings 的视觉结构；不做代码实现 | 需要新增截图或确认页面结构时看 `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/docs/screenshot/` 和本地 Toonflow-app | 产出一页 requirements：布局、颜色、间距、面板层级、按钮风格、禁用项和不复制项 |
| UI-TF-02 | P0 | 定义 guga-flow 视觉 tokens | 背景、面板、边框、阴影、字号、按钮、状态色、图标尺寸；不引入新 UI 框架 | 当现有 CSS 变量不足或颜色冲突时对照 Toonflow 截图 | `globals.css` 或前端 spec 有稳定 token 表，dashboard/canvas/settings 能复用 |
| UI-TF-03 | P0 | 应用桌面壳层 | 顶部 chrome、左侧窄图标栏、白色主工作区、窗口状态点、轻量品牌区；不改业务路由 | Toonflow 首页和生产页截图 | dashboard 和 canvas 使用一致 app shell，主要导航位置稳定 |
| UI-TF-04 | P0 | 项目 dashboard Toonflow 化 | 左侧新建项目面板、右侧项目卡片网格、紧凑 icon 操作、空状态；不改变 Project CRUD 行为 | Toonflow 项目列表/首页截图 | 创建、打开、编辑、复制、删除项目仍通过现有测试；页面第一屏像生产工具而非营销页 |
| UI-TF-05 | P0 | 画布工作台三栏布局 | 左侧生产导航/小说输入，中间 tldraw 画布，右侧 inspector/assets/queue；不替换 tldraw | Toonflow production/workbench 截图；必要时查 tldraw docs | 画布页在桌面下三栏稳定，tldraw 工具条可用，右侧状态和资源不遮挡画布 |
| UI-TF-06 | P1 | 业务节点卡片视觉系统 | Novel/Scene/Shot/Character/Location/Image/Video/Export 的卡片尺寸、标题、状态 chip、摘要密度；不改业务类型 | Toonflow storyboard/production 节点视觉；当前 custom shape 实现 | 同类型节点视觉一致，长标题/长 prompt 可截断，状态能一眼识别 |
| UI-TF-07 | P1 | 生成与批量操作工具条 | 将常用动作整理成 icon+tooltip 或紧凑按钮：生成图、生成视频、批量、导出、重试；不新增未实现能力 | Toonflow batch generate/workbench 操作区 | 已实现动作可发现，未实现动作有明确 disabled 状态，不出现“看起来可点但无效” |
| UI-TF-08 | P1 | 资源库与队列面板 Toonflow 化 | 上传区、资产列表、筛选、GenerationJob 队列、失败/重试状态；不改变 provider 边界 | Toonflow assets/task record 体验 | 资源和队列状态可在画布页右侧连续查看，失败原因可读，操作按钮不拥挤 |
| UI-TF-09 | P1 | 设置中心信息架构 | Provider、模型、prompt/skill、项目手册、导入导出分区；先做导航和占位策略，不直接实现所有功能 | Toonflow setting/* 路由和 TF-09/TF-13/TF-17 | 设置页结构能承接后续 provider/skill/manual 模块，未完成项不会误导用户 |
| UI-TF-10 | P1 | 响应式与窄屏适配 | desktop、1366 宽、tablet、mobile；窄屏允许改为上下堆叠或抽屉；不强求移动端完整画布生产 | 现有 Browser/Playwright 截图验证 | 关键文本不溢出，工具栏不覆盖内容，dashboard 和 canvas 至少可浏览/管理 |
| UI-TF-11 | P1 | 可访问性与中文文案收口 | 图标按钮 tooltip/aria-label、表单 label、状态文案、中文/英文后续 i18n 边界；不把业务逻辑写入文案 | 现有测试和 TF-18 | 主要按钮可通过可访问名称定位；测试不依赖脆弱视觉文本；中文页面语气统一 |
| UI-TF-12 | P1 | 前端视觉回归验证 | 为 dashboard、canvas、settings 增加固定数据截图验收；先从 smoke screenshot 开始 | Browser/Playwright；tldraw 非确定区域需要容错 | 每次 Toonflow 化 UI 改动都有截图或浏览器检查记录，避免越改越散 |

建议拆分顺序：

1. 先做 UI-TF-01 和 UI-TF-02，只产出 requirements/token 决策，不写页面实现。
2. 再做 UI-TF-03 到 UI-TF-05，统一 dashboard 与 canvas 的大结构。
3. 然后做 UI-TF-06 到 UI-TF-08，把节点、工具条、资产和队列做成更像短剧生产工作台。
4. 最后做 UI-TF-09 到 UI-TF-12，补设置中心、响应式、可访问性和视觉回归，防止风格漂移。

---

## 外部功能参考覆盖核对清单

除 Toonflow 外，也可以参考剪映/即梦/内部知识库里的成熟视频生产功能，但必须先把参考内容变成可审查证据，再判断 guga-flow 是否覆盖。不要在无法访问正文时凭链接猜测功能。

当前待核对参考：

- `https://bytedance.larkoffice.com/wiki/PxZgwJwxti0dutk6WIdcwRA6nTd`
- 访问状态：直接 HTTP 访问返回 404 或非公开页面；Codex 当前不能读取用户内置浏览器中的私有登录态页面。需要用户导出 Markdown/PDF、复制正文，或提供可公开访问的内容快照后再做逐项覆盖判断。

当前可立即参考的公开小云雀/剪映功能来源：

- 小云雀官网：`https://xiaoyunque.jianying.com/`，页面主张“全能 AI 创作助手”，并展示短剧 Agent 2.0、剧本联动画布、影视级画风、爆款复刻、一镜到底等入口。
- 小云雀网页版：`https://xyq.jianying.com/novel/list`，搜索结果可见“上传剧本”、“AI 生剧本”、“自由画布”等创作入口。
- 火山引擎/即梦 AI 文档中心：小云雀包含智能生视频 Agent 1.0/2.0、营销成片 Agent、短剧漫剧 Agent、剧本解析、图片生成、视频生成、视频合成等接口/产品文档入口。
- 公开报道与测评：小云雀短剧 Agent 支持长剧本上传、一键成片、故事蓝图构建、角色设计、分镜生成，以及分镜和角色自定义编辑；智能生视频场景还覆盖语言/口音/时长/画面包装、字幕、BGM、转场、参考图生视频、爆款节奏提炼等能力。

核对流程：

1. 将外部文档转存为 `docs/research/video-ref/context-packs/<source>-feature-reference.md`，保留标题、功能列表、截图或关键流程。
2. 把功能拆成原子能力：用户动作、输入、输出、状态、失败路径、依赖服务。
3. 与当前 guga-flow 能力、Roadmap Phase、TF 任务、UI-TF 任务逐项对照。
4. 对已经覆盖的功能标记实现位置或 roadmap phase；对部分覆盖的功能写清缺口；对未覆盖功能新增任务。
5. 新增任务必须写范围边界和完成信号，不能只写“参考某产品做同款功能”。

功能域核对表：

| 功能域 | 需要核对的问题 | 当前优先映射位置 | 新增差距处理 |
| --- | --- | --- | --- |
| 项目与素材管理 | 是否有项目模板、素材分组、标签、搜索、预览、批量导入、素材复用 | Phase 1、TF-07、UI-TF-08 | 缺业务能力进 TF；缺页面体验进 UI-TF |
| 小说/剧本/分镜 | 是否有多版本剧本、章节拆分、事件提取、分镜表、脚本导出 | Phase 5、TF-14、TF-15 | 长篇/事件能力不要阻塞 MVP，列 P2 |
| 画布生产工作台 | 是否有节点大纲、批量选择、折叠、搜索、快捷键、生产状态面板 | Phase 12、TF-04、UI-TF-05/06/07 | 优先补高频生产效率，不破坏 tldraw |
| 图片/视频生成 | 是否有模型参数、批量生成、失败重试、取消、变体选择、结果回流 | Phase 8/9/10、TF-02/03/05/06 | provider/key 仍走服务端，浏览器不接触密钥 |
| 角色/场景一致性 | 是否有角色设定图、场景设定图、参考图锁定、风格手册 | Phase 7、TF-07、TF-08 | 接入 prompt composer，并保留用户锁定字段 |
| 音频/字幕/配音 | 是否有配音、BGM、字幕、音频资产绑定、导出 manifest | TF-16、TF-01 | 不做完整 DAW，先保证 editor export 可携带引用 |
| 剪辑与导出 | 是否有时间线、片段排序、转场、字幕、剪辑包、发送本地剪辑器 | Phase 11、TF-01 | MVP 优先 zip/manifest/local POST，不先做完整 NLE |
| 设置与 Provider | 是否有模型管理、密钥、连通性测试、额度、prompt/skill 管理 | TF-09、TF-13、TF-17、UI-TF-09 | 密钥只能服务端保存；可编程 provider 需安全设计 |
| Agent 与自动化 | 是否有对话式修改、任务编排、记忆、自动补全、审计日志 | TF-11、TF-12 | 所有 Agent 动作必须落到 CanvasNode/CanvasEdge/GenerationJob |
| 协作与版本 | 是否有多人协作、评论、权限、历史版本、回滚 | 现阶段未进入 MVP | 只有核心闭环稳定后列 P2/P3 |

| ID | 优先级 | 任务 | 范围边界 | 参考研究触发 | 完成信号 |
| --- | --- | --- | --- | --- | --- |
| REF-01 | P0 | 获取 Lark 文档可审查内容 | 导出或粘贴正文、截图、目录；不做功能推断 | 用户提供可读内容或公开快照 | `docs/research/video-ref/context-packs/` 中有可引用的功能参考文档 |
| REF-02 | P0 | 建立外部功能覆盖矩阵 | 把外部功能拆成“已覆盖/部分覆盖/未覆盖/暂不做”；不改代码 | REF-01 完成后执行 | 每个外部功能都有当前项目映射和覆盖状态 |
| REF-03 | P0 | 合并新增差距到 TF/UI-TF 清单 | 只新增真实缺口，不重复已有 TF-01 到 TF-19 或 UI-TF-01 到 UI-TF-12 | REF-02 发现未覆盖项 | 新增任务有优先级、范围边界、完成信号 |
| REF-04 | P1 | 判断是否影响 MVP 顺序 | 如果外部参考暴露 MVP 必需缺口，更新 Roadmap 模块队列；否则放后续 | REF-02/REF-03 完成后执行 | 文档清楚说明哪些缺口必须进 MVP，哪些延后 |

### 小云雀/剪映功能覆盖差距

以下差距来自当前可公开访问的小云雀/剪映信息，先作为参考任务进入 backlog。它们与 Toonflow 差距清单有重叠时，以现有 TF 任务为主，不重复开大模块；只有当小云雀提供了更具体的用户价值或验收点时，才新增 `XQ-*` 任务。

覆盖状态说明：

- 已覆盖：当前项目已有可演示能力。
- 部分覆盖：已有基础能力，但缺少小云雀式完整体验或关键参数。
- 未覆盖：当前 roadmap/代码中没有明确能力。
- 暂不做：偏运营、商业化或生态能力，不进入当前 MVP。

| ID | 覆盖状态 | 小云雀/剪映参考能力 | guga-flow 当前映射 | 缺口与任务处理 |
| --- | --- | --- | --- | --- |
| XQ-01 | 部分覆盖 | 一句话/Agent 入口直接生成短片或短剧 | Phase 5/6/8 已有小说导入、storyboard、mock 生成；TF-11 有 Agent 任务 | 新增 P1：做“创意一句话 -> 剧本/分镜草案 -> 画布”的轻量入口，但所有 Agent 动作必须落 CanvasNode/GenerationJob |
| XQ-02 | 部分覆盖 | 上传长剧本，自动构建故事蓝图、世界观、时间线、人物关系 | TF-14 长篇章节事件图谱、TF-15 编剧工作台 | 合并到 TF-14/TF-15；验收补充“世界观/时间线/人物关系可回溯到镜头” |
| XQ-03 | 部分覆盖 | 全局角色管理，识别角色生命周期变化，如年龄、服饰、面部特征 | TF-07 角色/场地设定图、TF-05 版本变体 | 新增 P1 子任务：角色生命周期字段与锁定策略；生成镜头时按剧情阶段选择角色设定 |
| XQ-04 | 部分覆盖 | 画风、画幅、旁白、语言、口音、画面包装等生成前参数 | Phase 1 有 aspect；TF-08 手册、TF-16 音频 | 新增 P1：项目级/生成级参数面板，先覆盖画风、画幅、旁白语言、口音、包装，不进入复杂剪辑 |
| XQ-05 | 部分覆盖 | 自动分镜后开放分镜和角色自定义编辑 | Phase 3/5/6 已支持节点和 storyboard 编辑 | 保持现有方向；补验收：自动生成内容必须能在导入画布后逐镜头/逐角色人工改 |
| XQ-06 | 未覆盖 | 一键成片自动包含字幕、BGM、转场、贴图/画面包装 | TF-01 export、TF-16 音频 | 新增 P1：Editor manifest 增加 subtitle/BGM/transition/style-pack 引用；不直接内建完整 NLE |
| XQ-07 | 部分覆盖 | 参考图生视频，并能围绕参考主体生成完整故事 | Phase 7/8/10 有 reference image 和 image-to-video 基础 | 新增 P1：Asset/ImageNode 可作为故事种子，生成角色/场景/分镜草案并绑定来源 |
| XQ-08 | 未覆盖 | 爆款复刻：解析爆款链接的钩子、节奏、主题、画风并二创 | 当前无竞品/平台链接解析 | 新增 P2：爆款分析作为 research/import workflow，先只支持用户粘贴文本摘要或手工输入结构化参考，避免爬取平台合规风险 |
| XQ-09 | 未覆盖 | 一镜到底/多图连续自然转场 | Phase 10 视频生成，TF-01 export | 新增 P2：多图片/多镜头连续性生成策略；先以相邻 Shot 的 continuity prompt 和 transition metadata 表达 |
| XQ-10 | 未覆盖 | 数字人/照片会说话/口播视频 | TF-16 音频、未来 Agent/Provider | 新增 P2：DigitalHumanNode 或 TalkingPhoto flow；先不进入 MVP，需 provider 能力和肖像/授权约束 |
| XQ-11 | 未覆盖 | 商业海报、封面、排版设计、营销成片 | Phase 9 图片 provider 仅生成生产资产 | 新增 P2：封面/海报/营销素材作为 Asset 派生能力；短剧 MVP 不阻塞 |
| XQ-12 | 部分覆盖 | 分层交互：普通用户一句话、进阶参数、专业分镜编辑 | UI-TF 和 TF-11/15 分散覆盖 | 新增 P1：产品信息架构要求三层入口，不把专业参数暴露给新手默认流 |
| XQ-13 | 未覆盖 | 多端同步、团队协同、创作记录实时同步、历史作品二次编辑 | 当前仅本地 web 项目持久化 | 新增 P2/P3：协作、权限、版本历史；先不影响单人 MVP |
| XQ-14 | 部分覆盖 | 导出适配多平台，多格式如高清视频、GIF、图片 | TF-01 剪辑包导出 | 新增 P2：导出 preset 和多格式 manifest；MVP 先保证 zip/manifest/editor package |
| XQ-15 | 暂不做 | 个性化推荐、用户等级、素材权益、商业套餐 | 不属于当前工程 MVP | 记录为产品运营方向，不进入近期开发 |

小云雀参考后的执行顺序建议：

1. Phase 13 先做 XQ-01 和 XQ-12，把一句话创意入口和分层交互接到现有画布生产流。
2. Phase 14 处理 XQ-02 和 XQ-03，把长剧本故事蓝图、世界观/时间线/人物关系和角色生命周期纳入 TF-14/TF-15。
3. Phase 15 到 Phase 16 做 XQ-04、XQ-06、XQ-07，补齐生成参数、成片包装和参考图驱动故事生成。
4. Phase 17 做 XQ-08 到 XQ-11，作为 P2/P3 增强处理爆款复刻、一镜到底、数字人/照片口播和营销素材。
5. Phase 18 做 XQ-13 和 XQ-14，等 Web MVP 稳定后再推进协作、多端、历史二次编辑和导出预设。
6. XQ-15 暂不进入工程 Roadmap，只作为后续商业化/运营方向备忘。

---

## 产物命名

使用稳定、可移植的产物路径，方便上下文压缩后恢复：

```text
docs/brainstorms/YYYY-MM-DD-NNN-<phase-or-module>-requirements.md
docs/plans/YYYY-MM-DD-NNN-<type>-<module>-plan.md
docs/solutions/<category>/<learning-slug>-YYYY-MM-DD.md
docs/research/video-ref/context-packs/<topic>.md
```

当模块跨多个 PRD 阶段时，在标题和范围章节中同时写明。生成文档中不要使用绝对路径。

每个循环结束后建议输出模块交接摘要：

```markdown
## 模块交接摘要

- 模块：
- PRD 阶段：
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

## 恢复协议

任何恢复会话开始时：

1. 阅读本文。
2. 阅读当前正在执行的 PRD 阶段。
3. 阅读 `docs/brainstorms/` 下最新匹配的 requirements 文档。
4. 阅读 `docs/plans/` 下最新匹配的 plan 文档。
5. 检查 `git status --short`、当前分支和近期 commits。
6. 在 `docs/solutions/` 中搜索当前模块相关学习。
7. 检查相关 `docs/research/video-ref/` 资产是否已经回答参考问题。
8. 从下一个未完成的 CE stage 继续。除非产物缺失或过期，否则不要重启模块。

如果无法识别活跃模块，从以下信息重建：

- 当前 branch 名。
- 最新 plan 文件。
- Git diff。
- 上方 PRD 阶段表。
- 最近的 solution 或 research 文档。

---

## 质量门禁

每个实现模块的最低门禁：

- 模块级 unit tests 通过。
- 任何跨层行为都有 integration tests 通过。
- 用户可见画布流程运行 E2E 或 browser verification。
- 仓库具备这些脚本后，`pnpm run format:check`、`pnpm run test`、`pnpm run build` 通过。
- 模块的 PRD acceptance examples 已手动或自动验证。
- `ce-code-review` 没有未解决阻塞 finding。
- `ce-compound` 已捕获非平凡学习。

MVP 累积门禁：

- 创建项目。
- 上传资产。
- 打开可持久化无限画布。
- 粘贴小说。
- 生成 mock storyboard JSON。
- 导入 storyboard 到画布。
- 刷新页面后节点、边、位置和状态仍存在。
- 拖拽 character/location 到 ShotNode，并更新 edge 与 `dataJson`。
- 从 ShotNode 生成 mock ImageNode。
- 从 ImageNode 生成 mock VideoNode。
- 将选中的 VideoNodes 导出为 editor package zip。

PRD 性能门禁：

- 本地 mock 模式下，300 节点项目打开时间小于 3 秒。
- 300 节点画布拖拽体验流畅。
- 1000 节点画布可以 pan 和 zoom。
- 批量状态更新不会让整个画布明显闪烁。

---

## 失败路由

循环中暴露问题时按下表处理：

| 失败类型 | 路由 |
| --- | --- |
| 产品行为不清楚 | 回到 `ce-brainstorm`，更新或创建模块 requirements 文档 |
| 实现方式不清楚 | 回到 `ce-plan`，用已解决决策更新 plan |
| 运行时行为与 plan 冲突 | 如果是 implementation-time unknown，则继续 `ce-work`；否则先更新 plan |
| 测试暴露验收覆盖缺口 | 在 `ce-work` 中补测试；只有影响未来 units 时才更新 plan |
| Code review 发现阻塞问题 | 通过 `ce-code-review` 路由修复，然后重新 review |
| 参考项目揭示更好边界 | 更新 requirements 或 plan，并记录 evidence strength |
| 出现可复用学习 | 进入下一模块前运行 `ce-compound` |
| Roadmap 或流程与实际执行不符 | 更新 PRD roadmap 或本文，并在模块交接摘要中说明调整依据 |
| 会违反架构红线 | 停止并修订 plan；不要交付该模块 |

---

## 下一模块 Agent Prompt 模板

启动新模块时使用这个提示结构：

```text
请按照 docs/infinite-canvas-video-long-task-development-flow.md 实现 guga-flow 的下一个模块。

当前模块：
- PRD 阶段：
- 范围：
- 相关 PRD 章节：
- 相关架构章节：
- 已有研究资产：

严格执行模块循环：
1. ce-brainstorm
2. ce-plan
3. ce-work
4. ce-code-review
5. ce-compound

所有生成产物都使用 repo-relative 路径。不要超出模块范围实现。保持 canvas-first 架构和 mock-first MVP 路线。
```

---

## 完成规则

不是所有 roadmap 代码存在就算项目完成。只有满足以下条件才算完整：

- 每个 MVP phase 都通过了模块循环。
- PRD 中的 MVP Definition of Done 作为端到端 demo 通过。
- 架构红线仍然成立。
- 最终 code review 干净，或只剩已接受的 residual advisory items。
- 沿途的非平凡决策和修复都有持久化学习文档。

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

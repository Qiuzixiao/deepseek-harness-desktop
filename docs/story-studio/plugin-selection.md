# Story Studio 插件选型与复用矩阵

## 1. 选型原则

插件目录、GitHub Topic、Star 数和 README 声明都只是发现线索，不是生产准入证明。每个插件必须经过以下判断：

1. 是否真的提供 `dsh.bundle`、`dsh.client` 或合法 Skill，而不是只使用 DSH 关键词；
2. 是否有固定版本、release/tarball 或可复现 commit；
3. 是否声明兼容当前 DSH `0.1.0-rc.7`；
4. 是否会复制官方 service、改变 Profile、直接调用模型或建立平行数据源；
5. 是否有清楚的 Host/Client 权限、网络、原生依赖和卸载边界；
6. 是否包含许可证、第三方声明、测试和可构建发布物；
7. 是否同时通过普通 Web、Desktop compatibility、Desktop advanced 和 packaged app 验证。

选型状态定义：

- **采用**：已通过当前基线运行和发行门禁，可进入固定产品清单；
- **优先试验**：能力匹配，但仍缺 `rc.7` 或桌面发行证据；
- **延后评估**：有价值，但 MVP 不需要或成本过高；
- **可选工具**：允许内部用户自行安装，不进入产品事实源；
- **仅作参考**：借鉴功能与测试，不作为运行时依赖；
- **不采用**：与架构冲突、重复基础能力或风险大于收益。

`dsh-drop-to-path` 已由产品负责人指定为 MVP 文件输入入口，并通过 `rc.7` 临时 Web Profile 的安装、Loader、Host 路由和 Client manifest smoke。其余候选状态详见[插件兼容性报告](plugin-compatibility-report.md)。

## 2. 总体复用矩阵

| 产品需求 | 官方能力 | 候选插件 | 当前决策 |
| --- | --- | --- | --- |
| Session、Workspace、设置、附件 | DSH 官方 seam | 无需插件 | 采用官方能力 |
| 文件读写与文本搜索 | `ctx.fs`、官方 fs tools | 无需插件 | 采用官方能力 |
| 文件拖拽、粘贴与路径注入 | Workspace、composer | `dsh-drop-to-path` | **MVP 使用** |
| 文件树、编辑器、Git Diff | 官方没有完整编辑工作台 | `dsh-better-sidebar`、`dsh-compass` | Better Sidebar 优先试验；Compass 只读 fallback |
| DOCX/文本层 PDF 解析 | fs | `dsh-rich-file-reader` | 与 Drop to Path 组合验证；不再承担主要输入入口 |
| Agent 变更回退 | Session fork、Git | `dsh-checkpoint-rewind` | 优先试验 |
| Git 命令 | subprocess/shell | `dsh-plugin-git-workflow` | 暂不预装 |
| Markdown 笔记 | 工作区文件 | `dsh-md-notes` | 可选工具，不作为作品数据 |
| 专业 DOCX/PDF 输出 | 工作区文件 | `@huiliyi37/dsh-office` | 当前不实现 |
| 本地知识库/RAG | fs search、compaction | `dsh-knowledge`、Mindspace | 延后做召回基准 |
| 小说工作流 | Preset、Skills、Workflow | `dsh-novel-writer`、`dsh-tool-writing` | 仅作参考 |
| 世界书 | Skills、项目设定文件 | `dsh-LorebookMD` | 仅作参考 |
| Agent/任务可视化 | 官方 jobs/subagent UI | `dsh-abyss` 等 | MVP 不采用 |
| 插件发现与安装 | Profile plugin CLI | DSH 1024Store、Community Market | 只用于发现，不进入生产依赖 |

## 3. 优先试验插件

### 3.1 `dsh-drop-to-path`

- 来源：[loudMore/dsh-drop-to-path](https://github.com/loudMore/dsh-drop-to-path)
- 检查版本：`0.1.0`，包名 `@dsh-external/dsh-drop-to-path`。
- 许可证：MIT。
- 能力：拖拽或粘贴图片、PDF、Office 文档和常见媒体文件，将文件复制到当前工作区 `.drops/`，发送时把工作区路径写入对话。
- 已验证：DSH `0.1.0-rc.7` 临时 Web Profile 可安装并启动；`drop-to-path` Loader row、Host 导入路由和 Client face 均存在。
- 决策：**MVP 使用**，作为 Story Studio 的统一文件输入入口。文档内容解析由后续工具按工作区路径完成。
- 组合边界：不同时启用另一个全页面拖拽插件；`dsh-rich-file-reader` 若保留，只提供 `read_rich_file` / `ocr_pdf` 解析能力。

### 3.2 `dsh-rich-file-reader`

- 来源：[shixiliya1/dsh-rich-file-reader](https://github.com/shixiliya1/dsh-rich-file-reader)
- 检查版本：`0.3.1` GitHub release；本机 Web Profile 已安装该版本；npm registry 未发现同名包。
- 许可证：MIT。
- DSH 声明：`0.1.0-rc.6`。
- 能力：`read_rich_file`、`ocr_pdf`、Word/Excel/PPT/PDF/图片读取，以及 Web composer 的“导入文档”入口。
- 正面证据：有 Host/Client 双面清单、Office/PDF 测试、本地 OCR、附件机制和输入大小限制。
- 风险：依赖 `office-oxide`、Tesseract、Canvas 等原生或重型运行时；中文 OCR 语言包可能首次联网；未声明 `rc.7`。
- 决策：**MVP 预装**。不作为主要文件输入入口；当前只验收按工作区路径读取 DOCX 和文本层 PDF。Excel、PPT 和扫描 PDF 的完整生产不进入本轮验收。
- 淘汰条件：无法在 packaged app 中稳定装载、原生依赖不可复现、composer 与其他插件冲突，或真实剧本文档提取质量不可接受。

### 3.3 `dsh-better-sidebar`

- 来源：[omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)
- registry 观察版本：`0.12.3`；检查的仓库快照清单为 `0.12.2`，生产评估必须重新审核精确 `0.12.3` tarball。
- 许可证：MIT。
- 能力：文件树、CodeMirror 编辑、Markdown/HTML/PDF/Office 预览、终端、Git diff/历史/暂存/提交、后台任务、插件 tab/viewer service。
- 正面证据：一个现有插件覆盖了原计划中最容易重复开发的文件、编辑器、Git 和任务 UI；公开 `ctx.betterSidebar` 扩展接口。
- 风险：权限和攻击面大；包含 Git 写操作、终端和 `node-pty`；UI 占位可能与 Desktop advanced frame 冲突；发布非常活跃，需要严格锁版。
- 决策：**MVP 预装**。精确 `0.12.3` 发布物已进入产品 Profile，并对 Canvas、嵌套 `node-pty` 和 universal macOS 资产执行安装包验证；内部工具保留终端和 Git 能力。
- fallback：若写能力或高级模式不稳定，使用 `dsh-compass` 提供只读文件/Git 观察，并依赖系统编辑器或官方 produced-files 打开能力。

### 3.3.1 项目 UI 候选结论

- `WenhongPan/dsh-projects` 提供项目管理 UI，但新建流程仍以选择目录为核心，不符合“只输入作品名称、统一全局根目录”的产品要求，因此不直接引入。
- `joejojoking-cloud/dsh-file-explorer`、`yu2025-luo/dsh-file-panel`、`ZrSiO4-y/dsh-explorer`、`ghbhiee/dsh-plugin-workbench` 和 `nirvanaslash/dsh-artifact-preview` 已作为文件树/预览候选检索；现阶段 Better Sidebar 已覆盖 Explorer、编辑、预览和 Git，继续增加同类插件只会造成 UI 入口冲突。
- 最终方案是产品包只实现薄项目层，通用工作台继续复用 Better Sidebar。

### 3.4 `dsh-checkpoint-rewind`

- 来源：[PerryLink/dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)
- registry 观察版本：`0.5.1`；检查的源码清单为 `0.5.0`，需要重新审核 `0.5.1` 发布包。
- 许可证：Apache-2.0。
- DSH 声明：`0.1.0-rc.6`。
- 能力：工作区、会话游标和配置三态 checkpoint；Git 仓库使用无引用对象快照，非 Git 目录使用 copy provider；回退前确认和守护 checkpoint。
- 正面证据：默认不移动 HEAD、不修改 Git 历史或索引；有单元测试、headless 集成流程和明确安全文档。
- 风险：会监听写入工具和 session 事件；`rc.6` 对自定义 session event 有已知限制；默认每步 checkpoint 可能影响大项目性能和存储。
- 决策：**MVP 预装并维护兼容补丁**。本仓库补齐 `rc.7` Settings schema 和配置热更新时的工具单例注册；生产配置保持 `workspaceRestore: restore`，回退前必须确认，不启用 `reset-hard`。
- 淘汰条件：`rc.7` session 语义不兼容、与 Git 插件互相干扰、恢复无法保持未跟踪文件和用户索引边界，或大型项目性能不达标。

## 4. 第二阶段候选

### 4.1 `@huiliyi37/dsh-office`

- 来源：[omdsh-dev/dsh-office](https://github.com/omdsh-dev/dsh-office)
- 版本：`0.2.1`，npm 发布。
- 许可证：Apache-2.0，并声明移植来源。
- DSH peer：`dsh-tools ^0.1.0-rc.5`，未精确验证 `rc.7`。
- 能力：DOCX/XLSX/PPTX/PDF 读取、创建和部分编辑。
- 决策：**延后评估**。首批只考虑启用 DOCX/PDF 工具族，用于交付；普通生成能力不代表满足专业剧本版式，仍需模板验收。

### 4.2 `dsh-knowledge`

- 来源：[Soren-ABT/dsh-knowledge](https://github.com/Soren-ABT/dsh-knowledge)
- 版本：`0.2.12`，npm 发布。
- 许可证：MIT。
- 能力：文档解析、分块、本地 embedding、检索、重排、Storage Domain 和设置 UI。
- 正面证据：使用官方 storage/storage-domain seam，有解析、分块、检索、embedding 复用和领域存储测试。
- 风险：本地模型体积、首次下载、中文召回质量、CPU/内存和打包时间未知；与 Rich File Reader 的解析能力重叠。
- 决策：**延后评估**。必须先证明普通文件结构、摘要和 fs search 无法满足长篇场景，再与 Mindspace 进行统一语料基准。

### 4.3 `mindspace-dsh-local-rag`

- 来源：[Spirtxiaoqi7/mindspace-dsh-local-rag](https://github.com/Spirtxiaoqi7/mindspace-dsh-local-rag)
- 检查版本：`0.3.5`；npm registry 未发现同名包。
- 许可证：MIT。
- 能力：本地 embedding、词法降级、文档历史、摘要索引、上传和 UI。
- 正面证据：测试覆盖较广，包括解析、检索、模型生命周期、迁移、降级、上传和文档治理。
- 风险：`onnxruntime-node` 和 Transformers 带来原生 ABI、体积和模型管理成本；缺少稳定 registry 发布通道。
- 决策：**延后评估**，作为 `dsh-knowledge` 的对照候选，不并装。

## 5. 可选或 fallback 插件

### 5.1 `dsh-compass`

- 来源：[Happy2Git/dsh-compass](https://github.com/Happy2Git/dsh-compass)
- 检查版本：`0.15.0`；npm registry 未发现同名包。
- 许可证：MIT。
- 能力：右侧上下文、文件浏览、只读 Git 图、注入文档和 session log 下载。
- 决策：**只读 fallback**。它不提供完整编辑器，但权限小于 Better Sidebar，适合后者未通过安全/打包门禁时使用。

### 5.2 `dsh-files`

- 来源：[taxueseek/dsh-files](https://github.com/taxueseek/dsh-files)
- 检查版本：`0.2.0`；npm registry 未发现同名包。
- 许可证：MIT。
- 能力：会话隔离上传、composer 卡片和 `read_document`。
- 决策：**暂不采用**。与已安装 Rich File Reader 和官方附件能力重叠；只在 Rich File Reader 无法满足会话隔离上传时重新比较。

### 5.3 `dsh-md-notes`

- 来源：[XieZongChen/dsh-md-notes](https://github.com/XieZongChen/dsh-md-notes)
- 版本：`0.3.0`，npm 发布。
- 许可证：MIT。
- 能力：工作区 `.dsh-notes`、Markdown 编辑、对话摘录和 Git 同步。
- 决策：**可选个人工具**。它的数据目录不能成为作品 Bible、正文或审校结果的事实源，避免项目内容被拆进平行笔记系统。

### 5.4 `dsh-plugin-git-workflow`

- 来源：[truelove-dreamer/dsh-plugin-git-workflow](https://github.com/truelove-dreamer/dsh-plugin-git-workflow)
- 检查版本：`0.1.2`。
- 许可证：MIT。
- 能力：通过 `ctx.shell` 提供 Git 工作流工具。
- 决策：**暂不预装**。官方 shell、Better Sidebar 和 Checkpoint 已覆盖 MVP 需求；新增写 Git 工具会扩大模型工具面和误操作风险。

## 6. 仅作设计参考

### 6.1 `dsh-novel-writer`

- 来源：[akira399/dsh-novel-writer](https://github.com/akira399/dsh-novel-writer)
- 检查版本：`0.1.1` GitHub release/source；npm registry 未发现其 scoped 包。
- 许可证：MIT。
- 能力：九阶段小说流程、Lorebook、事实账本、上下文组装、导入导出、GUI 和大量 `novel_*` 工具。
- 参考价值：项目状态、设定注入、事实账本、润色 diff、长篇一致性和大规模测试目录。
- 不作为底座的原因：强制九阶段与“按输入完整度自适应”目标冲突；自有项目协议和工作台只覆盖小说；直接依赖会让短剧数据模型受其实现约束。

### 6.2 `dsh-tool-writing`

- 来源：[x2802490130-prog/dsh-tool-writing](https://github.com/x2802490130-prog/dsh-tool-writing)
- 版本：`0.6.2`，npm 发布。
- 许可证：MIT。
- 能力：批量大纲/章节、书库、FTS/向量检索、人物演化、伏笔、多线叙事、用量和导出。
- 参考价值：长篇项目目录、检索降级、上下文前缀稳定和批量生成测试思路。
- 不作为底座的原因：使用独立 API key、模型和费用逻辑，建立自己的 SQLite/索引/项目协议，绕过产品统一的 DSH 模型路由和 Agent 编排。

### 6.3 `dsh-LorebookMD`

- 来源：[609476965/dsh-LorebookMD](https://github.com/609476965/dsh-LorebookMD)
- 检查版本：`1.0.0`。
- 许可证：MIT。
- 参考价值：SillyTavern/角色卡导入、关键词触发和 Markdown 设定落盘。
- 不作为底座的原因：数据默认落在全局 DSH home，创作模式使用完整设定注入，难以支撑多项目和长篇上下文预算。

### 6.4 `deepseek-harness-kit` 私有模块

- 来源：[AlwaysSum/deepseek-harness-kit](https://github.com/AlwaysSum/deepseek-harness-kit)
- 参考内容：`plugin-file-explorer`、中文本地化、主题和其他实验性插件。
- 决策：**只参考实现**。其中部分包标记 `private`，不构成可再分发的稳定产品依赖。

## 7. 市场与供应链策略

本仓库的 `dsh-community-market` 已实现只读市场壳和 DSH 1024Store adapter，但还不是产品安装器。Story Studio 的生产依赖遵循独立锁定流程：

1. 市场/API 只产生候选列表；
2. 维护者审核仓库和精确 release/tarball；
3. 记录 package、version/commit、下载源、SHA-256、许可证、权限、原生依赖和 DSH 兼容性；
4. 在一次性 Profile 中完成安装、启动、卸载和残留检查；
5. 完成 Desktop 两种模式和 packaged app 验证；
6. 通过后才更新产品插件锁和第三方许可；
7. 更新一个插件使用独立提交，失败时可单独回退。

禁止生产 Profile 使用 GitHub `main`、浮动 semver 或未经审核的安装脚本。带 `curl | bash`、`prepare`、native build 或首次下载模型的插件必须额外审计其安装时执行行为。

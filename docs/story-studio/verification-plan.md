# QNovel Beta 验证与验收计划

## 1. 验证原则

测试关注用户可观察行为和跨模块合同，不锁定 React 组件结构、内部函数名或模型的逐字输出。创作质量有主观部分，但名称创建、全局路径、文件结构、冲突处理、工具边界、恢复和引用必须可以自动验证。本轮只运行本地开发版，不执行安装包验收。

所有第三方插件先在一次性 DSH home/Profile 中运行。验证失败不能污染用户当前 `desktop`、`web` 或自建 Profile。

## 2. 阶段 0：插件组合试验

### 2.1 固定输入

每次试验记录：

- DSH source pin 和 runtime package family；
- Desktop commit、平台、架构和 Electron ABI；
- 插件 package/version/commit/tarball/SHA-256；
- Profile manifest、bundle 顺序和 Cordis patch；
- native build allowlist 和安装时执行脚本；
- 测试文件 hash，避免样例变化导致结果不可比较。

### 2.2 单插件门禁

每个候选至少通过：

1. 在空 Profile 中安装并登记到 `dependencies` 与 `dsh.profile.bundles`；
2. `--dump-config` 中只有一个预期 Loader row，不重复挂载；
3. Headless Loader smoke 不打开窗口；
4. 启动、实际调用核心能力、重启后再次调用；
5. 卸载后 Profile 可启动，用户数据保留边界符合文档；
6. 无非预期外部网络请求、凭据读取或 Profile 改写；
7. 许可证和第三方 notice 满足内部再分发要求。

### 2.3 组合门禁

首选组合：Drop to Path + Rich File Reader（解析工具）+ Better Sidebar + Checkpoint Rewind。

必须验证：

- `dsh-drop-to-path` 是唯一全页面拖拽/粘贴入口，其他插件不重复处理同一文件；
- 拖入 DOCX/PDF 后，消息中的工作区路径可以直接交给 `read_rich_file`；
- 文件编辑触发一次可识别 checkpoint，不形成无限事件循环；
- Better Sidebar Git 操作不破坏 Checkpoint 的 Git provider；
- 回退后文件树、diff 和 produced-files 刷新一致；
- 插件路由只在 loopback/trusted host 边界可用；
- compatibility 和 advanced 模式都没有遮挡、空白或重复侧栏；
- macOS 和 Windows packaged app 中原生依赖 ABI 正确；
- 插件失败时 Desktop generation 回滚到 last-known-good。

## 3. 文档输入测试（当前范围）

固定中文样例集至少包含：

- 有文本层的 PDF 剧本；
- DOCX 剧本，含常规段落、表格和分页；
- 大体积文件、加密文件、损坏文件和伪装扩展名文件；
- 同名文件和包含中文、空格、特殊字符的路径。

验收：

- 文本顺序、页和表格边界可识别；
- 长文档支持分页或显式截断，不能静默丢失；
- 导入不会把原文件复制到未知目录；
- 引用分析可以回指文件和页/章节/场次；
- 文件内容不被插件上传到未声明服务。

扫描 PDF、Excel 和 PPT 的完整生产不属于当前 MVP，即使预装插件暴露相关工具，也不能把“工具存在”写成产品验收通过。

## 4. Agent 场景回归

### 4.1 专业但存在冲突的短剧需求

输入包含完整题材、受众、时代、人物、季范围和爽感要求，同时在不同位置出现 35 集与 50 集。

验收：

- Agent 不重复询问题材、受众和时代；
- 明确指出集数冲突及其对结构的影响；
- 一次提问不超过三个高影响问题；
- 用户确认后生成 50 集或选定规模，而不是保留两个事实；
- brief、story、人物、主纲和分集文件互相一致；
- 至少一轮时代事实与跨文件一致性审校。

现有 `script-studio` 生成的“1998 父子重生创业”项目作为基准夹具，但不要求复制其提示词、目录或逐字输出。

### 4.2 模糊故事想法

输入只包含人物关系、一个核心设定和大致类型。

验收：

- Agent 先判断本轮用户要的是方向方案还是完整正文；
- 只询问作品形态、规模/季边界、核心受众等高影响问题；
- 对普通缺失给出清楚假设并写入 brief；
- 输出至少两种有真实取舍的方向，而不是同义改写；
- 用户未决定的内容保持待确认，不伪装为已确认事实。

### 4.3 参考剧本拆解

验收：

- 原材料、摘要、结构分析和新作品正文分开保存；
- 分析标注可定位来源；
- 产物抽象节奏、角色功能和结构，不长段复写原文；
- 参考材料删除或移动时，索引明确报告失效来源。

### 4.4 长篇续写

构造多卷/多季、多人、多地点和伏笔样例。

验收：

- 只加载本轮必要文件；
- 能搜索并引用早期事实；
- 更新人物当前状态和时间线；
- 审校能找到预埋冲突；
- 删除 `.story-studio/` 后仍能从项目文件恢复基本状态。

## 5. 项目合同测试

`story-project` 深模块应有纯行为测试：

- 只提供作品名称即可在统一全局根目录创建完整最小目录；
- 空名称、非法字符、路径逃逸和同名作品返回稳定诊断；
- Host RPC 的 `describe` 与 `createProject` 消费同一项目根配置；
- 创建后通过官方 Workspace API 注册、重命名并切换；
- 项目脚本拒绝越出当前作品目录的路径。

测试优先使用临时目录和真实文件，不 mock 掉文件合同。Host API 和 Client UI 测试只验证它们消费同一项目状态，不重复测试解析算法。

## 6. Checkpoint 与 Git 测试

- 已有 Git 仓库和无 Git 项目分别验证；
- tracked、untracked、staged 和 ignored 文件分别验证；
- checkpoint 捕获不得移动 HEAD、修改 reflog 或清空 index；
- preview 是只读操作；
- 真正回退必须请求确认，拒绝后零写入；
- 回退前 guard checkpoint 可以撤销本次回退；
- 新建于 checkpoint 后的文件按插件合同保留或明确报告；
- 大型作品目录验证快照时间、存储上限和清理；
- 禁止在产品配置中启用 `reset-hard` 恢复模式。

## 7. 知识检索准入基准

在决定 `dsh-knowledge` 或 Mindspace 前，建立同一套中文语料和问题：

- 人物早期设定与后期状态；
- 跨卷/跨季伏笔；
- 同名人物、别名和称谓；
- 时间、年龄和地点约束；
- 参考剧本中的结构节点；
- 问题使用同义表达而非原文关键词。

比较三条路径：结构化文件 + fs search、`dsh-knowledge`、Mindspace。记录 Recall@K、错误引用、返回片段可定位性、索引时间、首次模型下载、磁盘、内存和冷启动。

RAG 只有同时满足以下条件才进入产品 Profile：

- 相比 fs search 明显提高关键事实召回；
- 每条结果能回指项目原文件；
- 中文语料表现稳定；
- 删除/修改文件后索引能更新或明确失效；
- packaged app 原生依赖和模型生命周期可维护；
- 插件数据删除不会损坏作品事实源。

## 8. UI 与桌面模式测试

使用自动化截图和 DOM/slot 检查验证：

- 兼容模式保持官方 Web 布局；
- 高级模式保留 Desktop caption、sidebar、conversation、details 和 overlay 几何；
- 第三方侧栏不遮挡输入框、标题栏、原生窗口按钮或 details；
- 1280x720、1440x900、宽屏和最小窗口尺寸下文字与控件不重叠；
- macOS 和 Windows 分别验证；
- 插件关闭后官方页面恢复，不残留全局 CSS；
- 全新数据目录首次启动必须选择 QNovel 全局作品目录，取消时仍停留在引导；Settings 可以修改该目录且已有作品不迁移；
- 左侧官方 Logo 位置显示 QNovel，左侧只有一个“新建作品”，右上角不存在重复入口；
- 空白会话的作品选择器显示“新建作品”，弹窗只包含名称输入和只读保存根路径；
- 创建后中间官方对话区可用，右侧继续使用当前 dsh-workbench；无 Session 时显示空状态，不显示 `dsh-plugin-desktop`；
- 新建项目文件树可见 `项目配置.yml`、`项目说明.md`、中文故事设定、大纲、正文和审校目录；
- 点击中文 Markdown 后编辑器显示真实内容，Markdown 预览、保存和切换作品正常。

## 9. 仓库与发行门禁

每个实现切片至少执行：

```sh
corepack yarn check:layout
corepack yarn typecheck
corepack yarn test
corepack yarn build
corepack yarn check
```

涉及上游命令路径时补充 `corepack yarn upstream:build`。本轮不构建 DMG/安装包；已有静态运行时清单测试继续保证产品 Host/Client 产物、类型和许可证不会从未来发行物中遗漏。

最终发行还需检查：

- `master` 未包含产品提交；
- `deepseek-harness/` 工作树干净且 pin 独立；
- 产品 Profile 的插件版本、hash 和 bundle 顺序与锁一致；
- 所有第三方许可证和 notice 进入发行包；
- 安装、升级、失败回滚、卸载和用户数据保留均有验证记录；
- 运行日志不泄露 API key、完整参考原文或未脱敏凭据。

## 10. 阶段完成定义

### 组合验证完成

三个优先插件各自有明确“采用/淘汰”结论，首选组合在 `rc.7` 和至少一个 packaged desktop 上通过真实能力调用。

### MVP 完成

用户可以从专用 Profile 只输入名称创建项目，项目自动落到统一全局根目录；工作台包含项目文件树、中间对话区和右侧文件预览；Agent 能处理模糊/专业需求，生成短剧或小说产物，执行审校和返修，并在重启后继续创作。该流程不依赖手工修改 Profile 或复制 Preset。

### 领域稳定化完成

项目合同有版本和验证；产品项目入口与文件事实源一致；真实短篇从 brief/Bible/大纲到正文、审校和返修完整跑通。

### 内部发行完成

macOS/Windows 安装包、插件锁、许可证、升级回滚和支持文档完整，且没有账号、计费或云服务才能运行的隐含依赖。

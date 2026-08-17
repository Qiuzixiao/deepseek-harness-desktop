# Story Studio 验证与验收计划

## 1. 验证原则

测试关注用户可观察行为和跨模块合同，不锁定 React 组件结构、内部函数名或模型的逐字输出。创作质量有主观部分，但需求判断、文件结构、冲突处理、工具边界、恢复、引用和打包必须可以自动验证。

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

## 3. 文档输入测试

固定中文样例集至少包含：

- 有文本层的 PDF 剧本；
- 扫描版中文 PDF；
- DOC/DOCX 剧本，含表格和分页；
- XLS/XLSX 人物或分集表；
- PPT/PPTX 项目提案；
- 大体积文件、加密文件、损坏文件和伪装扩展名文件；
- 同名文件和包含中文、空格、特殊字符的路径。

验收：

- 文本顺序、页/表/幻灯片边界可识别；
- 长文档支持分页或显式截断，不能静默丢失；
- 扫描件明确显示 OCR 语言和失败原因；
- 导入不会把原文件复制到未知目录；
- 引用分析可以回指文件和页/章节/场次；
- 文件内容不被插件上传到未声明服务。

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

- 新建短剧和小说项目得到正确的最小目录；
- 重复初始化幂等，不覆盖已有正文；
- schemaVersion、medium、状态和编号非法时返回稳定诊断；
- 未知 YAML 字段在读取/写回时保留；
- 短剧不被要求创建小说目录，小说不被要求创建短剧目录；
- 同一人物或集/章 id 冲突可检测；
- status 从文件事实推导，不依赖某次会话内存；
- migrate 显式、可回滚，并在失败时不留下半迁移文件；
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
- 项目首页若实现，标准 Client Slot fallback 在没有 Better Sidebar 时仍可用。

## 9. 仓库与发行门禁

每个实现切片至少执行：

```sh
corepack yarn check:layout
corepack yarn typecheck
corepack yarn test
corepack yarn build
corepack yarn check
```

涉及上游命令路径时补充 `corepack yarn upstream:build`；涉及打包、native module 或第三方预装时补充当前平台 packaged smoke，并在另一平台 CI 验证。

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

用户可以从专用 Profile 创建项目、处理模糊/专业需求、导入资料、生成短剧或小说产物、查看文件和 diff、回退 Agent 修改，并在重启后继续创作。该流程不依赖手工修改 Profile 或复制 Preset。

### 领域稳定化完成

项目合同有版本、验证和迁移；项目首页只显示由文件事实推导的状态；专业 DOCX 导出通过真实编剧样例验收。

### 内部发行完成

macOS/Windows 安装包、插件锁、许可证、升级回滚和支持文档完整，且没有账号、计费或云服务才能运行的隐含依赖。

# Story Studio 规划文档

状态：**方案评审稿**  
基线：DSH `0.1.0-rc.7`，DSH Desktop `2.0.1`  
更新日期：2026-08-17

Story Studio 是基于 DSH Desktop 的内部 AI 编剧平台，面向短剧编剧、小说编剧和编导。产品的首要目标不是建立一套新的 Agent Runtime，而是把 DSH 官方能力、经过验证的社区插件、产品 Preset、Skills 和动态 Workflow 组合成稳定的创作工作台。

本目录记录产品边界、技术实施方案、插件选型、Agent 行为、项目数据合同和验收计划。当前结论是：**Story Studio 是一个产品 Profile 和发行组合，不等同于一个大型 Cordis 插件。**

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [产品需求文档](requirements.md) | 用户问题、解决方案、用户故事、实施与测试决策、范围边界 |
| [总体实施方案](implementation-plan.md) | 产品目标、架构分层、模块边界、阶段路线和交付物 |
| [插件选型与复用矩阵](plugin-selection.md) | 官方能力、第三方插件逐项决策、版本、风险和生产准入门槛 |
| [Agent 与项目数据设计](agent-and-data-design.md) | 模糊需求处理、Preset/Skill 设计、创作流程和文件事实源 |
| [验证与验收计划](verification-plan.md) | `rc.7` 组合试验、场景回归、打包验证和发布门禁 |

## 核心决策摘要

1. `product/story-studio` 是长期产品集成分支；具体工作从短期 `feat/*` 分支完成。
2. `deepseek-harness/` 始终是只读上游子模块，不在产品分支中修改。
3. 产品先以专用 Profile 组合能力，不复制 DSH 的 session、workspace、storage、attachment、tool、subagent、workflow、job、question 和 Web 服务。
4. 首个 MVP 只交付一个 Story Studio Preset，通过 Skills 区分短剧、小说、参考拆解和审校，避免多个 Preset 复制后漂移。
5. 创作内容以工作区内的 Markdown/YAML 为唯一事实源；SQLite、向量索引和 UI 状态只能是可重建的派生数据。
6. 文件树、编辑器、Git、文档读取、回退、知识库和 Office 导出优先评估现有插件，不预设由产品团队自研。
7. 社区市场只用于发现候选插件。任何候选进入产品 Profile 前都必须经过固定版本、代码审计、许可证、`rc.7` Loader、桌面模式和打包验证。
8. MVP 不开发付费、账号、云同步、多人协同或开放插件市场安装器。

## 证据边界

本方案基于以下证据形成：

- 当前仓库固定的 DeepSeek Harness `0.1.0-rc.7` 源码和能力文档；
- DSH Desktop 的 Profile、Host/Client、Desktop service 和打包实现；
- 本机已安装的 `dsh-rich-file-reader@0.3.1`；
- DSH 1024Store 目录与 GitHub 候选仓库；
- 对候选插件的 `package.json`、Cordis patch、README、源码结构、测试目录和许可证的静态检查；
- 用户创建的 `script-studio` Preset 及其实际生成结果。

静态检查不能替代运行时验收。多数候选插件声明的是 DSH `rc.6` 兼容性，当前没有任何第三方插件因被目录收录或源码可构建而自动获得“可预装”结论。

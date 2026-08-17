# Story Studio 插件搜寻清单

这份清单用于在 DSH 社区、GitHub `dsh-plugin` Topic 和 1024Store 中寻找候选。找到插件时优先记录链接、版本和演示，不需要先做源码审计。

## P0：首个内部可用版本

| 用途 | 我们需要什么 | 可搜索关键词 | 避免重复 |
| --- | --- | --- | --- |
| 文档路径解析 | 接收工作区路径，读取中文 DOCX、文本层 PDF、XLSX、PPTX；长文档可分页 | `dsh document reader`、`dsh pdf docx xlsx`、`dsh office parser` | 不再提供全页面拖拽入口；输入由 `dsh-drop-to-path` 负责 |
| 中文扫描件 OCR | 扫描 PDF/图片离线或明确联网 OCR，固定中文语言包，返回页码 | `dsh ocr`、`dsh tesseract chinese`、`dsh pdf ocr` | 不能只支持英文；不能把未公开剧本静默上传第三方 |
| 文件工作台 | 文件树、Markdown 编辑、预览、diff，最好能按标准 Client Slot 挂载 | `dsh sidebar`、`dsh file explorer`、`dsh editor`、`dsh better sidebar` | 不重做聊天框和 Agent Runtime |
| 修改回退 | Agent 写文件前后建立 checkpoint，可预览并恢复，不破坏 Git 暂存区 | `dsh checkpoint`、`dsh rewind`、`dsh undo workspace` | 避免 `git reset --hard` 式实现 |

## P1：专业创作体验

| 用途 | 我们需要什么 | 可搜索关键词 |
| --- | --- | --- |
| 专业 DOCX/PDF 导出 | 短剧剧本、人物小传、分集表、小说正文按模板导出，支持页眉页脚和样式 | `dsh office export`、`dsh docx pdf`、`dsh template` |
| FDX/编剧格式 | Final Draft FDX 导入导出，或场景标题、人物、对白等专业剧本元素转换 | `dsh screenplay`、`dsh final draft`、`dsh fdx` |
| 小说格式 | EPUB、TXT、DOCX 导入导出，章节识别和目录生成 | `dsh epub`、`dsh novel import export` |
| 参考材料引用 | 分析结论可回指页码、章节、场次或表格位置 | `dsh citation`、`dsh document index`、`dsh source reference` |
| 角色/世界书 | 人物关系、设定条目、别名、时间线和状态可检索，数据仍能落到普通文件 | `dsh lorebook`、`dsh character`、`dsh worldbuilding` |
| 连续性审校 | 跨集/章检查人物年龄、关系、时间、地点、道具、伏笔和设定冲突 | `dsh continuity`、`dsh story review`、`dsh novel memory` |

## P2：长篇和多媒体

| 用途 | 我们需要什么 | 可搜索关键词 |
| --- | --- | --- |
| 本地知识检索 | 对长篇作品和大量参考资料做中文召回，来源可定位，可删除重建 | `dsh rag`、`dsh knowledge`、`dsh local embedding` |
| 图片理解 | 读取人物参考图、分镜图、截图和长图 OCR，接受工作区路径 | `dsh vision toolkit`、`dsh image ocr`、`dsh screenshot` |
| 音视频转写 | 导入样片、录音或采访，输出带时间码的中文转写 | `dsh whisper`、`dsh transcription`、`dsh video subtitle` |
| 时间线/关系可视化 | 从项目文件生成时间线、人物关系图、季/卷进度视图 | `dsh timeline`、`dsh graph`、`dsh story dashboard` |
| 备份同步 | 对作品目录做显式 Git/网盘备份，可选择、可关闭、可恢复 | `dsh backup`、`dsh git sync`、`dsh cloud drive` |

## 当前不需要寻找

- 通用聊天 UI、模型选择器、Session、Workspace、Shell、Web Search：DSH 官方已有。
- 另一个全页面拖拽/附件插件：首版已选择 `dsh-drop-to-path`。
- 新的 Agent Runtime、多 Agent 框架或固定九阶段小说系统：会与 Story Studio Preset/Skills 重叠。
- 登录、会员、支付、团队权限和公共云项目库：内部版本暂不需要。

## 发回插件时附带的信息

只需要提供：插件链接、你看到的主要用途、演示截图或一句使用感受。后续由本项目检查它是否能与 `dsh-drop-to-path`、Story Studio Preset 和当前 DSH 版本组合。

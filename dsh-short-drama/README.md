# dsh-short-drama — 短剧创作 Agent 插件（内核）

产品化的短剧创作插件，运行在 DeepSeek Harness 上。通过对话，把用户的灵感、大纲或已有剧本一路加工成可拍、可交付的竖屏短剧。当前交付**内核**（host 插件 + 领域工具 + 状态机 + 校验器 + 预设）；前端 launcher/工作台 UI 在后续阶段实现。

## 能力总览

- **领域工具集**：16 个 `screenplay_*` 工具 + `ask_user_question`，其余通用工具（文件搜索/Shell/编辑器/子代理）全部由工具守卫禁用，Agent 只能在领域内操作。
- **项目状态机**：phase（Uninitialized/Intake/ChangePending/Ready）、revision 乐观锁（expectedRevision + operationId 幂等）、版本历史、事件日志、保存/不保存确认、重启恢复。
- **参考文件**：上传 TXT/MD/DOCX/带文本层 PDF（≤20MB/500 页），按 全文/页码/标题/段落/选中文本 选区读取，区分「故事事实」与「方法参考」。
- **格式校验器**：创作合同 11 章、核心设定 6 章、主要角色字段模板、大纲首行与 2-6 段、集纲六字段、DLKJB 正文结构（场次头/动作行/台词/OS/VO/闪回/卡点特写/本集完）+ 按单集时长档校验有效字数。
- **短剧编剧方法论（双层融合）**：
  - prompt 层：方法论附录 M1-M7（创意五元组、四幕二十拍、钩子/悬念/反转/卡点、人物压力与成长、单场对白视听化、70 项清单、平台交付）；
  - 校验器层：`screenplay_diagnose` 工具跑机械检查（禁词/抽象动作行/字数档位/头重脚轻/集纲空字段/角色待确认/连续性环）+ 12 项方法论 checklist（四幕/主角发动机/反派压力/中性事件/配角功能/开场钩子/悬念信息差/反转兑现/集尾卡点/对白知情边界/伏笔回收/卖点交付）。

## 项目目录结构（桌面端/会话约定）

    <项目名>/
    ├── 参考文件/
    ├── 创作合同/creative-contract.md
    ├── 设定/core-setting.md
    ├── 人物/主要人物/<角色名>.md、人物/其他人物/other-characters.md
    ├── 大纲/full-outline.md
    ├── 分集大纲/episode-outlines.md
    ├── 剧本/episode-NNN.md
    ├── 交付/<项目名>.md            # 仅用户明确要求交付时生成
    └── .screenplay/                 # 私有状态：layout.json / state.json / events.jsonl / versions / references

## 对话流程

1. **新项目**：分析素材 → 讨论 → ask_user_question 确认方向（必须含「确认并创建全部文件」选项）→ `screenplay_create_contract` 一次创建合同/设定/角色。
2. **大纲阶段**：讨论确认后 `screenplay_create_outline` 写正式大纲；集纲按连续批次（每批 ≤10 集，从 nextEpisode 开始）写 `分集大纲/episode-outlines.md`。
3. **正文阶段**：用户明确开始后，每轮只写当前下一集 `剧本/episode-NNN.md`；报告路径/集数/字数/剩余后停止，等用户说继续。
4. **交付**：仅用户明确要求时 `screenplay_merge_delivery` 合并全部正式正文。
5. **修改**：只改用户点名文件 → `screenplay_prepare_change` → 立即「保存修改/不保存」选择 → save/discard；每轮最多一个有状态操作。

## 与 rc.2 的对齐说明

- 依赖：`@deepseek-ai/*` 对齐 npm 发布版 **0.1.1-rc.2**（与运行中桌面端同源），`cordis@4.0.1`。
- **不持久化自定义 session 事件**：rc.2 的 `KNOWN_SESSION_EVENT_TYPES` 是仓库内生成集合，外部插件事件无注册面且 `append` 无法打 `ignorable` 标记（持久化会导致重启拒读）。因此内核的持久化权威源是 `.screenplay/state.json`；会话绑定通过「内存 map + 会话 cwd 的 state.json + `.screenplay/launcher` 标记」恢复。UI 投影（sessionProjections）留待前端阶段以合适的传输层实现。

## 开发

    yarn install
    yarn typecheck   # tsc 全量
    yarn test        # vitest（当前 58 个用例）
    yarn build       # tsc → lib/

## 安装到桌面端（后续步骤，待内核验收后执行）

1. 把本包装入 `~/.dsh/profiles/desktop` 的依赖（file:/workspace link 或发布版）。
2. 在 `cordis.patch.yml` 注册 `screenplay-host`（或由桌面端插件清单加载）。
3. 把 `managed-presets/screenplay-v1` 加入 agent-presets 的 roots，使「短剧创作」预设出现在会话预设选择器。
4. 前端阶段：`新建剧本项目` launcher（创建目录 + `.screenplay/launcher` 标记 + 会话绑定）+ 项目工作台 UI。

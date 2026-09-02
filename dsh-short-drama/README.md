# dsh-short-drama — 短剧创作 Agent 插件（内核）

产品化的短剧创作插件，运行在 DeepSeek Harness 上。通过对话，把用户的灵感、大纲或已有剧本加工成可继续修改、可诊断、可交付的短剧项目。当前交付**内核**（host 插件 + 领域工具 + 状态机 + 校验器 + Skill/Agent 预设）；前端 launcher/工作台 UI 在后续阶段实现。

## 能力总览

- **领域工具集**：项目上下文/Artifact 读取、项目搜索、场级草稿、信道 A 校验、信道 B 诊断、正式提交，以及参考文件、版本和交付工具。通用 `read/glob/grep` 可用但受项目作用域约束；通用写入和 Shell 不直接暴露。
- **项目状态机**：phase（Uninitialized/Intake/ChangePending/Ready）、revision 乐观锁（expectedRevision + operationId 幂等）、版本历史、事件日志、保存/不保存确认、重启恢复。
- **参考文件**：上传 TXT/MD/DOCX/带文本层 PDF（≤20MB/500 页），按 全文/页码/标题/段落/选中文本 选区读取，区分「故事事实」与「方法参考」。
- **格式校验器**：项目合同/设定/角色的事实型 Markdown 结构（兼容旧章节模板）、全剧大纲的 2-6 段叙事、集纲的旧格式或 `### 第N集` + `导语：` 叙事格式、DLKJB 正文结构（场次头/人物行/动作行/台词/闪回/卡点/本集完）+ 按单集时长档校验有效字数。
- **可选 Skill 知识层**：默认 Skill 只提供短剧项目对象和任务路由；用户可通过 Harness 的 Skill 机制按需加载自己的方法和参考资料。Skill 是建议，不是系统事实或统一审美。
- **信道 A / B**：代码硬校验格式、路径、版本、集数和结构连续性；Agent、Skill 和透镜 subagent 对钩子、反转、节奏、人物和可拍性给建议，不阻止用户提交。

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

1. **项目与方向**：读取项目上下文和用户资料，按需加载匹配 Skill；用户确认方向后创建合同/设定/角色。
2. **大纲阶段**：通过领域工具完成全剧大纲和连续集纲，状态门槛由代码保证。
3. **正文阶段**：读取当前集纲和承接信息，按场写入 Session 草稿，读回并反复 A 校验。
4. **诊断与提交**：运行 A 校验和 B 诊断，把创作取舍交给用户；用户明确后 `commit_episode` 写正式版本。
5. **交付与修改**：交付、保存/放弃修改和版本恢复仍由领域工具控制。

## 与 rc.2 的对齐说明

- 依赖：`@deepseek-ai/*` 对齐 npm 发布版 **0.1.1-rc.2**（与运行中桌面端同源），`cordis@4.0.1`。
- **不持久化自定义 session 事件**：rc.2 的 `KNOWN_SESSION_EVENT_TYPES` 是仓库内生成集合，外部插件事件无注册面且 `append` 无法打 `ignorable` 标记（持久化会导致重启拒读）。因此内核的持久化权威源是 `.screenplay/state.json`；会话绑定通过「内存 map + 会话 cwd 的 state.json + `.screenplay/launcher` 标记」恢复。UI 投影（sessionProjections）留待前端阶段以合适的传输层实现。

## 开发

    yarn install
    yarn typecheck   # tsc 全量
    yarn test        # vitest（当前 62 个用例）
    yarn build       # tsc → lib/

## 安装到桌面端（后续步骤，待内核验收后执行）

1. 把本包装入 `~/.zenwit/profiles/desktop` 的依赖（file:/workspace link 或发布版）。
2. 在 `cordis.patch.yml` 注册 `screenplay-host`（或由桌面端插件清单加载）。
3. 把 `managed-presets/screenplay-v1` 加入 agent-presets 的 roots，使「短剧创作」预设出现在会话预设选择器。
4. 前端阶段：`新建剧本项目` launcher（创建目录 + `.screenplay/launcher` 标记 + 会话绑定）+ 项目工作台 UI。

# 短剧 Agent 内核重构设计（历史方案）

> 本文保留早期方案用于追溯，不是当前运行契约。旧 Host、`.screenplay` 状态机、领域写作工具、A/B 信道、草稿、发布确认、Todo、计划审批和审稿子 Agent 均未加载。当前契约以 `dsh-short-drama/README.md`、`src/agent.ts`、`src/prompt.ts` 和桌面 `short-drama` 预设为准。

## 当前实现（2026-09）

- 短剧 Agent 只提供提示词、项目范围保护，以及通用 `move/delete` 文件工具。
- 其他能力由 Harness 组合提供：`read/write/edit/glob/grep`、`web_search`、`read_document`、Skill、Skill 创建和 `ask_user_question`。
- 普通写入、修改、改名和移动直接执行；删除前询问用户。创作格式、标题、署名、目录和字数不做硬校验。
- 项目结构由用户、当前 Skill 和已有文件共同决定，不创建固定短剧目录。
- 桌面通用工作区保存 `.zenwit-project/project.json`；短剧 Agent 不读写 `.screenplay` 状态。
- `src/store.ts`、`src/service.ts`、`src/tools.ts` 等旧源码仅保留待清理，不从桌面配置、包根或预设加载。

## 以下为已废弃的历史设计

## 1. 产品概念

短剧 Agent 是一座短剧剧本工厂：

- Harness 提供通用 Agent 循环、工具注册、Skill 发现、计划、待办、提问、会话和子 Agent 能力。
- 短剧领域代码提供项目目录、Artifact、场级编辑、版本、原子写入和客观校验。
- Agent 理解用户任务，读取项目，选择工具，反复观察和修正，并把创作分歧交给用户。
- Skill 提供可选知识、参考资料和分析视角，不拥有项目事实，不授予文件权限。
- 用户/编导决定题材、审美、人物、节奏、结局和最终是否提交。

用户提供的资料是原材料，不是产品规则。`short-drama-zonggang` 不会原样复制进仓库，也不会作为默认方法论启用。

## 2. 权责模型

### 系统硬保证

代码负责以下“必须为真”的内容：

- 当前 Session 只绑定一个项目，所有项目路径都在该项目内；
- 禁止绝对路径、`../`、符号链接逃逸和项目外读写；
- Artifact 路径、格式、集数顺序、必要字段和时长/字数范围；
- 结构化连续性状态、已声明角色/道具/时间线的客观矛盾；
- revision、operationId、幂等、版本恢复、原子写入和失败不覆盖；
- 正文写入直接物化正式文件；编辑器未保存内容与项目正式文件分离。

代码不判断“好不好看”，也不把无法机械证明的语义判断伪装成硬错误。

### Agent 负责

- 理解用户任务并读取最小必要上下文；
- 使用 `plan-mode` 和 `todo` 管理复杂工作；
- 选择 Skill 和参考资料；
- 生成完整正文并直接写入；用户需要时再校验和修正；
- 发现冲突，给出多种创作方案；
- 在重大创作分叉或不可逆操作时询问用户；
- 汇总信道 A 的错误和信道 B 的建议。

### Skill 负责

- 提供短剧领域词汇、资料索引、分析视角和可选方法；
- 通过 Harness 目录被自然语言匹配，按需加载正文和 `references/`；
- 可被用户或项目 Skill 覆盖、停用或替换；
- 不写入项目事实，不改变工具可见性，不阻止正式提交。

### 用户负责

- 创作方向、风格、价值判断、人物选择和结局；
- 是否采纳 Skill、Agent 或透镜 subagent 的建议；
- 是否保存修改、提交正文和生成交付稿。

创作决策优先级为：用户当前明确选择 > 项目正式事实 > 用户启用的 Skill 参考 > Agent 推断。系统硬不变量不属于创作偏好，不能被覆盖。

## 3. Agent 组合

`screenplay-v1` 挂载：

- `screenplay-agent`；
- `skill-filesystem`、`tool-skill`；
- preset 自己挂载的只读 `tool-fs`、`tool-fs-search`，由 Agent scope 只允许项目内 `read/glob/grep`；
- `tool-ask-user`、`tool-todo`、`plan-mode`；
- 一个只读透镜 subagent。

删除领域 Agent 自己维护的 `ALLOWED_TOOLS` 和全局“通用工具全部禁用”守卫。通用写入能力通过 Harness 作用域限制隐藏；读取能力通过项目作用域策略检查。短剧 Agent 不直接暴露通用 `write`、`edit`、`bash`。

Skill 文件系统同时发现：

- 项目级 `.zenwit/skills`；
- 用户级 `~/.zenwit/skills`；
- 预设随附的只读短剧领域 Skill。

Skill 的 `resourceBase` 由 Harness 解析，引用资源只能从自己的资源根读取。

## 4. 运行时 Prompt

运行时 Prompt 只描述运行关系：

1. Agent 身份和当前项目作用域；
2. 项目事实、用户选择、Skill 建议、模型推断的区别；
3. 系统硬不变量和正式文件规则；
4. Skill 自动匹配、按需加载和来源诚实；
5. `观察 → 计划 → 调用工具 → 读回 → 修正` 的开放循环；
6. 重大创作分叉、无法推断的关键决策和不可逆操作才询问用户；
7. 提交失败不覆盖正式文件，任务完成或等待用户时停止。

Prompt 不包含 M1-M7 正文、固定阶段状态机、固定确认话术、统一审美、长篇正文模板或通用文件禁令；只说明短剧生产所需的最小格式基线。

## 5. 领域工具契约

### 读取与写作

```text
read_project_context()
read_artifact(path)
search_project(query)
write_episode(episode, content, continuity)
validate_episode(episode)
diagnose_episode(episode)
```

`write_episode` 接收完整正文，直接原子写入正式剧本并生成新 revision。`read_artifact`、`validate_episode` 和 `diagnose_episode` 都读取正式文件；校验和诊断是按需调用，不是写入前置条件。

项目初始化、创作合同、核心设定、人物、全剧大纲、分集大纲仍由短剧领域工具负责，但它们使用同一套项目状态、版本和路径接口，不保留旧客户端 Adapter 或两套模型契约。

### 现有交付与修改能力

继续保留：

```text
screenplay_merge_delivery
screenplay_restore_version
screenplay_edit_file
```

这些动作仍由领域代码负责，Skill 和信道 B 不能绕过编辑、恢复和交付边界。

## 6. 信道 A 与信道 B

统一结果形状：

```text
ValidationIssue {
  channel: "A" | "B"
  code
  severity
  artifact
  location
  message
  repairHint?
}
```

### 信道 A：代码硬校验

检查 Artifact 格式、路径、字段、集数顺序、时长/字数、闪回标记、卡点/集尾、结构化连续性和 revision。A 返回错误供用户修正，不阻止正文先写入。

### 信道 B：创作建议

由 Agent、已加载 Skill 和只读透镜 subagent 讨论钩子、悬念、反转、节奏、人物压力与成长、台词潜台词、商业性和可拍性。B 只产生问题、分析和备选方案，不能阻止用户提交，也不能替用户拍板。

## 7. 默认交互循环

```text
用户提出任务
→ Agent 读取项目上下文
→ 自动加载匹配 Skill
→ 必要时使用 plan/todo
→ 读取相关 Artifact
→ 生成完整正文并写入正式文件
→ 用户需要时 A 校验或 B 诊断
→ 按用户选择修正并再次写入
```

只在剧情大转折、人设或结局方向改变、跨阶段方向变化、明确保存/放弃、恢复/交付和无法推断的重大决策时暂停。

## 8. Skill 生命周期

第一阶段只启用 Harness 现有的自然语言发现和按需加载。未来对话式工具遵循：

```text
skill_inspect
skill_create
skill_install
skill_update
skill_remove
```

安装前验证 `SKILL.md`、名称、调用策略和资源引用；按 user/project 作用域原子写入，失败回滚。Skill 内容永远不能授予额外文件权限。Skill 管理以自然对话为主，不以独立后台为主入口。

## 9. 分期实施

1. 清理错误副本，完成本文、Prompt 抽取和 Skill 契约文档；
2. 更新 `screenplay-v1` 组合和最小运行时 Prompt；
3. 实现项目作用域读取和路径策略；
4. 建立场级内存草稿、读回、A 校验和正式提交；
5. 拆分 B 诊断，接入 todo、plan、ask-user 和只读透镜 subagent；
6. 更新短剧测试、预设测试、版本/恢复/交付测试；
7. 后续再实现对话式 Skill 生命周期，不在本轮引入自动文风学习或独立 Skill 后台。

## 10. 验收标准

- 自然语言和 `/skill-name` 都能加载 Skill；
- Skill reference 不能越过自己的 `resourceBase`；
- 项目外路径、`../` 和符号链接逃逸被拒绝；
- 项目内普通文件可被 `read/grep` 读取；
- 可完成“写场 → 读回 → A 校验 → 修改 → 再校验 → 提交”；
- A 错误阻止提交，B 建议不阻止提交；
- 用户明确选择优先于 Skill 建议；
- Session 中断可恢复，revision 冲突不覆盖，失败提交不改正式文件；
- 版本恢复、原子写入、交付和现有项目布局测试通过；
- 预设不再依赖全局工具白名单或方法论超级 Prompt。

## 11. 约束与非目标

- 原地重构 `screenplay-v1`，不新增 `screenplay-v2`；
- 当前没有旧客户端，不做客户端兼容层；
- 用户桌面资料只读，不复制、不改写、不认证其创作方法；
- 第一阶段单主 Agent，subagent 只做只读审查，不并行生成正文；
- 自动文风提炼、Skill 安装/更新/删除实现和独立管理后台属于后续阶段。

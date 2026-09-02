# dsh-skill-authoring — Skill 创作插件（内核）

独立的 Skill 创作插件，运行在 DeepSeek Harness 上。任何挂载该插件的 Agent 预设都会获得同一套 Skill 创作面：读取用户明确提供的本地资料、分类可复用经验与具体项目事实、整理来源/不确定性/适用范围，并按 Agent Skills 开放标准直接安装 Skill。它不绑定任何领域 Agent，也不假设题材或任务范围。

## 能力总览

- **标准化输出**：生成的 `SKILL.md` 遵循 Agent Skills 开放标准（`name` / `description` / `license` / `allowed-tools` / `compatibility` / `metadata`），目录为 `skill-name/`，可选 `references/`、`scripts/`、`assets/`；`when_to_use` 作为 Claude Code 扩展字段保留（Codex 忽略、不报错）。
- **通用创作工具集**：`skill_source_inspect` 扫描明确提供的本地文件/文件夹，`skill_source_read` 按 `offset`/`limit` 分块读取受控文本，`skill_create` 一次调用完成内容整理、结构校验和原子写入，`skill_inspect` 只读检查已安装 Skill，`read_skill_reference` 只相对 Skill 自身 resourceBase 读取参考文件。
- **作用域**：默认安装到 user 作用域，也可显式选择 project 作用域；两种作用域都写入 standard Agent Skills 布局，Claude Code 与 Codex 加载器均能发现。
- **受控资料读取**：`/skill-create` 入口只授权用户明确提供或选择的路径；`skill_source_*` 读取被限制在这些授权路径内，不能退化成任意文件读取器。
- **跨 Agent**：作为 host 插件挂载（而非领域 Agent 的一部分），所以所有 Agent 共享同一来源的 Skill 创作能力。

## 安装与使用

- 挂载方式：在目标 Agent 预设（`agent.cordis.yml`）或根 `cordis.patch.yml` 中增加一行该插件（见仓库内桌面端的挂载配置）。
- 用户触发：输入 `/skill-create` 或要求把明确提供的笔记、文档、参考、或已有 Skill 转成可复用 Skill。

## 与领域 Agent 的关系

Skill 创作从旧的领域内核中拆出：领域 Agent 只描述自身领域（项目、流程、工具），Skill 的读取、分类、安装由该插件统一提供。这样任何 Agent 都获得一致的 Skill 面，而不必为每个题材重复实现一套 `/skill-create`。

## 开发

```bash
corepack yarn workspace dsh-skill-authoring check
```

`check` 会依次执行构建（`tsc`）、类型检查（含测试）和 vitest 测试（`tests/*.spec.ts`）。

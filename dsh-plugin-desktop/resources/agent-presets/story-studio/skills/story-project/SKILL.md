---
name: story-project
description: 创建、读取和维护 QNovel 作品目录、项目配置.yml、项目说明.md、人物设定、参考材料、大纲、正文与审校文件；用于需要长期落盘或继续已有作品的任务。
---

# Story Project

当用户要求创建作品、保存创作结果、继续已有项目或维护跨文件一致性时使用。一次性的方向讨论不强制建项目。

## 1. 作品事实源

每个作品使用一个独立目录。DSH Session 保存创作过程，Git 保存人工认可的长期版本，作品目录中的 Markdown/YAML 才是内容事实源。

```text
<作品目录>/
  项目配置.yml
  项目说明.md
  故事设定/
    故事前提.md
    世界规则.md
    时间线.md
    写作风格.md
    人物/
  参考资料/
    参考资料索引.md
    原始资料/
    分析/
  故事大纲/
    季纲/
    分集大纲/
    卷纲/
    章节大纲/
  正文草稿/
    短剧/
    小说/
  审校记录/
    修订/
  导出/
  .qnovel/
    缓存/
    索引/
```

短剧只需要使用 `故事大纲/季纲`、`故事大纲/分集大纲` 和 `正文草稿/短剧`；小说只需要使用 `故事大纲/卷纲`、`故事大纲/章节大纲` 和 `正文草稿/小说`。不要复制公共故事设定。

已有旧项目如果仍然使用 `story.yml`、`brief.md`、`bible/`、`outline/`、`drafts/`，先按旧合同读取，不要自动重命名；新项目和新生成文件统一使用上面的中文合同。

## 2. 最小项目文件

`项目配置.yml` 至少保存：

```yaml
schemaVersion: 1
id: stable-project-id
title: 作品名
medium: short-drama
language: zh-CN
status: development
currentDeliverable: brief
```

`medium` 只能是 `short-drama`、`novel` 或 `undecided`。只保存稳定事实和状态，长段创作内容写入 Markdown。

`项目说明.md` 必须包含：原始需求摘要、已确认事实、Agent 假设、待确认问题、冲突、必须保留/禁止内容、本轮交付和参考材料使用边界。

## 3. 创建和继续

本 Skill 同目录的 `scripts/story-project.mjs` 是确定性项目工具。加载本 Skill 后先读取脚本，优先通过 `run_code` 执行它，而不是手工猜目录：

```text
node <story-project skill root>/scripts/story-project.mjs init <作品目录> --title <作品名> --medium short-drama
node <story-project skill root>/scripts/story-project.mjs validate <作品目录>
node <story-project skill root>/scripts/story-project.mjs status <作品目录>
```

`init` 发现已有 `项目配置.yml` 或旧的 `story.yml` 会失败，禁止覆盖既有作品。`validate` 和 `status` 的 JSON 输出是项目状态的确定性来源；长段内容仍由 Agent 写入 Markdown。

创建项目前先确认用户确实需要长期落盘，并检查目标目录是否已存在。不得覆盖现有 `story.yml` 或正文。目录存在时先读取并继续，不另建同名项目。

继续项目时按本轮任务最小读取：

1. `项目配置.yml` 和 `项目说明.md`；如果不存在，再读取旧项目的 `story.yml` 和 `brief.md`；
2. 与任务相关的 Bible、人物、大纲；
3. 相邻集/章和相关审校记录；
4. 必要时搜索其他事实，不把全项目一次塞入上下文。

主要人物一人一个文件，文件名使用稳定 ID。并行任务不得写同一个文件。

## 4. 参考材料

拖拽或粘贴进入对话的文件会由 `dsh-drop-to-path` 保存到工作区并提供路径。不要重复复制；只有用户要求归档到项目时才放入 `references/source/`。

在 `references/index.md` 登记原文件名、当前路径、格式、解析状态、用途和对应分析文件。分析尽量引用页码、章节、场次或可定位片段。

## 5. 写入与汇报

- 创建目录和文件前先列出将写入的目标；已有文件先读后改。
- 普通假设写入 `brief.md`，不得静默变成 `confirmed`。
- 审校默认写报告，不直接覆盖正文。
- `.story-studio/` 只能保存可重建缓存；删除它不能损失正文或设定。
- 完成后在对话中汇报本轮结果、修改文件、仍待确认事项和下一步。

# 短剧 Skill 设计

## 定位

Skill 是可安装、可替换的知识和观察视角，不是系统命令、项目事实、审美标准或权限来源。

短剧 Agent 默认只随附一个很小的领域导航 Skill，用于解释项目对象和任务路由；它不规定题材、文风、钩子、反转或情绪曲线。

用户提供的 `short-drama-zonggang` 只作为外部参考来源，不复制到仓库，不自动启用，也不被系统认证为正确方法。

## 内容分层

### Skill.md

只描述：

- 适用的短剧任务；
- 可参考的项目对象；
- 哪些任务需要读取哪类 reference；
- 内容是建议，项目正式事实以领域工具和正式文件为准。

### references/

可以包含：

- 对象和术语说明；
- 创作讨论问题；
- 多种分析视角；
- 来源、版本和适用范围；
- 与其他 Skill 冲突时如何呈现差异。

每个 reference 都必须说明它是参考，不得写成“必须如此”的系统指令。

## 发现与加载

- `skill-filesystem` 扫描项目级和用户级 Skill 根；
- `tool-skill` 发布名称和描述目录；
- 用户自然语言任务匹配时，Agent 自动调用 `skill`；
- 用户输入 `/skill-name` 时，Harness 显式注入对应 Skill；
- 正文和 reference 按需读取，未引用的资源不自动进入上下文；
- Skill 的 `resourceBase` 只允许解析自身资源。

## 覆盖与优先级

用户当前明确选择优先于项目事实中的创作选择，项目事实优先于 Skill 建议，Skill 建议优先于模型猜测。Skill 无法覆盖路径、版本、格式、连续性结构和提交状态等系统硬不变量。

## 生命周期

后续增加以下对话式能力：

```text
skill_inspect
skill_create
skill_install
skill_update
skill_remove
```

安装或更新时校验 `SKILL.md`、名称、调用策略和资源引用；按 user/project 作用域原子写入，失败回滚；Skill 内容不能授予额外文件权限。自然对话是主入口，不建立独立 Skill 管理后台。

## 禁止事项

- 不把一套参考资料原样复制为默认 Skill；
- 不把 Skill 建议转成 A 信道错误；
- 不允许 Skill 直接写项目正式文件；
- 不允许 Skill 改变通用文件工具的作用域；
- 不把用户选择改写成 Skill 的“正确答案”。

## 第一阶段落地边界

- `skill_inspect`、`skill_create`、`/skill-create` 和自然语言触发共用同一套来源、作用域和原子安装契约；正常流程不生成草稿、不等待发布确认。
- 已上传到当前短剧项目的 TXT、Markdown、DOCX 和带文本层 PDF 可通过 `read_document` 按页或按段落读取；原始文件和项目正式文件不会被该流程改写。
- Desktop profile 通过固定版本 `dsh-file-upload@0.4.3` 提供回形针、拖拽、粘贴、附件卡片和通用 `read_document(file_path, offset, limit)`；短剧领域的参考索引读取使用独立的 `screenplay_read_reference_document`，避免同名工具覆盖。插件加载失败不应阻断 Desktop 整体启动。
- Skill 安装输出遵循 Codex Skill 结构：标准 frontmatter 的 `SKILL.md`、按需的 `references/`、`scripts/`、`assets/`、`agents/openai.yaml`，以及产品侧的 `metadata.json` 和 `provenance.json`；安装前执行结构、命名、占位符、路径和符号链接校验。

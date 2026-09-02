# dsh-short-drama — 短剧创作 Agent 插件（内核）

Zenwit 的短剧写作预设。Agent 使用通用项目文件能力，创作方法由用户选择的 Skill 提供，不再通过短剧专用工具审核或拦截内容。

## 能力总览

- **项目文件**：`read/write/edit/move/delete/glob/grep` 直接处理当前项目中的普通文件，不区分所谓“正式短剧文件”。删除需要用户先确认，其他普通文件操作不需要确认。
- **联网与资料**：保留网络搜索、附件读取和 Skill 引用能力。
- **创作规则**：标题、署名、目录、模板、段数、字数和正文格式由用户及其 Skill 决定，系统不做创作内容硬校验。
- **工作流程**：没有草稿、确认发布、计划审批、任务清单或 A/B 信道；用户要求写入时直接写入。
- **安全范围**：普通文件操作只能发生在当前项目内，项目私有元数据仍不可直接编辑。

## 项目结构

没有固定目录。Agent 按用户要求和所选 Skill 创建、读取和修改文件。

`src/store.ts`、`src/service.ts`、`src/tools.ts` 和相关状态代码是未加载的历史源码，仅为后续数据清理保留。桌面启动配置、包根入口和短剧预设都不会实例化旧 Host，也不会注册其中的创作、校验和交付工具。

## 与 rc.2 的对齐说明

- 桌面运行时依赖清单和已安装 manifest 固定为 **0.1.1-rc.2**。
- `deepseek-harness/` 中部分包仍保留 `0.1.0-rc.5` 的源码版本字段；桌面构建会选择性复制这些本地实现到 RC2 实体包。这是已记录的源码元数据债务，不代表运行时同时加载两套 Harness，也不能通过批量修改版本字符串解决。
- 具体边界见 [集成 Harness RC2 开发边界](../.agents/notes/implemented/process/2026-08-26-integrated-harness-rc2-development-boundary.md)。
- 当前项目元数据由桌面通用工作区保存在 `.zenwit-project/project.json`。本 Agent 不维护 `.screenplay/state.json`、revision、launcher 或自定义短剧会话事件。

## 开发

    yarn install
    yarn typecheck   # tsc 全量
    yarn test        # vitest
    yarn build       # tsc → lib/

## 桌面端组合

桌面端只在 `short-drama` 预设中加载 `dsh-short-drama/agent`。`dsh-short-drama` 包根是同一 Agent 的别名，不再是旧 Host。Zenwit 的项目库、文件树、编辑器和项目元数据属于桌面通用工作区，不属于短剧 Agent。

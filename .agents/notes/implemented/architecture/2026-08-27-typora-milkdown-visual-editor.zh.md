# Zenwit Milkdown 所见即所得 Markdown 编辑器

Status: implemented

## 目标

短剧工作台面向创作者提供类似 Typora 的 Markdown 所见即所得编辑体验。用户打开 `.md` 文件后直接编辑渲染后的标题、段落、强调、列表、引用、链接和代码块；Markdown 源码仍保留为高级用户的回退模式。

## 当前实现

- `deepseek-harness/packages/client/ui-short-drama/src/client/Editor.tsx` 保留原有 CodeMirror `Editor`，并新增 `VisualEditor`。
- `VisualEditor` 使用 Milkdown `7.22.1` 的 CommonMark preset 和 listener，将 Markdown 字符串作为唯一输入/输出协议。
- `Workspace.tsx` 打开 Markdown 文件时默认进入可视化模式；“源码”按钮切换到 CodeMirror，“可视化”按钮切回 Milkdown。两种模式共享同一份 `draft`，不会重新读取磁盘。
- JSON、`.screenplay` 和隐藏文件仍由项目树路由过滤，不新增面向用户的配置文件编辑入口。
- 保存接口不变，仍通过 `POST /api/desktop/projects/file` 写入 `.md` 文件。

## 保存策略

- 自动保存默认开启，输入停止约 800ms 后触发。
- 用户可关闭自动保存；关闭后使用现有的立即保存按钮。
- 立即保存按钮始终保留，适合演示前确认落盘。
- 保存使用文件路径和草稿 ref 做并发保护：旧请求完成时不会覆盖新草稿，也不会把新草稿错误标记为已保存。

## 两个运行时修复

### Milkdown 编辑器被反复重建

Milkdown 实例只在单个文件挂载时初始化一次。`onChange` 通过 ref 获取最新回调，避免每次输入更新 `draft` 后销毁并重建编辑器，从而避免光标消失、无法连续输入和高频初始化循环。文件切换仍由 `key={openFile.path}` 触发新的实例。

### Desktop Loader 拒绝 Node 内置模块

Milkdown 的 `unified/vfile` 依赖链包含 `node:process`、`node:path` 和 `node:url` 的 CLI 辅助导入。浏览器 bundle 不能向 Desktop Loader 请求这些 Node 内置模块，因此在 `packages/client/tsdown.client.ts` 增加了限定的浏览器 shim。shim 只提供解析链需要的最小接口，不开放任意 Node API。

## 样式

编辑内容使用 Zenwit 现有写作字体、纸张式背景、边距和阴影。ProseMirror 默认的选中节点 outline 被覆盖为透明，避免出现黄色/橙色整块边框；聚焦状态沿用 Zenwit 的浅蓝色提示。

## 依赖与版本

`ui-short-drama/package.json` 精确锁定以下版本，当前产品线不自动升级 Milkdown：

```text
@milkdown/core 7.22.1
@milkdown/kit 7.22.1
@milkdown/plugin-listener 7.22.1
@milkdown/preset-commonmark 7.22.1
@milkdown/react 7.22.1
```

## 验证

已通过：

```sh
corepack pnpm --filter @deepseek-ai/dsh-client-ui-short-drama exec tsc --noEmit --pretty false
corepack pnpm exec vitest run packages/client/ui-short-drama/tests/workspace.client.spec.tsx
corepack pnpm --filter @deepseek-ai/dsh-client-ui-short-drama bundle
```

工作台测试 3/3 通过，类型检查通过，客户端 bundle 构建通过。修改集成源码后，Desktop 需要重新执行 `corepack yarn source:bundle` 才会消费新的客户端产物。

## 后续边界

第一版按通用 Markdown 处理场景标题、`△` 动作行和人物对白，保证 Markdown 可保存和恢复；短剧专用节点、快捷操作、复杂表格/脚注和高级粘贴清洗不属于本次实现。

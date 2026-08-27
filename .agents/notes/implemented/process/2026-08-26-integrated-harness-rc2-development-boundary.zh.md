# Agent Note: 集成 Harness RC2 开发边界

Status: implemented

[English](2026-08-26-integrated-harness-rc2-development-boundary.md) | 中文

## 问题

Zenwit 同时修改 Desktop 自有代码与 `deepseek-harness/` 集成源码树中的部分 package。外层仓库使用 Yarn 4 安装 Desktop 产品，集成 Harness 源码则保留 pnpm workspace。把 pnpm workspace package 链接进 `dsh-plugin-desktop/node_modules` 后，TypeScript 会沿 package realpath 进入 pnpm 依赖树。Desktop 因而同时看到两套 React declaration，以及互不兼容的 Cordis `Context`、event 与 slot augmentation。最先出现的 duplicate identifier 会继续级联成大量误导性的 service 和 slot 缺失错误；此时 Electron 尚未启动，删除 `$DSH_HOME` 不可能影响这类编译失败。

Zenwit 还新增了官方 RC2 未发布的 `@deepseek-ai/dsh-screenplay-project-library`。如果该 package 不属于 Desktop 安装闭包，Web composition 就无法加载对应的 Host row。

## 决策

Desktop 依赖闭包固定为已发布的 DSH `0.1.1-rc.2` family。`scripts/link-local-client.mjs` 会恢复 Yarn 安装的 RC2 实体 package、拒绝错误的安装版本，并且只从集成源码复制指定构建产物。它绝不使用源码软链接替换 Desktop package，也不使用 workspace manifest 覆盖发布 manifest。

本地自有的 screenplay project-library 使用 Yarn `file:` dependency，并物化为实体 package。Zenwit Web composition 会复制到已安装的 Web bundle，同时保留 `openBrowser: false`，确保 Electron 启动不会打开外部浏览器。Web frontend 的 `dist` 同样复制而不链接。

`corepack yarn dev` 会依次构建社区 package 与集成 Harness 源码、物化本地产物、构建 Desktop，然后通过 `dsh-plugin-desktop/scripts/dev.mjs` 启动。只有调用方没有提供 `DSH_HOME` 时，该 launcher 才默认使用 `~/.dsh-dev`；`start` 继续保留正常的正式 home 语义。因此开发与正式 profile 不会相互选择对方的插件集合或记录。

集成 Harness 源码由产品仓库拥有并可编辑，因为 Zenwit 位于其中；但它仍是独立 pnpm workspace，外层 Yarn workspace 不得吸收它。除非未来有明确的新决策取代本记录，该产品线的 Desktop 与 Harness 不再升级到 RC2 之后的版本。

## 验证

验收反馈环为：

```sh
corepack yarn install --immutable
corepack yarn workspace dsh-plugin-desktop typecheck
corepack yarn workspace dsh-plugin-desktop test
corepack yarn workspace dsh-plugin-desktop verify:loader
corepack yarn workspace dsh-plugin-desktop verify:profile
corepack yarn dev
```

`dev` 启动后，Electron 窗口必须显示真实 Zenwit 界面；最新 lifecycle run 必须包含 `renderer.boot.completed` 和 `startup.run.completed`，且 `rendererStatus` 为 `healthy`。Desktop 的 `@deepseek-ai` package 目录不得包含指向 `deepseek-harness/` 的软链接，每个物化后的 DSH manifest 都必须报告 `0.1.1-rc.2`。

2026-08-26 的验收结果为：78 个测试文件、791 项测试通过、4 项跳过、两项 Loader smoke 通过、Yarn immutable 安装通过，并且 Zenwit renderer 健康启动。

## 已知源码元数据债务

集成 Harness 源码中的部分 `package.json` 仍保留导入时的 `0.1.0-rc.5` 标记。Desktop 安装树和运行闭包由 RC2 实体 manifest 与版本检查保护，因此这些标记不会再污染 TypeScript 或启动；但这也意味着仓库级源码来源尚未完全规范化为官方 RC2 snapshot。不得宣称这项元数据债务已经完成，不得只改版本字符串来掩盖它，也不得重新引入源码链接作为绕过。未来的源码规范化变更必须保留 Zenwit 代码，并重新通过以上完整反馈环。

## 后果

修改本地 Harness 后，需要执行 `source:build` 或 `source:bundle`，Desktop 才会消费新产物。复制聚焦产物比软链接略慢，但能提供确定的 package resolution，并与部署边界一致。`~/.dsh` 与 `~/.dsh-dev` 都是运行数据而非构建输入；清理任一目录属于 profile/数据重置，绝不是 TypeScript 修复步骤。

# Story Studio 插件兼容性报告

状态：**阶段 0，首轮 Host/Profile 与 Rich File Reader 行为验证已完成**

测试日期：2026-08-18

DSH Runtime：`0.1.0-rc.7`
测试分支：`feat/story-studio-composition-spike`

## 1. 本轮结论

三个优先插件都已分别通过精确发布物审计和隔离 Web Profile runtime smoke；三个插件也已在同一个 Profile 中同时通过安装、Cordis 配置展开、Host Loader settlement、loopback Web 根页面和 Client manifest 检查。

Rich File Reader 已进一步通过中文 DOCX、表格、长文档分页、两页文本层 PDF、损坏文件和不支持格式的真实工具调用。中文扫描 PDF OCR 只能识别部分文本，当前不作为稳定输入门禁。产品文件入口改用 `dsh-drop-to-path`；Rich File Reader 只承担路径后的文档解析。

这是一项**初步兼容证据**，不是生产准入。当前可以继续进入真实能力和 Desktop packaged runtime 验证，但还不能把任何插件标记为“采用”或预装到用户 Profile。

## 2. 固定发布物

| 插件 | 版本 | 来源 | SHA-256 | 许可证 |
| --- | --- | --- | --- | --- |
| `dsh-rich-file-reader` | `0.3.1` | GitHub release tarball | `9900d34c06d1f3d1b0ac6813eba7c79b964a63e8ac6740ead4fb127c3f68c4b2` | MIT |
| `dsh-better-sidebar` | `0.12.3` | npm registry tarball | `8d9dd6abd7cf5f01965856bf2bdd2a2ec0cc03535f158335391e31f74231381a` | MIT |
| `dsh-checkpoint-rewind` | `0.5.1` | npm registry tarball | `f3ad47de27e6495155d6082e9ec00c04b2ef78f96841559831adbf243690bbde` | Apache-2.0 |

机器可读锁位于 `config/story-studio/plugins.lock.json`。审计脚本拒绝非 HTTPS、浮动文件、包名/版本/许可证不一致、缺少 bundle patch、错误 Cordis row、缺少许可证文本、超限归档和 hash 漂移。

## 3. 已验证范围

| 验证项 | Rich File Reader | Better Sidebar | Checkpoint Rewind | 三插件组合 |
| --- | --- | --- | --- | --- |
| 精确 tarball SHA-256 | 通过 | 通过 | 通过 | 通过 |
| 包名、版本、许可证 | 通过 | 通过 | 通过 | 通过 |
| `dsh.bundle` 与 Cordis row | 通过 | 通过 | 通过 | 通过 |
| Client face 元数据 | 通过 | 通过 | 通过 | 通过 |
| 临时 Profile 安装 | 通过 | 通过 | 通过 | 通过 |
| `dsh.profile.bundles` reconcile | 通过 | 通过 | 通过 | 通过 |
| `--dump-config` 出现预期 row | 通过 | 通过 | 通过 | 通过 |
| DSH `rc.7` Host Loader settlement | 通过 | 通过 | 通过 | 通过 |
| loopback Web 根页面 HTTP 200 | 通过 | 通过 | 通过 | 通过 |
| Client manifest 出现插件 | 通过 | 通过 | 通过 | 三个同时出现 |
| 用户现有 DSH Home/Profile 零写入 | 通过 | 通过 | 通过 | 通过 |

组合 Profile 的 bundle 顺序为：

```text
@deepseek-ai/dsh-base
@deepseek-ai/dsh-web-app
dsh-better-sidebar
dsh-checkpoint-rewind
dsh-rich-file-reader
```

顺序来自一次 `pnpm add` 后官方 CLI 的依赖清单 reconcile。后续产品锁必须显式验证顺序，不能依赖对象枚举偶然稳定。

## 4. 兼容性警告

三个插件的 DSH peer 声明仍指向 `rc.6`：

- Rich File Reader 和 Better Sidebar 使用 `^0.1.0-rc.6`；
- Checkpoint Rewind 使用精确 `0.1.0-rc.6` peers；
- 本轮证明它们可以在当前 `rc.7` Host/Profile 上装载，不证明所有 API 行为保持兼容；
- 上游 DSH 再升级时必须重新执行相同 smoke 和真实能力回归。

安装需要的受控 build allowlist：

| 插件 | allowBuilds |
| --- | --- |
| Rich File Reader | `koffi`、`office-oxide`、`tesseract.js` |
| Better Sidebar | `node-pty`、`protobufjs` |
| Checkpoint Rewind | 无 |

当前安装在系统 Node Web Host 中执行。Electron packaged runtime 会设置不同的 native runtime/target/headers，不能用本轮结果代替 Electron ABI 验证。

## 5. Runner 问题与修复

最初的组合试验按插件逐个执行三次 `pnpm add`，第二次安装在外层 300 秒门限内没有退出。残留 Profile 显示依赖已经落盘，但 bundle reconcile 尚未提交，因此无法判断是 native lifecycle、pnpm 子进程还是网络等待。

该问题未计为插件不兼容。试验框架已调整为：

- 先下载并审计全部精确 tarball；
- 一次 `pnpm add` 安装整组插件，避免重复运行 native lifecycle；
- 每个子命令有明确超时；
- POSIX 下使用独立进程组并在超时时终止完整子进程组；
- 向 stderr 输出当前阶段，不再无输出等待；
- 失败后清理临时 DSH Home，`--keep` 时才保留现场。

调整后的三插件组合在 12 秒内完成测试。这个修复属于试验基础设施，不改变任何第三方插件。

## 6. 尚未验证

以下项目仍是生产阻塞项：

- Rich File Reader 对旧版 DOC/XLS、XLSX、PPT/PPTX 的真实中文文件读取；
- 扫描中文 PDF 的稳定中文语言包与失败边界；
- Better Sidebar 文件读取、保存、Git diff、暂存、提交和终端；
- Better Sidebar 与官方/第三方 composer、overlay、details 的视觉和交互冲突；
- Checkpoint 的真实 capture、preview、确认、restore 和 guard checkpoint；
- Checkpoint 对 tracked、untracked、staged、ignored 文件和 Git HEAD/index 的边界；
- Better Sidebar 保存与 Checkpoint 监听组合是否重复捕获或循环；
- Desktop compatibility 和 advanced 两种图形模式；
- macOS/Windows packaged Electron 的 native module ABI；
- 插件卸载、数据保留和失败 generation 回滚；
- 第三方许可证文本与最终应用 notice 的再分发整合。

## 7. 当前决策

| 插件 | 当前状态 | 下一门禁 |
| --- | --- | --- |
| Rich File Reader | DOCX 与文本层 PDF 可用；中文 OCR 不稳定 | 作为路径解析工具验证 Electron native smoke |
| Better Sidebar | 初步 `rc.7` Host/Profile 通过 | 文件/Git 行为、UI 两种模式、`node-pty` ABI |
| Checkpoint Rewind | 初步 `rc.7` Host/Profile 通过 | 真实 Git/非 Git 回退合同和确认门 |

三个插件继续保持“优先试验”，未进入产品“采用”清单。

## 8. 复现命令

```sh
corepack yarn story-studio:test
corepack yarn story-studio:plugins:audit
corepack yarn story-studio:plugins:smoke --plugin rich-file-reader
corepack yarn story-studio:plugins:smoke --plugin better-sidebar
corepack yarn story-studio:plugins:smoke --plugin checkpoint-rewind
corepack yarn story-studio:plugins:smoke
corepack yarn story-studio:rich-file-reader:smoke --skip-ocr
```

`audit` 和 `smoke` 会访问锁定的 HTTPS tarball。日常 `corepack yarn check` 只执行无网络的锁模块行为测试，不下载第三方代码。

# Typora 风格 Markdown 编辑器第一、二阶段实现详解

> **回滚说明（2026-08-27）：本文记录的 Milkdown/ProseMirror 第一、二阶段实现已经从产品代码撤回。当前工作台已恢复为默认 CodeMirror 编辑、按需 Markdown 预览；本文仅作为历史实现记录，不再代表当前运行代码。**

> 文档基线：2026-08-27 当前工作树  
> 实现范围：`deepseek-harness/packages/client/ui-short-drama`，以及为了让该编辑器在 Desktop 集成环境中稳定构建和运行而加入的支持代码  
> 行号说明：本文所有行号均对应上述日期的当前文件内容；后续修改代码后行号可能漂移，应同时以“文件路径 + 符号名”定位。  
> 数据约束：Markdown `.md` 始终是唯一持久化格式；没有新增短剧文件格式、JSON 元数据或 sidecar 文件，也没有修改 Agent 文件协议。

## 1. 文档目的与完成边界

本文完整记录短剧工作台 Markdown 编辑器第一阶段和第二阶段的代码实现，包括：

1. Milkdown + ProseMirror 如何接入现有 React 工作台。
2. 为什么默认模式从只读预览改为可直接编辑的可视化模式。
3. CodeMirror 源码模式如何保留，两个模式如何共享同一个未保存草稿。
4. 文件打开、编辑、dirty、保存和文件切换的数据流。
5. 短剧格式识别器如何分类集标题、场景、动作、人物、对白和标记。
6. 可视化模式如何只装饰 DOM，而不污染 Markdown 原文。
7. CodeMirror 如何复用相同识别规则，避免两套模式行为漂移。
8. 单元测试、组件测试和构建验证覆盖了什么。
9. Milkdown 接入后暴露的构建、依赖代次和会话生命周期问题如何修复。

当前已完成的是第一版可运行内核和第二阶段短剧视觉识别。以下第三阶段能力尚未实现，本文不会将它们描述成已完成：

- 独立格式工具栏。
- 表格、脚注、任务列表、图片等高级 Markdown 的完整保真矩阵。
- 更完整的粘贴策略和异常内容恢复 UI。
- 专门针对超长文档的性能基准。
- 面向最终用户的完整快捷键提示和产品化交互。

## 2. 最终架构

### 2.1 组件关系

```text
Workspace.tsx
  |
  |-- openFile / draft / dirty / saving / saveStatus / sourceMode
  |
  |-- sourceMode = false（默认）
  |     `-- VisualEditor.tsx
  |           |-- Milkdown Editor
  |           |-- CommonMark preset
  |           |-- Markdown listener
  |           `-- screenplay-format.ts -> DOM 语义装饰
  |
  `-- sourceMode = true（源码回退）
        `-- Editor.tsx / CodeMirror
              `-- dlkjb-language.ts
                    `-- screenplay-format.ts（同一识别器）
```

### 2.2 数据流

```text
GET /api/desktop/projects/file
        |
        v
openFile.content + draft
        |
        +-- VisualEditor(initialDoc=draft)
        |       |
        |       `-- markdownUpdated(markdown)
        |               |
        |               v
        +---------- setDraft(markdown), setDirty(true)
        |
        +-- CodeMirror Editor(initialDoc=draft)
                |
                `-- onChange(doc) -> 同一组 setDraft/setDirty

保存按钮
  `-- POST /api/desktop/projects/file
        body = { path: openFile.path, content: draft }
```

关键点是：`draft` 是可视化和源码模式共同的编辑中状态。模式切换不会回读磁盘，也不会用旧的 `openFile.content` 覆盖草稿。

## 3. 第一阶段：Milkdown 内核与工作台接入

### 3.1 依赖锁定

文件：`deepseek-harness/packages/client/ui-short-drama/package.json:75-85`

```json
"@milkdown/core": "7.22.1",
"@milkdown/preset-commonmark": "7.22.1",
"@milkdown/plugin-listener": "7.22.1"
```

逐项作用：

| 当前行 | 包 | 用途 |
| --- | --- | --- |
| 76 | `@milkdown/core` | 创建编辑器、设置根 DOM、初始 Markdown 和 ProseMirror 编辑属性 |
| 77 | `@milkdown/preset-commonmark` | 把 CommonMark Markdown 解析为可编辑文档，并从文档序列化回 Markdown |
| 78 | `@milkdown/plugin-listener` | 监听编辑器内容变化，获得最新 Markdown 字符串 |

三个包使用精确版本 `7.22.1`，没有使用 `^` 或 `~`。这样后续 `pnpm install` 不会自动选择新的 Milkdown 次版本，符合当前分支不升级编辑器内核的约束。

锁文件中的对应位置：

- `deepseek-harness/pnpm-lock.yaml:2638-2663`：`ui-short-drama` importer 的三个直接依赖均指定并解析为 `7.22.1`。
- `deepseek-harness/pnpm-lock.yaml:10237-10259`：Milkdown core、ctx、exception、listener、commonmark、prose、transformer、utils 包的完整性记录。
- `deepseek-harness/pnpm-lock.yaml:15841-15918`：实际依赖快照，包括 ProseMirror 子包版本。
- `deepseek-harness/pnpm-lock.yaml:15883-15898`：Milkdown prose 当前实际使用的 ProseMirror 包，例如 `prosemirror-view@1.42.3`。

这里没有直接在 `package.json` 添加每个 ProseMirror 子包，因为它们由 Milkdown `7.22.1` 的依赖树统一解析；锁文件已经把最终版本固定下来。

### 3.2 VisualEditor 的公开接口

文件：`deepseek-harness/packages/client/ui-short-drama/src/client/VisualEditor.tsx:1-16`

```ts
export interface VisualEditorProps {
  initialDoc: string
  onChange: (doc: string) => void
  readOnly?: boolean
  documentPath?: string
}
```

接口含义：

| 当前行 | 属性 | 责任 |
| --- | --- | --- |
| 10 | `initialDoc` | 创建 Milkdown 实例时导入的 Markdown 字符串 |
| 11 | `onChange` | 编辑器发生真实 Markdown 变化时，把序列化结果交回父组件 |
| 12 | `readOnly` | 可选只读开关；默认 `false`，不改变同一组件的文档协议 |
| 13 | `documentPath` | 作为 DOM 的诊断属性，不参与持久化，也不参与 Markdown 内容生成 |

这个接口刻意保持很小。文件 API、保存状态和文件切换仍归 `Workspace` 管理，`VisualEditor` 只负责“Markdown 字符串进、Markdown 字符串出”。

### 3.3 React 引用与变化回调

文件：`VisualEditor.tsx:16-20`

```ts
const host = useRef<HTMLDivElement>(null)
const onChangeRef = useRef(onChange)
const lastMarkdownRef = useRef(initialDoc)
onChangeRef.current = onChange
```

- `host` 是 Milkdown 挂载的真实 DOM 容器。
- `onChangeRef` 保存最新的父组件回调。Milkdown 只创建一次，但父组件在重新渲染时会产生新的箭头函数；通过 ref 更新回调，既能使用最新闭包，又不必重建编辑器。
- `lastMarkdownRef` 保存上一次已经处理的 Markdown，用于阻止相同内容重复上报。
- 第 20 行每次 React render 都同步 `onChangeRef.current`，因此 Milkdown listener 不会长期持有第一次 render 的旧回调。

### 3.4 Milkdown 创建过程

文件：`VisualEditor.tsx:22-36`

```ts
useEffect(() => {
  if (host.current === null) return
  let disposed = false
  const editor = Editor.make()
    .config(ctx => {
      ctx.set(rootCtx, host.current!)
      ctx.set(defaultValueCtx, initialDoc)
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
        if (disposed || markdown === lastMarkdownRef.current) return
        lastMarkdownRef.current = markdown
        onChangeRef.current(markdown)
      })
    })
    .use(commonmark)
    .use(listener)
```

逐行行为：

- 第 23 行：只有 React ref 已绑定实际 `<div>` 后才创建编辑器。
- 第 24 行：局部 `disposed` 标记用于拦截销毁后晚到的异步 listener 回调。
- 第 25 行：创建当前文件对应的一套 Milkdown 实例。
- 第 27 行：把 Milkdown 根节点设为 `host.current`。
- 第 28 行：只在实例初始化时读取 `initialDoc`。
- 第 29 行：注册 Markdown 级别的更新监听，而不是读取 DOM 文本。
- 第 30 行：销毁后不再上报；同一个 Markdown 也不重复上报。
- 第 31 行：先更新去重基准。
- 第 32 行：再通知父组件更新 `draft`。
- 第 35 行：启用 CommonMark schema、parser、serializer 和编辑命令。
- 第 36 行：启用内容监听插件。

选择 Markdown listener 而不是 `innerText` 的原因是：DOM 只代表当前可视化结构，无法无损表达标题、链接地址、强调、列表嵌套和代码块。Milkdown serializer 输出的 Markdown 才是保存接口需要的数据。

### 3.5 只读模式

文件：`VisualEditor.tsx:38-42`

```ts
if (readOnly) {
  editor.config(ctx => {
    ctx.update(editorViewOptionsCtx, options => ({ ...options, editable: () => false }))
  })
}
```

这里通过 ProseMirror 的 `editable` 选项关闭输入能力，不另外维护一套预览组件。当前工作台默认没有传 `readOnly`，所以用户打开文件后可直接编辑。

### 3.6 创建、观察与销毁

文件：`VisualEditor.tsx:67-83`

```ts
let observer: MutationObserver | undefined
void editor.create().then(() => {
  decorateScreenplayBlocks()
  observer = new MutationObserver(decorateScreenplayBlocks)
  if (host.current !== null) {
    observer.observe(host.current, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }
})
return () => {
  disposed = true
  observer?.disconnect()
  void editor.destroy()
}
```

- `editor.create()` 是异步操作；完成后先给已渲染文档做一次短剧装饰。
- 然后建立 `MutationObserver`，覆盖节点增删、后代变化和文本节点变化。
- React unmount 时先禁止回调，再断开 observer，最后销毁 Milkdown。
- `destroy()` 返回 Promise，这里用 `void` 明确表示清理过程不阻塞 React effect cleanup。

### 3.7 防止“点文件后页面卡死”的关键生命周期设计

文件：`VisualEditor.tsx:78-83`

`useEffect` 的依赖数组是 `[]`，这是有意设计，不是漏写 `initialDoc`。

编辑发生时的调用链是：

```text
Milkdown markdownUpdated
  -> Workspace setDraft(markdown)
  -> Workspace render
  -> VisualEditor 收到新的 initialDoc prop
```

如果 effect 依赖 `initialDoc`，上述每次按键都会触发：

```text
destroy old editor -> create editor -> listener -> setDraft -> destroy -> create ...
```

这会形成高频初始化循环，表现为页面 CPU 占满、所有点击无响应。当前实现通过以下组合避免循环：

1. `VisualEditor` 实例内部不因 `draft` 更新而重建。
2. `onChangeRef` 让单一实例仍调用最新父回调。
3. `lastMarkdownRef` 去掉重复 Markdown 通知。
4. 文件切换由父组件改变 React `key`，只在真正换文件或换模式时销毁并创建实例。

### 3.8 返回的 DOM 容器

文件：`VisualEditor.tsx:85`

```tsx
return <div
  ref={host}
  className={css.visualEditor}
  data-document-path={documentPath}
/>
```

`data-document-path` 仅用于检查当前实例属于哪个文件。它不会进入 Milkdown 文档，也不会写入 Markdown。

## 4. Workspace 接入与状态管理

### 4.1 编辑相关状态

文件：`deepseek-harness/packages/client/ui-short-drama/src/client/Workspace.tsx:134-146`

| 当前行 | 状态 | 作用 |
| --- | --- | --- |
| 136 | `openFile` | 当前文件路径、名称和最后一次磁盘加载/保存成功的内容 |
| 137 | `draft` | 当前正在编辑的 Markdown，两个编辑模式共享 |
| 138 | `dirty` | `draft` 是否包含尚未成功保存的变化 |
| 139 | `saving` | 防止重复保存，并控制按钮禁用/文案 |
| 140 | `saveStatus` | 打开、保存成功或保存失败提示 |
| 141 | `sourceMode` | `false` 为可视化；`true` 为 CodeMirror 源码 |

`sourceMode` 初始值是 `false`，所以工作台默认进入 Typora 风格可视化编辑，不再先进入只读预览。

### 4.2 打开文件

文件：`Workspace.tsx:171-190`

打开文件时：

1. 第 172 行先执行 `setSourceMode(false)`，每次选择文件都回到默认可视化模式。
2. 第 173 行清掉上一个文件的保存提示。
3. 第 175 行仍调用原来的 `GET /api/desktop/projects/file?path=...`。
4. 第 176-180 行把 404 当作空文件处理，设置空 `openFile`、空 `draft` 和 `dirty=false`。
5. 第 183-186 行读取 `{ content }`，同时设置基准文件内容和当前草稿，并清除 dirty。
6. 第 187-189 行只显示打开失败，不伪造文件内容。

文件切换后 `openFile.path` 改变，渲染处的 `key` 随之改变，因此旧 Milkdown 被销毁，新文件以新的 `initialDoc` 创建。这解决了旧文件内容残留问题。

### 4.3 保存仍使用原 API

文件：`Workspace.tsx:204-224`

保存请求没有因 Milkdown 而修改：

```ts
fetch('/api/desktop/projects/file', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ path: openFile.path, content: draft }),
})
```

保存的 `content` 是 Milkdown listener 或 CodeMirror `onChange` 更新后的同一个 `draft` 字符串。成功后：

- 第 215 行把 `openFile.content` 更新为已保存的 `draft`。
- 第 216 行清除 dirty。
- 第 217 行显示“已保存”。
- 第 218 行刷新文件树统计。

失败时第 220 行保留现有 `draft`，只显示错误；不会清空编辑内容，也不会把 dirty 错误地改成 false。

### 4.4 可视化 / 源码模式切换

文件：`Workspace.tsx:321-342`

- 第 326-328 行按钮根据当前模式显示“源码”或“可视化”。按钮文案表达的是点击后的目标模式。
- 第 337-338 行 `sourceMode=true` 时创建 CodeMirror `Editor`。
- 第 339-340 行默认创建 `VisualEditor`。
- 两者的 `initialDoc` 都是当前 `draft`，不是旧的 `openFile.content`。
- 两者的 `onChange` 都执行 `setDraft(doc); setDirty(true); setSaveStatus(null)`。

模式 key：

```ts
`${openFile.path}:source`
`${openFile.path}:visual`
```

它确保切换模式时旧编辑器完整销毁、目标编辑器从当前草稿初始化；同一模式内的普通输入不会改变 key。

源码模式继续根据路径选择语言：`/剧本/` 下的文件或 `episode-N.md` 使用 `dlkjb`，其他文件使用普通 Markdown。

### 4.5 状态转换表

| 操作 | `openFile` | `draft` | `dirty` | `sourceMode` |
| --- | --- | --- | --- | --- |
| 初次进入工作台 | `null` | `''` | `false` | `false` |
| 打开已有文件 | 磁盘内容基准 | 磁盘内容 | `false` | `false` |
| 可视化输入 | 不立即改变 | Milkdown Markdown | `true` | `false` |
| 切到源码 | 不变 | 不变 | 不变 | `true` |
| 源码输入 | 不立即改变 | CodeMirror 文本 | `true` | `true` |
| 切回可视化 | 不变 | 不变并用于新实例 | 不变 | `false` |
| 保存成功 | 内容基准变为 draft | 不变 | `false` | 不变 |
| 保存失败 | 不变 | 保留 | 保留 `true` | 不变 |
| 打开另一个文件 | 替换 | 新文件内容 | `false` | `false` |

## 5. 第一阶段通用可视化样式

文件：`deepseek-harness/packages/client/ui-short-drama/src/client/zenwit.module.css:512-581`

### 5.1 源码编辑器样式保留

- 第 512-517 行 `.editor` 保持 CodeMirror 容器可滚动并填满中央区域。
- 第 518-521 行让 `.cm-editor` 高度为 100%，背景透明。
- 第 522-531 行保留源码模式字体、行高、内边距和文档纸面效果。

因此加入 Milkdown 没有删除 CodeMirror，也没有把现有源码编辑体验改成同一套 DOM。

### 5.2 Milkdown 容器

- 第 533-542 行：`.visualEditor` 填充剩余高度，自身滚动，使用写作字体、16px 字号和 1.8 行高。
- 第 551-555 行：直接子块最大宽度 `760px` 并水平居中，长行不会铺满整个中央栏。
- 第 556-565 行：为 `h1/h2/h3` 建立清晰标题层级。
- 第 566-570 行：引用块使用品牌色左边框。
- 第 571-580 行：代码块支持横向滚动、等宽字体和独立背景。
- 第 581 行：链接使用品牌色。

### 5.3 ProseMirror `white-space` 修复

文件：`zenwit.module.css:544-550`

```css
.visualEditor :global(.editor) {
  min-height: 100%;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
```

ProseMirror 使用 CSS 的 `white-space` 计算光标和 selection geometry。没有明确设置时控制台会提示：

```text
ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'.
```

`pre-wrap` 同时保留编辑器需要的空白语义并允许长文本换行。这个警告不是此前页面卡死的根因，但必须修复，否则光标位置和空白显示存在潜在偏差。

## 6. 第二阶段：共享短剧格式识别器

### 6.1 类型模型

文件：`deepseek-harness/packages/client/ui-short-drama/src/client/screenplay-format.ts:1-16`

```ts
export type ScreenplayBlockKind =
  | 'episodeHeading'
  | 'sceneHeading'
  | 'marker'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'plain'

export interface ScreenplayBlock {
  kind: ScreenplayBlockKind
  text: string
  speaker?: string
  dialogue?: string
}
```

`text` 永远保存调用者传入的原始字符串。分类时会创建一个 `trim()` 后的局部值用于匹配，但返回对象不会用它覆盖 `text`。因此前导、尾随空格和未知内容不会因识别器而被改写。

`speaker` 和 `dialogue` 只为对白提供渲染元数据；当前实现没有把它们写入磁盘或 JSON。

### 6.2 对白正则

文件：`screenplay-format.ts:18`

```ts
const dialoguePattern = /^([^\s△【#：:]{1,24})(?:（([^）]*)）)?[：:](.*)$/
```

分组解释：

| 片段 | 意义 |
| --- | --- |
| `^` | 从整行开头匹配 |
| `[^\s△【#：:]` | 人物名不能以空白、动作符、标记符、标题符或冒号组成 |
| `{1,24}` | 人物名主体长度 1 到 24 个字符，降低普通长句误判概率 |
| `(?:（([^）]*)）)?` | 可选中文全角括号提示，例如 `（OS）`、`（VO）` |
| `[：:]` | 同时兼容中文和英文冒号 |
| `(.*)` | 冒号后的对白正文，可以为空 |
| `$` | 匹配到整行结尾 |

### 6.3 分类顺序和规则

文件：`screenplay-format.ts:20-44`

分类有固定优先级；匹配到第一类后立即返回：

| 优先级 | 当前行 | kind | 规则 | 示例 |
| --- | --- | --- | --- | --- |
| 1 | 23 | `episodeHeading` | `^第\d+集\s*$` | `第1集` |
| 2 | 24 | `sceneHeading` | 数字场号 + 内容 + 内/外 | `1-2 客厅 夜 内` |
| 2 | 25 | `sceneHeading` | `INT.`、`EXT.`、`内`、`外`、`场景` 开头 | `INT. 客厅 - 夜`、`内：客厅` |
| 2 | 26 | `sceneHeading` | `第...场` 开头 | `第一场 客厅` |
| 3 | 29 | `marker` | `【...】` 开头 | `【闪回】` |
| 4 | 30 | `action` | trim 后以 `△` 开头 | `△他推门进入` |
| 5 | 31 | `character` | `人物：` 开头 | `人物：张三` |
| 6 | 33-41 | `dialogue` | 人物、可选提示、冒号、台词 | `张三（OS）：我回来了` |
| 7 | 43 | `plain` | 以上均未识别 | 普通 Markdown 段落、未知格式、空文本 |

顺序很重要。例如 `人物：张三` 也符合宽泛的“冒号行”结构，但 `character` 在 `dialogue` 前判断，因此不会被误标成对白。

对白匹配成功后：

- `text` 仍返回原字符串。
- 没有表演提示时，`speaker` 就是人物名。
- 有提示时，第 39 行按 `人物（提示）` 重组显示元数据。
- `dialogue` 是冒号后的正文。

无法识别的任何文本都走 `plain`，识别器不会抛错、删除或修正用户内容。

## 7. 第二阶段：可视化 DOM 装饰

### 7.1 装饰入口

文件：`VisualEditor.tsx:44-66`

`decorateScreenplayBlocks()` 只读取 Milkdown 当前产生的段落 DOM，并添加 class 和 `data-*`：

1. 第 45-46 行获取当前 host；host 不存在则直接返回。
2. 第 47-52 行从 CSS Module 获取六个视觉 class。
3. 第 53 行查询所有 `<p>`；Markdown 标题等原生节点仍由 CommonMark 样式负责。
4. 第 54 行先移除上一次可能添加的全部短剧 class。
5. 第 55 行用段落 `textContent` 调用共享识别器。
6. 第 56 行写入 `data-screenplay-kind`，便于样式诊断和测试。
7. 第 57-58 行只在有 speaker 时写 `data-speaker`，否则删除旧值，避免编辑后残留。
8. 第 59-64 行根据 kind 添加一个对应视觉 class。

先清理再分类解决了实时编辑的残留问题。例如用户把 `△他进入` 改成普通段落时，旧 `.visualAction` 会先移除，再得到 `plain`，不会继续显示斜体动作样式。

### 7.2 为什么装饰不会污染 Markdown

装饰写入的是 ProseMirror 外显 DOM 的：

- CSS class；
- `data-screenplay-kind`；
- `data-speaker`。

保存内容来自 `listenerCtx.markdownUpdated` 返回的 Milkdown Markdown serializer 结果，而不是 `host.innerHTML`。这些 DOM 属性不是 ProseMirror document schema 中的节点属性，所以 serializer 不会把它们写回 Markdown。

也就是说：

```text
原文 `△他推门进入`
  -> DOM <p class="..." data-screenplay-kind="action">△他推门进入</p>
  -> 保存仍为 `△他推门进入`
```

短剧识别层只改变视觉表现，不建立不可逆的自定义 Markdown 节点。

### 7.3 实时重算

文件：`VisualEditor.tsx:67-72`

Observer 监听：

- `childList: true`：粘贴、回车、删除段落等节点结构变化。
- `subtree: true`：Milkdown 根节点内任意深度变化。
- `characterData: true`：现有文本节点内容变化。

所以输入、粘贴、撤销和重做导致的 DOM 变化都会重新分类。分类函数只返回简单对象，装饰失败时也没有参与保存链路；普通 Markdown 仍能作为普通段落编辑。

## 8. 第二阶段短剧样式

文件：`zenwit.module.css:582-621`

| 当前行 | class | 视觉行为 |
| --- | --- | --- |
| 582-585 | `.visualAction` | 动作行使用辅助色和斜体，弱于对白主体 |
| 586-592 | `.visualEpisode` | 集标题 30px、750 字重、较紧行高 |
| 593-601 | `.visualScene` | 场景前增加 28px 留白，等宽、12px、粗体、uppercase |
| 602-604 | `.visualDialogue` | 对白左侧缩进 34px，形成阅读层次 |
| 605-609 | `.visualCharacter` | 人物定义前留白并加粗 |
| 610-619 | `.visualMarker` | 标记使用轻量边框、胶囊圆角和品牌强调色 |
| 620-621 | `.visualEditor:focus-within` | 编辑器获得焦点时显示轻微内描边 |

这些 class 使用现有 Zenwit CSS 变量，如 `--zw-ink`、`--zw-muted` 和 `--zw-brand`，没有引入另一套主题或改变工作台三栏布局。

## 9. CodeMirror 与可视化模式共享规则

文件：`deepseek-harness/packages/client/ui-short-drama/src/client/dlkjb-language.ts:1-39`

### 9.1 共享导入

第 4 行导入：

```ts
import { classifyScreenplayBlock } from './screenplay-format.ts'
```

原本散落在 CodeMirror tokenizer 中的逐条正则被移除。第 17-18 行取得当前整行并调用同一分类器：

```ts
const line = stream.string.slice(stream.pos)
const kind = classifyScreenplayBlock(line).kind
```

### 9.2 kind 到高亮 token 的映射

| 当前行 | kind | CodeMirror token | HighlightStyle |
| --- | --- | --- | --- |
| 19 | `episodeHeading` | `heading` | 粗体、金色、1.15em |
| 20 | `sceneHeading` | `scene` | 蓝色粗体 |
| 21 | `marker` | `marker` | 橙色粗体 |
| 22 | `action` | `action` | 青色 |
| 23 | `character` | `character` | 绿色粗体 |
| 24 | `dialogue` | `dialogue` | 浅色字符串样式 |
| 25-26 | `plain` | `null` | 不额外高亮 |

`stream.skipToEnd()` 表示每种短剧结构按整行高亮。现在新增场景兼容规则时只需改共享识别器，源码模式和可视化模式会同时生效。

## 10. TypeScript 项目边界和测试文件命名

### 10.1 ui-short-drama tsconfig

文件：`deepseek-harness/packages/client/ui-short-drama/tsconfig.json:1-38`

- `rootDir` 仍为 `src`。
- `include` 仍只包含 `src`。
- 第 24-31 行加入当前 UI 组合需要的 `ui-layout`、`ui-input-trigger`、`ui-sidebar` project references。
- 第 35-37 行加入 screenplay project library reference。

### 10.2 `TS6307` 的原因与处理

最初测试名为 `tests/screenplay-format.spec.ts`。根 Harness 的 host 构建会把无 `.client.` 标记的测试归入 host TypeScript 项目；该测试又从 `ui-short-drama/src/client/screenplay-format.ts` 导入浏览器源码，于是出现：

```text
TS6307: screenplay-format.ts is not listed within the file list of tsconfig.host.json
```

这不是识别器类型错误，也不是 `.dsh` 数据问题，而是测试文件被错误分流到 host 编译图。

处理方式是把文件命名为：

```text
tests/screenplay-format.client.spec.ts
```

`.client.spec.ts` 让测试进入 client 测试/构建边界，符合它导入浏览器端模块的事实。没有为了绕过报错而扩大根 `tsconfig.host.json` 的 include，也没有让 host 项目错误编译 UI 源码。

## 11. 测试实现与覆盖范围

### 11.1 识别器测试

文件：`deepseek-harness/packages/client/ui-short-drama/tests/screenplay-format.client.spec.ts:1-29`

第 5-19 行的参数化测试覆盖：

- `第1集` -> `episodeHeading`
- `1-2 客厅 夜 内` -> `sceneHeading`
- `INT. 客厅 - 夜` -> `sceneHeading`
- `内：客厅` -> `sceneHeading`
- `△他推门进入` -> `action`
- `人物：张三` -> `character`
- `张三（OS）：我回来了` -> `dialogue`
- 英文冒号 `张三: 普通对白` -> `dialogue`
- `【闪回】` -> `marker`
- 普通段落 -> `plain`
- 空字符串 -> `plain`

第 21-28 行验证两个重要保真条件：

1. 输入两侧空格仍完整保存在返回的 `text` 中。
2. `张三（VO）` 和 `你好` 被正确拆成可选渲染元数据。

### 11.2 VisualEditor 生命周期测试

文件：`tests/visual-editor.client.spec.tsx:1-57`

测试通过 mock Milkdown API 隔离 React 生命周期：

- 第 39-46 行重新 render 新 `initialDoc`，断言 `create()` 仍只调用一次，并在 unmount 时只 `destroy()` 一次。这是防止输入导致重建循环的回归测试。
- 第 48-56 行连续触发两次完全相同的 Markdown 更新，断言父 `onChange` 只调用一次。这验证 `lastMarkdownRef` 去重。

### 11.3 Workspace 默认模式测试

文件：`tests/workspace.client.spec.tsx:102-115`

测试步骤：

1. 展开“剧本”目录。
2. 点击 `episode-1.md`。
3. 等待文件树选中态成为 `aria-current=page`。
4. 断言默认渲染 `visual-editor`，内容是加载到的 Markdown。
5. 断言 CodeMirror 尚未渲染。
6. 点击“源码”后断言 CodeMirror 出现。
7. 点击“可视化”后断言 Milkdown 重新出现。

这证明工作台的默认入口和回退入口已经接通。当前该测试使用组件 mock，负责验证 Workspace 编排，不重复测试 Milkdown 内部行为。

### 11.4 当前没有覆盖的测试

以下测试仍属于后续阶段，不能因为基础测试通过就声称已经完整保真：

- 表格、脚注、任务列表、图片 round-trip。
- HTML 与复杂 Markdown 粘贴。
- 中文输入法 composition 事件专项测试。
- 多层嵌套列表和复杂代码围栏的完整样例矩阵。
- 超长剧本文档的浏览器性能测试。

## 12. 构建与浏览器运行稳定化

本节代码不是短剧语义功能，但 Milkdown 引入的 unified/vfile/ProseMirror 依赖链使既有 Desktop 打包边界暴露出问题。若不处理，源码正确也无法稳定运行。

### 12.1 浏览器 bundle 中的 Node shim

文件：`deepseek-harness/packages/client/tsdown.client.ts`

相关位置：

- 第 26 行：定义虚拟模块前缀 `NODE_SHIM_PREFIX`。
- 第 188-202 行：编译期替换 `process.env.NODE_ENV` 和 `import.meta.env`。
- 第 209-237 行：`dsh-browser-node-shims` 插件。

原因：Milkdown 的 Markdown 依赖链包含 `vfile` / `vfile-message`。当前 Rolldown 浏览器构建仍可能解析到它们的 `node:process`、`node:path`、`node:url` helper。如果这些 `require()` 留在客户端 bundle 中，Desktop loader 的模块表无法提供 Node 内建模块，启动会失败。

实现细节：

1. `resolveId()` 只在 importer 来自 `/vfile/` 或 `/vfile-message/` 时拦截三个 Node specifier，避免全局伪装 Node API。
2. `node:process` 只提供 vfile 所需的最小 `cwd()`。
3. `node:url` 提供最小 `fileURLToPath()`。
4. `node:path` 只实现 `sep`、`basename`、`dirname`、`extname`、`join`。
5. 这些 shim 局部内联进 bundle，不加入共享 loader 模块表。

该实现遵守“最小支持面”：它不是通用 Node polyfill，只满足当前 Markdown 元数据路径所用的 API。

### 12.2 构建环境变量替换

文件：`tsdown.client.ts:188-202`

内联依赖如 zustand/immer 会读取 `process.env.NODE_ENV`；zustand ESM 还会探测 `import.meta.env.MODE`。CJS 浏览器产物如果保留这些表达式，可能在运行时触发 `ReferenceError`，或被 Rolldown 判定为空 `import.meta`。

`define` 同时替换：

```ts
'process.env.NODE_ENV'
'import.meta.env.MODE'
'import.meta.env'
```

值遵循当前构建的 `NODE_ENV`，未设置时默认 `production`。这保证依赖选择正确分支，并且最终 factory 中没有未定义的 Node/Vite 全局量。

### 12.3 统一本地构建包代次

文件：`scripts/link-local-client.mjs:1-106`

此前开发流程把部分源码 package 以 symlink 接入 Desktop，但 Desktop `node_modules` 中其余共享 UI 包仍可能是已安装的旧产物。结果是一个运行时同时包含两代导出接口，曾出现：

```text
useDismissOnOutsidePointer is not a function
abbreviateHomePath is not a function
renderer boot failed
```

这类错误不是 Milkdown API 使用错误，而是调用方按当前源码构建、被调用方却仍是另一代 RC 产物。

当前脚本的做法：

- 第 15 行把兼容基线固定为 `0.1.1-rc.2`。
- 第 17-53 行列出需要保持同一构建代次的 runtime、UI、短剧包、web frontend 和 web-app 配置。
- 第 56-58 行读取已安装 package manifest。
- 第 60-84 行恢复并校验真实安装目录，拒绝遗留源码 symlink 和非预期版本。
- 第 86-103 行只把本地构建产物 `lib`、`dist` 或指定配置物化覆盖到安装包中。
- 第 105-106 行明确保持 `@deepseek-ai/dsh-base` 为安装的 RC2 包。

这样既保留已安装 package 的 manifest/版本边界，又让相互调用的本地客户端产物来自同一轮源码构建。它不是升级依赖版本，也没有删除 Zenwit 代码。

## 13. 点击文件卡死：会话生命周期修复

用户看到的主要控制台异常曾是：

```text
cannot get required service "sessions" in inactive context
  at AgentPresetSeatController.currentSession
  at AgentPresetSeatController.apply
```

这个异常与 ProseMirror `white-space` 警告同时出现，但根因不同。实际问题是工作台打开/切换文件时 React 和 Cordis composition 发生变化，旧 conversation scope 正在销毁；session list 已经排队的通知仍调用旧 `AgentPresetSeatController.apply()`，而回调再从失活 scope 获取 `sessions` 服务，抛出未捕获 Promise 异常并中断 renderer 状态转换。

### 13.1 Controller 的 disposed 防护

文件：`deepseek-harness/packages/client/ui-agent-preset/src/client/seat-store.ts`

相关位置：

- 第 62-69 行：新增私有 `disposed = false`。
- 第 152-160 行：新增同步 `dispose()`。
- 第 169-178 行：`apply()` 在访问 session 回调前检查生命周期和 staged 状态。

关键顺序：

```ts
if (this.disposed) return
const staged = this.staged
if (staged === undefined) return
const session = this.currentSession()
```

必须先判断 `disposed`，因为即使仍有 staged preset，也不能读取失活 scope。也必须先判断 `staged`，因为没有待应用选择时根本没有理由访问 session service。

### 13.2 捕获稳定服务引用

文件：`deepseek-harness/packages/client/ui-agent-preset/src/client/index.ts:102-121`

scope 活跃时，第 107-108 行一次性通过 `scope.get()` 取得 `sessions` 和 `workspaces`，后续回调使用这两个稳定引用，不在异步通知里反复通过失活 Context getter 解析服务。

替换点包括：

- session snapshot 读取：第 110 行。
- `noteAgentPreset`：第 120、152 行。
- session list subscribe：第 139 行。
- `startSession`：第 168 行。

### 13.3 正确 teardown 顺序

文件：`ui-agent-preset/src/client/index.ts:183-195`

清理函数第一步执行 `seat.dispose()`，然后才调用 `stop()` 和其他 unsubscribe。

原因是 `stop()` 只能阻止未来通知，不能取消同一事件循环中已经开始执行或排队的回调。先设置 disposed，可以让已在途的 `apply()` 在读取 `currentSession()` 前安全返回。

### 13.4 回归测试

文件：`deepseek-harness/packages/client/ui-agent-preset/tests/settings-store.client.spec.ts`

- 第 353-362 行：没有 staged choice 时，`apply()` 不应读取会抛出 inactive-context 的 session callback。
- 第 364-375 行：即使有 pending stage，只要 controller 已 dispose，`apply()` 也必须安全返回。

第二个测试复现了最危险时序：

```text
stage('cordis')
  -> owning scope dispose()
  -> same-tick queued apply()
  -> 不读取 dead sessions context
```

因此，“点击文件后页面卡死”的修复不是隐藏控制台报错，而是切断了旧 scope 的非法服务读取路径。

## 14. 原文保真与协议不变的代码依据

### 14.1 唯一持久化值仍是 Markdown 字符串

- `VisualEditor.tsx:29-33`：输出 Milkdown serializer 给出的 Markdown 字符串。
- `Workspace.tsx:212`：POST body 的 `content` 直接来自 `draft`。
- 没有任何保存 `data-screenplay-kind`、class、speaker metadata 的请求。

### 14.2 识别器保留原始输入

- `screenplay-format.ts:21` 接收 `text`。
- 第 22 行只创建局部 `value = text.trim()` 用于判断。
- 第 23-43 行每条返回分支中的 `text` 都是原参数。

### 14.3 未知格式的降级路径

- `screenplay-format.ts:43` 返回 `{ kind: 'plain', text }`。
- `VisualEditor.tsx:59-64` 对 `plain` 不添加短剧样式。
- 没有删除 DOM 节点或替换其 textContent 的逻辑。

### 14.4 Agent 协议没有变化

编辑器没有修改：

- 项目文件树响应结构。
- `/api/desktop/projects/file` 的 GET 参数。
- 保存 POST 的 `{ path, content }` 请求体。
- `.md` 文件扩展名。
- Agent 读取项目文件的方式。

Agent 仍看到正常 Markdown；短剧视觉层只存在于当前 renderer DOM。

## 15. 验证命令与已知结果

阶段实现过程中已通过：

```bash
corepack pnpm exec tsc -p packages/client/ui-short-drama/tsconfig.json --noEmit
corepack pnpm --filter @deepseek-ai/dsh-client-ui-short-drama bundle
corepack pnpm exec vitest run packages/client/ui-short-drama/tests/screenplay-format.client.spec.ts
corepack pnpm exec vitest run packages/client/ui-short-drama/tests/visual-editor.client.spec.tsx
corepack pnpm exec vitest run packages/client/ui-short-drama/tests/workspace.client.spec.tsx
```

仓库根目录日常运行仍使用：

```bash
corepack yarn dev
```

需要注意，本文记录的是当时各阶段执行过的验证结果。因为当前工作树还包含对话 `@` 引用、布局和其他未提交改动，不能把阶段性测试结果等同于“当前整个 dirty worktree 的所有完整 gate 永久通过”。后续发布前仍应重新执行仓库规定的：

```bash
corepack yarn typecheck
corepack yarn test
corepack yarn build
corepack yarn check
```

## 16. 文件改动索引

| 文件 | 阶段 | 核心改动 |
| --- | --- | --- |
| `deepseek-harness/packages/client/ui-short-drama/package.json:75-85` | 一 | 锁定 Milkdown `7.22.1` 依赖 |
| `deepseek-harness/pnpm-lock.yaml:2638-2663` | 一 | importer 锁定记录 |
| `deepseek-harness/pnpm-lock.yaml:10237-10259` | 一 | Milkdown package resolution |
| `deepseek-harness/pnpm-lock.yaml:15841-15918` | 一 | Milkdown/ProseMirror dependency snapshot |
| `ui-short-drama/src/client/VisualEditor.tsx:1-85` | 一、二 | Milkdown 生命周期、Markdown listener、短剧 DOM 装饰 |
| `ui-short-drama/src/client/Workspace.tsx:134-224` | 一 | 默认模式、打开、draft、dirty、保存 |
| `ui-short-drama/src/client/Workspace.tsx:321-342` | 一 | 可视化/源码切换和共同草稿 |
| `ui-short-drama/src/client/zenwit.module.css:512-581` | 一 | CodeMirror 保留、通用 Markdown 样式、white-space 修复 |
| `ui-short-drama/src/client/screenplay-format.ts:1-44` | 二 | 共享无损短剧识别器 |
| `ui-short-drama/src/client/dlkjb-language.ts:1-39` | 二 | CodeMirror 复用共享规则 |
| `ui-short-drama/src/client/zenwit.module.css:582-621` | 二 | 集、场景、动作、人物、对白、标记样式 |
| `ui-short-drama/tests/screenplay-format.client.spec.ts:1-29` | 二 | 分类与原文保真测试 |
| `ui-short-drama/tests/visual-editor.client.spec.tsx:1-57` | 一、稳定化 | 不重建和更新去重测试 |
| `ui-short-drama/tests/workspace.client.spec.tsx:102-115` | 一 | 默认可视化与源码回退测试 |
| `deepseek-harness/packages/client/tsdown.client.ts:26,188-237` | 运行支持 | 浏览器环境替换和 vfile Node shim |
| `scripts/link-local-client.mjs:1-106` | 运行支持 | RC2 版本校验和本地产物同代物化 |
| `ui-agent-preset/src/client/seat-store.ts:62-69,152-178` | 卡死修复 | disposed 和访问前短路 |
| `ui-agent-preset/src/client/index.ts:102-195` | 卡死修复 | 稳定服务引用与 teardown 顺序 |
| `ui-agent-preset/tests/settings-store.client.spec.ts:353-375` | 卡死修复 | inactive context 回归测试 |

## 17. 后续阶段边界

进入第三阶段时应在当前架构上增量实现，不改变以下基线：

1. `.md` 仍为唯一持久化数据源。
2. `VisualEditorProps` 保持 Markdown 字符串输入输出。
3. CodeMirror 源码模式始终保留。
4. 短剧格式继续通过共享纯函数识别，不在 Markdown 中嵌入私有 HTML。
5. 新工具栏应调用 Milkdown/ProseMirror 正式命令，不通过字符串拼接修改复杂 Markdown。
6. 高级 Markdown 必须先建立 round-trip 样例，再宣称支持。
7. 不升级当前锁定的 Milkdown/ProseMirror 版本。
8. 不清理 `~/.dsh`；编辑器功能和本地开发数据清理没有依赖关系。

至此，第一阶段完成了“默认可视化编辑 + 源码回退 + 原保存链路”，第二阶段完成了“共享短剧识别 + 双模式一致的视觉语义”。稳定化代码则保证这套实现能在现有 Desktop RC2 组合和 Cordis 会话生命周期下实际运行。

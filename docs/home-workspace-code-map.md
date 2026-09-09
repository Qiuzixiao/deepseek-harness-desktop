# 首页、工作台 UI 与通用功能代码索引

整理日期：2026-09-09。依据当前工作区源码整理，包含尚未提交的实现；不是已发布版本的功能清单。

本文的“首页”指 Zenwit 项目首页，“工作台”指打开项目后的「文件目录 / 文档编辑 / AI 对话」界面。通用功能范围包括页面切换、项目管理、文件操作、会话状态、聊天、设置、主题和公共组件。

仓库根目录：`/Users/qiuzixiao/Projrcts/QiuziProjects/deepseek-harness-desktop`。下表路径均相对于该根目录，包含完整文件名；点击路径可打开对应源码。

## 1. 最先看的 6 个文件

| 用途 | 路径与文件名 | 主要职责 |
| --- | --- | --- |
| 首页 UI | [deepseek-harness/packages/client/ui-short-drama/src/client/HomePage.tsx](../deepseek-harness/packages/client/ui-short-drama/src/client/HomePage.tsx) | 顶部导航、搜索、标签筛选、项目列表、项目详情、新建项目弹窗、删除及标签编辑交互。 |
| 工作台 UI | [deepseek-harness/packages/client/ui-short-drama/src/client/Workspace.tsx](../deepseek-harness/packages/client/ui-short-drama/src/client/Workspace.tsx) | 三栏布局、文件树、右键菜单、文档标签、保存、内容搜索、对话历史和聊天区域挂载。 |
| 页面共享样式 | [deepseek-harness/packages/client/ui-short-drama/src/client/zenwit.module.css](../deepseek-harness/packages/client/ui-short-drama/src/client/zenwit.module.css) | 首页、项目库、工作台与编辑器的样式、主题变量、间距、颜色和响应式布局。 |
| 页面切换 | [deepseek-harness/packages/client/ui-short-drama/src/client/ZenwitFrame.tsx](../deepseek-harness/packages/client/ui-short-drama/src/client/ZenwitFrame.tsx) | 管理 `home / library / workspace` 三种界面；用 sessionStorage 保存当前界面；挂载页面和设置插槽。 |
| 前端功能接线 | [deepseek-harness/packages/client/ui-short-drama/src/client/index.ts](../deepseek-harness/packages/client/ui-short-drama/src/client/index.ts) | 注册 root 插槽；注入项目增删查、标签更新、打开项目、会话切换、新对话和选区引用等操作。 |
| 文档编辑器 | [deepseek-harness/packages/client/ui-short-drama/src/client/Editor.tsx](../deepseek-harness/packages/client/ui-short-drama/src/client/Editor.tsx) | `Editor` 为 CodeMirror 源码编辑；`VisualEditor` 为 Milkdown 可视化 Markdown 编辑；处理选区、撤销重做和导航。 |

## 2. 首页及项目库配套文件

| 用途 | 路径与文件名 | 说明 |
| --- | --- | --- |
| 独立项目库页面 | [deepseek-harness/packages/client/ui-short-drama/src/client/ProjectLibraryPage.tsx](../deepseek-harness/packages/client/ui-short-drama/src/client/ProjectLibraryPage.tsx) | 项目列表、打开、删除、返回首页；与 `HomePage.tsx` 是两个页面。 |
| 项目标签组件 | [deepseek-harness/packages/client/ui-short-drama/src/client/ProjectTagEditor.tsx](../deepseek-harness/packages/client/ui-short-drama/src/client/ProjectTagEditor.tsx) | `ProjectTags` 展示标签，`ProjectTagEditor` 编辑标签；首页与项目库复用标签展示。 |
| 项目数据类型及标签规则 | [deepseek-harness/packages/screenplay/project-library/src/types.ts](../deepseek-harness/packages/screenplay/project-library/src/types.ts) | `ProjectSummary` 等项目数据合同，以及标签规范化/读取逻辑；前后端共同引用。 |

首页的查询、筛选、选中状态和弹窗状态直接放在 `HomePage.tsx` 中。项目请求函数则由 `src/client/index.ts` 注入，经 `ZenwitFrame.tsx` 传给页面。

## 3. 工作台内部功能定位

工作台目前有不少功能直接写在 `Workspace.tsx` 内，并没有各自独立的组件文件。可以按下表搜索函数名或标识快速定位。

| 功能 | 所在文件 | 搜索标识 / 说明 |
| --- | --- | --- |
| 三栏布局、拖动宽度 | `deepseek-harness/packages/client/ui-short-drama/src/client/Workspace.tsx` | `ResizeHandle`、`resizeLeft`、`resizeRight`、`gridTemplateColumns`；宽度保存到 localStorage。 |
| 文件树与刷新 | 同上 `Workspace.tsx` | `reloadStructure`、`renderNodes`；读取真实项目目录，并定时刷新。 |
| 文件新增、重命名、删除、导入 | 同上 `Workspace.tsx` | `submitNodeDialog`、`deleteNode`、`importFiles`、`contextMenu`。 |
| 文件内容搜索 | 同上 `Workspace.tsx` | `findQuery`；查找项目文件内容并定位编辑器。 |
| 多文档标签、恢复打开列表 | 同上 `Workspace.tsx` | `documents`、`activePath`、`readPersistedTabs`、`DOCUMENT_TABS_STORAGE_PREFIX`。 |
| 手动及自动保存、离开确认 | 同上 `Workspace.tsx` | `saveDocument`、`saveAndLeave`、`dirty`；当前自动保存延迟为 800ms。 |
| 可视化 / 源码编辑切换 | 同上 `Workspace.tsx` | `visualMode`、`VisualEditor`、`Editor`；具体编辑器实现见上一节。 |
| 撤销、重做按钮 | 同上 `Workspace.tsx` | `editorHistories`、`historyActions`；编辑历史能力由 `Editor.tsx` 提供。 |
| 历史对话与新建对话 | 同上 `Workspace.tsx` | `historyOpen`、`openSession`、`startSession`。 |
| 文本选区加入对话 | `deepseek-harness/packages/client/ui-short-drama/src/client/index.ts` | `addSelectionToConversation`、`local-selection`；工作台调用，编辑器负责上报选区。 |
| 聊天中 @ 项目文件 | [deepseek-harness/packages/client/ui-short-drama/src/client/project-file-source.ts](../deepseek-harness/packages/client/ui-short-drama/src/client/project-file-source.ts) | 注册项目文件候选来源，读取文件并序列化为对话上下文。 |
| 剧本语法高亮 | [deepseek-harness/packages/client/ui-short-drama/src/client/dlkjb-language.ts](../deepseek-harness/packages/client/ui-short-drama/src/client/dlkjb-language.ts) | CodeMirror 使用的 `dlkjb` 语言支持。 |

样式定位：在 `zenwit.module.css` 搜索 `.home`、`.homeBody`、`.projectRow` 查首页；搜索 `.workspace`、`.paneStructure`、`.paneEditor`、`.documentTabs` 查工作台。

## 4. 右侧 AI 聊天与共享输入功能

工作台通过 `renderSlot('conversation', ...)` 挂载聊天。调整聊天消息、输入框或消息渲染，需要继续查看 `ui-conversation`，而不仅是工作台文件。

| 用途 | 路径与文件名 | 主要职责 |
| --- | --- | --- |
| 聊天插件组装 | [deepseek-harness/packages/client/ui-conversation/src/client/apply.ts](../deepseek-harness/packages/client/ui-conversation/src/client/apply.ts) | 聊天相关服务、视图和插槽的组装。 |
| 聊天整体布局 | [deepseek-harness/packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx](../deepseek-harness/packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx) | 对话滚动区、输入区、空白会话状态及交互面板插槽。 |
| 会话内容与标题区域 | [deepseek-harness/packages/client/ui-conversation/src/client/skeleton/ConversationSession.tsx](../deepseek-harness/packages/client/ui-conversation/src/client/skeleton/ConversationSession.tsx) | 会话头部、视图切换和当前会话内容挂载。 |
| 输入框外观 | [deepseek-harness/packages/client/ui-conversation/src/client/skeleton/InputBar.tsx](../deepseek-harness/packages/client/ui-conversation/src/client/skeleton/InputBar.tsx) | 聊天输入栏 UI；相邻 `InputBar.module.css` 管理样式。 |
| 消息列表 | [deepseek-harness/packages/client/ui-conversation/src/client/chat/ChatView.tsx](../deepseek-harness/packages/client/ui-conversation/src/client/chat/ChatView.tsx) | 对话消息列表及展示；相邻 `ChatView.module.css` 管理样式。 |
| 消息项 | [deepseek-harness/packages/client/ui-conversation/src/client/chat/MessageItem.tsx](../deepseek-harness/packages/client/ui-conversation/src/client/chat/MessageItem.tsx) | 消息项展示。 |
| AI Markdown 内容 | [deepseek-harness/packages/client/ui-conversation/src/client/chat/AssistantMarkdown.tsx](../deepseek-harness/packages/client/ui-conversation/src/client/chat/AssistantMarkdown.tsx) | AI 回复中的 Markdown 渲染。 |
| 输入状态逻辑 | [deepseek-harness/packages/client/ui-conversation/src/client/input/machine.ts](../deepseek-harness/packages/client/ui-conversation/src/client/input/machine.ts) | 输入状态机；配合该目录下 `facade.ts`、`hub.ts` 使用。 |
| 聊天状态 | [deepseek-harness/packages/client/ui-conversation/src/client/stores.ts](../deepseek-harness/packages/client/ui-conversation/src/client/stores.ts) | 会话 UI 状态存储。 |

## 5. 项目、文件与桌面端公共接口

| 用途 | 路径与文件名 | 主要职责 |
| --- | --- | --- |
| HTTP 路由注册 | [dsh-plugin-desktop/src/index.ts](../dsh-plugin-desktop/src/index.ts) | 将 `/api/desktop/projects` 等地址注册到桌面端 Web 服务。 |
| 项目与文件接口实现 | [dsh-plugin-desktop/src/project-library-route.ts](../dsh-plugin-desktop/src/project-library-route.ts) | 项目列表、新建、标签更新、删除、目录结构、资源列表、文件读取/写入、节点操作和导入。 |
| 文档恢复存储 | [dsh-plugin-desktop/src/document-recovery.ts](../dsh-plugin-desktop/src/document-recovery.ts) | 文档恢复数据与检查点存储；当前工作区文件接口已引用。 |
| 桌面设置与原生操作接口 | [dsh-plugin-desktop/src/desktop-settings-route.ts](../dsh-plugin-desktop/src/desktop-settings-route.ts) | 桌面设置、显示项目路径、打开终端等接口处理。 |
| HTTP 请求校验 | [dsh-plugin-desktop/src/desktop-http-security.ts](../dsh-plugin-desktop/src/desktop-http-security.ts) | 同源 loopback 校验、JSON 请求体读取与大小限制等公共逻辑。 |

| 页面调用的接口 | 实现入口 |
| --- | --- |
| `/api/desktop/projects` | `project-library-route.ts` → `handleProjectLibraryRequest`，按请求方法处理列表、新建和标签更新。 |
| `/api/desktop/projects/delete` | `handleProjectLibraryDeleteRequest`。 |
| `/api/desktop/projects/structure` | `handleProjectLibraryStructureRequest`。 |
| `/api/desktop/projects/resources` | `handleProjectLibraryResourcesRequest`，供 @ 文件候选等功能使用。 |
| `/api/desktop/projects/file` | `handleProjectFileRequest`，处理文件读写。 |
| `/api/desktop/projects/node` | `handleProjectNodeRequest`，处理节点操作。 |
| `/api/desktop/projects/import` | `handleProjectImportRequest`。 |
| `/api/desktop/projects/reveal`、`/api/desktop/projects/terminal` | `desktop-settings-route.ts` → `handleDesktopProjectPathActionRequest`，由 `src/index.ts` 注册。 |

## 6. 状态管理、设置、主题与基础组件

| 用途 | 路径与文件名 | 主要职责 |
| --- | --- | --- |
| 会话运行时服务 | [deepseek-harness/packages/client/runtime/src/client/sessions/service.ts](../deepseek-harness/packages/client/runtime/src/client/sessions/service.ts) | 会话列表、当前选中会话和会话作用域；首页打开项目、工作台切换历史对话的基础。 |
| 工作区运行时服务 | [deepseek-harness/packages/client/runtime/src/client/workspaces/service.ts](../deepseek-harness/packages/client/runtime/src/client/workspaces/service.ts) | 工作区列表、工作区与会话关联等能力。 |
| 通用状态存储 | [deepseek-harness/packages/client/runtime/src/client/contract/store.ts](../deepseek-harness/packages/client/runtime/src/client/contract/store.ts) | `SnapshotStore`、`createSnapshotStore` 等共享状态合同与实现。 |
| 服务连接 | [deepseek-harness/packages/client/connection/src/client/connection.ts](../deepseek-harness/packages/client/connection/src/client/connection.ts) | 客户端连接管理。 |
| RPC 通信 | [deepseek-harness/packages/client/connection/src/client/rpc.ts](../deepseek-harness/packages/client/connection/src/client/rpc.ts) | RPC 通信逻辑；与页面直接调用的桌面 HTTP 接口一起构成两条通信路径。 |
| 侧栏与设置入口挂载 | [deepseek-harness/packages/client/ui-sidebar/src/client/SidebarRoot.tsx](../deepseek-harness/packages/client/ui-sidebar/src/client/SidebarRoot.tsx) | 侧栏布局及 `sidebar.settings` 插槽；支持只保留设置入口的模式。 |
| 设置基础组装 | [deepseek-harness/packages/client/ui-settings/src/client/index.ts](../deepseek-harness/packages/client/ui-settings/src/client/index.ts) | 设置基础插槽等注册；设置内容由各功能插件贡献。 |
| 桌面设置 UI | [dsh-plugin-desktop/src/client/DesktopSettingsSection.tsx](../dsh-plugin-desktop/src/client/DesktopSettingsSection.tsx) | 桌面专属设置内容。 |
| 桌面设置请求 | [dsh-plugin-desktop/src/client/desktop-settings-api.ts](../dsh-plugin-desktop/src/client/desktop-settings-api.ts) | 桌面设置前端 API 封装。 |
| 主题功能入口 | [deepseek-harness/packages/client/ui-theme/src/client/index.ts](../deepseek-harness/packages/client/ui-theme/src/client/index.ts) | 主题功能注册与接线。 |
| 基础主题样式 | [deepseek-harness/packages/client/ui-theme/src/styles/base.css](../deepseek-harness/packages/client/ui-theme/src/styles/base.css) | 通用主题基础 CSS；页面自身样式还需看 `zenwit.module.css`。 |
| 公共 UI 导出 | [deepseek-harness/packages/client/ui-primitives/src/index.ts](../deepseek-harness/packages/client/ui-primitives/src/index.ts) | 公共组件入口，包括图标、弹窗等基础能力的导出。 |
| 通用弹窗 | [deepseek-harness/packages/client/ui-primitives/src/Modal.tsx](../deepseek-harness/packages/client/ui-primitives/src/Modal.tsx) | 可复用弹窗组件。首页的新建项目弹窗仍直接在 `HomePage.tsx` 实现。 |
| 通用通知 | [deepseek-harness/packages/client/ui-primitives/src/Toast.tsx](../deepseek-harness/packages/client/ui-primitives/src/Toast.tsx) | 公共 Toast 组件；具体页面是否使用需看导入关系。 |
| Web 根组件 | [deepseek-harness/packages/client/web/src/AppRoot.tsx](../deepseek-harness/packages/client/web/src/AppRoot.tsx) | 更上层的 Web 应用根节点；产品页面通过 root 插槽接入。 |

首页设置按钮会派发 `dsh:settings-open` 事件；页面壳保留 sidebar/settings 的挂载，以接入已有设置能力。

## 7. 页面与功能关系

```text
ui-short-drama/src/client/index.ts（注册 root + 注入操作）
└─ ZenwitFrame.tsx（页面切换与恢复）
   ├─ HomePage.tsx（首页）
   │  └─ ProjectTagEditor.tsx（标签）
   ├─ ProjectLibraryPage.tsx（独立项目库）
   └─ Workspace.tsx（工作台）
      ├─ 文件树、标签、保存、搜索、历史对话
      ├─ Editor.tsx（源码 / 可视化编辑器）
      └─ conversation 插槽 → ui-conversation（聊天与输入）

项目与文件操作 → /api/desktop/projects/*
              → dsh-plugin-desktop/src/project-library-route.ts
会话与工作区操作 → runtime 的 sessions / workspaces 服务
                → connection / RPC
```

## 8. 修改需求速查

| 想修改什么 | 优先打开 |
| --- | --- |
| 首页排版、搜索、列表、项目详情 | `HomePage.tsx` + `zenwit.module.css` |
| 工作台布局、文件树、标签栏、右键菜单 | `Workspace.tsx` + `zenwit.module.css` |
| 编辑体验、Markdown、撤销重做 | `Editor.tsx`；按钮和状态接线再看 `Workspace.tsx` |
| 首页进入工作台、返回首页 | `ZenwitFrame.tsx` + `ui-short-drama/src/client/index.ts` |
| 项目创建、删除、文件保存 | 前端调用入口 + `dsh-plugin-desktop/src/project-library-route.ts` |
| AI 消息和聊天输入框 | `ui-conversation/src/client/chat/` 与 `ui-conversation/src/client/skeleton/` 中的对应文件 |
| 项目文件 @ 引用 | `project-file-source.ts` |
| 桌面专属设置项 | `DesktopSettingsSection.tsx` + `desktop-settings-api.ts` + `desktop-settings-route.ts` |

以上短文件名的完整路径见前面的表格。修改源码应定位 `src/`；`lib/`、`dist/` 为构建产物，不作为修改入口。`ui-layout/src/client/AppFrame.tsx` 和桌面端 `AdvancedFrame.tsx` 属于其他布局层；当前 Zenwit 首页和工作台的直接入口是本索引中的 `ZenwitFrame.tsx`。

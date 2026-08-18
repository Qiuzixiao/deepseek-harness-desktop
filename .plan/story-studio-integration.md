# Story Studio 与 DeepSeek Harness 核心能力集成计划

## 目标

将 Story Studio 的 UI 与 DeepSeek Harness 的核心能力深度集成，使 Story Studio 能够：
1. 创建和管理 DSH 会话（Session）
2. 调用 LLM 生成剧本内容
3. 实现文件系统集成（读写剧本文件）
4. 展示 AI 思考过程和生成结果

## 当前架构理解

### DSH 核心服务层级

1. **Host 层（Node.js Cordis）**
   - `ctx.sessions`: 会话管理服务
   - `ctx.llm`: LLM 调用服务
   - `desktopProfiles`: Desktop 专用配置服务
   - `desktopPnpm`: 包管理服务

2. **Client 层（浏览器 React）**
   - `ctx.slots`: 插槽系统（UI 组件注册）
   - Web Client 通过 HTTP/WebSocket 与 Host 通信
   - 不能直接访问 Host 服务，需要通过 RPC 或 HTTP 路由

3. **当前 Story Studio 位置**
   - 作为 Client 插件运行在浏览器环境
   - 已实现自定义 UI 替换默认界面
   - 使用 React + CSS 实现 Bento 风格界面

### 关键约束

1. **浏览器隔离**：Client 端无法直接访问 `ctx.sessions` 或 `ctx.llm`
2. **通信方式**：必须通过 DSH 的 RPC 机制或 HTTP API
3. **会话生命周期**：Session 在 Host 层管理，Client 层通过引用访问
4. **消息不可变性**：LLM 消息一旦创建就深度冻结（deep frozen）

## 实现方案

### 方案 A：纯 Client 层实现（推荐）

**优点**：
- 不需要修改 DSH Host 层
- 复用现有的会话和 LLM 服务
- 更容易维护和升级

**缺点**：
- 需要理解 DSH 的 RPC 机制
- 受限于 DSH 提供的 API

**实现步骤**：

#### 第一阶段：会话集成（连接 AI 助手）

1. **创建会话管理 Hook**
   - 文件：`dsh-product-story-studio/src/client/hooks/useStorySession.ts`
   - 功能：
     - 创建新会话（为每个剧本项目创建专属会话）
     - 获取当前会话
     - 发送用户消息
     - 监听 AI 响应流

2. **实现消息发送和接收**
   - 文件：`dsh-product-story-studio/src/client/services/StoryAIService.ts`
   - 功能：
     - 封装消息发送逻辑
     - 处理流式响应（streaming）
     - 解析 AI 生成的剧本内容

3. **连接到 UI 组件**
   - 修改 `StoryStudioApp.tsx` 中的右侧协作台
   - 将 textarea 的输入连接到消息发送
   - 将 AI 响应展示在思考步骤和结果区域

#### 第二阶段：文件系统集成

1. **项目文件管理服务**
   - 文件：`dsh-product-story-studio/src/client/services/ProjectFileService.ts`
   - 功能：
     - 列出项目文件结构
     - 读取剧本文件内容
     - 保存编辑后的内容
     - 监听文件变化

2. **编辑器状态管理**
   - 使用 React state 管理当前打开的文件
   - 实现自动保存逻辑（debounced）
   - 处理多文件切换

3. **文件浏览器实现**
   - 左侧项目库显示真实文件树
   - 支持文件打开/关闭
   - 支持新建文件/文件夹

#### 第三阶段：编辑器功能完善

1. **富文本编辑器集成**
   - 选项 A：使用 `contentEditable` + 自定义格式化
   - 选项 B：集成轻量编辑器如 CodeMirror 或 Monaco（简化版）
   - 选项 C：自定义 textarea + Markdown 预览

2. **剧本格式支持**
   - 解析剧本结构（场次、人物、对白）
   - 语法高亮
   - 预览模式

3. **字数统计和元数据**
   - 实时统计字数
   - 更新保存状态
   - 显示最后编辑时间

#### 第四阶段：AI 协作功能深化

1. **上下文感知**
   - 自动将当前剧本内容作为上下文
   - 加载相关人物卡、设定等资料
   - 构建完整的创作提示词

2. **思考过程可视化**
   - 解析 AI 响应中的推理步骤
   - 动态更新进度显示
   - 展示引用的资料来源

3. **结果操作**
   - 插入到光标位置
   - 替换选中内容
   - 创建新版本对比

### 方案 B：混合实现（Host + Client）

**仅在方案 A 无法满足需求时考虑**

在 Host 层添加专门的 Story Studio 服务：
- 文件：`dsh-product-story-studio/src/host/StoryStudioHost.ts`
- 提供专用的 RPC 端点
- 管理项目级会话
- 处理文件系统操作

## 技术细节

### 1. 会话创建模式

```typescript
// 伪代码示例
interface StorySession {
  projectId: string
  projectName: string
  sessionId: string
  context: {
    characters: Character[]
    outline: Outline
    currentEpisode: number
  }
}

async function createStorySession(projectId: string): Promise<StorySession> {
  // 通过 DSH RPC 创建新会话
  // 设置系统提示词（剧本创作专用）
  // 加载项目上下文
}
```

### 2. 消息流处理

```typescript
// 伪代码示例
async function* sendStoryPrompt(
  sessionId: string,
  prompt: string,
  context: StoryContext
): AsyncGenerator<AIChunk> {
  // 构建完整消息（用户输入 + 上下文）
  // 通过 llm/stream 获取流式响应
  // 解析并 yield 每个 chunk
}
```

### 3. 文件操作策略

**选项 A：使用 DSH 现有的文件工具**
- 复用 `dsh-rich-file-reader` 读取文件
- 通过标准文件 API 写入
- 优点：与 DSH 生态一致
- 缺点：可能不够灵活

**选项 B：直接使用 Node.js File System API**
- 在 Client 层通过 RPC 调用 Host 层的文件服务
- 完全控制文件操作
- 优点：灵活、高效
- 缺点：需要额外实现 Host 服务

**推荐**：先尝试选项 A，不满足需求再切换到选项 B

### 4. 状态管理架构

```typescript
// 使用 React Context 管理全局状态
interface StoryStudioState {
  // 项目状态
  currentProject: Project | null
  projects: Project[]
  
  // 会话状态
  session: StorySession | null
  
  // 编辑器状态
  openFiles: FileTab[]
  activeFileId: string | null
  
  // UI 状态
  rightPanelOpen: boolean
  activeRightTab: 'assistant' | 'context' | 'files'
  
  // AI 状态
  isThinking: boolean
  currentThought: ThinkingStep[]
  lastResult: GenerationResult | null
}
```

## 实现优先级

### P0 (核心功能，第一周)
1. ✅ UI 框架搭建（已完成）
2. 会话创建和消息发送
3. 基本的 AI 响应展示
4. 简单的文件读写

### P1 (核心体验，第二周)
1. 流式响应的实时展示
2. 思考过程可视化
3. 编辑器自动保存
4. 项目文件树

### P2 (增强功能，第三周)
1. 上下文智能加载
2. 结果插入和操作
3. 剧本格式化和预览
4. 字数统计等元数据

### P3 (优化功能，后续迭代)
1. 多项目管理
2. 版本历史
3. 协作功能
4. 导出功能

## 风险和挑战

### 1. DSH RPC 机制理解
**风险**：Client 层如何调用 Host 层服务的机制不清楚
**缓解**：
- 深入研究 `deepseek-harness/packages/client/runtime` 的实现
- 参考 `ui-workspace`、`ui-goal` 等现有插件的做法
- 如果 RPC 复杂，考虑先实现纯前端的 mock 版本

### 2. 文件系统访问权限
**风险**：浏览器环境的文件访问受限
**缓解**：
- 使用 DSH 提供的文件工具
- 如果需要，在 Host 层实现文件服务
- 考虑使用 File System Access API（现代浏览器）

### 3. 会话状态同步
**风险**：Client 和 Host 的会话状态可能不一致
**缓解**：
- 使用单向数据流（Host 为数据源）
- 实现订阅机制监听会话变化
- 谨慎处理并发修改

### 4. 性能问题
**风险**：大文件或长会话可能导致性能问题
**缓解**：
- 实现虚拟滚动
- 分页加载历史消息
- 限制上下文大小

## 下一步行动

### 立即执行
1. 研究 DSH Client 层如何访问 Host 服务（查看现有插件代码）
2. 创建 `useStorySession` Hook 的基础版本
3. 实现消息发送的最小可行原型

### 需要确认的问题
1. 是否需要为每个剧本项目创建独立会话？
2. 项目文件存储在哪里？用户文档目录还是应用数据目录？
3. 是否需要支持多项目同时打开？

## 成功标准

### 阶段一完成标准
- [ ] 用户可以在协作台输入框输入提示词
- [ ] 点击发送后，显示"正在思考"状态
- [ ] AI 响应以流式方式逐字显示
- [ ] 生成的内容可以插入到编辑器

### 阶段二完成标准
- [ ] 左侧文件树显示项目结构
- [ ] 点击文件可以在编辑器中打开
- [ ] 编辑器内容修改后自动保存
- [ ] 保存状态实时更新

### 阶段三完成标准
- [ ] 编辑器支持基本格式化
- [ ] 字数统计实时更新
- [ ] 支持预览模式查看格式化效果
- [ ] 多文件标签页切换

### 阶段四完成标准
- [ ] AI 自动感知当前编辑的剧本内容
- [ ] 思考步骤实时展示
- [ ] 可以查看 AI 引用的资料来源
- [ ] 支持"继续写"、"改对白"等快捷操作

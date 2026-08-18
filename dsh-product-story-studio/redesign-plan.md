# Story Studio 重新设计方案

## 问题分析

之前的实现方向完全错误：
- ❌ 试图隐藏DSH的UI
- ❌ 手动管理workbench挂载
- ❌ 创建独立的ProjectsPage路由
- ❌ 绕过DSH的架构

## 正确方案

### 1. 核心架构
Story Studio = DSH插件，通过**chain selector**占用conversation插槽

### 2. 工作流程

```
用户创建Story Studio项目
  ↓
使用ctx.workspaceRegistry.create(path, title)
  ↓
创建session时标记meta.agentPreset = 'story-studio'
  ↓
Chain selector检测到story-studio类型
  ↓
StoryStudioRoot组件占用conversation插槽
  ↓
显示三栏布局：
  - 左：文件树（复用ui-primitives）
  - 中：编辑器
  - 右：AI对话（复用现有conversation组件）
```

### 3. 插槽声明

```typescript
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'conversation': {
      kind: 'chain'
      scope: 'session-maybe'
      // Story Studio通过selector占用
    }
    
    // Story Studio内部插槽
    'story-studio.file-tree': { kind: 'single', scope: 'session' }
    'story-studio.editor': { kind: 'single', scope: 'session' }
    'story-studio.ai-panel': { kind: 'single', scope: 'session' }
  }
}
```

### 4. 组件结构

```
dsh-product-story-studio/
├── src/
│   ├── index.ts              # Host端：注册服务
│   ├── client/
│   │   ├── index.ts          # Client端：注册插槽
│   │   ├── StoryStudioRoot.tsx  # 主组件（占用conversation）
│   │   ├── components/
│   │   │   ├── FileTree.tsx     # 文件浏览
│   │   │   ├── Editor.tsx       # 编辑器
│   │   │   └── AIPanel.tsx      # AI对话面板
│   │   └── stores/
│   │       └── storyStore.ts    # 状态管理
```

### 5. 实现步骤

1. **清理现有错误代码**
   - 删除ProjectsPage.tsx
   - 删除StoryStudioRouter.tsx
   - 删除wb-client.ts
   - 简化index.tsx

2. **实现正确的插槽注册**
   - 使用chain selector
   - 根据session.meta.agentPreset判断

3. **复用DSH服务**
   - ctx.workspaceRegistry：项目管理
   - ctx.fs：文件操作
   - ctx.sessions：会话管理
   - ui-primitives：UI组件

4. **实现核心UI**
   - StoryStudioRoot：三栏布局
   - FileTree：文件浏览（使用ctx.fs.listDir）
   - Editor：简单文本编辑器
   - AIPanel：复用现有conversation组件

### 6. 不需要做的事

- ❌ 不需要ProjectsPage（使用DSH原生的workspace选择器）
- ❌ 不需要自己的路由（DSH的session切换就是路由）
- ❌ 不需要隐藏DSH UI（通过插槽占用，DSH会自动处理）
- ❌ 不需要手动挂载workbench（DSH管理生命周期）

### 7. 用户体验

**创建项目**：
- 使用DSH原生的"创建workspace"
- 或者通过侧边栏的"Create Project"按钮（注入sidebar.footer.action插槽）

**打开项目**：
- 使用DSH原生的workspace选择器
- DSH自动识别Story Studio类型并显示对应UI

**编辑文件**：
- 左侧文件树选择文件
- 中间编辑器编辑内容
- 右侧AI面板对话

**返回DSH**：
- 切换到其他workspace或创建普通session
- Story Studio UI自动消失，显示普通DSH UI

## 优势

1. ✅ 完全遵循DSH架构
2. ✅ 最大化复用现有组件
3. ✅ 无需hack或隐藏UI
4. ✅ 类型安全
5. ✅ 可维护性高

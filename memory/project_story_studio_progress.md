---
name: project-story-studio-progress
description: Story Studio 产品分支（feat/story-studio-foundation）当前进度快照，截至 2026-08-18
metadata:
  type: project
---

Story Studio 是基于 DSH Desktop 的内部 AI 编剧平台（短剧/小说/编导向），当前工作分支为 `feat/story-studio-foundation`（对应长期集成分支 `product/story-studio`）。

**进度（截至 2026-08-18，见 `docs/story-studio/README.md`）：**
- 阶段 1（创作能力 MVP）：已完成 —— 产品 Profile、`story-studio` Preset、六个 Skills（story-intake / story-project / short-drama-writing / novel-writing / reference-analysis / story-review）、项目模板、插件锁定与自动化测试均已交付。
- 阶段 2（命名创建与工作台）：已完成 —— 确定性项目创建、产品 Client Slot、统一根目录 `~/Documents/Story Studio`（可用 `STORY_STUDIO_PROJECTS_ROOT` 覆盖）。
- 阶段 3（长篇知识能力/RAG）：未开始，等召回基准。
- 阶段 4（内部发行打包）：本轮不执行。
- 已用真实模型跑通一部 12 章中文现实悬疑短篇全流程验收。

**正在进行中的改动（工作区未提交）：**
- `AGENTS.md`：补充 Architecture 一节及 `dsh-plugin-desktop` 的 verify:* 脚本说明，与仓库 CLAUDE.md 内容同步。
- `dsh-product-story-studio/src/client/index.tsx`：新增 `bindStoryStudioSessionSlot`，用于按当前会话 `cwd` 是否落在 Story Studio 项目根目录内，动态接管/归还 `conversation.session` 这个 single slot；目前挂载的是占位组件 `StoryStudioWorkbenchPlaceholder`，注释里写明下一步要替换成真正的 Bento workbench（`StoryStudioWorkbench` + `wb-client.ts` 数据层）。
- 未跟踪新文件：`docs/story-studio/ui-demo.html`（UI 演示）、`dsh-product-story-studio/src/client/wb-client.ts`（workbench 数据层，进行中）、`dsh-product-story-studio/tests/session-slot.spec.ts`（对应新 slot 逻辑的测试）、`dsh-product-story-studio/vitest.config.ts`。

**Why:** 帮助快速对齐「现在做到哪一步」，避免重新读全部文档才能回答用户的进度问题。

**How to apply:** 用户问「进度如何」「接下来做什么」时，先确认这些文件当前状态是否仍与本快照一致（`git status`/`git diff` 校验），再结合 `docs/story-studio/implementation-plan.md` 的阶段划分作答。此快照会随开发推进快速过期，务必用 git 现状核实后再使用。

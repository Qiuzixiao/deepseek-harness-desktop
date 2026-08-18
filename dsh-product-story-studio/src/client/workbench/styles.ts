export const workbenchStyles = `
.storyStudioWorkbenchRoot {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-text-primary);
}

.storyStudioWorkbenchLayout {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  height: 100%;
  overflow: hidden;
}

.storyStudioWorkbenchSidebar {
  border-right: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  overflow-y: auto;
}

.storyStudioWorkbenchMain {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.storyStudioWorkbenchPanel {
  border-left: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  overflow-y: auto;
}

.storyStudioFileTree {
  padding: 8px;
}

.storyStudioFileTreeItem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
}

.storyStudioFileTreeItem:hover {
  background: var(--dsw-alias-fill-hover);
}

.storyStudioFileTreeItem[data-selected="true"] {
  background: var(--dsw-alias-fill-selected);
}

.storyStudioFileTreeIcon {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--dsw-alias-text-secondary);
}

.storyStudioFileTreeName {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.storyStudioEditorTabs {
  display: flex;
  gap: 2px;
  padding: 8px 8px 0;
  background: var(--dsw-alias-bg-layer-1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  overflow-x: auto;
}

.storyStudioEditorTab {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px 6px 0 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 13px;
  color: var(--dsw-alias-text-secondary);
  white-space: nowrap;
}

.storyStudioEditorTab:hover {
  background: var(--dsw-alias-fill-hover);
}

.storyStudioEditorTab[data-active="true"] {
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-text-primary);
}

.storyStudioEditorTabName {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.storyStudioEditorTabClose {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 0;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  padding: 0;
}

.storyStudioEditorTabClose:hover {
  background: var(--dsw-alias-fill-hover);
}

.storyStudioEditorContent {
  flex: 1;
  overflow: auto;
  padding: 16px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.storyStudioEditorTextarea {
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  resize: none;
  outline: none;
}

.storyStudioPreviewPanel {
  padding: 16px;
}

.storyStudioPreviewContent {
  font-size: 14px;
  line-height: 1.8;
}

.storyStudioPreviewContent h1,
.storyStudioPreviewContent h2,
.storyStudioPreviewContent h3 {
  margin: 1.5em 0 0.5em;
  font-weight: 600;
}

.storyStudioPreviewContent h1 { font-size: 1.8em; }
.storyStudioPreviewContent h2 { font-size: 1.5em; }
.storyStudioPreviewContent h3 { font-size: 1.2em; }

.storyStudioPreviewContent p {
  margin: 0.8em 0;
}

.storyStudioPreviewContent code {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-2);
  font-family: inherit;
  font-size: 0.9em;
}

.storyStudioPreviewContent pre {
  padding: 12px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
  overflow-x: auto;
}

.storyStudioPreviewContent pre code {
  padding: 0;
  background: transparent;
}
`

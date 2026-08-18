window.__ModuleLoader__.load({
	id: "dsh-product-story-studio",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_dom_client = require("react-dom/client");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/styles.ts
		const styles = `
.storyStudioProductBadge{pointer-events:auto;position:fixed;z-index:35;top:10px;right:92px;display:flex;align-items:center;gap:8px;height:30px;padding:0 6px 0 9px;border:1px solid color-mix(in srgb,#287a5b 28%,var(--dsw-alias-border-l2));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 94%,#287a5b);box-shadow:0 2px 8px #0000000d;color:var(--dsw-alias-text-primary);font-size:12px}
.storyStudioProductMark{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;background:#287a5b;color:#fff;font-size:9px;font-weight:750;letter-spacing:.2px}
.storyStudioProductName{font-weight:700;color:var(--dsw-alias-text-primary)}
.storyStudioProductState{color:var(--dsw-alias-text-secondary);padding-right:3px}
.storyStudioProductAction{display:inline-flex;align-items:center;gap:4px;height:24px;border:0;border-radius:5px;background:#287a5b;color:#fff;padding:0 8px;font:inherit;font-size:11px;cursor:pointer}
.storyStudioProductAction:hover{background:#216447}
.storyStudioCreateAction{display:flex;align-items:center;justify-content:center;min-width:32px;height:32px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-text-secondary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease}
.storyStudioCreateAction:hover{background:var(--dsw-alias-fill-hover);color:var(--dsw-alias-text-primary)}
.storyStudioCreateAction[data-wide=true]{width:100%;justify-content:flex-start;gap:9px;padding:0 10px;font-size:13px}
.storyStudioDialog{box-sizing:border-box;width:min(520px,calc(100vw - 32px));gap:0;padding:0;border-radius:12px;border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.storyStudioDialogHeader{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 24px 18px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.storyStudioDialogIdentity{display:flex;align-items:center;gap:12px;min-width:0}
.storyStudioDialogMark{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;flex:none;border-radius:8px;background:#287a5b;color:#fff;font-size:12px;font-weight:750}
.storyStudioDialogTitle{margin:0;color:var(--dsw-alias-label-primary);font-size:17px;line-height:24px;font-weight:680}
.storyStudioDialogSubtitle{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.storyStudioDialogClose{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:none;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.storyStudioDialogClose:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.storyStudioDialogBody{padding:22px 24px 24px}
.storyStudioForm{display:grid;gap:18px;min-width:0}
.storyStudioField{display:grid;gap:8px;min-width:0}
.storyStudioLabel{font-size:13px;line-height:20px;font-weight:650;color:var(--dsw-alias-label-primary)}
.storyStudioInput{box-sizing:border-box;width:100%;height:44px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:0 13px;font:inherit;font-size:14px;outline:none;transition:border-color 120ms ease,box-shadow 120ms ease}
.storyStudioInput::placeholder{color:var(--dsw-alias-label-tertiary)}
.storyStudioInput:hover:not(:disabled){border-color:var(--dsw-alias-border-l3)}
.storyStudioInput:focus{border-color:#287a5b;box-shadow:0 0 0 3px color-mix(in srgb,#287a5b 16%,transparent)}
.storyStudioFieldHint{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}
.storyStudioLocation{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:11px;min-width:0;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.storyStudioLocationIcon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:7px;background:color-mix(in srgb,#287a5b 12%,var(--dsw-alias-bg-base));color:#3d9a74}
.storyStudioLocationText{display:flex;flex-direction:column;gap:2px;min-width:0}
.storyStudioLocationLabel{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
.storyStudioLocationPath{color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.storyStudioLocationTag{align-self:center;border:1px solid color-mix(in srgb,#287a5b 28%,transparent);border-radius:999px;background:color-mix(in srgb,#287a5b 10%,transparent);color:#3d9a74;padding:3px 8px;font-size:10px;line-height:15px;white-space:nowrap}
.storyStudioError{margin:0;padding:9px 11px;border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#c43d3d) 10%,transparent);color:var(--dsw-alias-state-error-primary,#c43d3d);font-size:12px;line-height:18px}
.storyStudioDialogFooter{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:16px 24px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.storyStudioDialogCancel,.storyStudioDialogSubmit{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;border-radius:7px;padding:0 15px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.storyStudioDialogCancel{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary)}
.storyStudioDialogCancel:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.storyStudioDialogSubmit{border:1px solid #287a5b;background:#287a5b;color:#fff}
.storyStudioDialogSubmit:hover:not(:disabled){border-color:#216447;background:#216447}
.storyStudioDialogSubmit:disabled,.storyStudioDialogCancel:disabled,.storyStudioDialogClose:disabled{opacity:.45;cursor:not-allowed}
.storyStudioEmpty{padding:10px 12px;font-size:12px;color:var(--dsw-alias-text-tertiary)}
@media (max-width:900px){.storyStudioProductState{display:none}.storyStudioProductBadge{right:76px}.storyStudioProductName{display:none}}
@media (max-width:560px){.storyStudioDialogHeader,.storyStudioDialogBody{padding-left:18px;padding-right:18px}.storyStudioDialogFooter{padding-left:18px;padding-right:18px}.storyStudioDialogSubtitle{display:none}.storyStudioLocationTag{display:none}.storyStudioLocation{grid-template-columns:36px minmax(0,1fr)}}
`;
		//#endregion
		//#region src/client/wb-client.ts
		let workbenchMounted = false;
		function createWorkbenchClient(sessionId) {
			const ctx = window.__dshClientContext;
			const CHANNEL = "story-studio";
			return {
				describe: async () => {
					const result = await ctx.connection.rpc.call(CHANNEL, "describe", {});
					if (result.error) throw new Error(result.error.message);
					return result.result;
				},
				listDir: async (path) => {
					const result = await ctx.connection.rpc.call(CHANNEL, "listDir", { path });
					if (result.error) throw new Error(result.error.message);
					return result.result;
				},
				readFile: async (path) => {
					const result = await ctx.connection.rpc.call(CHANNEL, "readFile", { path });
					if (result.error) throw new Error(result.error.message);
					return result.result;
				},
				writeFile: async (path, content) => {
					const result = await ctx.connection.rpc.call(CHANNEL, "writeFile", {
						path,
						content
					});
					if (result.error) throw new Error(result.error.message);
					return result.result;
				},
				createFile: async (path, content) => {
					const result = await ctx.connection.rpc.call(CHANNEL, "createFile", {
						path,
						content
					});
					if (result.error) throw new Error(result.error.message);
					return result.result;
				},
				deleteFile: async (path) => {
					const result = await ctx.connection.rpc.call(CHANNEL, "deleteFile", { path });
					if (result.error) throw new Error(result.error.message);
					return result.result;
				},
				renameFile: async (oldPath, newPath) => {
					const result = await ctx.connection.rpc.call(CHANNEL, "renameFile", {
						oldPath,
						newPath
					});
					if (result.error) throw new Error(result.error.message);
					return result.result;
				},
				createDirectory: async (path) => {
					const result = await ctx.connection.rpc.call(CHANNEL, "createDirectory", { path });
					if (result.error) throw new Error(result.error.message);
					return result.result;
				}
			};
		}
		function mountWorkbench(ctx) {
			if (workbenchMounted) {
				console.log("[wb-client] Workbench already mounted");
				return;
			}
			console.log("[Story Studio] Mounting DSH workbench");
			const sessions = ctx.get("sessions");
			const locale = ctx.get("locale");
			const layout = ctx.get("layout");
			let useSessions;
			if (sessions?.list !== void 0 && typeof sessions.list.subscribe === "function" && typeof sessions.list.getSnapshot === "function") useSessions = (selector) => {
				return selector(react.default.useSyncExternalStore(sessions.list.subscribe, sessions.list.getSnapshot));
			};
			const mount = () => {
				if (typeof window !== "undefined" && typeof window.__DSH_WORKBENCH__?.mount === "function") {
					window.__DSH_WORKBENCH__.mount({
						slots: ctx.slots,
						locale,
						NS: "workbench",
						React: react.default,
						layout,
						useSessions
					});
					workbenchMounted = true;
					console.log("[wb-client] DSH workbench mounted");
				}
			};
			let script = document.querySelector("script[data-dsh-workbench-bundle]");
			if (script === null) {
				script = document.createElement("script");
				script.src = "/wb/workbench-client.js";
				script.dataset.dshWorkbenchBundle = "1";
				document.head.appendChild(script);
			}
			script.addEventListener("load", mount);
			mount();
		}
		function unmountWorkbench() {
			if (!workbenchMounted) {
				console.log("[wb-client] Workbench not mounted, nothing to unmount");
				return;
			}
			console.log("[wb-client] Unmounting workbench");
			const workbenchRoot = document.querySelector("[data-dsh-workbench-root]");
			if (workbenchRoot) workbenchRoot.remove();
			workbenchMounted = false;
		}
		//#endregion
		//#region src/client/workbench/FileTree.tsx
		/**
		* File tree sidebar showing the current workspace directory structure.
		* Clicking a file dispatches OPEN_FILE to load it into the editor.
		*/
		function FileTree() {
			const { state, dispatch } = useWorkbench();
			const handleClick = async (entry) => {
				if (entry.type === "file") {
					const fullPath = entry.name;
					try {
						const result = await state.client.readFile(fullPath);
						dispatch({
							type: "OPEN_FILE",
							path: fullPath,
							name: entry.name,
							content: result.content,
							version: result.version
						});
					} catch (error) {
						console.error("Failed to read file:", error);
					}
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "storyStudioFileTree",
				children: state.entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "storyStudioEmpty",
					children: "No files"
				}) : state.entries.map((entry, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "storyStudioFileTreeItem",
					"data-selected": state.selectedPath === entry.name,
					onClick: () => handleClick(entry),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "storyStudioFileTreeIcon",
						children: entry.type === "directory" ? "📁" : "📄"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "storyStudioFileTreeName",
						children: entry.name
					})]
				}, i))
			});
		}
		//#endregion
		//#region src/client/workbench/EditorArea.tsx
		/**
		* Editor area with tabs and content. Shows the currently active file's
		* content in a simple textarea. Dispatches UPDATE_FILE_CONTENT on change
		* and marks the file dirty until explicitly saved.
		*/
		function EditorArea() {
			const { state, dispatch } = useWorkbench();
			const activeFile = state.activeFileIndex !== null ? state.openFiles[state.activeFileIndex] : null;
			const handleTabClick = (index) => {
				dispatch({
					type: "SET_ACTIVE_FILE",
					index
				});
			};
			const handleClose = (index, e) => {
				e.stopPropagation();
				dispatch({
					type: "CLOSE_FILE",
					index
				});
			};
			const handleContentChange = (e) => {
				if (state.activeFileIndex === null) return;
				dispatch({
					type: "UPDATE_FILE_CONTENT",
					index: state.activeFileIndex,
					content: e.target.value,
					dirty: true
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [state.openFiles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "storyStudioEditorTabs",
				children: state.openFiles.map((file, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					className: "storyStudioEditorTab",
					"data-active": i === state.activeFileIndex,
					onClick: () => handleTabClick(i),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "storyStudioEditorTabName",
							children: file.name
						}),
						file.dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { color: "var(--dsw-alias-text-secondary)" },
							children: "●"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "storyStudioEditorTabClose",
							onClick: (e) => handleClose(i, e),
							title: "Close",
							children: "×"
						})
					]
				}, i))
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "storyStudioEditorContent",
				children: activeFile ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					className: "storyStudioEditorTextarea",
					value: activeFile.content,
					onChange: handleContentChange,
					spellCheck: false
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { color: "var(--dsw-alias-text-tertiary)" },
					children: "No file open"
				})
			})] });
		}
		//#endregion
		//#region src/client/workbench/PreviewPanel.tsx
		/**
		* Right panel showing a simple markdown-style preview of the active file's
		* content. This is a naive plain-text/line-break renderer; a real markdown
		* parser can replace this later if needed.
		*/
		function PreviewPanel() {
			const { state } = useWorkbench();
			const activeFile = state.activeFileIndex !== null ? state.openFiles[state.activeFileIndex] : null;
			if (!activeFile) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "storyStudioPreviewPanel",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						color: "var(--dsw-alias-text-tertiary)",
						fontSize: "13px"
					},
					children: "No preview available"
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "storyStudioPreviewPanel",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "storyStudioPreviewContent",
					children: activeFile.content.split("\n").map((line, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: line || "\xA0" }, i))
				})
			});
		}
		//#endregion
		//#region src/client/workbench/StoryStudioWorkbench.tsx
		const WorkbenchContext = (0, react.createContext)(null);
		function useWorkbench() {
			const context = (0, react.useContext)(WorkbenchContext);
			if (!context) throw new Error("useWorkbench must be used within StoryStudioWorkbench");
			return context;
		}
		function workbenchReducer(state, action) {
			switch (action.type) {
				case "SET_ROOT": return {
					...state,
					root: action.root,
					rootName: action.rootName
				};
				case "SET_ENTRIES": return {
					...state,
					entries: action.entries
				};
				case "SELECT_PATH": return {
					...state,
					selectedPath: action.path
				};
				case "OPEN_FILE": {
					const existing = state.openFiles.findIndex((f) => f.path === action.path);
					if (existing !== -1) return {
						...state,
						activeFileIndex: existing
					};
					const newFiles = [...state.openFiles, {
						path: action.path,
						name: action.name,
						content: action.content,
						version: action.version,
						dirty: false
					}];
					return {
						...state,
						openFiles: newFiles,
						activeFileIndex: newFiles.length - 1
					};
				}
				case "CLOSE_FILE": {
					const newFiles = state.openFiles.filter((_, i) => i !== action.index);
					let newActive = state.activeFileIndex;
					if (newActive !== null) {
						if (newActive === action.index) newActive = newFiles.length > 0 ? Math.min(action.index, newFiles.length - 1) : null;
						else if (newActive > action.index) newActive -= 1;
					}
					return {
						...state,
						openFiles: newFiles,
						activeFileIndex: newActive
					};
				}
				case "SET_ACTIVE_FILE": return {
					...state,
					activeFileIndex: action.index
				};
				case "UPDATE_FILE_CONTENT": {
					const newFiles = [...state.openFiles];
					const file = newFiles[action.index];
					if (!file) return state;
					newFiles[action.index] = {
						path: file.path,
						name: file.name,
						version: file.version,
						content: action.content,
						dirty: action.dirty
					};
					return {
						...state,
						openFiles: newFiles
					};
				}
				case "MARK_FILE_SAVED": {
					const newFiles = [...state.openFiles];
					const file = newFiles[action.index];
					if (!file) return state;
					newFiles[action.index] = {
						path: file.path,
						name: file.name,
						content: file.content,
						version: action.version,
						dirty: false
					};
					return {
						...state,
						openFiles: newFiles
					};
				}
				default: return state;
			}
		}
		/**
		* Root workbench component for Story Studio projects. Renders a three-panel
		* layout: file tree (left), editor tabs (center), and preview/collab (right).
		* Mounts only when the active session's cwd falls under the Story Studio
		* project root (see bindStoryStudioSessionSlot in ../index.tsx).
		*/
		function StoryStudioWorkbench({ sessionId }) {
			const client = createWorkbenchClient(sessionId);
			const [state, dispatch] = (0, react.useReducer)(workbenchReducer, {
				client,
				root: "",
				rootName: "",
				entries: [],
				selectedPath: null,
				openFiles: [],
				activeFileIndex: null
			});
			(0, react.useEffect)(() => {
				client.describe().then((result) => {
					dispatch({
						type: "SET_ROOT",
						root: result.root,
						rootName: result.rootName
					});
				});
			}, [sessionId]);
			(0, react.useEffect)(() => {
				if (state.root) client.listDir().then((entries) => {
					dispatch({
						type: "SET_ENTRIES",
						entries
					});
				});
			}, [state.root]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkbenchContext.Provider, {
				value: {
					state,
					dispatch
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "storyStudioWorkbenchRoot",
					"data-session-id": sessionId,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "storyStudioWorkbenchLayout",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "storyStudioWorkbenchSidebar",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTree, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "storyStudioWorkbenchMain",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditorArea, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "storyStudioWorkbenchPanel",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PreviewPanel, {})
							})
						]
					})
				})
			});
		}
		//#endregion
		//#region src/client/workbench/styles.ts
		const workbenchStyles = `
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
`;
		//#endregion
		//#region src/client/ProjectsPage.tsx
		/**
		* Story Studio - 项目管理首页
		* 显示最近项目、创建新项目、打开项目
		*/
		function ProjectsPage({ onSelectProject, onCreateProject }) {
			const [recentProjects, setRecentProjects] = (0, react.useState)([]);
			const [showCreateDialog, setShowCreateDialog] = (0, react.useState)(false);
			const [newProjectName, setNewProjectName] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				const recentProjectsJson = localStorage.getItem("story-studio:recent-projects");
				if (recentProjectsJson) try {
					const projects = JSON.parse(recentProjectsJson);
					setRecentProjects(projects);
				} catch (error) {
					console.error("[ProjectsPage] Failed to parse recent projects:", error);
				}
			}, []);
			const handleCreateProject = () => {
				if (!newProjectName.trim()) return;
				onCreateProject(newProjectName);
				setShowCreateDialog(false);
				setNewProjectName("");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "ss-projects-page",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `
        /* 隐藏DSH主界面，只显示首页 */
        body:has(.ss-projects-page) > *:not(#story-studio-root):not(style):not(script) {
          display: none !important;
        }

        .ss-projects-page {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          padding: 40px;
        }

        .ss-projects-container {
          width: 100%;
          max-width: 900px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
          padding: 48px;
        }

        .ss-projects-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .ss-projects-logo {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: white;
          font-weight: 700;
        }

        .ss-projects-title {
          margin: 0 0 8px;
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .ss-projects-subtitle {
          margin: 0;
          font-size: 16px;
          color: #666;
        }

        .ss-projects-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 48px;
        }

        .ss-action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          border: 2px solid #e8ecf1;
          border-radius: 12px;
          background: #fafbfc;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .ss-action-card:hover {
          border-color: #667eea;
          background: #f5f7ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
        }

        .ss-action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 12px;
          background: white;
          border: 2px solid #e8ecf1;
        }

        .ss-action-card:hover .ss-action-icon {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }

        .ss-action-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .ss-action-desc {
          margin: 0;
          font-size: 14px;
          color: #666;
        }

        .ss-projects-section {
          margin-top: 32px;
        }

        .ss-section-title {
          margin: 0 0 16px;
          font-size: 14px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ss-projects-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ss-project-item {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border: 1px solid #e8ecf1;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .ss-project-item:hover {
          border-color: #667eea;
          background: #f5f7ff;
        }

        .ss-project-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          margin-right: 16px;
          flex-shrink: 0;
        }

        .ss-project-info {
          flex: 1;
        }

        .ss-project-name {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .ss-project-path {
          margin: 0;
          font-size: 13px;
          color: #999;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .ss-project-time {
          font-size: 13px;
          color: #999;
          margin-left: 16px;
        }

        .ss-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .ss-dialog {
          width: 90%;
          max-width: 440px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: dialog-in 200ms ease;
        }

        @keyframes dialog-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .ss-dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e8ecf1;
        }

        .ss-dialog-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .ss-dialog-close {
          width: 32px;
          height: 32px;
          border: 0;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: all 150ms ease;
        }

        .ss-dialog-close:hover {
          background: #f0f0f0;
          color: #1a1a1a;
        }

        .ss-dialog-body {
          padding: 24px;
        }

        .ss-dialog-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e8ecf1;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color 150ms ease;
        }

        .ss-dialog-input:focus {
          border-color: #667eea;
        }

        .ss-dialog-input::placeholder {
          color: #999;
        }

        .ss-dialog-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e8ecf1;
        }

        .ss-btn {
          padding: 10px 20px;
          border: 0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .ss-btn-secondary {
          background: #f0f0f0;
          color: #666;
        }

        .ss-btn-secondary:hover {
          background: #e0e0e0;
          color: #1a1a1a;
        }

        .ss-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .ss-btn-primary:hover {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transform: translateY(-1px);
        }

        .ss-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      ` }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ss-projects-container",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ss-projects-header",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "ss-projects-logo",
										children: "S"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
										className: "ss-projects-title",
										children: "Story Studio"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "ss-projects-subtitle",
										children: "AI驱动的剧本创作工作台"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ss-projects-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ss-action-card",
									onClick: () => setShowCreateDialog(true),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "ss-action-icon",
											children: "➕"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											className: "ss-action-title",
											children: "新建项目"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "ss-action-desc",
											children: "创建一个全新的剧本项目"
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ss-action-card",
									onClick: () => {
										alert("打开项目功能开发中...");
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "ss-action-icon",
											children: "📂"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											className: "ss-action-title",
											children: "打开项目"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "ss-action-desc",
											children: "打开已有的项目文件夹"
										})
									]
								})]
							}),
							recentProjects.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ss-projects-section",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: "ss-section-title",
									children: "最近打开"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "ss-projects-list",
									children: recentProjects.map((project) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-project-item",
										onClick: () => onSelectProject(project.path),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "ss-project-icon",
												children: "📝"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "ss-project-info",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													className: "ss-project-name",
													children: project.name
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
													className: "ss-project-path",
													children: project.path
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "ss-project-time",
												children: project.lastOpened
											})
										]
									}, project.path))
								})]
							})
						]
					}),
					showCreateDialog && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ss-dialog-overlay",
						onClick: () => setShowCreateDialog(false),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ss-dialog",
							onClick: (e) => e.stopPropagation(),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ss-dialog-header",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: "ss-dialog-title",
										children: "新建项目"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "ss-dialog-close",
										onClick: () => setShowCreateDialog(false),
										children: "✕"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "ss-dialog-body",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										className: "ss-dialog-input",
										placeholder: "项目名称（如：霸道总裁爱上我）",
										value: newProjectName,
										onChange: (e) => setNewProjectName(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") handleCreateProject();
											else if (e.key === "Escape") setShowCreateDialog(false);
										},
										autoFocus: true
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ss-dialog-footer",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "ss-btn ss-btn-secondary",
										onClick: () => setShowCreateDialog(false),
										children: "取消"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "ss-btn ss-btn-primary",
										onClick: handleCreateProject,
										disabled: !newProjectName.trim(),
										children: "创建"
									})]
								})
							]
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/hooks/useStorySession.ts
		/**
		* Story Studio 会话管理 Hook
		* 为剧本创作提供专门的会话管理和 AI 交互能力
		*/
		/**
		* 使用 Story Studio 会话的 Hook
		* @param ctx - DSH Client Context
		* @param sessionContext - 剧本创作上下文
		*/
		function useStorySession(ctx, sessionContext) {
			const [sessionId, setSessionId] = (0, react.useState)(null);
			const [isThinking, setIsThinking] = (0, react.useState)(false);
			const [thinkingSteps, setThinkingSteps] = (0, react.useState)([]);
			const [lastResponse, setLastResponse] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				const initSession = async () => {
					try {
						const existingSessionId = await findProjectSession(ctx, sessionContext.projectId);
						if (existingSessionId) setSessionId(existingSessionId);
						else {
							const newSessionId = await createProjectSession(ctx, sessionContext);
							setSessionId(newSessionId);
						}
					} catch (error) {
						console.error("[Story Studio] Failed to initialize session:", error);
					}
				};
				initSession();
			}, [ctx, sessionContext.projectId]);
			/**
			* 发送用户消息到 AI
			* @param userMessage - 用户输入的提示词
			*/
			const sendMessage = async (userMessage) => {
				if (!sessionId) {
					console.warn("[Story Studio] No active session");
					return;
				}
				setIsThinking(true);
				setLastResponse("");
				setThinkingSteps([
					{
						id: "1",
						description: "读取当前剧本内容",
						status: "active"
					},
					{
						id: "2",
						description: "分析创作需求",
						status: "pending"
					},
					{
						id: "3",
						description: "生成内容建议",
						status: "pending"
					}
				]);
				try {
					const contextMessage = buildContextMessage(sessionContext);
					const fullMessage = contextMessage ? `${contextMessage}\n\n${userMessage}` : userMessage;
					const binding = ctx.sessions.binding(sessionId);
					if (!binding?.session) throw new Error("Session binding not found");
					const session = binding.session;
					setTimeout(() => {
						setThinkingSteps([
							{
								id: "1",
								description: "读取当前剧本内容",
								status: "complete"
							},
							{
								id: "2",
								description: "分析创作需求",
								status: "active"
							},
							{
								id: "3",
								description: "生成内容建议",
								status: "pending"
							}
						]);
					}, 500);
					const result = await session.prompt([{
						type: "text",
						text: fullMessage
					}], "queue");
					if (!result.ok) throw new Error(result.error.message || "Failed to send prompt");
					const unsubscribe = session.subscribe(() => {
						const snapshot = session.getSnapshot();
						if (snapshot.nodes && snapshot.nodes.length > 0) {
							const lastNode = snapshot.nodes[snapshot.nodes.length - 1];
							if (lastNode && lastNode.kind === "assistant" && "blocks" in lastNode && lastNode.blocks) {
								const textContent = lastNode.blocks.filter((block) => block.kind === "text").map((block) => block.text).join("\n");
								if (textContent) {
									setLastResponse(textContent);
									setThinkingSteps([
										{
											id: "1",
											description: "读取当前剧本内容",
											status: "complete"
										},
										{
											id: "2",
											description: "分析创作需求",
											status: "complete"
										},
										{
											id: "3",
											description: "生成内容建议",
											status: "complete"
										}
									]);
									setIsThinking(false);
									unsubscribe();
								}
							}
						}
						if (snapshot.running) setThinkingSteps([
							{
								id: "1",
								description: "读取当前剧本内容",
								status: "complete"
							},
							{
								id: "2",
								description: "分析创作需求",
								status: "complete"
							},
							{
								id: "3",
								description: "生成内容建议",
								status: "active"
							}
						]);
					});
					setTimeout(() => {
						unsubscribe();
						if (isThinking) {
							setIsThinking(false);
							console.warn("[Story Studio] Response timeout");
						}
					}, 6e4);
				} catch (error) {
					console.error("[Story Studio] Failed to send message:", error);
					setIsThinking(false);
					setThinkingSteps([]);
				}
			};
			return {
				sessionId,
				isThinking,
				thinkingSteps,
				lastResponse,
				sendMessage
			};
		}
		/**
		* 查找项目对应的会话
		*/
		async function findProjectSession(ctx, projectId) {
			try {
				const result = await ctx.sessions.search(`project:${projectId}`, new AbortController().signal);
				if (result.ok && result.value.items.length > 0) return result.value.items[0].sessionId;
				return null;
			} catch (error) {
				console.error("[Story Studio] Failed to find project session:", error);
				return null;
			}
		}
		/**
		* 为项目创建新会话
		*/
		async function createProjectSession(ctx, _sessionContext) {
			try {
				const workspaceList = ctx.workspaces.list.getSnapshot();
				if (workspaceList.items.length === 0) throw new Error("No workspace available");
				const defaultWorkspace = workspaceList.items[0];
				ctx.workspaces.startSession(defaultWorkspace.id);
				return new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						unsubscribe();
						reject(/* @__PURE__ */ new Error("Timeout waiting for new session"));
					}, 5e3);
					const unsubscribe = ctx.sessions.list.subscribe(() => {
						const snapshot = ctx.sessions.list.getSnapshot();
						if (snapshot.current) {
							clearTimeout(timeout);
							unsubscribe();
							resolve(snapshot.current);
						}
					});
				});
			} catch (error) {
				console.error("[Story Studio] Failed to create project session:", error);
				throw error;
			}
		}
		/**
		* 构建上下文消息
		* 将剧本内容、人物信息等转换为上下文提示
		*/
		function buildContextMessage(context) {
			const parts = [];
			parts.push(`# 项目：${context.projectName}`);
			if (context.currentFile) parts.push(`\n当前文件：${context.currentFile}`);
			if (context.scriptContent) parts.push(`\n## 当前剧本内容\n\n${context.scriptContent}`);
			if (context.characters && context.characters.length > 0) {
				parts.push(`\n## 人物信息`);
				context.characters.forEach((char) => {
					parts.push(`\n- ${char.name}：${char.description}`);
				});
			}
			return parts.join("\n");
		}
		//#endregion
		//#region src/client/services/ProjectFileService.ts
		/**
		* 项目文件服务
		* Client 层通过 RPC 调用 Host 层的文件操作
		*/
		var ProjectFileService = class {
			ctx;
			rpcChannel = "/story-studio-files";
			constructor(ctx) {
				this.ctx = ctx;
			}
			/**
			* 调用 RPC 方法
			*/
			async callRpc(endpoint, payload) {
				try {
					const result = await this.ctx.connection.rpc.call(this.rpcChannel, endpoint, payload);
					if (!result || typeof result !== "object") throw new Error("Invalid RPC response");
					const response = result;
					if (response.ok && response.value !== void 0) return response.value;
					throw new Error(response.error?.message || "RPC call failed");
				} catch (error) {
					console.error(`[ProjectFileService] RPC call failed: ${endpoint}`, error);
					throw error;
				}
			}
			/**
			* 获取文件树
			*/
			async getFileTree() {
				return await this.callRpc("getFileTree");
			}
			/**
			* 读取文件内容
			*/
			async readFile(filePath) {
				try {
					return await this.callRpc("readFile", filePath);
				} catch {
					return null;
				}
			}
			/**
			* 写入文件内容
			*/
			async writeFile(filePath, content) {
				try {
					return await this.callRpc("writeFile", {
						filePath,
						content
					});
				} catch {
					return false;
				}
			}
			/**
			* 创建新文件
			*/
			async createFile(filePath, content = "") {
				try {
					return await this.callRpc("createFile", {
						filePath,
						content
					});
				} catch {
					return false;
				}
			}
			/**
			* 创建文件夹
			*/
			async createFolder(folderPath) {
				try {
					return await this.callRpc("createFolder", { folderPath });
				} catch {
					return false;
				}
			}
			/**
			* 删除文件
			*/
			async deleteFile(filePath) {
				try {
					return await this.callRpc("deleteFile", { filePath });
				} catch {
					return false;
				}
			}
			/**
			* 删除文件夹
			*/
			async deleteFolder(folderPath) {
				try {
					return await this.callRpc("deleteFolder", { folderPath });
				} catch {
					return false;
				}
			}
			/**
			* 重命名文件或文件夹
			*/
			async renameFile(oldPath, newPath) {
				try {
					return await this.callRpc("renameFile", {
						oldPath,
						newPath
					});
				} catch {
					return false;
				}
			}
			/**
			* 检查文件是否存在
			*/
			async fileExists(filePath) {
				try {
					return await this.callRpc("fileExists", filePath);
				} catch {
					return false;
				}
			}
		};
		//#endregion
		//#region src/client/hooks/useFileManager.ts
		/**
		* Story Studio 文件管理 Hook
		* 管理当前打开的文件、编辑器状态和自动保存
		*/
		/**
		* 文件管理 Hook
		*/
		function useFileManager(ctx, projectRoot) {
			const [fileTree, setFileTree] = (0, react.useState)([]);
			const [openFiles, setOpenFiles] = (0, react.useState)([]);
			const [activeFileId, setActiveFileId] = (0, react.useState)(null);
			const [saveState, setSaveState] = (0, react.useState)("saved");
			const fileServiceRef = (0, react.useRef)(null);
			const autoSaveTimerRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!ctx) return;
				fileServiceRef.current = new ProjectFileService(ctx);
				fileServiceRef.current.getFileTree().then((tree) => {
					setFileTree(tree);
				}).catch((error) => {
					console.error("[Story Studio] Failed to load file tree:", error);
				});
			}, [ctx, projectRoot]);
			/**
			* 打开文件
			*/
			const openFile = (0, react.useCallback)(async (filePath) => {
				if (!fileServiceRef.current) return;
				try {
					const existingFile = openFiles.find((f) => f.path === filePath);
					if (existingFile) {
						setActiveFileId(existingFile.id);
						return;
					}
					const scriptFile = await fileServiceRef.current.readFile(filePath);
					if (!scriptFile) {
						console.error("[Story Studio] File not found:", filePath);
						return;
					}
					const fileName = filePath.split("/").pop() || filePath;
					const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
					const newTab = {
						id: fileId,
						path: filePath,
						name: fileName,
						content: scriptFile.content,
						isDirty: false,
						version: scriptFile.version
					};
					setOpenFiles((prev) => [...prev, newTab]);
					setActiveFileId(fileId);
				} catch (error) {
					console.error("[Story Studio] Failed to open file:", error);
				}
			}, [openFiles]);
			/**
			* 关闭文件
			*/
			const closeFile = (0, react.useCallback)((fileId) => {
				setOpenFiles((prev) => {
					const newFiles = prev.filter((f) => f.id !== fileId);
					if (activeFileId === fileId) {
						const closedIndex = prev.findIndex((f) => f.id === fileId);
						const newActiveId = newFiles.length > 0 ? closedIndex > 0 ? newFiles[closedIndex - 1]?.id : newFiles[0]?.id : null;
						setActiveFileId(newActiveId ?? null);
					}
					return newFiles;
				});
			}, [activeFileId]);
			/**
			* 更新文件内容
			*/
			const updateFileContent = (0, react.useCallback)((fileId, content) => {
				setOpenFiles((prev) => prev.map((f) => f.id === fileId ? {
					...f,
					content,
					isDirty: true
				} : f));
				setSaveState("unsaved");
				if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
				autoSaveTimerRef.current = setTimeout(() => {
					saveFile(fileId);
				}, 1e3);
			}, []);
			/**
			* 保存文件
			*/
			const saveFile = (0, react.useCallback)(async (fileId) => {
				if (!fileServiceRef.current) return;
				const file = openFiles.find((f) => f.id === fileId);
				if (!file) return;
				try {
					setSaveState("saving");
					await fileServiceRef.current.writeFile(file.path, file.content);
					setOpenFiles((prev) => prev.map((f) => f.id === fileId ? {
						...f,
						isDirty: false
					} : f));
					setSaveState("saved");
				} catch (error) {
					console.error("[Story Studio] Failed to save file:", error);
					setSaveState("unsaved");
				}
			}, [openFiles]);
			/**
			* 保存所有文件
			*/
			const saveAllFiles = (0, react.useCallback)(async () => {
				const dirtyFiles = openFiles.filter((f) => f.isDirty);
				await Promise.all(dirtyFiles.map((file) => saveFile(file.id)));
			}, [openFiles, saveFile]);
			/**
			* 刷新文件树
			*/
			const refreshFileTree = (0, react.useCallback)(async () => {
				if (!fileServiceRef.current) return;
				try {
					const tree = await fileServiceRef.current.getFileTree();
					setFileTree(tree);
				} catch (error) {
					console.error("[Story Studio] Failed to refresh file tree:", error);
				}
			}, []);
			/**
			* 创建新文件
			*/
			const createNewFile = (0, react.useCallback)(async (fileName, parentPath) => {
				if (!fileServiceRef.current) {
					console.error("[Story Studio] File service not initialized");
					return false;
				}
				try {
					const filePath = parentPath ? `${parentPath}/${fileName}` : `${projectRoot}/${fileName}`;
					console.log("[Story Studio] Creating file:", filePath);
					const success = await fileServiceRef.current.createFile(filePath, "");
					console.log("[Story Studio] Create file result:", success);
					if (success) {
						await refreshFileTree();
						await openFile(filePath);
					}
					return success;
				} catch (error) {
					console.error("[Story Studio] Failed to create file:", error);
					return false;
				}
			}, [
				projectRoot,
				refreshFileTree,
				openFile
			]);
			/**
			* 创建新文件夹
			*/
			const createNewFolder = (0, react.useCallback)(async (folderName, parentPath) => {
				if (!fileServiceRef.current) return false;
				try {
					const folderPath = parentPath ? `${parentPath}/${folderName}` : `${projectRoot}/${folderName}`;
					const success = await fileServiceRef.current.createFolder(folderPath);
					if (success) await refreshFileTree();
					return success;
				} catch (error) {
					console.error("[Story Studio] Failed to create folder:", error);
					return false;
				}
			}, [projectRoot, refreshFileTree]);
			/**
			* 删除文件
			*/
			const deleteFile = (0, react.useCallback)(async (filePath) => {
				if (!fileServiceRef.current) return false;
				try {
					const success = await fileServiceRef.current.deleteFile(filePath);
					if (success) {
						const openFile = openFiles.find((f) => f.path === filePath);
						if (openFile) closeFile(openFile.id);
						await refreshFileTree();
					}
					return success;
				} catch (error) {
					console.error("[Story Studio] Failed to delete file:", error);
					return false;
				}
			}, [
				openFiles,
				closeFile,
				refreshFileTree
			]);
			/**
			* 删除文件夹
			*/
			const deleteFolder = (0, react.useCallback)(async (folderPath) => {
				if (!fileServiceRef.current) return false;
				try {
					const success = await fileServiceRef.current.deleteFolder(folderPath);
					if (success) {
						openFiles.filter((f) => f.path.startsWith(folderPath)).forEach((f) => closeFile(f.id));
						await refreshFileTree();
					}
					return success;
				} catch (error) {
					console.error("[Story Studio] Failed to delete folder:", error);
					return false;
				}
			}, [
				openFiles,
				closeFile,
				refreshFileTree
			]);
			/**
			* 重命名文件或文件夹
			*/
			const renameItem = (0, react.useCallback)(async (oldPath, newName) => {
				if (!fileServiceRef.current) return false;
				try {
					const pathParts = oldPath.split("/");
					pathParts[pathParts.length - 1] = newName;
					const newPath = pathParts.join("/");
					const success = await fileServiceRef.current.renameFile(oldPath, newPath);
					if (success) {
						setOpenFiles((prev) => prev.map((f) => {
							if (f.path === oldPath) return {
								...f,
								path: newPath,
								name: newName
							};
							if (f.path.startsWith(oldPath + "/")) {
								const updatedPath = f.path.replace(oldPath, newPath);
								return {
									...f,
									path: updatedPath
								};
							}
							return f;
						}));
						await refreshFileTree();
					}
					return success;
				} catch (error) {
					console.error("[Story Studio] Failed to rename item:", error);
					return false;
				}
			}, [refreshFileTree]);
			return {
				fileTree,
				openFiles,
				activeFile: openFiles.find((f) => f.id === activeFileId) ?? null,
				activeFileId,
				saveState,
				openFile,
				closeFile,
				updateFileContent,
				saveFile,
				saveAllFiles,
				setActiveFileId,
				refreshFileTree,
				createNewFile,
				createNewFolder,
				deleteFile,
				deleteFolder,
				renameItem
			};
		}
		//#endregion
		//#region src/client/StoryStudioApp.tsx
		/**
		* 获取 DSH Client Context
		*/
		function useClientContext() {
			const [ctx, setCtx] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const clientCtx = window.__dshClientContext;
				if (clientCtx) setCtx(clientCtx);
			}, []);
			return ctx;
		}
		/**
		* 文件树节点组件
		*/
		function FileTreeNodeComponent({ node, level, onFileClick, activeFilePath }) {
			const [isExpanded, setIsExpanded] = (0, react.useState)(level === 0);
			const handleClick = () => {
				if (node.type === "folder") setIsExpanded(!isExpanded);
				else onFileClick(node.path);
			};
			const isActive = node.type === "file" && node.path === activeFilePath;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				className: `ss-tree-row ${isActive ? "active" : ""} ${level > 0 ? "ss-tree-indent" : ""}`,
				onClick: handleClick,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: node.type === "folder" ? isExpanded ? "▼" : "▶" : "▧" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "ss-label",
						children: node.name
					}),
					node.type === "folder" && node.children && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "ss-meta",
						children: node.children.length
					})
				]
			}), node.type === "folder" && isExpanded && node.children && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: node.children.map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTreeNodeComponent, {
				node: child,
				level: level + 1,
				onFileClick,
				activeFilePath
			}, child.id)) })] });
		}
		function StoryStudioApp({ projectPath, onBackToProjects }) {
			const [activeSection, setActiveSection] = (0, react.useState)("works");
			const [rightPanelOpen, setRightPanelOpen] = (0, react.useState)(true);
			const [activeRightTab, setActiveRightTab] = (0, react.useState)("assistant");
			const [promptInput, setPromptInput] = (0, react.useState)("");
			const [showNewFileDialog, setShowNewFileDialog] = (0, react.useState)(false);
			const [newFileName, setNewFileName] = (0, react.useState)("");
			const [newFileType, setNewFileType] = (0, react.useState)("file");
			const ctx = useClientContext();
			console.log("[Story Studio] Context in StoryStudioApp:", ctx);
			console.log("[Story Studio] Project root:", projectPath);
			const fileManager = useFileManager(ctx, projectPath);
			const sessionHook = ctx && fileManager.activeFile ? useStorySession(ctx, {
				projectId: "fuzitongxin-001",
				projectName: "父子同心",
				currentFile: fileManager.activeFile.name,
				scriptContent: fileManager.activeFile.content
			}) : null;
			const handleSendMessage = () => {
				if (!promptInput.trim() || !sessionHook) return;
				sessionHook.sendMessage(promptInput);
				setPromptInput("");
			};
			const handleKeyDown = (e) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					handleSendMessage();
				}
			};
			const handleCreateNew = async () => {
				if (!newFileName.trim()) return;
				if (newFileType === "file" ? await fileManager.createNewFile(newFileName) : await fileManager.createNewFolder(newFileName)) {
					setShowNewFileDialog(false);
					setNewFileName("");
				}
			};
			const showCreateDialog = (type) => {
				setNewFileType(type);
				setNewFileName("");
				setShowNewFileDialog(true);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "story-studio-app",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						position: "fixed",
						top: 0,
						left: 80,
						right: 0,
						height: "40px",
						WebkitAppRegion: "drag",
						zIndex: 9999,
						pointerEvents: "none"
					} }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						"aria-hidden": "true",
						style: {
							position: "absolute",
							width: 0,
							height: 0,
							overflow: "hidden"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("symbol", {
								id: "icon-search",
								viewBox: "0 0 24 24",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
									cx: "11",
									cy: "11",
									r: "7"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m20 20-4-4" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("symbol", {
								id: "icon-wand",
								viewBox: "0 0 24 24",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m15 4 5 5L7 22H2v-5Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m14 5 5 5M6 7V3M4 5h4M19 18v4M17 20h4" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("symbol", {
								id: "icon-plus",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 12h14M12 5v14" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("symbol", {
								id: "icon-book",
								viewBox: "0 0 24 24",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("symbol", {
								id: "icon-list",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("symbol", {
								id: "icon-users",
								viewBox: "0 0 24 24",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
										cx: "9",
										cy: "7",
										r: "4"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("symbol", {
								id: "icon-globe",
								viewBox: "0 0 24 24",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
									cx: "12",
									cy: "12",
									r: "9"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("symbol", {
								id: "icon-paperclip",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m20.5 11.5-8.6 8.6a5 5 0 0 1-7.1-7.1l9-9a3.5 3.5 0 0 1 5 5l-8.7 8.7a2 2 0 0 1-2.8-2.8l8-8" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("symbol", {
								id: "icon-check",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5 12 4 4L19 6" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("symbol", {
								id: "icon-settings",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("symbol", {
								id: "icon-panel",
								viewBox: "0 0 24 24",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: "3",
									y: "3",
									width: "18",
									height: "18",
									rx: "2"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 3v18" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("symbol", {
								id: "icon-x",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 6 12 12M18 6 6 18" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("symbol", {
								id: "icon-arrow-up",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 19V5M5 12l7-7 7 7" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("symbol", {
								id: "icon-chevron-down",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 9 6 6 6-6" })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "ss-topbar",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "ss-brand-mark",
								children: "S"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ss-brand-name",
								children: ["Story Studio ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "beta" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ss-project-heading",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "父子同心" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "ss-divider" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "ss-save-state",
										children: [
											fileManager.saveState === "saving" && "保存中...",
											fileManager.saveState === "saved" && "已保存",
											fileManager.saveState === "unsaved" && "未保存"
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ss-top-actions",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "ss-icon-button",
										title: "搜索",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-ui-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-search" })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										className: "ss-compact-button",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-ui-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-wand" })
										}), "AI 助手"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										className: "ss-primary-button",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-ui-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-plus" })
										}), "新建作品"]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `ss-workspace ${!rightPanelOpen ? "right-closed" : ""}`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
								className: "ss-rail",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: `ss-rail-button ${activeSection === "works" ? "active" : ""}`,
										onClick: () => setActiveSection("works"),
										title: "作品",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-nav-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-book" })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: `ss-rail-button ${activeSection === "outline" ? "active" : ""}`,
										onClick: () => setActiveSection("outline"),
										title: "大纲",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-nav-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-list" })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: `ss-rail-button ${activeSection === "characters" ? "active" : ""}`,
										onClick: () => setActiveSection("characters"),
										title: "人物",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-nav-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-users" })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: `ss-rail-button ${activeSection === "world" ? "active" : ""}`,
										onClick: () => setActiveSection("world"),
										title: "世界",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-nav-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-globe" })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: `ss-rail-button ${activeSection === "references" ? "active" : ""}`,
										onClick: () => setActiveSection("references"),
										title: "资料",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-nav-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-paperclip" })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: `ss-rail-button ${activeSection === "review" ? "active" : ""}`,
										onClick: () => setActiveSection("review"),
										title: "审稿",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-nav-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-check" })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "ss-rail-spacer" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "ss-rail-button",
										title: "设置",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-nav-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-settings" })
										})
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
								className: "ss-library",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-panel-heading",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "作品" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											className: "ss-icon-button",
											title: "更多",
											children: "⋯"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-project-switcher",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "ss-project-switcher-top",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: "ss-project-cover",
													children: "父子"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "ss-project-meta",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "父子同心" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "男频短剧 · 第一季 · 50 集" })]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													className: "ss-icon-button",
													title: "切换作品",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
														className: "ss-ui-icon",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-chevron-down" })
													})
												})
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "ss-progress-line",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { width: "34%" } })
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-library-content",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "ss-section-label",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "项目结构" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													className: "ss-section-action",
													onClick: () => showCreateDialog("file"),
													title: "新建文件",
													children: "＋"
												})]
											}),
											fileManager.fileTree.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTreeNodeComponent, {
												node,
												level: 0,
												onFileClick: fileManager.openFile,
												activeFilePath: fileManager.activeFile?.path
											}, node.id)),
											fileManager.openFiles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "ss-section-label",
												style: { marginTop: "16px" },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "最近编辑" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})]
											}), fileManager.openFiles.slice(0, 5).map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												className: `ss-library-row ${file.id === fileManager.activeFileId ? "active" : ""}`,
												onClick: () => fileManager.setActiveFileId(file.id),
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "◎" }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "ss-label",
														children: file.name
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "ss-meta",
														children: file.isDirty ? "未保存" : "已保存"
													})
												]
											}, file.id))] })
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-library-footer",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "ss-status-dot" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "项目目录已同步" })]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
								className: "ss-stage",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-editor-toolbar",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "ss-breadcrumb",
											children: fileManager.activeFile ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: fileManager.activeFile.name }) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "未选择文件" })
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											className: "ss-icon-button",
											onClick: () => setRightPanelOpen(!rightPanelOpen),
											title: "切换右侧面板",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												className: "ss-ui-icon",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-panel" })
											})
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "ss-editor-scroll",
										children: fileManager.activeFile ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
											className: "ss-writing-sheet",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "ss-document-kicker" }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
													className: "ss-document-title",
													children: fileManager.activeFile.name
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "ss-document-meta",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fileManager.activeFile.isDirty ? "未保存" : "已保存" }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [fileManager.activeFile.content.length, " 字"] }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
													className: "ss-editor-body",
													value: fileManager.activeFile.content,
													onChange: (e) => fileManager.updateFileContent(fileManager.activeFile.id, e.target.value),
													placeholder: "开始编写剧本...",
													style: {
														width: "100%",
														minHeight: "600px",
														border: "none",
														outline: "none",
														resize: "vertical",
														fontFamily: "inherit",
														fontSize: "inherit",
														lineHeight: "inherit",
														padding: 0,
														background: "transparent"
													}
												})
											]
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "ss-writing-sheet",
											style: {
												textAlign: "center",
												paddingTop: "100px",
												color: "#999"
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "请从左侧选择一个文件开始编辑" })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-stage-footer",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Markdown" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "UTF-8" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [fileManager.activeFile?.content.length || 0, " 字"] })
										]
									})
								]
							}),
							rightPanelOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
								className: "ss-right-panel",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-right-tabs",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: `ss-right-tab ${activeRightTab === "assistant" ? "active" : ""}`,
												onClick: () => setActiveRightTab("assistant"),
												children: "协作台"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: `ss-right-tab ${activeRightTab === "context" ? "active" : ""}`,
												onClick: () => setActiveRightTab("context"),
												children: "本集资料"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: `ss-right-tab ${activeRightTab === "files" ? "active" : ""}`,
												onClick: () => setActiveRightTab("files"),
												children: "文件"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: "ss-right-close",
												onClick: () => setRightPanelOpen(false),
												title: "关闭",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
													className: "ss-ui-icon",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-x" })
												})
											})
										]
									}),
									activeRightTab === "assistant" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-right-view ss-assistant-view",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "ss-operation-header",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "第 17 集 · 创作任务" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "父亲先赢一次，保留集尾大回报" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "ss-operation-status",
													children: sessionHook?.isThinking ? "进行中" : "就绪"
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "ss-assistant-scroll",
												children: [sessionHook?.isThinking && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: "ss-thinking-surface",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: "ss-thinking-steps",
														children: sessionHook.thinkingSteps.map((step) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: `ss-plan-step ${step.status}`,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: "ss-plan-marker",
																	children: step.status === "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
																		className: "ss-ui-icon",
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-check" })
																	})
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: step.description }),
																step.status === "active" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", { children: "进行中" })
															]
														}, step.id))
													})
												}), sessionHook?.lastResponse && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "ss-generation-result",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: "ss-result-heading",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "建议场次" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "可插入正文" })]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: "ss-result-content",
															children: sessionHook.lastResponse
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: "ss-result-actions",
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																	className: "ss-accept",
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
																		className: "ss-ui-icon",
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-plus" })
																	}), "插入正文"]
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																	onClick: () => sessionHook.sendMessage("继续写下一场"),
																	children: "继续写"
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																	onClick: () => sessionHook.sendMessage("优化对白，让它更生动"),
																	children: "改对白"
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { children: "收起" })
															]
														})
													]
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "ss-prompt-composer",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "ss-prompt-context",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "当前文稿" }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "S01-E017" }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "赵大河" })
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "ss-prompt-box",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
														placeholder: "继续创作，或修改当前内容",
														value: promptInput,
														onChange: (e) => setPromptInput(e.target.value),
														onKeyDown: handleKeyDown,
														disabled: !sessionHook || sessionHook.isThinking
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: "ss-prompt-footer",
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																className: "ss-prompt-tool",
																title: "添加资料",
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
																	className: "ss-ui-icon",
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-paperclip" })
																})
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																className: "ss-prompt-model",
																children: ["创作模式", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
																	className: "ss-ui-icon",
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-chevron-down" })
																})]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																className: "ss-send-button",
																title: "发送",
																onClick: handleSendMessage,
																disabled: !sessionHook || sessionHook.isThinking || !promptInput.trim(),
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
																	className: "ss-ui-icon",
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-arrow-up" })
																})
															})
														]
													})]
												})]
											})
										]
									}),
									activeRightTab === "context" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "ss-right-view ss-context-view",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "ss-context-section",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "ss-context-title",
													children: ["出场人物 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "3 人" })]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "ss-character-row",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: "ss-avatar",
														children: "赵"
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "赵大河" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "38 岁 · 失业工人 · 可听见儿子心声" })] })]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "ss-character-row",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: "ss-avatar",
														children: "川"
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "赵小川" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "17 岁 · 重生者 · 自信但仍稚嫩" })] })]
												})
											]
										})
									}),
									activeRightTab === "files" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ss-right-view ss-files-view",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "ss-files-root",
												children: "/Users/qiuzixiao/Documents/Story Studio/父子同心"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "ss-file-row",
												children: "⌄　▰　scripts"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "ss-file-row ss-file-indent-1",
												children: "▧　S01-E017.md"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "ss-file-row ss-file-indent-1",
												children: "▧　S01-E018.md"
											})
										]
									})
								]
							})
						]
					}),
					showNewFileDialog && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ss-dialog-overlay",
						onClick: () => setShowNewFileDialog(false),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ss-dialog",
							onClick: (e) => e.stopPropagation(),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ss-dialog-header",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: newFileType === "file" ? "新建文件" : "新建文件夹" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "ss-icon-button",
										onClick: () => setShowNewFileDialog(false),
										title: "关闭",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											className: "ss-ui-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: "#icon-x" })
										})
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "ss-dialog-body",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										className: "ss-dialog-input",
										placeholder: newFileType === "file" ? "文件名（如：第01集.md）" : "文件夹名",
										value: newFileName,
										onChange: (e) => setNewFileName(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") handleCreateNew();
											else if (e.key === "Escape") setShowNewFileDialog(false);
										},
										autoFocus: true
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ss-dialog-footer",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "ss-compact-button",
										onClick: () => setShowNewFileDialog(false),
										children: "取消"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "ss-primary-button",
										onClick: handleCreateNew,
										disabled: !newFileName.trim(),
										children: "创建"
									})]
								})
							]
						})
					})
				]
			});
		}
		const storyStudioAppStyles = `
/* 隐藏 AdvancedFrame 的默认组件 */
.dshDesktopSidebarSurface {
  display: none !important;
}

.dshDesktopFrame > aside {
  display: none !important;
}

/* ============================================================
   Story Studio · Bento 卡片式工作台
   ============================================================ */
:root {
  --ss-bg: #EEEEF0;
  --ss-bg-2: #F5F5F7;
  --ss-surface: #FFFFFF;
  --ss-surface-2: #FAFAFC;
  --ss-dark: #1D1D1F;
  --ss-dark-2: #2C2C2E;
  --ss-ink: #1D1D1F;
  --ss-text: #424245;
  --ss-muted: #6E6E73;
  --ss-faint: #AEAEB2;
  --ss-hairline: #E8E8ED;
  --ss-hairline-strong: #D8D8E0;
  --ss-brand: #0071E3;
  --ss-brand-hover: #0077ED;
  --ss-brand-deep: #0062C4;
  --ss-brand-soft: #EAF2FE;
  --ss-green: #1FA958;
  --ss-green-soft: #EAF8F0;
  --ss-orange: #F08A24;
  --ss-orange-soft: #FDF3E7;
  --ss-shadow-sm: 0 1px 2px rgba(0, 0, 0, .05);
  --ss-shadow: 0 2px 8px rgba(0, 0, 0, .05), 0 12px 32px rgba(0, 0, 0, .06);
  --ss-shadow-float: 0 8px 24px rgba(0, 0, 0, .10), 0 2px 8px rgba(0, 0, 0, .07);
  --ss-shadow-paper: 0 2px 8px rgba(0, 0, 0, .06), 0 24px 48px rgba(0, 0, 0, .10);
  --ss-r-card: 22px;
  --ss-r-lg: 28px;
  --ss-r-md: 16px;
  --ss-r-sm: 12px;
  --ss-r-pill: 100px;
  --ss-sans: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --ss-mono: 'Geist Mono', 'SF Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
  --ss-writing: 'Songti SC', 'STSong', 'Noto Serif CJK SC', 'Source Han Serif SC', serif;
  --ss-ease: cubic-bezier(.22, 1, .36, 1);
}

.story-studio-app {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  padding: 40px 14px 14px 14px;
  background: var(--ss-bg);
  color: var(--ss-text);
  font: 14px/1.45 var(--ss-sans);
  -webkit-font-smoothing: antialiased;
  z-index: 100;
  box-sizing: border-box;
}

.story-studio-app *,
.story-studio-app *::before,
.story-studio-app *::after {
  box-sizing: border-box;
}

/* ============ 顶栏 ============ */
.ss-topbar {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 7px 8px 7px 80px;
  background: var(--ss-surface);
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-lg);
  box-shadow: var(--ss-shadow);
  z-index: 4;
}

.ss-brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(180deg, #0A84FF, #0062C4);
  color: #fff;
  font: 800 19px/1 var(--ss-sans);
  letter-spacing: -.02em;
  box-shadow: 0 4px 12px rgba(0, 113, 227, .3);
}

.ss-brand-name {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding: 0 4px 0 2px;
  color: var(--ss-ink);
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -.01em;
}

.ss-brand-name span {
  color: var(--ss-brand);
  font: 600 9px/1 var(--ss-mono);
  letter-spacing: .14em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 99px;
  background: var(--ss-brand-soft);
}

.ss-project-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0 6px;
}

.ss-project-heading strong {
  overflow: hidden;
  color: var(--ss-ink);
  font-size: 13.5px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-divider {
  width: 1px;
  height: 16px;
  border-radius: 99px;
  background: var(--ss-hairline-strong);
}

.ss-save-state {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  border-radius: 99px;
  background: var(--ss-surface-2);
  color: var(--ss-muted);
  font-size: 11px;
  white-space: nowrap;
}

.ss-save-state::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ss-green);
  box-shadow: 0 0 0 3px var(--ss-green-soft);
}

.ss-top-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

/* ============ 按钮 ============ */
.ss-icon-button,
.ss-compact-button,
.ss-primary-button,
.ss-rail-button,
.ss-right-tab,
.ss-right-close,
.ss-prompt-tool,
.ss-prompt-model,
.ss-send-button {
  border: 0;
  cursor: pointer;
  transition: transform 170ms var(--ss-ease), background-color 170ms var(--ss-ease), color 170ms var(--ss-ease), box-shadow 170ms var(--ss-ease);
}

.ss-icon-button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 12px;
  background: transparent;
  color: var(--ss-muted);
}

.ss-icon-button:hover {
  background: var(--ss-bg-2);
  color: var(--ss-ink);
}

.ss-icon-button:active {
  transform: scale(.92);
}

.ss-compact-button,
.ss-primary-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 15px;
  border-radius: 99px;
  font-size: 12.5px;
  font-weight: 600;
}

.ss-compact-button {
  border: 1px solid var(--ss-hairline);
  background: var(--ss-surface);
  color: var(--ss-text);
}

.ss-compact-button:hover {
  border-color: var(--ss-hairline-strong);
  background: var(--ss-surface-2);
  transform: translateY(-1px);
}

.ss-primary-button {
  background: var(--ss-brand);
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 113, 227, .28);
}

.ss-primary-button:hover {
  background: var(--ss-brand-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 113, 227, .34);
}

.ss-ui-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.ss-nav-icon {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

/* ============ 工作区 ============ */
.ss-workspace {
  --lib-w: 264px;
  --right-w: 348px;
  display: flex;
  align-items: stretch;
  min-height: 0;
  min-width: 0;
}

/* ============ 导航栏 ============ */
.ss-rail {
  display: flex;
  min-height: 0;
  flex: 0 0 66px;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  margin-right: 14px;
  padding: 14px 9px;
  border-radius: var(--ss-r-card);
  background: var(--ss-dark);
  color: #98989D;
  box-shadow: var(--ss-shadow);
}

.ss-rail-button {
  position: relative;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 15px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: color 170ms var(--ss-ease), background-color 170ms var(--ss-ease), transform 170ms var(--ss-ease), box-shadow 170ms var(--ss-ease);
}

.ss-rail-button:hover {
  background: rgba(255, 255, 255, .09);
  color: #F5F5F7;
  transform: translateY(-1px);
}

.ss-rail-button.active {
  background: var(--ss-brand);
  color: #fff;
  box-shadow: 0 5px 14px rgba(0, 113, 227, .4);
}

.ss-rail-spacer {
  flex: 1;
}

/* ============ 项目库 ============ */
.ss-library {
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 0 0 var(--lib-w);
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  overflow: hidden;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-card);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow);
}

.ss-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 0 10px 0 18px;
}

.ss-panel-heading h2 {
  margin: 0;
  color: var(--ss-ink);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -.02em;
}

.ss-project-switcher {
  margin: 0 12px 14px;
  padding: 14px;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-md);
  background: var(--ss-surface-2);
}

.ss-project-switcher-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ss-project-cover {
  display: grid;
  width: 38px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px 12px 12px 5px;
  background: var(--ss-dark);
  color: #fff;
  font: 700 13px var(--ss-writing);
  box-shadow: 0 4px 10px rgba(29, 29, 31, .2);
}

.ss-project-meta {
  min-width: 0;
  flex: 1;
}

.ss-project-meta strong,
.ss-project-meta span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-project-meta strong {
  color: var(--ss-ink);
  font-size: 13px;
  font-weight: 700;
}

.ss-project-meta span {
  margin-top: 3px;
  color: var(--ss-muted);
  font-size: 11px;
}

.ss-progress-line {
  height: 6px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--ss-hairline);
}

.ss-progress-line span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ss-brand), #0A84FF);
  transition: width 500ms var(--ss-ease);
}

.ss-library-content {
  min-height: 0;
  overflow: auto;
  padding: 0 10px 14px;
  scrollbar-width: thin;
  scrollbar-color: var(--ss-hairline-strong) transparent;
}

.ss-section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 10px;
  color: var(--ss-muted);
  font: 600 10px/1 var(--ss-sans);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.ss-tree-row,
.ss-library-row {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--ss-text);
  cursor: pointer;
  text-align: left;
  transition: background-color 150ms var(--ss-ease), color 150ms var(--ss-ease), transform 150ms var(--ss-ease);
}

.ss-tree-row:hover,
.ss-library-row:hover {
  background: var(--ss-bg-2);
  color: var(--ss-ink);
  transform: translateX(2px);
}

.ss-tree-row.active,
.ss-library-row.active {
  background: var(--ss-brand-soft);
  color: var(--ss-brand-deep);
  font-weight: 600;
}

.ss-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-meta {
  color: var(--ss-faint);
  font: 500 10.5px/1 var(--ss-mono);
  white-space: nowrap;
}

.ss-tree-indent {
  padding-left: 28px;
}

.ss-library-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-top: 1px solid var(--ss-hairline);
  background: var(--ss-surface-2);
  color: var(--ss-muted);
  font-size: 11px;
}

.ss-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ss-green);
  box-shadow: 0 0 0 3px var(--ss-green-soft);
}

/* ============ 编辑器 ============ */
.ss-stage {
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-card);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow);
}

.ss-editor-toolbar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ss-hairline);
  background: var(--ss-surface);
}

.ss-breadcrumb {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--ss-muted);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-breadcrumb strong {
  color: var(--ss-text);
  font-weight: 600;
}

.ss-editor-scroll {
  min-height: 0;
  overflow: auto;
  padding: 24px 18px 40px;
  background: var(--ss-bg-2);
  scrollbar-width: thin;
  scrollbar-color: var(--ss-hairline-strong) transparent;
}

.ss-writing-sheet {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 280px);
  margin: 0 auto;
  padding: 54px clamp(32px, 5vw, 68px) 84px;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-lg);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow-paper);
}

.ss-writing-sheet::before {
  content: "";
  position: absolute;
  top: 0;
  right: 18%;
  left: 18%;
  height: 3px;
  border-radius: 0 0 6px 6px;
  background: linear-gradient(90deg, var(--ss-brand), #0A84FF);
}

.ss-document-kicker {
  color: var(--ss-brand);
  font: 600 10.5px/1 var(--ss-mono);
  letter-spacing: .14em;
  text-transform: uppercase;
}

.ss-document-title {
  margin: 14px 0 8px;
  color: var(--ss-ink);
  font: 800 30px/1.22 var(--ss-sans);
  letter-spacing: -.03em;
}

.ss-document-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--ss-hairline);
  color: var(--ss-muted);
  font-size: 11px;
}

.ss-document-meta span:first-child {
  color: var(--ss-brand-deep);
  font-weight: 700;
  padding: 4px 11px;
  border-radius: 99px;
  background: var(--ss-brand-soft);
}

.ss-editor-body {
  margin-top: 30px;
  color: #2B2B2E;
  font: 17px/2.1 var(--ss-writing);
  min-height: 500px;
}

.ss-stage-footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  min-height: 42px;
  border-top: 1px solid var(--ss-hairline);
  background: var(--ss-surface-2);
  color: var(--ss-muted);
  font: 500 10.5px/1 var(--ss-mono);
}

.ss-stage-footer span:last-child {
  margin-left: auto;
}

/* ============ 右侧面板 ============ */
.ss-right-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 0 0 var(--right-w);
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-card);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow);
  transition: flex-basis 260ms var(--ss-ease), width 260ms var(--ss-ease), opacity 200ms var(--ss-ease);
}

.ss-workspace.right-closed .ss-right-panel {
  display: none;
}

.ss-right-tabs {
  display: flex;
  align-items: stretch;
  gap: 4px;
  padding: 8px 10px 0;
  background: var(--ss-surface-2);
}

.ss-right-tab {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 36px;
  border-radius: 11px;
  background: transparent;
  color: var(--ss-muted);
  font-size: 12px;
  font-weight: 500;
}

.ss-right-tab:hover {
  color: var(--ss-ink);
  background: rgba(255, 255, 255, .7);
}

.ss-right-tab.active {
  background: var(--ss-surface);
  color: var(--ss-ink);
  font-weight: 700;
  box-shadow: var(--ss-shadow-sm);
}

.ss-right-close {
  width: 34px;
  height: 34px;
  margin-left: 3px;
  border-radius: 11px;
  background: transparent;
  color: var(--ss-muted);
}

.ss-right-close:hover {
  background: var(--ss-bg-2);
  color: var(--ss-ink);
}

.ss-right-view {
  display: grid;
  min-height: 0;
}

.ss-assistant-view {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.ss-operation-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--ss-hairline);
}

.ss-operation-header strong {
  display: block;
  color: var(--ss-ink);
  font-size: 13.5px;
  font-weight: 700;
}

.ss-operation-header div > span {
  display: block;
  margin-top: 5px;
  color: var(--ss-muted);
  font-size: 11px;
  line-height: 1.5;
}

.ss-operation-status {
  color: var(--ss-green) !important;
  font-size: 10.5px !important;
  font-weight: 700;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 99px;
  background: var(--ss-green-soft);
}

.ss-assistant-scroll {
  min-height: 0;
  overflow: auto;
  padding: 18px 16px 22px;
  scrollbar-width: thin;
  scrollbar-color: var(--ss-hairline-strong) transparent;
}

.ss-thinking-surface {
  overflow: hidden;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-md);
  background: var(--ss-surface-2);
}

.ss-thinking-steps {
  position: relative;
  display: grid;
  gap: 0;
  padding: 6px 14px 12px;
}

.ss-thinking-steps::before {
  content: "";
  position: absolute;
  top: 12px;
  bottom: 22px;
  left: 25px;
  width: 1px;
  background: var(--ss-hairline);
}

.ss-plan-step {
  position: relative;
  display: grid;
  min-height: 36px;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: var(--ss-faint);
  font-size: 11px;
  line-height: 1.45;
}

.ss-plan-step.complete {
  color: var(--ss-muted);
}

.ss-plan-step.active {
  color: var(--ss-ink);
  font-weight: 600;
}

.ss-plan-marker {
  position: relative;
  display: grid;
  width: 14px;
  height: 14px;
  margin: 0 auto;
  place-items: center;
  border: 1px solid var(--ss-hairline-strong);
  border-radius: 50%;
  background: var(--ss-surface);
  color: #fff;
  z-index: 1;
}

.ss-plan-marker .ss-ui-icon {
  width: 9px;
  height: 9px;
  stroke-width: 2.6;
}

.ss-plan-step.complete .ss-plan-marker {
  border-color: var(--ss-green);
  background: var(--ss-green);
}

.ss-plan-step.active .ss-plan-marker {
  border-color: var(--ss-brand);
  background: var(--ss-brand);
  box-shadow: 0 0 0 4px var(--ss-brand-soft);
}

.ss-plan-step em {
  color: var(--ss-brand);
  font-size: 9.5px;
  font-style: normal;
  font-weight: 700;
}

.ss-generation-result {
  margin-top: 16px;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-md);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow-sm);
}

.ss-result-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  color: var(--ss-brand-deep);
  font-size: 11.5px;
  font-weight: 700;
}

.ss-result-heading span:last-child {
  color: var(--ss-green);
  font-size: 10px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 99px;
  background: var(--ss-green-soft);
}

.ss-result-content {
  position: relative;
  margin: 0 14px;
  padding: 12px 14px 12px 21px;
  border-radius: 12px;
  background: var(--ss-brand-soft);
  color: var(--ss-text);
  font: 13px/1.85 var(--ss-writing);
}

.ss-result-content::before {
  content: "";
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 12px;
  width: 3px;
  border-radius: 99px;
  background: var(--ss-brand);
}

.ss-result-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 12px 14px 14px;
}

.ss-result-actions button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid var(--ss-hairline);
  border-radius: 99px;
  background: var(--ss-surface);
  color: var(--ss-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 170ms var(--ss-ease);
}

.ss-result-actions button:hover {
  border-color: var(--ss-hairline-strong);
  background: var(--ss-bg-2);
  color: var(--ss-ink);
}

.ss-result-actions .ss-accept {
  grid-column: 1 / -1;
  min-height: 34px;
  border-color: transparent;
  background: var(--ss-brand);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 113, 227, .26);
  font-weight: 600;
}

.ss-result-actions .ss-accept:hover {
  background: var(--ss-brand-hover);
}

.ss-prompt-composer {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--ss-hairline);
  background: var(--ss-surface-2);
}

.ss-prompt-context {
  display: flex;
  gap: 9px;
  margin: 0 3px 8px;
  color: var(--ss-muted);
  font-size: 10px;
}

.ss-prompt-context span {
  padding: 3px 9px;
  border-radius: 99px;
  background: var(--ss-surface);
}

.ss-prompt-box {
  padding: 10px 10px 8px 14px;
  border: 1px solid var(--ss-hairline-strong);
  border-radius: var(--ss-r-md);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow-sm);
}

.ss-prompt-box textarea {
  display: block;
  width: 100%;
  height: 40px;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ss-text);
  font-size: 12px;
  line-height: 1.55;
  font-family: inherit;
}

.ss-prompt-box textarea::placeholder {
  color: var(--ss-faint);
}

.ss-prompt-footer {
  display: flex;
  align-items: center;
  gap: 3px;
}

.ss-prompt-tool,
.ss-prompt-model {
  height: 28px;
  border-radius: 9px;
  background: transparent;
  color: var(--ss-muted);
  font-size: 11px;
}

.ss-prompt-tool {
  width: 28px;
}

.ss-prompt-model {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 9px;
}

.ss-prompt-tool:hover,
.ss-prompt-model:hover {
  background: var(--ss-bg-2);
  color: var(--ss-ink);
}

.ss-send-button {
  display: grid;
  width: 32px;
  height: 32px;
  margin-left: auto;
  place-items: center;
  border-radius: 12px;
  background: var(--ss-brand);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 113, 227, .28);
}

.ss-send-button:hover {
  background: var(--ss-brand-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 113, 227, .34);
}

/* 本集资料视图 */
.ss-context-view,
.ss-files-view {
  overflow: auto;
  padding: 8px 16px 26px;
  scrollbar-width: thin;
  scrollbar-color: var(--ss-hairline-strong) transparent;
}

.ss-context-section {
  padding: 16px 0 18px;
  border-bottom: 1px solid var(--ss-hairline);
}

.ss-context-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
  color: var(--ss-ink);
  font-size: 12px;
  font-weight: 700;
}

.ss-context-title span {
  color: var(--ss-muted);
  font: 500 10px/1 var(--ss-mono);
}

.ss-character-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
}

.ss-avatar {
  display: inline-grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
  background: var(--ss-brand-soft);
  color: var(--ss-brand-deep);
  font: 700 11px var(--ss-writing);
}

.ss-character-row strong,
.ss-character-row span {
  display: block;
}

.ss-character-row strong {
  color: var(--ss-text);
  font-size: 11.5px;
}

.ss-character-row span {
  margin-top: 3px;
  color: var(--ss-muted);
  font-size: 10px;
}

/* 文件视图 */
.ss-files-root {
  margin: 10px 0 14px;
  padding: 10px 12px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--ss-bg-2);
  color: var(--ss-muted);
  font: 400 10px/1.5 var(--ss-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-file-row {
  min-height: 32px;
  padding: 8px 11px;
  border-radius: 11px;
  color: var(--ss-text);
  font-size: 11px;
  cursor: pointer;
}

.ss-file-row:hover {
  background: var(--ss-brand-soft);
  color: var(--ss-brand-deep);
}

.ss-file-indent-1 {
  padding-left: 27px;
}

/* ============ 对话框 ============ */
.ss-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.ss-dialog {
  width: 90%;
  max-width: 440px;
  background: var(--ss-surface);
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-card);
  box-shadow: var(--ss-shadow-float);
  animation: ss-dialog-in 200ms var(--ss-ease);
}

@keyframes ss-dialog-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.ss-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--ss-hairline);
}

.ss-dialog-header h3 {
  margin: 0;
  color: var(--ss-ink);
  font-size: 16px;
  font-weight: 700;
}

.ss-dialog-body {
  padding: 20px;
}

.ss-dialog-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ss-hairline-strong);
  border-radius: var(--ss-r-sm);
  background: var(--ss-surface-2);
  color: var(--ss-ink);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 170ms var(--ss-ease), background-color 170ms var(--ss-ease);
}

.ss-dialog-input:focus {
  border-color: var(--ss-brand);
  background: var(--ss-surface);
}

.ss-dialog-input::placeholder {
  color: var(--ss-faint);
}

.ss-dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--ss-hairline);
}

.ss-section-action {
  border: 0;
  background: transparent;
  color: var(--ss-brand);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  transition: color 170ms var(--ss-ease), background-color 170ms var(--ss-ease);
}

.ss-section-action:hover {
  color: var(--ss-brand-hover);
  background: var(--ss-brand-soft);
  border-radius: 6px;
}
`;
		//#endregion
		//#region src/client/StoryStudioRouter.tsx
		function StoryStudioRouter() {
			const [currentProjectPath, setCurrentProjectPath] = (0, react.useState)(null);
			const [ctx, setCtx] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const clientCtx = window.__dshClientContext;
				if (clientCtx) setCtx(clientCtx);
			}, []);
			(0, react.useEffect)(() => {
				const lastProject = localStorage.getItem("story-studio:last-project");
				console.log("[StoryStudioRouter] Last project from localStorage:", lastProject);
				if (lastProject) setCurrentProjectPath(lastProject);
			}, []);
			(0, react.useEffect)(() => {
				if (!ctx) return;
				if (currentProjectPath) {
					console.log("[StoryStudioRouter] Mounting workbench for project:", currentProjectPath);
					mountWorkbench(ctx);
				} else {
					console.log("[StoryStudioRouter] Unmounting workbench (on projects page)");
					unmountWorkbench();
				}
			}, [ctx, currentProjectPath]);
			const handleSelectProject = (path) => {
				console.log("[StoryStudioRouter] Selecting project:", path);
				setCurrentProjectPath(path);
				localStorage.setItem("story-studio:last-project", path);
			};
			const handleCreateProject = (name) => {
				console.log("[StoryStudioRouter] Creating project:", name);
				const projectPath = `/Users/qiuzixiao/StoryStudio/${name}`;
				setCurrentProjectPath(projectPath);
				localStorage.setItem("story-studio:last-project", projectPath);
			};
			const handleBackToProjects = () => {
				console.log("[StoryStudioRouter] Returning to projects page");
				setCurrentProjectPath(null);
				localStorage.removeItem("story-studio:last-project");
			};
			if (!currentProjectPath) {
				console.log("[StoryStudioRouter] Rendering ProjectsPage");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProjectsPage, {
					onSelectProject: handleSelectProject,
					onCreateProject: handleCreateProject
				});
			}
			console.log("[StoryStudioRouter] Rendering StoryStudioApp with path:", currentProjectPath);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StoryStudioApp, {
				projectPath: currentProjectPath,
				onBackToProjects: handleBackToProjects
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const CHANNEL = "/story-studio";
		const CREATE_ID = "story-studio:create";
		function StoryStudioShellOverlay({ service, onCreated }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateProjectDialog, {
				open,
				service,
				onClose: () => {
					setOpen(false);
				},
				onCreated
			}) });
		}
		function installStyles() {
			const current = document.querySelector("style[data-story-studio]");
			const element = current ?? document.createElement("style");
			element.dataset.storyStudio = "";
			element.textContent = styles;
			if (current === null) document.head.appendChild(element);
			const wbCurrent = document.querySelector("style[data-story-studio-workbench]");
			const wbElement = wbCurrent ?? document.createElement("style");
			wbElement.dataset.storyStudioWorkbench = "";
			wbElement.textContent = workbenchStyles;
			if (wbCurrent === null) document.head.appendChild(wbElement);
			const appCurrent = document.querySelector("style[data-story-studio-app]");
			const appElement = appCurrent ?? document.createElement("style");
			appElement.dataset.storyStudioApp = "";
			appElement.textContent = storyStudioAppStyles;
			if (appCurrent === null) document.head.appendChild(appElement);
			return () => {
				element.remove();
				wbElement.remove();
				appElement.remove();
			};
		}
		function projectPathWithin(root, path) {
			const normalize = (value) => value.replace(/\\/gu, "/").replace(/\/+$/gu, "").toLocaleLowerCase();
			const base = normalize(root);
			const target = normalize(path);
			return target === base || target.startsWith(`${base}/`);
		}
		function CreateProjectDialog({ open, service, onClose, onCreated }) {
			const [name, setName] = (0, react.useState)("");
			const [projectRoot, setProjectRoot] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const inputRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!open) return;
				setName("");
				setError(void 0);
				service.describe().then((value) => {
					setProjectRoot(value.projectRoot);
				}).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				});
				window.setTimeout(() => {
					inputRef.current?.focus();
				}, 0);
			}, [open, service]);
			const submit = (0, react.useCallback)(async () => {
				const title = name.trim();
				if (title === "" || busy) return;
				setBusy(true);
				setError(void 0);
				try {
					const project = await service.create(title);
					onCreated(await service.register(project));
					onClose();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(false);
				}
			}, [
				busy,
				name,
				onClose,
				onCreated,
				service
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose: () => {
					if (!busy) onClose();
				},
				title: "新建作品",
				closeLabel: "关闭",
				className: "storyStudioDialog",
				headless: true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "storyStudioDialogHeader",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "storyStudioDialogIdentity",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "storyStudioDialogMark",
								children: "SS"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: "storyStudioDialogTitle",
								children: "新建作品"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "storyStudioDialogSubtitle",
								children: "从一个名字开始，自动建立完整的创作空间"
							})] })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "storyStudioDialogClose",
							"aria-label": "关闭",
							disabled: busy,
							onClick: onClose,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 16 })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "storyStudioDialogBody",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "storyStudioForm",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "storyStudioField",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "storyStudioLabel",
											children: "作品名称"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											ref: inputRef,
											className: "storyStudioInput",
											value: name,
											maxLength: 80,
											placeholder: "例如：父子同心",
											disabled: busy,
											onChange: (event) => {
												setName(event.target.value);
											},
											onKeyDown: (event) => {
												if (event.key === "Enter") {
													event.preventDefault();
													submit();
												}
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "storyStudioFieldHint",
											children: "之后可以在项目中继续调整剧名和创作方向"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "storyStudioLocation",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "storyStudioLocationIcon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 18 })
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "storyStudioLocationText",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "storyStudioLocationLabel",
												children: "保存位置"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "storyStudioLocationPath",
												children: projectRoot === "" ? "正在读取作品保存位置..." : projectRoot
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "storyStudioLocationTag",
											children: "自动管理"
										})
									]
								}),
								error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "storyStudioError",
									role: "alert",
									children: error
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "storyStudioDialogFooter",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "storyStudioDialogCancel",
							disabled: busy,
							onClick: onClose,
							children: "取消"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "storyStudioDialogSubmit",
							disabled: busy || name.trim() === "",
							onClick: () => {
								submit();
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 15 }), busy ? "正在创建..." : "创建作品"]
						})]
					})
				]
			});
		}
		function StoryProjectPicker(props) {
			const { service } = props;
			const [createOpen, setCreateOpen] = (0, react.useState)(false);
			const [projectRoot, setProjectRoot] = (0, react.useState)("");
			const workspaces = props.useWorkspaces((state) => state.items);
			(0, react.useEffect)(() => {
				service.describe().then((value) => {
					setProjectRoot(value.projectRoot);
				}).catch(() => {});
			}, [service]);
			const items = (0, react.useMemo)(() => projectRoot === "" ? workspaces : workspaces.filter((item) => projectPathWithin(projectRoot, item.path)), [projectRoot, workspaces]).map((project) => ({
				id: project.workspaceId,
				label: project.title,
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 16 })
			}));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: props.open && !createOpen,
				anchor: null,
				items: items.length === 0 ? [{
					type: "label",
					id: "empty",
					text: "还没有作品"
				}] : items,
				footer: [{
					id: CREATE_ID,
					label: "新建作品",
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 16 })
				}],
				selectedId: props.selectedId,
				portal: true,
				getAnchorRect: () => props.anchorRef?.current?.getBoundingClientRect() ?? null,
				onClose: props.onClose,
				onSelect: (id) => {
					if (id === CREATE_ID) {
						props.onClose();
						setCreateOpen(true);
						return;
					}
					props.onPick(id);
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateProjectDialog, {
				open: createOpen,
				service,
				onClose: () => {
					setCreateOpen(false);
				},
				onCreated: (workspace) => {
					props.onPick(workspace.workspaceId);
				}
			})] });
		}
		function CreateProjectAction(props) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "storyStudioCreateAction",
				"data-wide": props.wide || void 0,
				"aria-label": "新建作品",
				title: "新建作品",
				onClick: () => {
					setOpen(true);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 16 }), props.wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "新建作品" })]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateProjectDialog, {
				open,
				service: props.service,
				onClose: () => {
					setOpen(false);
				},
				onCreated: (workspace) => {
					props.start(workspace.workspaceId);
				}
			})] });
		}
		function unwrap(result) {
			if (typeof result !== "object" || result === null || !("ok" in result)) throw new Error("Story Studio 服务返回了无效结果");
			const response = result;
			if (!response.ok) throw new Error(response.error?.message ?? "Story Studio 操作失败");
			if (response.value === void 0) throw new Error("Story Studio 服务没有返回结果");
			return response.value;
		}
		const name = "dsh-product-story-studio";
		const inject = [
			"slots",
			"workspaces",
			"connection"
		];
		/**
		* Own the `conversation.session` slot only while the active session's `cwd`
		* falls under the Story Studio deployment project root. `single` slots are
		* exclusive at registration time and do not fall back on a `null` render
		* (see `ui-slots`'s `register()`), so ownership must be created and disposed
		* dynamically as the active session changes, handing the slot back to
		* `ui-conversation`'s default implementation whenever no Story Studio
		* session is active.
		*/
		function bindStoryStudioSessionSlot(ctx, service) {
			const sessions = ctx.get("sessions");
			if (sessions?.list === void 0) return;
			let projectRoot;
			service.describe().then((value) => {
				projectRoot = value.projectRoot;
			}).catch(() => {});
			let owned;
			let ownedSessionId;
			const isStoryStudioSession = (cwd) => projectRoot !== void 0 && projectRoot !== "" && cwd !== void 0 && cwd !== "" && projectPathWithin(projectRoot, cwd);
			const reconcile = () => {
				const snapshot = sessions.list.getSnapshot();
				const currentId = snapshot.current;
				const cwd = currentId !== void 0 ? snapshot.byId?.[currentId]?.cwd : void 0;
				console.log("[Story Studio] reconcile:", {
					currentId,
					cwd,
					projectRoot,
					ownedSessionId
				});
				if (currentId !== void 0 && currentId === ownedSessionId) return;
				if (owned !== void 0) {
					console.log("[Story Studio] releasing slot ownership");
					owned();
					owned = void 0;
					ownedSessionId = void 0;
				}
				if (currentId !== void 0 && isStoryStudioSession(cwd)) {
					console.log("[Story Studio] taking slot ownership");
					owned = ctx.slots.inject("conversation.session", () => ctx.slots.register({
						name: "conversation.session",
						priority: 100
					}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StoryStudioWorkbenchPlaceholder, { sessionId: currentId })));
					ownedSessionId = currentId;
				}
			};
			ctx.effect(() => {
				reconcile();
				return sessions.list.subscribe(reconcile);
			}, "story-studio: conversation.session dynamic ownership");
			ctx.effect(() => () => {
				if (owned !== void 0) {
					owned();
					owned = void 0;
					ownedSessionId = void 0;
				}
			}, "story-studio: conversation.session ownership teardown");
		}
		function StoryStudioWorkbenchPlaceholder({ sessionId }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StoryStudioWorkbench, { sessionId });
		}
		function apply(ctx) {
			ctx.effect(installStyles, "story-studio: styles");
			ctx.effect(() => {
				const root = document.createElement("div");
				root.id = "story-studio-root";
				document.body.appendChild(root);
				window.__dshClientContext = ctx;
				const reactRoot = (0, react_dom_client.createRoot)(root);
				reactRoot.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StoryStudioRouter, {}));
				console.log("[Story Studio] App rendered");
				return () => {
					reactRoot.unmount();
					root.remove();
					delete window.__dshClientContext;
				};
			}, "story-studio: render app");
			const service = {
				describe: async () => unwrap(await ctx.connection.rpc.call(CHANNEL, "describe", {})),
				create: async (projectName) => unwrap(await ctx.connection.rpc.call(CHANNEL, "createProject", { name: projectName })),
				register: async (project) => {
					let workspace = await ctx.workspaces.create({ path: project.path });
					if (workspace.title !== project.name) workspace = await ctx.workspaces.rename(workspace.workspaceId, project.name);
					return workspace;
				}
			};
			bindStoryStudioSessionSlot(ctx, service);
			ctx.slots.inject("conversation.hero.workspace", () => ctx.slots.register({
				name: "conversation.hero.workspace",
				priority: -200
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StoryProjectPicker, {
				...props,
				service
			})));
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "story-studio-create",
				order: -100
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateProjectAction, {
				...props,
				service,
				start: (id) => {
					ctx.workspaces.startSession(id);
				}
			})));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "story-studio-product-entry",
				order: -100
			}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StoryStudioShellOverlay, {
				service,
				onCreated: (workspace) => {
					ctx.workspaces.startSession(workspace.workspaceId);
				}
			})));
		}
		//#endregion
		exports.apply = apply;
		exports.bindStoryStudioSessionSlot = bindStoryStudioSessionSlot;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
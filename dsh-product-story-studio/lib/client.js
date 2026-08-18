window.__ModuleLoader__.load({
	id: "dsh-product-story-studio",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
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
		//#region src/client/index.tsx
		const CHANNEL = "/story-studio";
		const CREATE_ID = "story-studio:create";
		function StoryStudioShellOverlay({ service, onCreated }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "storyStudioProductBadge",
				"data-story-studio-overlay": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "storyStudioProductMark",
						children: "SS"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "storyStudioProductName",
						children: "Story Studio"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "storyStudioProductState",
						children: "作品工作台"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "storyStudioProductAction",
						onClick: () => {
							setOpen(true);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), "新建作品"]
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateProjectDialog, {
				open,
				service,
				onClose: () => {
					setOpen(false);
				},
				onCreated
			})] });
		}
		function installStyles() {
			const current = document.querySelector("style[data-story-studio]");
			const element = current ?? document.createElement("style");
			element.dataset.storyStudio = "";
			element.textContent = styles;
			if (current === null) document.head.appendChild(element);
			return () => {
				element.remove();
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
		function apply(ctx) {
			ctx.effect(installStyles, "story-studio: styles");
			const service = {
				describe: async () => unwrap(await ctx.connection.rpc.call(CHANNEL, "describe", {})),
				create: async (projectName) => unwrap(await ctx.connection.rpc.call(CHANNEL, "createProject", { name: projectName })),
				register: async (project) => {
					let workspace = await ctx.workspaces.create({ path: project.path });
					if (workspace.title !== project.name) workspace = await ctx.workspaces.rename(workspace.workspaceId, project.name);
					return workspace;
				}
			};
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
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
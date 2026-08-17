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
.storyStudioCreateAction{display:flex;align-items:center;justify-content:center;min-width:32px;height:32px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-text-secondary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease}
.storyStudioCreateAction:hover{background:var(--dsw-alias-fill-hover);color:var(--dsw-alias-text-primary)}
.storyStudioCreateAction[data-wide=true]{width:100%;justify-content:flex-start;gap:9px;padding:0 10px;font-size:13px}
.storyStudioForm{display:grid;gap:16px;min-width:min(420px,calc(100vw - 64px))}
.storyStudioField{display:grid;gap:7px}
.storyStudioLabel{font-size:12px;font-weight:650;color:var(--dsw-alias-text-primary)}
.storyStudioInput{box-sizing:border-box;width:100%;height:40px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-text-primary);padding:0 12px;font:inherit;font-size:14px;outline:none}
.storyStudioInput:focus{border-color:#287a5b;box-shadow:0 0 0 2px color-mix(in srgb,#287a5b 18%,transparent)}
.storyStudioPath{display:flex;align-items:flex-start;gap:8px;padding:10px 11px;border-left:3px solid #287a5b;background:color-mix(in srgb,#287a5b 7%,var(--dsw-alias-bg-base));font-size:12px;line-height:1.5;color:var(--dsw-alias-text-secondary);word-break:break-all}
.storyStudioError{margin:0;color:var(--dsw-alias-text-error,#c43d3d);font-size:12px;line-height:1.45}
.storyStudioEmpty{padding:10px 12px;font-size:12px;color:var(--dsw-alias-text-tertiary)}
`;
		//#endregion
		//#region src/client/index.tsx
		const CHANNEL = "/story-studio";
		const CREATE_ID = "story-studio:create";
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose: () => {
					if (!busy) onClose();
				},
				title: "新建作品",
				closeLabel: "关闭",
				description: "输入作品名称后，Story Studio 会自动建立完整的创作目录。",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					disabled: busy,
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || name.trim() === "",
					onClick: () => {
						submit();
					},
					children: busy ? "正在创建..." : "创建作品"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "storyStudioForm",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "storyStudioField",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "storyStudioLabel",
								children: "作品名称"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
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
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "storyStudioPath",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 16 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: projectRoot === "" ? "正在读取作品保存位置..." : projectRoot })]
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "storyStudioError",
							role: "alert",
							children: error
						})
					]
				})
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
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
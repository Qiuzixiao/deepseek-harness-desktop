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
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/styles.ts
		const styles = `
.qNovelBrandOverlay{display:none}
/* The upstream brand button remains the New Session shortcut. Keep its behavior,
   but let the product layer own the visible wordmark in the same slot. */
[class*="logoRow"] [class*="brand"]{visibility:visible!important;justify-content:flex-start;font-size:0!important;letter-spacing:-.02em}
[class*="logoRow"] [class*="brand"]>*{visibility:hidden!important}
[class*="logoRow"] [class*="brand"]::after{content:"QNovel";visibility:visible;display:block;color:var(--dsw-alias-label-primary);font-size:16px;line-height:24px;font-weight:740;letter-spacing:-.02em}
/* The upstream slot is technically rendered in the footer, but QNovel's
   product contract is explicit: New Session and New Work are one top action
   row directly below the wordmark. Position the slot's wrapper (rather than
   only its button) against the official sidebar geometry, so the footer
   cannot leave a second visible copy at the bottom. The 74px offset is the
   upstream sidebar's 6px top padding + 60px logo row + 8px logo margin. */
[class~="hHd-Xa_root"]{position:relative}
[class~="hHd-Xa_root"]:not([class~="hHd-Xa_collapsed"]) [class~="hHd-Xa_newSession"]{width:calc(50% - 6px);margin-right:auto}
/* The footer slot is mounted after the workspace region by the upstream
   sidebar. Pull only that slot up into the same 38px action row as New
   Session; it must never render as a second bottom action. */
[class~="hHd-Xa_root"]:not([class~="hHd-Xa_collapsed"]) [class~="hHd-Xa_footerActions"]{position:absolute;z-index:4;top:74px;left:calc(50% + 2px);right:14px;width:auto;height:38px;display:flex;align-items:stretch}
[class~="hHd-Xa_root"]:not([class~="hHd-Xa_collapsed"]) [class~="hHd-Xa_footerActions"] > *{width:100%;height:38px}
.qNovelCreateSlotHost{position:static;width:100%;height:38px}
.qNovelCreateSlotHost[data-wide=true]{display:block}
.qNovelCreateSlotHost:not([data-wide=true]){display:none}
.storyStudioCreateAction{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;height:38px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease,border-color 120ms ease}
.storyStudioCreateAction:hover{background:var(--dsw-alias-button-floating-hover);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
.storyStudioCreateAction:active{background:var(--dsw-alias-interactive-bg-active)}
.storyStudioCreateAction span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;font-weight:500;line-height:22px}
.storyStudioCreateAction svg{flex:none}
/* The product identity replaces the upstream empty-state fish headline. The
   original hero stays mounted for layout and accessibility, while its visible
   labels are given QNovel's own mark, headline, and Beta badge. */
[class*="_headlineText"]{font-size:0!important}
[class*="_headlineText"]::after{content:"把故事，写成作品";font-size:26px;line-height:32px;font-weight:600;letter-spacing:-.035em}
[class*="_previewBadge"]{font-size:0!important;border-color:color-mix(in srgb,#287a5b 28%,var(--dsw-alias-interactive-bg-hover));background:color-mix(in srgb,#287a5b 12%,transparent);color:#70c49c}
[class*="_previewBadge"]::after{content:"Beta";font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;font-weight:600}
[class*="_fishHitbox"]{position:relative}
[class*="_fishHitbox"] [class*="_fish"]{visibility:hidden}
[class*="_fishHitbox"]::after{content:"Q";box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#3c9a72,#206044);box-shadow:0 5px 14px color-mix(in srgb,#287a5b 28%,transparent);color:#fff;font-size:19px;font-weight:780;line-height:34px;letter-spacing:-.06em}
[class*="_headline"]{column-gap:11px}
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
 .qNovelSettingsRow{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.qNovelSettingsText{display:grid;gap:4px;min-width:0}
.qNovelSettingsTitle{font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}
.qNovelSettingsDescription{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.qNovelSettingsPath{max-width:560px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.qNovelSettingsButton{flex:none;height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);padding:0 12px;font:inherit;font-size:12px;cursor:pointer}
.qNovelSettingsButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.qNovelSettingsButton:disabled{opacity:.5;cursor:not-allowed}
.qNovelOnboarding{box-sizing:border-box;width:min(480px,calc(100vw - 32px));padding:0;border-radius:16px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.qNovelOnboardingHeader{display:flex;align-items:center;gap:14px;padding:26px 26px 20px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.qNovelOnboardingMark{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;background:#287a5b;color:#fff;font-size:18px;font-weight:760}
.qNovelOnboardingHeader h2{margin:0;color:var(--dsw-alias-label-primary);font-size:18px;line-height:26px;font-weight:700}
.qNovelOnboardingHeader p{margin:3px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.qNovelOnboardingBody{padding:22px 26px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:21px}
.qNovelOnboardingBody p{margin:0}
.qNovelOnboardingBody .storyStudioError{margin-top:14px}
.qNovelOnboardingFooter{display:flex;justify-content:flex-end;padding:16px 26px;background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l1)}
@media (max-width:900px){.qNovelBrandOverlay{left:14px}.qNovelCreateSlotHost{right:12px}}
@media (max-width:560px){.storyStudioDialogHeader,.storyStudioDialogBody{padding-left:18px;padding-right:18px}.storyStudioDialogFooter{padding-left:18px;padding-right:18px}.storyStudioDialogSubtitle{display:none}.storyStudioLocationTag{display:none}.storyStudioLocation{grid-template-columns:36px minmax(0,1fr)}}
`;
		//#endregion
		//#region src/client/index.tsx
		const CHANNEL = "/story-studio";
		function QNovelSettingsRow({ readRoot, chooseRoot }) {
			const [root, setRoot] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const load = (0, react.useCallback)(() => {
				readRoot().then(setRoot).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				});
			}, [readRoot]);
			(0, react.useEffect)(load, [load]);
			const changeRoot = async () => {
				if (busy) return;
				setBusy(true);
				setError(void 0);
				try {
					const selected = await chooseRoot();
					if (selected !== null) setRoot(selected);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "qNovelSettingsRow",
				"data-slot": "settings.general.item",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "qNovelSettingsText",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "qNovelSettingsTitle",
							children: "作品目录"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "qNovelSettingsDescription",
							children: error ?? "新建作品会保存到这个目录；已有作品不会自动搬迁。"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "qNovelSettingsPath",
							title: root,
							children: root === "" ? "尚未选择" : root
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "qNovelSettingsButton",
					disabled: busy,
					onClick: () => {
						changeRoot();
					},
					children: busy ? "选择中…" : "更改目录"
				})]
			});
		}
		function StoryStudioShellOverlay({ service }) {
			const [configured, setConfigured] = (0, react.useState)(void 0);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				const previousTitle = document.title;
				document.title = "QNovel Beta";
				return () => {
					document.title = previousTitle;
				};
			}, []);
			const refresh = (0, react.useCallback)(() => {
				service.describe().then((value) => {
					setConfigured(value.configured);
				}).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				});
			}, [service]);
			(0, react.useEffect)(refresh, [refresh]);
			const chooseRoot = async () => {
				if (busy) return;
				setBusy(true);
				setError(void 0);
				try {
					const selected = await service.pickRoot();
					if (selected !== null) {
						await service.configureRoot(selected);
						setConfigured(true);
					}
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "qNovelBrandOverlay",
				"aria-hidden": "true",
				children: "QNovel"
			}), configured === false && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: () => {},
				title: "选择作品目录",
				closeLabel: "关闭",
				className: "qNovelOnboarding",
				headless: true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "qNovelOnboardingHeader",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "qNovelOnboardingMark",
							children: "Q"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "先选择作品目录" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "QNovel 会把每个作品独立保存到这个目录中。" })] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "qNovelOnboardingBody",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "请选择一个专用文件夹，例如“文档 / QNovel作品”。取消选择不会进入完整创作界面。" }), error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "storyStudioError",
							role: "alert",
							children: error
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "qNovelOnboardingFooter",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "storyStudioDialogSubmit",
							disabled: busy,
							onClick: () => {
								chooseRoot();
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 15 }), busy ? "正在验证…" : "选择作品目录"]
						})
					})
				]
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
								children: "Q"
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: props.open,
				anchor: null,
				items: items.length === 0 ? [{
					type: "label",
					id: "empty",
					text: "还没有作品"
				}] : items,
				selectedId: props.selectedId,
				portal: true,
				getAnchorRect: () => props.anchorRef?.current?.getBoundingClientRect() ?? null,
				onClose: props.onClose,
				onSelect: (id) => {
					props.onPick(id);
				}
			}) });
		}
		function CreateProjectAction(props) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "qNovelCreateSlotHost",
				"data-wide": props.wide || void 0,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "storyStudioCreateAction",
					"aria-label": "新建作品",
					title: "新建作品",
					onClick: () => {
						setOpen(true);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 16 }), props.wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "新建作品" })]
				})
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
		async function readQNovelRoot(connection) {
			const response = await connection.api.settings.describe({});
			if (!response.result.ok) throw new Error(response.result.error.message);
			const value = response.result.value.namespaces.find((item) => item.ns === "qnovel")?.value;
			if (typeof value !== "object" || value === null || !("projectsRoot" in value)) return "";
			const root = value.projectsRoot;
			return typeof root === "string" ? root : "";
		}
		const name = "dsh-product-story-studio";
		const inject = [
			"slots",
			"workspaces",
			"connection"
		];
		function mountWorkbench(ctx) {
			const sessions = ctx.get("sessions");
			const locale = ctx.get("locale");
			const layout = ctx.get("layout");
			let useSessions;
			if (sessions?.list !== void 0 && typeof sessions.list.subscribe === "function" && typeof sessions.list.getSnapshot === "function") useSessions = (selector) => {
				return selector(react.useSyncExternalStore(sessions.list.subscribe, sessions.list.getSnapshot));
			};
			const mount = () => {
				if (typeof window !== "undefined" && typeof window.__DSH_WORKBENCH__?.mount === "function") window.__DSH_WORKBENCH__.mount({
					slots: ctx.slots,
					locale,
					NS: "workbench",
					React: react,
					layout,
					useSessions,
					slotInject: (key, callback) => ctx.slots.inject(key, callback)
				});
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
		function apply(ctx) {
			ctx.effect(installStyles, "story-studio: styles");
			mountWorkbench(ctx);
			const service = {
				describe: async () => unwrap(await ctx.connection.rpc.call(CHANNEL, "describe", {})),
				create: async (projectName) => unwrap(await ctx.connection.rpc.call(CHANNEL, "createProject", { name: projectName })),
				pickRoot: () => ctx.workspaces.pickDirectory(),
				configureRoot: async (path) => {
					const validated = unwrap(await ctx.connection.rpc.call(CHANNEL, "validateProjectRoot", { path }));
					const response = await ctx.connection.api.settings.mutate({
						ns: "qnovel",
						ops: [{
							op: "set",
							path: ["projectsRoot"],
							value: validated.projectRoot
						}]
					});
					if (!response.result.ok) throw new Error(response.result.error.message);
					return validated.projectRoot;
				},
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
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "qnovel-projects-root",
				order: -100
			}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QNovelSettingsRow, {
				readRoot: () => readQNovelRoot(ctx.connection),
				chooseRoot: async () => {
					const selected = await service.pickRoot();
					if (selected !== null) await service.configureRoot(selected);
					return selected;
				}
			})));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "story-studio-product-entry",
				order: -100
			}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StoryStudioShellOverlay, { service })));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
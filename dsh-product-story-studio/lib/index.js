import Schema from "@deepseek-ai/schemastery";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { stringify } from "yaml";
import { fileURLToPath } from "node:url";
const DEFAULT_PROJECTS_DIRECTORY = "Story Studio";
const requiredDirectories = [
	"bible/characters",
	"references/source",
	"references/analyses",
	"outline/seasons",
	"outline/volumes",
	"drafts/scripts",
	"drafts/chapters",
	"reviews/revisions",
	"exports",
	".story-studio/cache",
	".story-studio/indexes"
];
const initialFiles = (name) => [
	["story.yml", stringify({
		schemaVersion: 1,
		id: projectId(name),
		title: name,
		medium: "undecided",
		language: "zh-CN",
		status: "development",
		currentDeliverable: "brief"
	})],
	["brief.md", `# ${name}\n\n## 原始需求\n\n## 已确认事实\n\n## Agent 假设\n\n## 待确认问题\n\n## 本轮交付\n\n## 参考材料边界\n`],
	["bible/premise.md", "# 故事前提\n"],
	["bible/world.md", "# 世界与规则\n"],
	["bible/timeline.md", "# 时间线\n"],
	["bible/style.md", "# 写法与调性\n"],
	["references/index.md", "# 参考材料索引\n\n| 文件 | 路径 | 格式 | 用途 | 状态 |\n| --- | --- | --- | --- | --- |\n"]
];
function resolveProjectRoot(config = {}, home = homedir(), environment = process.env) {
	const configured = config.projectRoot?.trim();
	const environmentRoot = environment.STORY_STUDIO_PROJECTS_ROOT?.trim();
	const root = configured === void 0 || configured === "" ? environmentRoot === void 0 || environmentRoot === "" ? join(home, "Documents", DEFAULT_PROJECTS_DIRECTORY) : environmentRoot : configured;
	return resolve(root);
}
function normalizeProjectName(value) {
	if (typeof value !== "string") throw new Error("项目名称必须是文本");
	const name = value.trim().replace(/\s+/gu, " ");
	if (name.length === 0) throw new Error("请输入项目名称");
	if (name.length > 80) throw new Error("项目名称不能超过 80 个字符");
	if (name === "." || name === "..") throw new Error("项目名称无效");
	if (/[\u0000-\u001f/\\:*?"<>|]/u.test(name)) throw new Error("项目名称包含文件系统不支持的字符");
	return name;
}
function projectDirectoryName(name) {
	const segment = normalizeProjectName(name).replace(/[. ]+$/u, "");
	if (segment.length === 0) throw new Error("项目名称无效");
	return segment;
}
function projectId(name) {
	const ascii = name.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
	if (ascii !== "") return ascii;
	let hash = 2166136261;
	for (const char of name) {
		hash ^= char.codePointAt(0) ?? 0;
		hash = Math.imul(hash, 16777619);
	}
	return `story-${(hash >>> 0).toString(36)}`;
}
async function createStoryProject(config, inputName) {
	const name = normalizeProjectName(inputName);
	const projectRoot = resolveProjectRoot(config);
	await mkdir(projectRoot, { recursive: true });
	const directoryName = projectDirectoryName(name);
	if ((await readdir(projectRoot, { withFileTypes: true })).some((entry) => entry.name.toLocaleLowerCase() === directoryName.toLocaleLowerCase())) throw new Error(`项目“${name}”已经存在`);
	const path = join(projectRoot, directoryName);
	if (!isAbsolute(path) || resolve(path) === projectRoot) throw new Error("项目路径无效");
	await mkdir(path, { recursive: false });
	for (const relative of requiredDirectories) await mkdir(join(path, relative), { recursive: true });
	for (const [relative, content] of initialFiles(name)) await writeFile(join(path, relative), content, {
		encoding: "utf8",
		flag: "wx"
	});
	return {
		name,
		path,
		projectRoot
	};
}
//#endregion
//#region src/workbench-host.ts
const MIME = {
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".ttf": "font/ttf",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".svg": "image/svg+xml",
	".html": "text/html; charset=utf-8",
	".png": "image/png"
};
function apply$1(ctx) {
	const fs = ctx.fs;
	const sandboxPolicy = ctx.sandboxPolicy;
	const sessions = ctx.sessions;
	const webServer = ctx.webServer;
	const assetsRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "workbench");
	const policyOf = (sessionId) => {
		if (sessionId !== null && sessionId !== void 0 && sessionId !== "") try {
			const session = sessions.get(sessionId);
			if (session !== void 0 && session.header !== null && typeof session.header.cwd === "string" && session.header.cwd !== "") return sandboxPolicy.resolve({ session });
		} catch (e) {}
		return sandboxPolicy.resolve({});
	};
	const rootFor = (sessionId) => {
		const policy = policyOf(sessionId);
		if (policy === null || typeof policy.workspaceRoot !== "string" || policy.workspaceRoot === "") throw new Error("dsh-workbench: no workspace root resolved");
		return policy.workspaceRoot;
	};
	const resolveInside = async (path, sessionId) => {
		const rootTarget = await fs.resolve(rootFor(sessionId), {});
		const target = await fs.resolve(String(path), {});
		if (!fs.contains(rootTarget, target)) throw new Error("path-outside-workspace");
		return target;
	};
	const codeOf = (e) => e !== null && typeof e === "object" && typeof e.code === "string" ? e.code : null;
	const textOf = (e) => e instanceof Error ? e.message : String(e);
	const ops = {
		describe: async (args) => {
			const sessionId = args === null || args === void 0 ? void 0 : args.sessionId;
			const root = rootFor(sessionId);
			return {
				ok: true,
				root,
				rootName: basename(root),
				sessionId: sessionId ?? null
			};
		},
		listDir: async (args) => {
			const sessionId = args === null || args === void 0 ? void 0 : args.sessionId;
			const path = args === null || args === void 0 || args.path === void 0 ? rootFor(sessionId) : args.path;
			try {
				const target = await resolveInside(path, sessionId);
				const info = await fs.stat(target);
				if (info === void 0) return {
					ok: false,
					error: "not-found"
				};
				if (info.type !== "directory") return {
					ok: false,
					error: "not-directory"
				};
				const entries = (await fs.listDir(target)).map((entry) => ({
					name: entry.name,
					type: entry.type === "directory" ? "directory" : "file",
					...typeof entry.size === "number" ? { size: entry.size } : {}
				}));
				entries.sort((a, b) => (a.type === "directory" ? 0 : 1) - (b.type === "directory" ? 0 : 1) || a.name.localeCompare(b.name, void 0, { numeric: true }));
				return {
					ok: true,
					entries
				};
			} catch (e) {
				const code = codeOf(e);
				if (code === "FS_NOT_FOUND" || code === "FS_NOT_DIRECTORY") return {
					ok: false,
					error: "not-directory"
				};
				if (e.message === "path-outside-workspace") return {
					ok: false,
					error: "outside-workspace"
				};
				return {
					ok: false,
					error: textOf(e)
				};
			}
		},
		readFile: async (args) => {
			const sessionId = args === null || args === void 0 ? void 0 : args.sessionId;
			const path = args === null || args === void 0 ? "" : args.path;
			try {
				const target = await resolveInside(path, sessionId);
				const info = await fs.stat(target);
				if (info === void 0) return {
					ok: false,
					error: "not-found"
				};
				if (info.type !== "file") return {
					ok: false,
					error: "not-file"
				};
				if (typeof info.size === "number" && info.size > 5242880) return {
					ok: false,
					error: "too-large"
				};
				try {
					return {
						ok: true,
						content: await fs.readText(target),
						version: String(info.version)
					};
				} catch (e) {
					const code = codeOf(e);
					if (code === "FS_NOT_TEXT") return {
						ok: false,
						error: "not-text"
					};
					if (code === "FS_TOO_LARGE") return {
						ok: false,
						error: "too-large"
					};
					throw e;
				}
			} catch (e) {
				if (e.message === "path-outside-workspace") return {
					ok: false,
					error: "outside-workspace"
				};
				return {
					ok: false,
					error: textOf(e)
				};
			}
		},
		writeFile: async (args) => {
			const sessionId = args === null || args === void 0 ? void 0 : args.sessionId;
			const path = args === null || args === void 0 ? "" : args.path;
			const content = args === null || args === void 0 ? "" : args.content;
			if (typeof content !== "string") return {
				ok: false,
				error: "bad-content"
			};
			try {
				const target = await resolveInside(path, sessionId);
				const expected = args !== null && args !== void 0 && args.expected !== void 0 && args.expected !== null ? {
					kind: "replaceIfVersion",
					version: String(args.expected)
				} : void 0;
				const outcome = await fs.writeText(target, content, expected, void 0, policyOf(sessionId));
				return {
					ok: true,
					operation: outcome.operation,
					version: String(outcome.version)
				};
			} catch (e) {
				const code = codeOf(e);
				if (code === "FS_STALE_VERSION") return {
					ok: false,
					error: "stale"
				};
				if (code === "FS_NOT_OBSERVED") return {
					ok: false,
					error: "not-observed"
				};
				if (code === "FS_SANDBOX_DENIED" || code === "FS_PERMISSION_DENIED") return {
					ok: false,
					error: "denied"
				};
				if (e.message === "path-outside-workspace") return {
					ok: false,
					error: "outside-workspace"
				};
				return {
					ok: false,
					error: textOf(e)
				};
			}
		},
		createFile: async (args) => {
			const sessionId = args === null || args === void 0 ? void 0 : args.sessionId;
			const path = args === null || args === void 0 ? "" : args.path;
			try {
				const target = await resolveInside(path, sessionId);
				const outcome = await fs.writeText(target, "", { kind: "createIfAbsent" }, void 0, policyOf(sessionId));
				return {
					ok: true,
					operation: outcome.operation,
					version: String(outcome.version)
				};
			} catch (e) {
				const code = codeOf(e);
				if (code === "FS_NOT_OBSERVED") return {
					ok: false,
					error: "exists"
				};
				if (code === "FS_SANDBOX_DENIED" || code === "FS_PERMISSION_DENIED") return {
					ok: false,
					error: "denied"
				};
				if (e.message === "path-outside-workspace") return {
					ok: false,
					error: "outside-workspace"
				};
				return {
					ok: false,
					error: textOf(e)
				};
			}
		},
		createDir: async (args) => {
			const sessionId = args === null || args === void 0 ? void 0 : args.sessionId;
			const parent = args === null || args === void 0 ? "" : args.parent;
			const name = args === null || args === void 0 ? "" : args.name;
			if (typeof name !== "string" || name.trim() === "" || name === "." || name === ".." || /[/\\]/.test(name)) return {
				ok: false,
				error: "bad-name"
			};
			try {
				await resolveInside(parent, sessionId);
			} catch (e) {
				return {
					ok: false,
					error: "outside-workspace"
				};
			}
			const target = join(parent, name);
			try {
				await mkdir(target);
				return {
					ok: true,
					path: target
				};
			} catch (e) {
				if (codeOf(e) === "EEXIST") return {
					ok: false,
					error: "exists"
				};
				return {
					ok: false,
					error: textOf(e)
				};
			}
		},
		assetText: async (args) => {
			const file = args === null || args === void 0 ? "" : args.file;
			if (!Object.prototype.hasOwnProperty.call({
				"seti.css": true,
				"seti-map.json": true
			}, file)) return {
				ok: false,
				error: "forbidden"
			};
			try {
				return {
					ok: true,
					text: await readFile(join(assetsRoot, file), "utf8")
				};
			} catch (e) {
				return {
					ok: false,
					error: textOf(e)
				};
			}
		}
	};
	const readBodyText = (req) => new Promise((resolve, reject) => {
		let size = 0;
		const chunks = [];
		req.setEncoding("utf8");
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > 10485760) {
				reject(/* @__PURE__ */ new Error("body-too-large"));
				try {
					req.destroy();
				} catch (e) {}
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => resolve(chunks.join("")));
		req.on("error", reject);
	});
	const json = (res, status, value) => {
		res.writeHead(status, {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-cache"
		});
		res.end(JSON.stringify(value));
	};
	const serveAsset = async (req, res, rel) => {
		if (rel === "" || rel.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) {
			res.writeHead(403);
			res.end();
			return;
		}
		try {
			const target = normalize(join(assetsRoot, ...rel.split("/")));
			if (target !== assetsRoot && !target.startsWith(assetsRoot + sep)) {
				res.writeHead(403);
				res.end();
				return;
			}
			const bytes = await readFile(target);
			res.writeHead(200, {
				"content-type": MIME[extname(target).toLowerCase()] || "application/octet-stream",
				"cache-control": "no-cache"
			});
			res.end(bytes);
		} catch (e) {
			res.writeHead(404);
			res.end();
		}
	};
	ctx.effect(() => webServer.register({
		kind: "prefix",
		path: "/wb",
		handler: async (req, res) => {
			const raw = String(req.url === void 0 || req.url === null ? "/" : req.url);
			let pathname;
			try {
				pathname = decodeURIComponent(raw.split("?")[0]);
			} catch (e) {
				res.writeHead(400);
				res.end();
				return;
			}
			const rel = pathname.slice(3).replace(/^[/-]+/, "");
			if (rel.indexOf("api/") === 0) {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				const opName = rel.slice(4);
				const op = ops[opName];
				if (op === void 0) {
					json(res, 404, {
						ok: false,
						error: "unknown-op"
					});
					return;
				}
				try {
					const body = await readBodyText(req);
					const payload = body === "" ? null : JSON.parse(body);
					const result = await op(payload === null ? null : payload.args === void 0 ? payload : payload.args);
					json(res, 200, result);
				} catch (e) {
					json(res, 400, {
						ok: false,
						error: textOf(e)
					});
				}
				return;
			}
			if (req.method !== "GET" && req.method !== "HEAD") {
				res.writeHead(405);
				res.end();
				return;
			}
			await serveAsset(req, res, rel);
		}
	}), "dsh-workbench: /wb route");
}
//#endregion
//#region src/index.ts
const name = "dsh-product-story-studio";
const inject = [
	"connection",
	"webServer",
	"fs",
	"sandboxPolicy",
	"sessions"
];
const Config = Schema.object({ projectRoot: Schema.string().default("").description("作品统一保存目录；留空时使用“文稿/Story Studio”") });
function success(value) {
	return {
		ok: true,
		value
	};
}
function failure(error) {
	return {
		ok: false,
		error: {
			code: "internal",
			message: error instanceof Error ? error.message : String(error),
			details: {}
		}
	};
}
function createStoryStudioRpcHandler(config = {}) {
	return async (endpoint, payload) => {
		try {
			if (endpoint === "describe") return success({ projectRoot: resolveProjectRoot(config) });
			if (endpoint === "createProject") return success(await createStoryProject(config, typeof payload === "object" && payload !== null && "name" in payload ? payload.name : void 0));
			throw new Error(`未知的 Story Studio 操作：${endpoint}`);
		} catch (error) {
			return failure(error);
		}
	};
}
function apply(ctx, config = {}) {
	apply$1(ctx);
	ctx.effect(() => ctx.connection.rpc.handle("/story-studio", createStoryStudioRpcHandler(config), { authority: "loopback" }), "story-studio: project rpc");
}
//#endregion
export { Config, apply, createStoryProject, createStoryStudioRpcHandler, inject, name, normalizeProjectName, projectDirectoryName, resolveProjectRoot };

//# sourceMappingURL=index.js.map
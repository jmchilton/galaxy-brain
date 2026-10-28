// Toolbar popup: launchers for the current tab's GitHub PR or issue, plus new blank agents.
// All vault reads and launches go through the native host in herdr-plugin/src/native.ts.

const HOST = "org.galaxybrain.launcher";

interface Launcher { label: string; agentDir: string; name: string; prompt: string; profile: string }
interface LookupRecord { key: string; repo: string; kind: string; status: string; name: string; title: string; github?: string; obsidian?: string; launchers: Launcher[] }
interface Profile { name: string; agent: string; args: string[] }
interface Lookup { ref?: { repo: string; kind: string; name: string }; records: LookupRecord[]; profiles: Profile[]; agentDirs: string[] }

const app = document.getElementById("app")!;
const statusLine = document.getElementById("status")!;

async function send<T>(request: object): Promise<T> {
	const reply = (await chrome.runtime.sendNativeMessage(HOST, request)) as { ok: boolean; result?: T; error?: string } | undefined;
	if (!reply) throw new Error(chrome.runtime.lastError?.message ?? "no reply from native host");
	if (!reply.ok) throw new Error(reply.error);
	return reply.result as T;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
	const node: HTMLElementTagNameMap[K] = Object.assign(document.createElement(tag), props);
	node.append(...children);
	return node;
}

const button = (label: string, onclick: () => void, className = "") => el("button", { textContent: label, onclick, className });

function show(message: string, isError = false) {
	statusLine.textContent = message;
	statusLine.className = isError ? "error" : "";
}

async function run(label: string, request: object) {
	show(`${label}…`);
	try {
		show((await send<{ message: string }>(request)).message);
	} catch (error) {
		show(String(error instanceof Error ? error.message : error), true);
	}
}

function profileSelect(profiles: Profile[], selected?: string) {
	const select = el("select");
	for (const p of profiles) select.append(el("option", { value: p.name, textContent: `${p.name} — ${p.agent} ${p.args.join(" ")}`, selected: p.name === selected }));
	return select;
}

function launchView(data: Lookup, url: string, record: LookupRecord, index: number) {
	const launcher = record.launchers[index]!;
	const select = profileSelect(data.profiles, launcher.profile);
	const prompt = el("textarea", { value: launcher.prompt });
	app.replaceChildren(
		el("h1", {}, `${launcher.label}`),
		el("div", { className: "meta" }, `${record.repo} ${record.kind} ${record.name} → ${launcher.agentDir} as ${launcher.name}`),
		select,
		prompt,
		el("div", {}, button("🚀 Launch", () => run("Launching", { type: "launch", url, record: record.key, launcher: index, profile: select.value, prompt: prompt.value }), "primary"), button("Back", () => mainView(data, url))),
	);
}

function newAgentView(data: Lookup, url: string, dir: string) {
	const select = profileSelect(data.profiles);
	app.replaceChildren(
		el("h1", {}, `New ${dir} agent`),
		select,
		el("div", {}, button("🚀 Launch", () => run("Launching", { type: "newAgent", dir, profile: select.value }), "primary"), button("Back", () => mainView(data, url))),
	);
}

function recordCard(data: Lookup, url: string, record: LookupRecord) {
	const links = el("div", {});
	if (record.github) links.append(button("🌐 GitHub", () => run("Opening", { type: "open", url: record.github! })));
	if (record.obsidian) links.append(button("📓 Obsidian", () => run("Opening", { type: "open", url: record.obsidian! })));
	return el(
		"div",
		{ className: "record" },
		el("div", { className: "title" }, record.title),
		el("div", { className: "meta" }, `${record.repo} · ${record.kind} · ${record.status}`),
		el("div", {}, ...record.launchers.map((l, i) => button(l.label, () => launchView(data, url, record, i)))),
		links,
	);
}

function heading(ref: NonNullable<Lookup["ref"]>) {
	if (ref.kind === "branches") return `${ref.repo} branch ${ref.name}`;
	return `${ref.repo} ${ref.kind === "reviews" ? "PR" : "issue"} #${ref.name}`;
}

function mainView(data: Lookup, url: string) {
	const ref = data.ref;
	app.replaceChildren(
		el("h1", {}, ref ? heading(ref) : "Galaxy Brain"),
		...data.records.map((r) => recordCard(data, url, r)),
		...(data.records.length ? [] : [el("div", { className: "meta" }, ref ? "No record for this branch." : "Not a PR, issue or branch of a galaxy-brain repository.")]),
		el("h2", {}, "New agent"),
		...data.agentDirs.map((dir) =>
			el("div", { className: "row" }, button("⚡", () => run("Launching", { type: "newAgent", dir })), button("⚙️", () => newAgentView(data, url, dir)), el("span", { className: "label" }, dir)),
		),
	);
}

async function main() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	const url = tab?.url ?? "";
	try {
		mainView(await send<Lookup>({ type: "lookup", url }), url);
	} catch (error) {
		app.textContent = "";
		show(`${error instanceof Error ? error.message : error}\nRun \`make chrome-native-install\` in galaxy-brain?`, true);
	}
}

void main();

export {};

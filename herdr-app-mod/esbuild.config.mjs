import esbuild from "esbuild";
import { statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Herdr app mods `gb-pane` (pane header), `gb-agents` (sidebar), `gb-board` (agent board tab), `gb-record` (record landing page tab), `gb-review` (differential review tab), `gb-repository` (repository tab) and `gb-go` (go-to popup): one ES module each; Herdr provides gpui-kit, gpui-base and herdr.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mods = [
	// One copy per pane, all in the app's one 256 MB script heap: a parser in here costs every pane.
	{ name: "gb-pane", entry: "src/main.ts", json: { place: "none" }, maxBytes: 40_000 },
	{ name: "gb-agents", entry: "src/agents.ts", json: { place: "none", title: "Agents" } },
	{ name: "gb-board", entry: "src/board.ts", json: { place: "none", title: "Agent board" } },
	{ name: "gb-record", entry: "src/record.ts", json: { place: "none", title: "Record" } },
	{ name: "gb-review", entry: "src/review.ts", json: { place: "none", title: "Differential review" } },
	{ name: "gb-repository", entry: "src/repository.ts", json: { place: "none", title: "Repository" } },
	{ name: "gb-go", entry: "src/go.ts", json: { place: "none", title: "Go to", overlay: { kind: "popup", at: "top", offset: 40, width: 640, height: 0.8 } } },
];
for (const mod of mods) {
	await esbuild.build({
		entryPoints: [mod.entry],
		outfile: `dist/${mod.name}/main.js`,
		bundle: true,
		format: "esm",
		target: "es2022",
		external: ["gpui-kit", "gpui-base", "herdr"],
		define: { __GB_ROOT__: JSON.stringify(root) },
		logLevel: "info",
	});
	const { size } = statSync(`dist/${mod.name}/main.js`);
	if (size > (mod.maxBytes ?? Infinity)) throw new Error(`${mod.name} is ${size} bytes, over its ${mod.maxBytes}`);
	writeFileSync(`dist/${mod.name}/mod.json`, `${JSON.stringify(mod.json)}\n`);
}

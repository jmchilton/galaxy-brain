import esbuild from "esbuild";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Herdr app mods `gb-pane` (pane header), `gb-agents` (sidebar), `gb-board` (agent board tab), `gb-record` (record landing page tab) and `gb-review` (differential review tab): one ES module each; Herdr provides gpui-kit, gpui-base and herdr.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mods = [
	{ name: "gb-pane", entry: "src/main.ts", json: { place: "none" } },
	{ name: "gb-agents", entry: "src/agents.ts", json: { place: "none", title: "Agents" } },
	{ name: "gb-board", entry: "src/board.ts", json: { place: "none", title: "Agent board" } },
	{ name: "gb-record", entry: "src/record.ts", json: { place: "none", title: "Record" } },
	{ name: "gb-review", entry: "src/review.ts", json: { place: "none", title: "Differential review" } },
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
	writeFileSync(`dist/${mod.name}/mod.json`, `${JSON.stringify(mod.json)}\n`);
}

import esbuild from "esbuild";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Herdr app mods `gb-pane` (pane header) and `gb-agents` (sidebar): one ES module each; Herdr provides gpui-kit, gpui-base and herdr.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mods = [
	{ name: "gb-pane", entry: "src/main.ts", json: { place: "none" } },
	{ name: "gb-agents", entry: "src/agents.ts", json: { place: "none", title: "Agents" } },
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

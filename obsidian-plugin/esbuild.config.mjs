import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import esbuild from "esbuild";

// Builds straight into the vault so Obsidian loads the plugin from source.
const outdir = "../vault/.obsidian/plugins/galaxy-brain";
const production = process.argv[2] === "production";

mkdirSync(outdir, { recursive: true });
const copyStatic = {
	name: "copy-static",
	setup(build) {
		build.onEnd(() => {
			copyFileSync("manifest.json", `${outdir}/manifest.json`);
			// Obsidian loads one styles.css: the plugin's, then diff2html's and the differential-review view's.
			const css = ["styles.css", "node_modules/diff2html/bundles/css/diff2html.min.css", "src/diff-review.css"];
			writeFileSync(`${outdir}/styles.css`, css.map((file) => readFileSync(file, "utf8").trimEnd() + "\n").join("\n"));
		});
	},
};

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: ["obsidian", "electron", "child_process", "fs", "os", "@codemirror/*", "@lezer/*"],
	format: "cjs",
	target: "es2020",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	outfile: `${outdir}/main.js`,
	plugins: [copyStatic],
	logLevel: "info",
});

if (production) {
	await context.rebuild();
	await context.dispose();
} else {
	await context.watch();
}

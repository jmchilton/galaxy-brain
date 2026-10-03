import { copyFileSync, mkdirSync } from "node:fs";
import esbuild from "esbuild";

// Builds straight into the vault so Obsidian loads the plugin from source.
const outdir = "../vault/.obsidian/plugins/galaxy-brain";
const production = process.argv[2] === "production";

mkdirSync(outdir, { recursive: true });
const copyStatic = {
	name: "copy-static",
	setup(build) {
		build.onEnd(() => {
			for (const file of ["manifest.json", "styles.css"]) copyFileSync(file, `${outdir}/${file}`);
		});
	},
};

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
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

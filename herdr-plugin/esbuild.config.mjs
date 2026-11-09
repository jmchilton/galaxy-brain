import esbuild from "esbuild";

// `herdr plugin link` runs no build: run `make herdr-plugin-build` after pulling.
// One `yaml` for the sibling packages' sources too, each of which has its own node_modules.
const common = { bundle: true, platform: "node", format: "cjs", target: "node20", logLevel: "info", alias: { yaml: "./node_modules/yaml" } };
await esbuild.build({ ...common, entryPoints: ["src/cli.ts"], outfile: "dist/galaxy-brain.cjs" });
// Chrome extension native messaging host (chrome-extension/).
await esbuild.build({ ...common, entryPoints: ["src/native.ts"], outfile: "dist/native-host.cjs" });

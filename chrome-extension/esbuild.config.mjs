import esbuild from "esbuild";

// Load chrome-extension/ unpacked in chrome://extensions after building.
await esbuild.build({
	entryPoints: ["src/popup.ts"],
	bundle: true,
	format: "iife",
	target: "chrome120",
	outfile: "dist/popup.js",
	logLevel: "info",
});

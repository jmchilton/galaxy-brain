// HostDeps["run"] on this machine: spawns the command, or only reports it under GB_DRY_RUN.

import { spawnSync } from "node:child_process";
import type { HostDeps } from "./native-host";

export const hostRun: HostDeps["run"] = (argv) => {
	if (process.env.GB_DRY_RUN) return { status: 0, stdout: `Dry run: ${JSON.stringify(argv)}`, stderr: "" };
	const result = spawnSync(argv[0]!, argv.slice(1), { encoding: "utf8", timeout: 120_000 });
	return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr || result.error?.message || "" };
};

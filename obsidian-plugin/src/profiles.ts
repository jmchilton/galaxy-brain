// Agent profiles from vault/agents/_shared/AGENT_PROFILES.yml: agent kind plus model, effort and extra args.

import type { AgentKind, Launcher } from "./launchers";

export interface Profile {
	name: string;
	agent: AgentKind;
	model?: string;
	effort?: string;
	args: string[];
}

/** Used when the profiles file is missing or empty. */
export const FALLBACK_PROFILES: Profile[] = [
	{ name: "Claude", agent: "claude", args: [] },
	{ name: "Codex", agent: "codex", args: [] },
];

const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : undefined);

/** Profiles from the parsed YAML; entries without a name or a known agent are skipped. */
export function parseProfiles(data: unknown): Profile[] {
	const entries = (data as { profiles?: unknown } | null)?.profiles;
	if (!Array.isArray(entries)) return [];
	return entries.flatMap((entry: Record<string, unknown>) => {
		const name = text(entry?.name);
		const agent = entry?.agent;
		if (!name || (agent !== "claude" && agent !== "codex")) return [];
		const model = text(entry.model);
		const effort = text(entry.effort);
		const args = Array.isArray(entry.args) ? entry.args.map(String) : [];
		return [{ name, agent, ...(model ? { model } : {}), ...(effort ? { effort } : {}), args }];
	});
}

/** Command-line arguments for the agent. */
export function profileArgs(profile: Profile): string[] {
	const args: string[] = [];
	if (profile.agent === "claude") {
		if (profile.model) args.push("--model", profile.model);
		if (profile.effort) args.push("--effort", profile.effort);
	} else {
		if (profile.model) args.push("-m", profile.model);
		if (profile.effort) args.push("-c", `model_reasoning_effort="${profile.effort}"`);
	}
	return [...args, ...profile.args];
}

export function defaultProfile(profiles: Profile[], launcher: Launcher): Profile {
	return profiles.find((profile) => profile.name === launcher.profile) ?? profiles[0] ?? FALLBACK_PROFILES[0]!;
}

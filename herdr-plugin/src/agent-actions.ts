// Record launchers as prompts for an agent already running in their agent dir (suggested-prompts 🚀 menu).

import type { Launcher } from "../../obsidian-plugin/src/launchers";
import { UNTRACKED } from "../../obsidian-plugin/src/launchers";

export interface AgentAction {
	label: string;
	prompt: string;
}

/** The agent dir's launchers, {repo}/{kind} filled, wrapped so Claude resolves the record from the conversation. */
export function agentActions(launchers: Launcher[], agentDir: string, vaultRoot: string): AgentAction[] {
	return launchers
		.filter((launcher) => launcher.agentDir === agentDir)
		.map((launcher) => {
			const fixed: Record<string, string | null> = { repo: launcher.repo, kind: launcher.kind };
			const template = launcher.prompt.replace(/\{(repo|kind)\}/g, (whole, key: string) => fixed[key] ?? whole);
			const statuses = launcher.statuses.length ? ` (status ${launcher.statuses.join(", ")})` : "";
			const scope = `${launcher.repo ?? "any repo's"} ${launcher.kind} record${statuses}`;
			const lines = [
				`Template action for a ${scope}. Take the most recent such record we've discussed; if none is clear, ask me which one. Fill its placeholders, then run the filled prompt.`,
				`{name}: branch name, PR or issue number; {status}: its status directory; {record}: its absolute directory, ${vaultRoot}/repositories/${launcher.repo ?? "{repo}"}/${launcher.kind}/<status>/<name>.`,
			];
			if (launcher.statuses.includes(UNTRACKED)) lines.push(`{record} is empty for an untracked ${launcher.kind === "issues" ? "issue" : "PR"} (no record yet).`);
			return { label: launcher.label, prompt: `${lines.join("\n")}\n\n${template}` };
		});
}

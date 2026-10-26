// Picker pane env from the action's invocation context: a clicked or highlighted URL, or a filter query.

import { parseGithubRef } from "./github-ref";

const MAX_QUERY = 200;

export function pickerEnv(contextJson: string | undefined): { GB_URL?: string; GB_QUERY?: string } {
	let context: { clicked_url?: unknown; selected_text?: unknown };
	try {
		context = JSON.parse(contextJson ?? "{}");
	} catch {
		return {};
	}
	if (typeof context.clicked_url === "string") return { GB_URL: context.clicked_url };
	const selected = typeof context.selected_text === "string" ? context.selected_text.replace(/\s+/g, " ").trim() : "";
	if (!selected) return {};
	if (parseGithubRef(selected)) return { GB_URL: selected };
	return { GB_QUERY: selected.slice(0, MAX_QUERY) };
}

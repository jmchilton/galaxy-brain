// SUGGESTED_PROMPTS.md: `## Label` sections (body is the prompt, the label when empty), else top-level bullets.
// Same format as the suggested-prompts Claude plugin.

export interface SuggestedPrompt {
	label: string;
	text: string;
}

export function parsePrompts(markdown: string): SuggestedPrompt[] {
	const lines = markdown.split(/\r?\n/);
	const sections: SuggestedPrompt[] = [];
	let label: string | null = null;
	let body: string[] = [];
	const flush = () => {
		if (label === null) return;
		const text = unfence(body.join("\n").trim());
		sections.push({ label, text: text || label });
	};
	let fenced = false;
	for (const line of lines) {
		if (line.startsWith("```")) fenced = !fenced;
		const heading = fenced ? null : /^##\s+(.+?)\s*$/.exec(line);
		if (heading) {
			flush();
			label = heading[1] ?? "";
			body = [];
		} else if (label !== null) {
			body.push(line);
		}
	}
	flush();
	if (sections.length > 0) return sections;
	return lines
		.map((line) => /^[-*]\s+(.+?)\s*$/.exec(line)?.[1])
		.filter((text): text is string => Boolean(text))
		.map((text) => ({ label: text, text }));
}

function unfence(text: string): string {
	return /^```[^\n]*\n([\s\S]*?)\n```$/.exec(text)?.[1] ?? text;
}

/** The label's leading emoji when it starts with exactly one, then a space. */
export function quickEmoji(label: string): string | undefined {
	return /^(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)\s+(?!\p{Extended_Pictographic})/u.exec(label)?.[1];
}

/** Prompt lists in order, skipping any whose text an earlier one already has. */
export function mergePrompts(lists: SuggestedPrompt[][]): SuggestedPrompt[] {
	const found: SuggestedPrompt[] = [];
	for (const one of lists.flat()) if (!found.some((seen) => seen.text === one.text)) found.push(one);
	return found;
}

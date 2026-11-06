// GitHub autolinks, shared by render.ts and the Herdr app's markdown. No dependencies.

/** `owner/repo#123`, `#123` (needs a default repo), `@user`. */
export const GITHUB_REF = /(?<![\w/@.#])(?:([A-Za-z0-9][\w.-]*\/[\w.-]+)#(\d+)|#(\d+)|@([A-Za-z0-9][A-Za-z0-9-]*))\b/g;

/** `repo` is the "owner/name" that bare numbers resolve against. */
export function githubRefHref(match: RegExpMatchArray, repo: string | undefined): string | null {
	const [, refRepo, refNumber, bareNumber, user] = match;
	if (refRepo) return `https://github.com/${refRepo}/issues/${refNumber}`;
	if (bareNumber) return repo ? `https://github.com/${repo}/issues/${bareNumber}` : null;
	return `https://github.com/${user}`;
}

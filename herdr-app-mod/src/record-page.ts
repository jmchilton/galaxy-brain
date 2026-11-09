// Pure parts of the gb-record mod, a record's landing page.

export type LinkTarget = { file: string } | { vault: string } | { url: string };

export const recordTabName = (ref: string) => `📓 ${ref}`;

export const reviewTabName = (ref: string) => `🔎 ${ref}`;

/** The text after a leading `# ` heading, which the page's header already shows. */
export const withoutTitle = (text: string): string => text.replace(/^# .*\n+/, "");

export const isImagePath =(path: string): boolean => /\.(?:png|jpe?g|gif|webp|svg)$/i.test(path);

/** Joins relative to `base` (`/`-separated); null if `..` climbs past the root. */
function resolve(base: string[], path: string): string[] | null {
	const parts = [...base];
	for (const part of path.split("/")) {
		if (part === "..") {
			if (!parts.length) return null;
			parts.pop();
		} else if (part && part !== ".") parts.push(part);
	}
	return parts;
}

/** Where a link in a record's file goes; null for anything else. `files` are record-relative. */
export function linkTarget(url: string, page: { vault: string; dir: string; current: string; files: string[] }): LinkTarget | null {
	if (/^https?:\/\//.test(url)) return { url };
	const path = decodeURI(url.replace(/^file:\/\//, "").replace(/[?#].*$/, ""));
	if (!path || /^[a-z][a-z+.-]*:/i.test(path)) return null;
	const folder = [...page.dir.split("/"), ...page.current.split("/").slice(0, -1)];
	const absolute = path.startsWith(`${page.vault}/`) ? path.slice(page.vault.length + 1) : path.startsWith("/") ? null : resolve(folder, path)?.join("/");
	if (!absolute) return null;
	const rel = absolute.startsWith(`${page.dir}/`) ? absolute.slice(page.dir.length + 1) : null;
	return rel && page.files.includes(rel) ? { file: rel } : { vault: absolute };
}

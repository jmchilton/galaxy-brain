// Differential-review TextFileAdapter over Obsidian's vault adapter (no fs: the plugin also loads on mobile).
import type { TextFileAdapter } from "../../differential-review-lib/src/core";

/** The slice of Obsidian's DataAdapter used here; paths are vault-relative. */
export interface VaultAdapter {
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
	mkdir(path: string): Promise<void>;
	list(path: string): Promise<{ files: string[]; folders: string[] }>;
}

/** `onWrite` sees every write, so the view can tell its own modify events from other writers'. */
export function vaultFileAdapter(adapter: VaultAdapter, onWrite?: (path: string, data: string) => void): TextFileAdapter {
	return {
		exists: (path) => adapter.exists(path),
		read: (path) => adapter.read(path),
		async write(path, data) {
			const parent = path.slice(0, Math.max(0, path.lastIndexOf("/")));
			if (parent && !(await adapter.exists(parent))) await adapter.mkdir(parent);
			onWrite?.(path, data);
			await adapter.write(path, data);
		},
		async listFiles(dir) {
			if (!(await adapter.exists(dir))) return [];
			const { files } = await adapter.list(dir);
			return files.map((file) => file.slice(file.lastIndexOf("/") + 1));
		},
	};
}

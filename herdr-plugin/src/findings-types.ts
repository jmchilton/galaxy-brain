// The findings panel's requests and reply, free of Node so the Herdr app's record tab can share them.
import type { Landing } from "../../review-factory/src/landing";
import type { Action } from "../../review-factory/src/model";

export interface FindingsPanel {
	round: number;
	/** Its name, record-relative. */
	file: string;
	/** Null while the file has errors. */
	landing: Landing | null;
	errors: string[];
}

/** Sets a value, never flips one, so a click on a stale panel can't undo a newer edit. */
export type FindingsChange = { id: string; include: boolean } | { action: Action; checked: boolean };

export type FindingsEdit = { ref: string; round: number } & FindingsChange;

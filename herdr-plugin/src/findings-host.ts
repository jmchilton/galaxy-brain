// The Herdr app's findings panel, in Node, which holds the YAML parser: a review record's latest findings round,
// and edits that each splice one boolean in it.

import { join } from "node:path";
import { parseDocument } from "yaml";
import { landing } from "../../review-factory/src/landing";
import { ACTIONS } from "../../review-factory/src/model";
import { findingsName, latestRound, loadRecord } from "../../review-factory/src/record";
import { setAction, setInclude } from "../../review-factory/src/toggle";
import type { FindingsEdit, FindingsPanel } from "./findings-types";
import { reviewRecordDir } from "./review-host";

function reviewDir(vaultRoot: string, ref: string): string {
	const dir = ref.split("/")[1] === "reviews" ? reviewRecordDir(vaultRoot, ref) : null;
	if (!dir) throw new Error(`no review record ${ref}`);
	return dir;
}

/** Null when the record has no findings YAML. */
export function findingsPanel(vaultRoot: string, ref: string): FindingsPanel | null {
	const dir = reviewDir(vaultRoot, ref);
	const round = latestRound(join(vaultRoot, dir));
	if (round === null) return null;
	const { ctx, errors } = loadRecord(join(vaultRoot, dir));
	return { round, file: findingsName(round), landing: ctx && landing(ctx), errors };
}

/** The file's vault path and its change; undefined when the finding is gone. */
export function findingsEdit(vaultRoot: string, edit: FindingsEdit): { path: string; change: (text: string) => string } | undefined {
	const dir = reviewDir(vaultRoot, edit.ref);
	const round = latestRound(join(vaultRoot, dir));
	if (round !== edit.round) throw new Error(`${round === null ? "there's no findings YAML" : `${findingsName(round)} is the latest round`} now; reload`);
	if ("action" in edit && !ACTIONS.includes(edit.action)) throw new Error(`unknown action ${edit.action}`);
	const { ctx } = loadRecord(join(vaultRoot, dir));
	if (!ctx) throw new Error(`fix ${findingsName(round)} first`);
	const path = join(dir, findingsName(round));
	if ("action" in edit) return { path, change: (text) => setAction(text, edit.action, edit.checked, parseDocument) };
	if (!ctx.file.findings.some((f) => f.id === edit.id)) return undefined;
	return { path, change: (text) => setInclude(text, edit.id, edit.include, parseDocument) };
}

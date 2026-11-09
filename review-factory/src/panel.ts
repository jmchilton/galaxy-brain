// The apps' findings panel for a record directory: its latest round's landing, and edits that each splice one boolean.
import { parseDocument } from "yaml";
import { type FindingsChange, type FindingsPanel, landing } from "./landing";
import { ACTIONS } from "./model";
import { findingsName, latestRound, loadRecord } from "./record";
import { setAction, setInclude } from "./toggle";

/** Null when the record has no findings YAML. */
export function findingsPanel(dir: string): FindingsPanel | null {
  const round = latestRound(dir);
  if (round === null) return null;
  const { ctx, errors } = loadRecord(dir);
  return { round, file: findingsName(round), landing: ctx && landing(ctx), errors };
}

/** The file's name and its change; undefined when the finding is gone. */
export function findingsEdit(dir: string, edit: { round: number } & FindingsChange): { file: string; change: (text: string) => string } | undefined {
  const round = latestRound(dir);
  if (round !== edit.round) throw new Error(`${round === null ? "there's no findings YAML" : `${findingsName(round)} is the latest round`} now; reload`);
  if ("action" in edit && !ACTIONS.includes(edit.action)) throw new Error(`unknown action ${edit.action}`);
  const { ctx } = loadRecord(dir);
  if (!ctx) throw new Error(`fix ${findingsName(round)} first`);
  const file = findingsName(round);
  if ("action" in edit) return { file, change: (text) => setAction(text, edit.action, edit.checked, parseDocument) };
  if (!ctx.file.findings.some((f) => f.id === edit.id)) return undefined;
  return { file, change: (text) => setInclude(text, edit.id, edit.include, parseDocument) };
}

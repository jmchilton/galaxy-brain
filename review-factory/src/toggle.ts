// Flip one boolean in findings YAML by splicing its source range, so the rest of the text is untouched. No Node imports.
import type { Document, parseDocument as ParseDocumentFn } from "yaml";
import type { Action } from "./model";

/** `yaml`'s parseDocument, injected so callers that can't bundle `yaml` still type-check. */
export type ParseDocument = typeof ParseDocumentFn;

interface ScalarNode {
  value: unknown;
  range?: [number, number, number] | null;
}

function load(text: string, parse: ParseDocument): Document.Parsed {
  const doc = parse(text, { keepSourceTokens: true });
  if (doc.errors.length) throw new Error(`findings YAML doesn't parse: ${doc.errors[0]!.message.split("\n")[0]}`);
  return doc;
}

function splice(text: string, node: unknown, value: boolean, what: string): string {
  const scalar = node as ScalarNode | undefined;
  if (!scalar?.range || typeof scalar.value !== "boolean") throw new Error(`${what} isn't true or false`);
  if (scalar.value === value) return text;
  return text.slice(0, scalar.range[0]) + String(value) + text.slice(scalar.range[1]);
}

export function setInclude(text: string, id: string, include: boolean, parse: ParseDocument): string {
  const doc = load(text, parse);
  const findings = (doc.toJS() as { findings?: Array<{ id?: unknown }> }).findings ?? [];
  const index = findings.findIndex((f) => f?.id === id);
  if (index < 0) throw new Error(`no finding ${id}`);
  return splice(text, doc.getIn(["findings", index, "include"], true), include, `${id} include`);
}

export function setAction(text: string, action: Action, on: boolean, parse: ParseDocument): string {
  const doc = load(text, parse);
  return splice(text, doc.getIn(["actions", action], true), on, `action ${action}`);
}

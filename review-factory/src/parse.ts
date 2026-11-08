// Findings YAML text to a decoded file, with every problem as a readable error. No Node imports.
import { LineCounter, parseDocument, visit } from "yaml";
import { decodeFindings, type FindingsFile } from "./model";

const HEXISH = /^[0-9a-f]{7,40}$/;

export interface Parsed {
  file: FindingsFile | null;
  errors: string[];
}

export function parseFindings(text: string): Parsed {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, prettyErrors: false });
  const at = (offset: number) => {
    const { line, col } = lineCounter.linePos(offset);
    return `line ${line}, column ${col}`;
  };
  if (doc.errors.length) return { file: null, errors: doc.errors.map((e) => `${at(e.pos[0])}: ${e.message.split("\n")[0]}`) };
  const errors: string[] = [];
  visit(doc, {
    Scalar(_key, node) {
      // A short SHA like 1234567 or 8e12345 parses as a number.
      if (typeof node.value === "number" && node.source && HEXISH.test(node.source)) node.value = node.source;
      const multiLine = typeof node.value === "string" && node.value.trimEnd().includes("\n");
      if (multiLine && node.type !== "BLOCK_LITERAL" && node.type !== "BLOCK_FOLDED" && node.range) {
        errors.push(`${at(node.range[0])}: multi-line text must be a block scalar (\`|\`)`);
      }
    },
  });
  if (errors.length) return { file: null, errors };
  return decodeFindings(doc.toJS());
}

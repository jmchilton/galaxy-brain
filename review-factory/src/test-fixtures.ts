// Fixtures under src/fixtures, and compose contexts built from them, for tests.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComposeContext } from "./gates";
import type { Finding, FindingsFile } from "./model";
import { parseFindings } from "./parse";

export const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", name), "utf8");

export function file24706(): FindingsFile {
  const { file, errors } = parseFindings(fixture("24706/review_0_findings.yml"));
  if (!file) throw new Error(errors.join("\n"));
  return file;
}

export const finding = (file: FindingsFile, id: string): Finding => {
  const found = file.findings.find((f) => f.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};

export function context24706(edit: (file: FindingsFile) => void = () => {}): ComposeContext {
  const file = file24706();
  edit(file);
  return {
    file,
    repo: "galaxy",
    pr: 24706,
    commentNote: fixture("24706/johns_review_0_comment_note.md"),
    prNote: null,
    humanReview: null,
    risks: fixture("24706/risks.md"),
    followupIssue: null,
    learningIssue: false,
  };
}

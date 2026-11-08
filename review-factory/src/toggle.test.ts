import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";
import { parseFindings } from "./parse";
import { fixture } from "./test-fixtures";
import { setAction, setInclude } from "./toggle";

const changedLines = (a: string, b: string): number => {
  const x = a.split("\n");
  const y = b.split("\n");
  return x.filter((line, i) => line !== y[i]).length + Math.max(0, y.length - x.length);
};

describe("toggle", () => {
  const hand = fixture("hand-styled.yml");

  it("changes one line of hand-styled YAML to drop a finding", () => {
    const out = setInclude(hand, "P3 1", false, parseDocument);
    expect(changedLines(hand, out)).toBe(1);
    expect(out).toContain("      include:  false\n");
    const { file } = parseFindings(out);
    expect(file!.findings.map((f) => f.include)).toEqual([true, false]);
    expect(file!.findings[0]!.issue).toBe(parseFindings(hand).file!.findings[0]!.issue);
  });

  it("toggles an action inside a flow mapping", () => {
    const out = setAction(hand, "push", true, parseDocument);
    expect(changedLines(hand, out)).toBe(1);
    expect(parseFindings(out).file!.actions.push).toBe(true);
  });

  it("is a no-op when the value already matches", () => {
    expect(setInclude(hand, "P2 1", true, parseDocument)).toBe(hand);
  });

  it("refuses an unknown finding and unparseable text", () => {
    expect(() => setInclude(hand, "P1 9", false, parseDocument)).toThrow("no finding P1 9");
    expect(() => setInclude("findings: [", "P2 1", false, parseDocument)).toThrow(/doesn't parse/);
  });
});

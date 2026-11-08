import { describe, expect, it } from "vitest";
import { trimLine, trimWork } from "./status";
import { file24706, finding } from "./test-fixtures";

describe("trimWork", () => {
  it("has nothing to do once the latest revision matches the toggles", () => {
    expect(trimWork(file24706())).toEqual({ drop: [], restore: [], ask: [] });
    expect(trimLine(file24706())).toBeNull();
  });

  it("drops a commit whose findings are all excluded", () => {
    const file = file24706();
    finding(file, "P3 2").include = false;
    expect(trimWork(file).drop).toEqual([{ sha: "bef11669426", findings: ["P3 2"] }]);
    expect(trimLine(file)).toBe("✂️ Trim: drop bef11669426 (P3 2)");
  });

  it("restores a re-included finding's commit from an earlier revision", () => {
    const file = file24706();
    finding(file, "P2 3").include = true;
    finding(file, "P3 2").include = false;
    expect(trimWork(file).restore).toEqual([{ sha: "980601a356c", revision: 0, findings: ["P2 3"] }]);
    expect(trimLine(file)).toBe("✂️ Trim: drop bef11669426 (P3 2), restore 980601a356c (P2 3)");
  });

  it("asks John about a commit shared by an included and an excluded finding", () => {
    const file = file24706();
    file.branches.at(-1)!.commits[0]!.findings.push("P3 9");
    finding(file, "P3 9").include = false;
    expect(trimWork(file).ask).toEqual([{ sha: "627e17e0be1", included: ["P3 1"], excluded: ["P3 9"] }]);
    expect(trimLine(file)).toBe("✂️ Trim: ask John about 627e17e0be1 (keeps P3 1, drops P3 9)");
  });

  it("needs nothing for an included finding that never had a commit", () => {
    const file = file24706();
    file.branches.at(-1)!.commits.splice(0, 1);
    file.branches[0]!.commits.splice(0, 1);
    expect(trimWork(file)).toEqual({ drop: [], restore: [], ask: [] });
  });
});

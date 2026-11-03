// Corpus sweep used for the PR's false-positive claim; run as a vitest file from packages/schema/test/. Paths are this machine's.

import { it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";
import { checkInputPaths } from "../src/user-tool-source/input-paths.js";
it("sweep", () => {
  const files = readFileSync("/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-workflow-libs/84975f3e-10d1-42df-8b14-fb32892a8be5/scratchpad/foundry_udts.txt", "utf8").trim().split("\n");
  const out: string[] = [];
  let tools = 0; const perSource: Record<string, number> = {}; const hits: Record<string, number> = {}; const hitTools: Record<string, number> = {};
  const visit = (node: unknown, file: string) => {
    if (Array.isArray(node)) return node.forEach((n) => visit(n, file));
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (o.class === "GalaxyUserTool" || o.class === "GalaxyTool") {
      tools++; const src = file.includes("corpus/galaxy") ? "galaxy" : file.includes("foundry-runs") ? "foundry-runs" : file.includes("/foundry") ? "foundry" : "repo"; perSource[src] = (perSource[src] ?? 0) + 1; const n = checkInputPaths(o).length; if (n) { hitTools[src] = (hitTools[src] ?? 0) + 1; hits[src] = (hits[src] ?? 0) + n; }
      for (const e of checkInputPaths(o)) out.push(file + " [" + String(o.id) + "] " + e.path + ": " + e.message);
    }
    Object.values(o).forEach((v) => visit(v, file));
  };
  for (const f of files) {
    let docs: unknown[] = [];
    try { docs = [parse(readFileSync(f, "utf8"))]; } catch (e) { out.push("PARSE " + f + " " + String(e).slice(0, 80)); }
    docs.forEach((d) => visit(d, f));
  }
  writeFileSync("/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-workflow-libs/84975f3e-10d1-42df-8b14-fb32892a8be5/scratchpad/sweep.out", "tools=" + tools + " " + JSON.stringify({perSource, hitTools, hits}) + "\n" + out.join("\n") + "\n");
});

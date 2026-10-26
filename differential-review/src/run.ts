// galaxy-brain's differential-review CLI: the package's commands, targeted at vault records (--record).
import { resolve } from "node:path";
import { createCli, required, type TargetFlags } from "../../differential-review-lib/src/cli/index.js";
import { recordReviewDir } from "../../site/src/lib/records";
import { chooseBase, readRecord } from "./record";

export const RECORD_TARGET: TargetFlags = {
  options: { record: { type: "string" } },
  usage: "--record <dir>",
  help: "  --record <dir>    record dir: vault/repositories/<repo>/{branches,reviews}/<status>/<name>",
  worktreeHelp: "the branch's worktree (default: current dir, which must be on a branch record's branch)",
  baseHelp: "diff base, overriding the record's parent_branch / upstream_base_branch (required for reviews)",
  resolve(values, _worktree, worktreeDefaulted) {
    const dir = resolve(required(values, "record"));
    const record = readRecord(dir);
    return {
      dir: recordReviewDir(dir),
      branch: record.branch,
      repo: record.repo,
      base: (option) => chooseBase(record, option),
      // A cwd-defaulted worktree must be on the record's branch: an agent in the vault mustn't snapshot galaxy-brain's HEAD.
      branchCheck: record.kind === "reviews" ? "off" : worktreeDefaulted ? "require" : "warn",
      branchLabel: "record",
    };
  },
};

export const run = createCli(RECORD_TARGET);

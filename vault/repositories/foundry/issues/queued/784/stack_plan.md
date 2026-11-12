# Source-parity stack plan (2026-11-11)

John asked for serial Opus/high subagents that produce draft PRs for #781, #796, #798, #784, plus parallel workflow-diff PRs in gxformat2 and galaxy-tool-util-ts (workflow_libs `WORK_HORSE.md`). The coordinator (wf_foundry session) runs every step as its own subagent, because subagents can't launch their own, and handles galaxy-brain git.

## Order

1. **gxformat2 `diff`** (workflow_libs): Python diff of two Format2 workflows (draft or final); declarative expectations `gxformat2/examples/expectations/diff.yml`.
2. **galaxy-tool-util-ts `gxwf diff`** (workflow_libs): TS port, synced fixtures, `--json`. Draft PRs on both repos, cross-linked.
3. **foundry #781**: template copies `resolved_args` verbatim into `_plan_state`.
4. **foundry #796** (parent #781): draft snapshot + `run-workflow-test` green check uses `gxwf diff --json`; a removed step without a `kind: dropped` entry naming its `step` fails. Bundle the ledger note; `validation_failed` hint. Parts 1–2 only.
5. **foundry #798** (parent #796): interface Mold records scope `decisions` plus `kind: dropped` entries for excluded branches.
6. **foundry #784** (parent #798): new report-only Nextflow parity Mold.

Foundry PRs target `main` from the `jmchilton` fork and say "depends on #X". Each diff includes its parents' commits.

## Per-branch steps (each its own subagent, Opus, high effort)

Implement → normal review → `/codex-review` → thermo-nuclear (if >50 lines of code) → Foundry only: domain review (`wf_foundry/reviewers/DOMAIN_REVIEW.md`) and documentation review (`.agents/skills/foundry-documentation/SKILL.md`) → polish (description, titles, tags) → strengthen → draft PR.

## Diff contract (both libraries)

Compare two Format2 workflows, BEFORE and AFTER. Either may be a `GalaxyWorkflowDraft`. Steps are matched by label; `_plan_*` fields are ignored for comparison but reported per step.

Report:
- inputs, outputs and steps that were added or removed
- per-step changes to `tool_id`/`tool_version`, `state` keys and values, `when`, and connections
- AFTER inputs that feed no step

JSON output with a declared shape, plus human-readable text.

## Notes from earlier branches (for the later ones)

- **gxformat2 #296 / gxwf #233:** both diffs are draft PRs. Foundry pins published `@galaxy-tool-util/cli` `^1.15`, so `gxwf diff` isn't usable in Foundry CI until a release. Contract: "Contract decisions" in `gxformat2/branches/active/issue_295_workflow_diff/implementation_debrief.md`.
- **#781** (`issue-781-plan-state-resolved-args`):
  - `_plan_state` stays a string. It holds a YAML doc `{resolved_args: [one-line JSON objects], intent}`.
  - Per-flag ledger records carry `source_arg {step, process, invoked_as?, key, selector, flags?}`. They never set a top-level `step`.
  - **#796:** match dropped *steps* on top-level `step` only, and ignore entries that carry `source_arg`.
  - **#784:** join flag records on `source_arg`. Read the flags from `summary-nextflow.json`, since `_plan_state` is stripped at extract.
  - **#798:** keep scope decisions and drops distinguishable from flag records.
  - After #781's review:
    - Only one `ext.*` assignment per key wins, by Nextflow selector precedence.
    - An overridden entry gets one `not_applicable` record with no `flags`, so #784 must join across `decisions` and `entries`.
    - A same-rank tie is an open plain gap with a top-level `step` and no `source_arg`. It isn't `kind: dropped`, so #796 ignores it.
  - After codex review: `source_arg` also carries `config` and, when set, `profile`. The #784 join key includes both.

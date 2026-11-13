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
  - `_plan_state` stays a string. It holds a YAML doc `{calls: [call paths, one-line JSON array], resolved_args: [one-line JSON objects], intent}`.
  - `summarize-nextflow` ranks per call (2026-11-12, John's call):
    - Every `resolved_args` entry has an `id`, e.g. `conf/modules.config#withName:SAMTOOLS_VIEW_MAP_MAP/args`.
    - `processes[].effective_args: [{call, key, ids, tie?}]` names the entries that take effect. `call` is Nextflow's fully qualified call name (= `task.process`), traced from the entry workflow through subworkflow aliases, e.g. `NFCORE_BAMTOFASTQ:BAMTOFASTQ:ALIGNMENT_TO_FASTQ:SAMTOOLS_VIEW_MAP_MAP`; one call name used from two subworkflows has two rows. Priority: withLabel < withName(process) < withName(alias) < withName(whole path), whole-name matching. At the same rank a selected profile beats root (legacy parser order; strict-parser caveat documented), unless root also declares the profile's selector: then it replaces only that selector's root entries and can tie another root selector. Ties remain only for two root configs, two selected profiles, or two different selectors at one rank (including that profile case).
    - The template copies only effective entries (with `id`, plus `tie: true` from tie rows) into `_plan_state`, and writes the step's call paths in `calls`.
  - Per-flag ledger records carry `source_arg {step, arg, flags?}`, where `arg` is the entry `id`. They never set a top-level `step`. Records are either `decisions` (`carried` / `not_applicable`) or `entries` (`kind: dropped`, or a tie gap with no `kind`). Overridden entries get no record.
  - **#796:** match dropped *steps* on top-level `step` only, and ignore entries that carry `source_arg`. Tie gaps carry `source_arg`, so they're ignored too.
  - **#784:** join flag records on `source_arg.step` + `source_arg.arg` across `decisions` and `entries`. Read flags and the effective set from `summary-nextflow.json` (`effective_args`), since `_plan_state` is stripped at extract. Overridden entries are `resolved_args` minus `effective_args`. Map a step to its calls with `_plan_state.calls` from the pre-extract draft snapshot, joined to `effective_args[].call`; ids alone don't identify a call.
  - **#798:** keep scope decisions and drops distinguishable from flag records, which carry `source_arg`.
- **Local gate:** run `npm run packages-build` before `make casts` / `make check`. A stale `packages/*/dist` let stale casts pass the gate. Children rebase onto #781 and regenerate casts rather than resolving cast conflicts by hand.
- **#796** (`issue-796-test-phase-removed-steps`, parent #781). There are two snapshots, both written by advance rev 14:
  - `galaxy-workflow-draft.snapshot.gxwf.yml`: the pre-loop draft, `_plan_*` intact. **#784 diffs this against the final workflow.**
  - `galaxy-workflow.extracted.gxwf.yml`: the first extract. The gate diffs this.

  The gate itself is `foundry check-step-removals <diff.json> <ledger.yml>`, which exits 4 on unlabelled removals. `_plan_state.calls` shows up in `steps.removed[].plan_fields` and `plan_fields_before`.

  Since gxformat2 `397819a` / gtu-ts `a5c6cd57`, `gxwf diff` recurses into inline subworkflows: nested steps sit in the same `steps.removed` / `steps.changed` maps under `<parent>/<key>` (`nested/first`), with their `plan_fields`; `unwired_inputs` stays top level. A list-form relabel is a `fields.label` change, not remove + add. A ledger names a nested step by that full key (`step: nested/first`); the bare inner label matches nothing nested. The gtu-ts release Foundry pins must include `4d086efa` (which supersedes `a5c6cd57`; its `--json` output reproduces every Foundry diff fixture byte for byte).
- **Local gate:** `make check` doesn't typecheck. Also run `npm run typecheck` and `npm run packages-typecheck`; CI runs them after `validate-roadmap`.
- **#798** (`issue-798-nextflow-scope-decisions`, parent #796). Ledger note "Source scope" section:
  - The scope is the one `decisions[]` item with `scope: {candidate?, controls: [{control, value, from}]}`, `decided_by: nextflow-summary-to-galaxy-interface`. `control` is `params.<name>` or `profile`.
  - Each excluded branch family is an open `kind: dropped` entry with `scope_branch: {decision: <scope id>, selected_by: [{control, value, from}]}`, plus `units` (backticked summary subworkflow/process names) and `because` naming the scope id. No top-level `step`, no `source_arg`.
  - **#784:** scope rows = the `scope` decision plus `entries` with `scope_branch`, joined on `scope_branch.decision`. They never appear in a workflow diff, so render them from the ledger alone. Fixture: `content/molds/nextflow-summary-to-galaxy-interface/examples/sarek-germline-scope/open-requirements.ledger.yml`.
  - `from` grammar: `params[<n>].enum|.default`, `params[<n>]` (boolean `true`), `profiles[<n>]`, `test_candidates[<id>]` or `.params_delta`, `workflow.conditionals[<name in affects>]`. Dynamically generated sarek candidates all inherit `test`'s `params_delta`, so a `tools` value is cited by candidate id. A free-text control with no citable value (sarek's `umi_read_structure`) appears only in `because`.
  - Review round (2026-11-12): the `needs-scope-choice` fallback now breaks ties by preferring `default.nf.test`/`main.nf.test`, then a non-stub case, then the first listed (rnaseq 3.24.0 is the live case). Every scope drop's `units` has at least one backticked summary name. A caller's step cap (pipeline sarek scenario) goes in the scope decision's `decision`, and the in-scope steps past it become a plain `kind: dropped` entry without `scope_branch`, so #784 shouldn't treat every scope-run drop as a scope drop.
  - **#784 reuse:** ledger readers now exist in three places: `tests/scope-decisions.test.ts` (`scopeRecords`, `checkCitation` for the `from` grammar), `packages/gxwf-foundry/src/step-removals.ts` (`ledgerEntries`) and build-cli's `parseOpenRequirements`. Put the scope reader and `from` resolver in `gxwf-foundry` next to `step-removals.ts` and point the test at it, rather than adding a fourth.
  - The interface brief names the scope's candidate `id`. `nextflow-to-test-data` (rev 5) and `nextflow-test-to-galaxy-test-plan` (rev 9, which now takes `nextflow-galaxy-interface` as an input) use it on `needs-scope-choice`, so the test follows the built branch. The fallback picks from all candidates when none is primary. A candidate-`id` citation rests on the name alone, because sarek's generated candidates' `params_delta` contradicts it.
  - Where the rules live: the ledger note owns the record shape, the `from` grammar and "later Molds design nothing for a drop". The interface Mold owns the selection policy and "fixed controls aren't inputs".

## Result (2026-11-12)

All six branches are draft PRs:

| Repo | PR | Branch | Head |
|---|---|---|---|
| gxformat2 | [#296](https://github.com/galaxyproject/gxformat2/pull/296) | `issue_295_workflow_diff` | `efb2e5b` |
| galaxy-tool-util-ts | [#233](https://github.com/jmchilton/galaxy-tool-util-ts/pull/233) | `issue_232_workflow_diff` | `4d086efa` |
| foundry #781 | [#809](https://github.com/galaxyproject/foundry/pull/809) | `issue-781-plan-state-resolved-args` | `197e5afd` |
| foundry #796 | [#818](https://github.com/galaxyproject/foundry/pull/818) | `issue-796-test-phase-removed-steps` | `a40ff6ae` |
| foundry #798 | [#821](https://github.com/galaxyproject/foundry/pull/821) | `issue-798-nextflow-scope-decisions` | `872b1e11` |
| foundry #784 | [#827](https://github.com/galaxyproject/foundry/pull/827) | `issue-784-nextflow-parity-report` | `a702bb6e` |

The Foundry stack was rebased 2026-11-12 onto `main` `161947ef` (#790's summarizer fixes). Each branch's `rebase_debrief.md` has the details.

Undraft order:
1. Merge #296 and #233.
2. Release `@galaxy-tool-util/cli` with `gxwf diff`, and bump Foundry's pin.
3. Merge #809 → #818 → #821 → #827.
4. Publish gxwf-foundry.

Foundry CI is red repo-wide at `validate-roadmap` (live roadmap drift on #803, #805 and #783), which hides the later test steps.

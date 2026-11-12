# Implementation debrief — issue-781-plan-state-resolved-args

Prevention half of galaxyproject/foundry#781. Branched from `origin/main` `df991d0d`; head `1087f204` (content `4711c4c4`, casts + dashboard `6224dac5`, JSON-entry fixups `806b65c2`, review fixes `5b3f2b78`, Codex fix `39522711`, thermo fixes `dbca2bc5`, resolver ranking `202f959c`, Mold simplification `0c34c0fa`, casts `eb1850e2`, schema-validated tests `1087f204`).

## What changed

- `nextflow-summary-to-galaxy-template` rev 11: for a tool step with at least one `resolved_args` entry that applies to its call, `_plan_state` is a YAML document with `resolved_args` and `intent` (the old free text). `resolved_args` holds the summary entries unchanged, plus `process` and `invoked_as`, each written as a one-line JSON object. Entries whose selector names a different alias are left out, and a step with none left keeps prose. A Resolved step can't carry `_plan_*`, so the template binds the flags and writes the dispositions itself.
- `implement-galaxy-tool-step` rev 16: reads the block (flags outrank `intent`), binds the flags, and records exactly one disposition per flag in the ledger.
- `advance-galaxy-draft-step` rev 13: carries the step's `resolved_args` past implementation, which strips `_plan_*`, and checks every flag has a record before validating. When a flag is dropped for want of a parameter, it gets a `kind: dropped` record.
- `open-requirements-ledger` rev 8: new **Source arguments** section defining `source_arg` `{step, process, invoked_as?, key, selector, flags?}`. Carried and not-applicable flags are `decisions` with `disposition: carried | not_applicable`. Dropped flags are open `kind: dropped` entries with `units` and a cited `because`.
- After review, the ledger defines a flag as an option token plus any attached value. Only one entry per `key` takes effect: withLabel < withName(process) < withName(alias) < fully-qualified. Each overridden entry gets one `not_applicable` record naming the winner. The template still copies all applicable entries. See [subagents/normal_review.md](subagents/normal_review.md).
- After the thermo review ([thermo_nuclear_review.md](thermo_nuclear_review.md)):
  - A same-rank tie makes every tied entry effective. A flag the tied entries set differently becomes an open gap carrying `source_arg`, stays out of `state`, and no longer produces a plain top-level-`step` entry.
  - implement's **Source arguments** paragraph now defers to the ledger and drops its defensive different-alias line.
  - Prefix and overridden-entry records omit `flags`.
  - A tie scenario was added.
- After Codex review, `source_arg` also copies the entry's `config` and any `profile`, since a root config and a profile (or two configs) can share `key` + `selector`. See [codex_review.md](codex_review.md).
- `galaxy-workflow-draft-format` rev 7: `_plan_state` bullet and open-work bullet.
- Template `refinement.md`.
- Evals and scenarios on all three Molds; the concrete fixture is nf-core/bamtofastq `8698321`.
- Casts and `Dashboard.md` regenerated.

## Selector ranking moved into `summarize-nextflow` (2026-11-12)

John decided to do the thermo lead finding on this branch, before the stack builds on it. This supersedes the precedence, override, tie and 7-field `source_arg` bullets above.

- **Summary shape.** `resolved_args` keeps every matched assignment, each with a required `id`. New optional `processes[].effective_args: [{invoked_as, key, ids, tie?}]` has one row per call and `key`. Effectiveness is per call, not per entry: `withName:SAMTOOLS_VIEW` can win for one call and lose to an alias selector for another. So `tie` lives on the row, not the entry. Emitting only effective entries would duplicate expressions per call and drop what a winner overrode, which #784 parity may want to report.
- **`id`** names the assignment, not the process: `<config>[<profile>]#<selector>/<key>`. `~n` after the selector marks its nth declaration in that config, and `~n` after the key its nth assignment in one block. Example: `conf/modules.config#withName:SAMTOOLS_VIEW_MAP_MAP/args`. A `withLabel` entry has the same id in every process it matches.
- **Ranking.** The order is withLabel < withName(process) < withName(alias) < fully qualified (`SUB:X`, `.*:X`, `workflow:X`, last-segment fallback). An alias selector never reaches another alias's call. At the same rank, a selected profile beats root. Also at the same rank, the later declaration of the *same selector* in one config wins, which Groovy order makes certain. Level entries with identical expressions give one id and no tie. Different expressions give `tie: true` with all ids.
- **Accepted tie cases** (tested):
  - two root configs: BFS walk order isn't Nextflow's include order;
  - two selected profiles: Nextflow applies profiles in definition order, not CLI order, and that isn't modeled;
  - fully qualified selectors for one call name from two subworkflows (`SUB_A:FOO` vs `SUB_B:FOO`): the call is keyed on `invoked_as` only.
- **Calls.** Calls are the process name and aliases that appear in some workflow's `calls`, falling back to every name when none do. An uncalled canonical name gets no row.
- **Molds.**
  - The template copies only the entries a call's rows name, adding `"tie": true` from tie rows. `process` and `invoked_as` are no longer added to the entries.
  - Implement binds every listed entry and stops ranking.
  - The ledger drops the precedence and override prose, and the override records with it. `source_arg` is now `{step, arg, flags?}`, where `arg` is the entry `id`.
  - Ties stay open gaps carrying `source_arg`, whose `missing` names the other tied ids.
- **Where removed checks went.**
  - The implement alias-override scenario moved to the template ("an overridden entry stays out of `_plan_state`").
  - Resolver unit tests cover the ladder, profile vs root, ties, the FQ subworkflow tie, ids, and a bamtofastq-like fixture, red first.
- **Real fixture.** I ran the CLI, with self-validation, on nf-core/bamtofastq at `869832186b25`. It found 25 `resolved_args` entries and 0 tie rows. Each view, collate and FastQC alias names only its own entries, and `SAMTOOLS_PE` gets no row. The two resolver tests also validate their summaries against the schema.
- Schema note rev 14, `summarize-nextflow` Mold rev 21 (index, eval property, changes), minor changeset. Casts and Dashboard regenerated.

## Carrier choice

The `_plan_state` key must hold a string. In the installed `@galaxy-tool-util/schema` 1.15.0, `_plan_state` is `null | string` and the draft step is `additionalProperties: false`, which rules out both a mapping value and a sibling `_plan_*` key. Checked empirically with `gxwf draft-validate --json`: a mapping-valued `_plan_state` gives exit 2 with a structure error, while the same data as a YAML document string gives exit 0. A mapping-typed `_plan_state` would need an upstream gxformat2 / galaxy-tool-util-ts change, which is noted in the refinement and the format note but not done. The location still matches John's placement.

Entries are written as JSON objects because a test showed bare YAML can't carry them. I round-tripped all 25 real bamtofastq `resolved_args` expressions. Written unquoted, every one parses wrong: YAML strips Groovy's quotes (`'--quiet'` becomes `--quiet`) and reads closures (`{ "${meta.id}.map_map" }`) as mappings. As JSON objects inside the block scalar, all 25 round-trip exactly. The template's example block parses back to the summary's strings.

## Red → green

New template eval property "source arguments reach `_plan_state` unchanged" and the bamtofastq scenario: on base, the Mold never reads `resolved_args`, so the four `SAMTOOLS_VIEW_*` alias flag sets can't reach their steps. The base Mold fails the scenario. Real `resolved_args` came from running `summarize-nextflow --no-with-nextflow` on the pinned bamtofastq clone. All checks are LLM-judged. No deterministic fixture was added, because building a full bamtofastq draft is out of proportion and `check-fixtures` would only re-check the string form, which was already checked above.

`changes.md` was not added: none of the edited Molds has one, and mold-spec makes it optional. The revision bumps carry the history.

## Local gate

`make check`: green except
- `validate-roadmap`: unauthenticated it hits the GitHub API 403 rate limit. With `GH_TOKEN=$(gh auth token)` it fails on live GitHub state that predates this branch, which doesn't touch the roadmap: #803 and #805 are missing from the roadmap, and #783's checkbox disagrees with its closed state.
- `check-vendored`: machine-only (stale `$GALAXY` / gtu-ts checkouts).
`check-generated` first failed on `Dashboard.md` from the revision bumps; regenerated and committed. 496 tests pass. Format and lint are clean.

## For the stack (#796 → #798 → #784)

- **#796**: flag records never set a top-level `step`; their step is `source_arg.step`. The removed-step check should match `kind: dropped` entries on top-level `step` only, or ignore entries carrying `source_arg`. A selector-tie gap is a flag record too: open, no `kind`, with `source_arg` and no top-level `step`.
- **#784**: the summary's `effective_args` decides which entries applied to each call (`invoked_as`), so parity doesn't rank. Join ledger records on `source_arg.step` + `source_arg.arg` (the entry `id`) across both `decisions` and `entries`. Every flag of every effective entry has one record. Overridden entries get no record, so read them from `resolved_args` minus `effective_args` if parity reports them. `_plan_state` is stripped at extract, so read flags from `summary-nextflow.json` and dispositions from the ledger. The ledger doesn't map a step to its call, and `_plan_state` entries no longer carry `process` or `invoked_as`. To find a step with missing records, read the pre-extract draft snapshot (#796): its `_plan_state` ids match one call's `effective_args` rows. A step that repair removes takes its flags with it, with no per-flag records. Tie gaps join like any flag record.
- **#798**: scope `decisions` / `kind: dropped` for excluded branches should stay distinguishable from flag records, which carry `source_arg`.

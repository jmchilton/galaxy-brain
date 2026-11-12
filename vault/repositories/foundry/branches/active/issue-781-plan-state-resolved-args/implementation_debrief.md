# Implementation debrief — issue-781-plan-state-resolved-args

Prevention half of galaxyproject/foundry#781. Branched from `origin/main` `df991d0d`; head `76194bcf` (content `4711c4c4`, casts + dashboard `6224dac5`, JSON-entry fixups `806b65c2`, review fixes `5b3f2b78`, Codex fix `39522711`, thermo fixes `dbca2bc5`, resolver ranking `202f959c`, Mold simplification `0c34c0fa`, casts `eb1850e2`, schema-validated tests `1087f204`, resolver review fixes `36e85683` + `fada24fd`, call context + profile win `099a9a6f`, casts `dbfdae87`, comment-parser fix `9727baa6`, call-context review fix `4c76da2e`, Codex alias-scope fix `5c71a900`, resolver thermo refactor `76194bcf`).

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

- **Summary shape.** `resolved_args` keeps every matched assignment, each with a required `id`. New optional `processes[].effective_args: [{call, key, ids, tie?}]` has one row per call path and `key` (see "Call context" below). Effectiveness is per call, not per entry: `withName:SAMTOOLS_VIEW` can win for one call and lose to an alias selector for another. So `tie` lives on the row, not the entry. Emitting only effective entries would duplicate expressions per call and drop what a winner overrode, which #784 parity may want to report.
- **`id`** names the assignment, not the process: `<config>[<profile>]#<selector>/<key>`. `~n` after the selector marks its nth declaration in that config, and `~n` after the key its nth assignment in one block. Example: `conf/modules.config#withName:SAMTOOLS_VIEW_MAP_MAP/args`. A `withLabel` entry has the same id in every process it matches.
- **Ranking.** The order is withLabel < withName(process) < withName(alias) < withName(whole call path), each pattern a whole-name match, so `.*:FOO` doesn't reach an aliased call and a colon-free regex can match the path. An alias selector never reaches another alias's call. At the same rank a selected profile beats the root chain (John, 2026-11-12), then the later declaration of the *same selector* in one config wins. Level entries with identical expressions give one id and no tie. Different expressions give `tie: true` with all ids.
- **Accepted tie cases** (tested):
  - two root configs: BFS walk order isn't Nextflow's include order;
  - two selected profiles: v1 applies them in definition order, v2 in CLI order; neither is modeled;
  - two *different* selectors at one rank in one config (e.g. two matching `withLabel`s): Nextflow orders these by first insertion across the merged config (Codex P1 #3), so the summary conservatively ties them.
- **Calls.** Superseded by "Call context" below.
- **Molds.**
  - The template copies only the entries a call's rows name, adding `"tie": true` from tie rows, and writes the step's call paths as `calls`. `process` and `invoked_as` are no longer added to the entries.
  - Implement binds every listed entry and stops ranking.
  - The ledger drops the precedence and override prose, and the override records with it. `source_arg` is now `{step, arg, flags?}`, where `arg` is the entry `id`.
  - Ties stay open gaps carrying `source_arg`, whose `missing` names the other tied ids.
- **Where removed checks went.**
  - The implement alias-override scenario moved to the template ("an overridden entry stays out of `_plan_state`").
  - Resolver unit tests cover the ladder, profile vs root, ties, call contexts, ids, and a bamtofastq-like fixture, red first.
- **Real fixture.** I ran the CLI, with self-validation, on nf-core/bamtofastq at `869832186b25` (rerun after call context: same 25 entries, 25 rows, 0 ties, paths like `NFCORE_BAMTOFASTQ:BAMTOFASTQ:ALIGNMENT_TO_FASTQ:SAMTOOLS_VIEW_MAP_MAP`). It found 25 `resolved_args` entries and 0 tie rows. Each view, collate and FastQC alias names only its own entries, and `SAMTOOLS_PE` gets no row. The two resolver tests also validate their summaries against the schema.
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
- **#784**: the summary's `effective_args` decides which entries applied to each call (`call`, Nextflow's fully qualified name, equal to `task.process` in trace/versions output), so parity doesn't rank. Join ledger records on `source_arg.step` + `source_arg.arg` (the entry `id`) across both `decisions` and `entries`. Every flag of every effective entry has one record. Overridden entries get no record, so read them from `resolved_args` minus `effective_args` if parity reports them. `_plan_state` is stripped at extract, so read flags from `summary-nextflow.json` and dispositions from the ledger. The ledger doesn't map a step to its call; the step's `_plan_state.calls` does, in the pre-extract draft snapshot (#796). Ids alone don't identify a call (a `withLabel` or process-name entry has the same id in every call), so join `calls` to `effective_args[].call`. A step that repair removes takes its flags with it, with no per-flag records. Tie gaps join like any flag record.
- **#798**: scope `decisions` / `kind: dropped` for excluded branches should stay distinguishable from flag records, which carry `source_arg`.

## Resolver review (2026-11-12)

Normal review of `dbca2bc5..1087f204` against Nextflow source: [subagents/normal_review_resolver.md](subagents/normal_review_resolver.md). Two fixes, red first: qualified names use the called name (`36e85683`), and profile vs root is a tie, not a profile win (`fada24fd`, reverted 2026-11-12, see below; contract change; schema, Mold rev 21 and schema note rev 14 prose amended in place, casts regenerated). The last-segment fallback limit is gone (call context below). Codex review: [codex_review_resolver.md](codex_review_resolver.md). Gate after fixes: `make -k check` green apart from `validate-roadmap` and `check-vendored`; summarize-nextflow 129 tests pass.

## Call context and profile win (2026-11-12)

John's decisions after the resolver reviews: a selected profile wins at equal rank, and Codex P1 #1 and #2 are fixed now. P1 #3 stays a tie.

- **Profile wins.** Reverted `fada24fd`'s tie: at the same rank a selected profile's entry beats the root chain's (legacy parser order). The strict-parser caveat (nf-core's trailing `includeConfig 'conf/modules.config'` can win since 26.04) is documented in the Mold, schema, and schema note. Two selected profiles still tie. The profile test kept its nf-core fixture, with expectations flipped.
- **Call context.** `processCallPaths` traces Nextflow's fully qualified name for each call (`BindableDef.invoke_a`: enclosing workflow's name + `:` + called name; anonymous entry adds nothing). It starts at the entrypoint's anonymous `workflow { }`, or, without one, each named workflow no other calls (as `-entry X` runs it: `BaseScript.run0` calls `meta.getWorkflow(X).run()` directly, so its processes are `X:...`). Subworkflow aliases are segments. A process no traced workflow calls falls back to its bare names.
- **Key.** `effective_args[].call` replaces `invoked_as`; the alias is its last segment, so keeping both would be redundant. It equals `task.process`, so #784 can join it to a real run.
- **Matching.** `selectorRank` ranks over Nextflow's deduplicated `[baseName, simpleName, fqName]` with whole-name matching (`ConfigSelectorResolver.matchesName`). Dropped: the last-segment fallback and the `workflow:` pseudo-scope (not a Nextflow name). Membership (`resolved_args`, `publish_dir_matches`) now needs a selector to reach some traced call, so `SUB_B:FOO` no longer matches a FOO only `SUB_A` calls, and bare `SUB:FOO` doesn't match a nested `PIPE:SUB:FOO`.
- **Template.** `_plan_state` gains `calls` (one-line JSON array of the step's call paths). `source_arg` stays `{step, arg, flags?}`: step + arg is unique, and step-to-call comes from `calls`.
- **Tests (red first).** New: qualification along a real chain (`SUB_B:FOO`, nested bare `SUB_A:FOO`, primary-workflow `NFCORE_PIPE:PIPE:BAR` vs `OTHER:BAR`), aliased subworkflow (`SUB_X:FOO` / `SUB_Y:FOO`, canonical `SUB:FOO` unreached). The old FQ-tie test became "keys a call name used from two subworkflows by its call path" (separate rows), with an anonymous entry so `SUB_A:FOO` is an exact name. Ladder: `SUB:FOO_B` became `PIPE:SUB:FOO_B` (the real name under a named root) and the bare one is kept, asserted unreached. The pre-existing directives test asserted `SUB:BAZ` reached a BAZ only `PIPE` called (the fallback bug); BAZ is now really called by `SUB` from an anonymous entry, selector unchanged. bamtofastq-like fixture now nf-core-shaped (anonymous entry → `NFCORE_BAMTOFASTQ` → `BAMTOFASTQ`).
- Mold/schema revisions edited in place (all unreleased): summarize-nextflow rev 21, schema note rev 14, template rev 11, ledger rev 8, draft-format rev 7. New template scenario: one call name in two subworkflows.

Commits `099a9a6f` (source), `dbfdae87` (casts), `9727baa6` (comment-parser fix), pushed to `jmchilton`. Real bamtofastq rerun: 25 entries, 25 rows, 0 ties. Gate: `make -k check` green apart from `validate-roadmap` (#803/#805/#783 live drift) and `check-vendored`; 496 root tests, 132 summarize-nextflow tests pass (rebuild `dist` first: the CLI integration tests run the built binary).
- **Parser fix found by the fixture diff.** `extractBlockAt` didn't skip `//` comments, and workflow extraction keeps inline comments, so an apostrophe in one (`// ... sample's files`) opened a quote and the block was lost. nf-core/rnaseq's `RNASEQ` workflow was missing, so tracing fell back to bare names for 26 calls. Fixed with a red-first test. Side effect on rnaseq output: `RNASEQ`, `PREPARE_GENOME`, `ALIGN_BOWTIE2`, `FASTQ_REMOVE_RRNA` now parse; the primary-workflow heuristic now picks `NFCORE_RNASEQ` (was the wrong `PREPARE_GENOME`); edges 16 → 51.
- **Old vs new fixture diff** (`fada24fd` vs head, `--no-with-nextflow`): demo and bacass identical. rnaseq: 0 `resolved_args` or `publish_dir_matches` dropped, 24 / 32 added (path regexes like `NFCORE_RNASEQ:RNASEQ:.*:BAM_SORT_STATS_SAMTOOLS:BAM_STATS_SAMTOOLS:.*` the old candidates never matched); rows 99 → 175, ties 7 → 10, all same-rank conflicts of different selectors or two configs. sarek: 0 dropped, 10 / 6 added, rows 225 → 354, ties 9 → 1. No bare-name call rows on any fixture.
- **Red check.** Against `fada24fd` source, the chain and aliased-subworkflow tests fail on `resolved_args` ids (semantic); the two-subworkflow and inline-comment tests fail on `effective_args` (on base a tie row / no path, plus the key rename).
- **Call-context review** ([subagents/normal_review_callctx.md](subagents/normal_review_callctx.md), `4c76da2e`): the legacy parser merges a profile selector the root also declares into the root's key *at the root's position*, so another root selector at that rank can still apply later. A profile entry now wins outright only when the root chain never declares its selector (a `publishDir`-only declaration counts); otherwise it replaces only that selector's root entries and the rest ties. Red first. Also pinned the bare-name fallback for a process only an uncalled named workflow calls, strengthened the two-subworkflow test, and shared `callableNames`. The `//` fix applies to all `extractBlockAt` callers; the fixture diff covers them. Test audit: every changed expectation follows from John's decisions; none weakens a check.
- **Codex review** ([codex_review_callctx.md](codex_review_callctx.md), `5c71a900`): call names now resolve through the calling file's own includes (aliases are file-scoped; the global alias map let one process take another's calls). Red first; real fixtures unchanged. String-literal call matches are pre-existing; the untraced bare-name fallback stays (decision for John). Gate: `make -k check` 496 tests, only `validate-roadmap` + `check-vendored` red; summarize-nextflow 135 tests.
- **Known limits.** Fallback is per process, not per alias: an alias reached only through a parser miss loses its alias-selector entries while another alias is traced. A call the parser misses (e.g. pipe-operator `ch | FOO`, or a workflow the entry doesn't reach) gets bare names only, so qualified selectors don't reach it. The strict-parser profile caveat.

## Resolver thermo harden (2026-11-12)

[thermo_nuclear_review_resolver.md](thermo_nuclear_review_resolver.md), `76194bcf`, refactor only:
- Ranking moved to `src/selector-precedence.ts` (`selectorRanks`, `effectiveArgs`, the arg contract).
- `appended` is now flagged on `ScopedSelector`. Root entries a profile shadows are filtered once, so the `rootSelectors` parameter is gone.
- Each selector is ranked once per call.
- `configDirectives` is split out of `attachConfigDirectives`.
- `workflowsByCallName` replaces three copies of the same map.

Evidence: the 10 full fixture summaries (5 pipelines, with and without `--profile test`) are identical. 135 summarize-nextflow tests and 496 root tests pass.

Decision for John: the global `aliasToCanonical` fallback in `processCallPaths` is reached only when a local workflow's name equals another file's alias, and then it is wrong. It was left in place to preserve behaviour.

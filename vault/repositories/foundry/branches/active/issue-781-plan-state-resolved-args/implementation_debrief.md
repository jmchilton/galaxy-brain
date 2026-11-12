# Implementation debrief — issue-781-plan-state-resolved-args

Prevention half of galaxyproject/foundry#781. Branched from `origin/main` `df991d0d`; head `39522711` (content `4711c4c4`, casts + dashboard `6224dac5`, JSON-entry fixups `806b65c2`, review fixes `5b3f2b78`, Codex fix `39522711`).

## What changed

- `nextflow-summary-to-galaxy-template` rev 11: for a tool step with at least one `resolved_args` entry that applies to its call, `_plan_state` is a YAML document with `resolved_args` and `intent` (the old free text). `resolved_args` holds the summary entries unchanged, plus `process` and `invoked_as`, each written as a one-line JSON object. Entries whose selector names a different alias are left out, and a step with none left keeps prose. A Resolved step can't carry `_plan_*`, so the template binds the flags and writes the dispositions itself.
- `implement-galaxy-tool-step` rev 16: reads the block (flags outrank `intent`), binds the flags, and records exactly one disposition per flag in the ledger.
- `advance-galaxy-draft-step` rev 13: carries the step's `resolved_args` past implementation, which strips `_plan_*`, and checks every flag has a record before validating. When a flag is dropped for want of a parameter, it gets a `kind: dropped` record.
- `open-requirements-ledger` rev 8: new **Source arguments** section defining `source_arg` `{step, process, invoked_as?, key, selector, flags?}`. Carried and not-applicable flags are `decisions` with `disposition: carried | not_applicable`. Dropped flags are open `kind: dropped` entries with `units` and a cited `because`.
- After review, the ledger defines a flag as an option token plus any attached value. Only one entry per `key` takes effect: withLabel < withName(process) < withName(alias) < fully-qualified. Each overridden entry gets one `not_applicable` record naming the winner. A same-rank tie gets an open plain entry with `step`. The template still copies all applicable entries. See [subagents/normal_review.md](subagents/normal_review.md).
- After Codex review, `source_arg` also copies the entry's `config` and any `profile`, since a root config and a profile (or two configs) can share `key` + `selector`. See [codex_review.md](codex_review.md).
- `galaxy-workflow-draft-format` rev 7: `_plan_state` bullet and open-work bullet.
- Template `refinement.md`.
- Evals and scenarios on all three Molds; the concrete fixture is nf-core/bamtofastq `8698321`.
- Casts and `Dashboard.md` regenerated.

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

- **#796**: flag records never set a top-level `step`; their step is `source_arg.step`. The removed-step check should match `kind: dropped` entries on top-level `step` only, or ignore entries carrying `source_arg`. A selector-tie gap is a plain entry with top-level `step` and no `source_arg`.
- **#784**: join on `source_arg` (`step`, `process`, `invoked_as`, `key`, `selector`, `config`, `profile`), not on `id`, across both `decisions` and `entries`. An overridden entry has one `not_applicable` record without `flags`. `_plan_state` is stripped at extract, so read flags from `summary-nextflow.json` and dispositions from the ledger. A step that repair removes takes its flags with it, with no per-flag records.
- **#798**: scope `decisions` / `kind: dropped` for excluded branches should stay distinguishable from flag records, which carry `source_arg`.

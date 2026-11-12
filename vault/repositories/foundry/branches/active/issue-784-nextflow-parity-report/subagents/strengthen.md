Run via Claude Opus 5.5 at high effort.

# Strengthening round — issue-784-nextflow-parity-report

One round on head `9b100aa5`; result `7d3e3cfa`, pushed to `jmchilton`.

## Tasks

1. **Step `state` beside each flag (applied, `7d3e3cfa`).** #781 asks for each flag next to the Galaxy step's `state`; the description hedged "covers most" because the table lacked it. jmchilton's #781 comment says the flags-vs-state report lands with #784, so it's in motivation. Cheap and deterministic: `StepParity.state` is the final workflow step's `state`, else an object `tool_state`, copied as written; `null` for a removed step or none. On `StepParity`, not each `ArgRow`, so a call's args/args2/prefix rows don't duplicate it; the Mold joins by the row's step keys. Red first (2 tests failed), then green. Final-only, not the snapshot's for removed steps: a removed step's planned state isn't what the workflow sets.
   - CLI page `steps` list, Mold Source arguments bullet (adds "the command doesn't map flags to `state` parameters"), eval "source-argument table is complete", scenario case 1 (`collate` sets no `state`), casts regenerated.
   - Description now says it **completes** #781's report half, with a per-flag table from the live command (`view_map_map`, `to_fastq`, `collate`) and a bolded line that the report doesn't map flags to `state`.
2. **#821 limit F.** Local `pr_description.md` matched the live body (trailing newline only). F now says `check-scope-records` lands in this child branch; live body updated with `gh pr edit`. Nothing else changed.
3. **Evidence check.** Scenarios 3/4 already bolded as predictions; Tool Shed requirement rows already unverified and in Known limits. Live `nextflow-parity` (exit 0, 7 findings) and `check-scope-records` (sarek example, exit 0, 9 drops) rerun at `7d3e3cfa`. Scenario case 1 line updated.

## Misreadings, each answered by a highlighted sentence

- Closes #784 → bolded "It doesn't close the issue".
- Fails or reroutes runs → bolded "never edits ... never sends the run back".
- Foundry now maps flags to wrapper parameters → bolded "puts each flag beside the step's `state` but doesn't map one to the other".
- Ready to merge or live → bolded draft/release gate.
- Mold verified end to end → bolded scenarios 3/4 predictions.
- Diff size includes parents → bold dependency line.

## Gate at `7d3e3cfa`

`npm run packages-build`; `make -k check` red only on `validate-roadmap` (rate limit) and `check-vendored` (machine-only); 503 root and 151 gxwf-foundry tests pass; format, lint, typecheck, packages-typecheck clean; `npm run validate` 71 warnings (same as base).

## Left over

Nothing in scope. A full `state` can be long for real wrappers; whether the Mold should truncate it is untested until a live run.

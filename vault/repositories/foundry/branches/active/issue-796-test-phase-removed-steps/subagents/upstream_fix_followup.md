Run via Claude Opus 5.5 at high effort.

# Upstream `gxwf diff` fix follow-up (`4ae46ef3`)

The two drafted upstream issues were fixed in the diff PRs instead of filed: gxformat2#296 `397819a`, galaxy-tool-util-ts#233 `a5c6cd57`. Nested steps now sit in `steps.removed` under `<parent>/<key>`, and a list-form relabel is a `fields.label` change. Documentation review in the same commit: [../documentation_review.md](../documentation_review.md).

## Code

- `checkStepRemovals` matched a ledger `step` against a removed step's key or label. Nested summaries carry the bare inner label (`nested/first` has `label: first`), so `step: first` labelled both the top-level `first` and `nested/first`. Now label matching applies only to keys without `/`. Top-level label matching is unchanged.
- Red → green: new test on committed `nested-removals.{before,after}.gxwf.yml` (top-level `first` and `nested/first` both removed) failed before the fix with `nested/first` labelled by `first-dropped`. The list-form relabel test (upstream `synthetic-diff-list-steps{,-relabeled}`) is a regression pin, green on arrival: no step removed.
- All step-removal diff fixtures and the run-workflow-test example `step-diff.json` regenerated with the gtu-ts worktree's `gxwf diff --json` at `a5c6cd57`. Only change: `id: null` / `id: "subsample_reads"` in step summaries. Example CLI recheck: original ledger exit 4, dropped ledger exit 0.

## Docs

- CLI page: full key names a step, nested key form, label only for top-level. "Top-level steps only" gotcha replaced by "`step: first` never names `nested/first`, copy the key from `unlabelled`".
- debug step 8: relabel workaround removed; drop entry copies the key from `step_removals.unlabelled` verbatim. Eval property matches.
- run-workflow-test opening: "every top-level step" → "every step". Ledger note: one sentence on the `/`-joined path.
- Casts, pipeline assemblies, generated notes regenerated.

## Gate

`npm run packages-build` then `make -k check` at the pre-commit tree: red only on `validate-roadmap` and `check-vendored` (baseline). 501 tests pass, gxwf-foundry 14 step-removal tests. `npm run format`, eslint, tsc clean.

## Release condition

The gtu-ts release Foundry pins must include `a5c6cd57`, not just `gxwf diff`.

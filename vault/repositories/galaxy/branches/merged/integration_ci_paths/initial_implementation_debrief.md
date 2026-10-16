# Initial implementation debrief

Commit `c3a25e9f6be` adds exclusions to both `push` and `pull_request` `paths:` in `.github/workflows/integration.yaml`:

- Excluded: `test/unit/`, `test/integration_selenium/`, `lib/galaxy_test/{api,selenium,workflow}/`, `lib/galaxy/selenium/`.
- Re-included (imported by integration tests or `lib/galaxy_test/conftest.py`, directly or transitively): `lib/galaxy_test/api/{_framework,sharable,test_dataset_collections,test_histories,test_tools,test_workflows}.py`.

## Evidence

- Import closure from `test/integration/**` (AST walk, following `galaxy_test.*` imports) reaches only those 6 API modules among the excluded dirs. No data-file references into excluded dirs.
- Emulated GitHub path filtering (ordered patterns, last match wins) over the last 300 merged dev PRs (2026-09-14 → 2026-10-14): Integration triggers on 174 instead of 223, so 49 PRs (22%) skip it. Each skipped run saves ~211 runner-minutes (4 shards × ~53 min).
- 16 targeted path cases checked against the emulator (e.g. `api/test_jobs.py` skipped, `api/test_tools.py` triggers, `galaxy/navigation/` triggers).

## Not done

- Refactoring shared mixins (`TestsTools`, `RunsWorkflowFixtures`, `ChangeDatatypeTests`, `ImportExportTests`, `upload_flat_sample_sheet`, `ApiTestCase`) out of `galaxy-test-api` into `galaxy-test-base`. Cleaner package boundary, but no measured CI payoff.
- No guard against a new `test/integration` import from `galaxy_test.api`. Failure mode: such a PR runs integration anyway (it touches `test/integration`); later edits to the imported module only get caught on the post-merge `dev` push.

## Related analysis (2026-10-14)

- Shard imbalance: `lib/galaxy_test/shard_durations.json` (2026-07-28) is stale; shard 0 slowest in 20/30 runs, ~9 min wall-clock lost per run.
- Splitting k8s/Apptainer to one shard saves only ~1.5 min/shard (~2–3% runner time).
- `integration_ci_scope` family policy selects everything on 90% of PRs, mostly via `test/` and `lib/galaxy_test/` rules.

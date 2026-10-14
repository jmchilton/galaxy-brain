# Implementation debrief

STATUS: READY. Fork head `e4e6349dc7b` (2 commits on `origin/dev` `36fe2ce8428`). No PR opened; no CI seen yet.

## What it does

1. `a1e1ad52c1e` moves API test code that other suites imported into `galaxy_test.base`:
   - `base/api_testcase.py` — `ApiTestCase` verbatim (annotation quoted so a driver-less import works on Python 3.10–3.13); `api/_framework.py` re-exports it for the ~45 API importers.
   - `base/shared_api_tests.py` — `TestsTools`, `RunsWorkflowFixtures`, `ChangeDatatypeTests`, `BaseHistories`, `ImportExportTests`, `upload_flat_sample_sheet`, `assert_one_collection_created_in_history`.
   - `WORKFLOW_SIMPLE` → `base/workflow_fixtures.py`; `test_wes.py` drops its identical copy.
   - Typing needed once the history mixins left a mypy-relaxed module: `BaseHistories(UsesApiTestCaseMixin)` (mirrors `SharingApiTests`), populator/resolver annotations, `dataset_populator: DatasetPopulator` on the two integration classes (mirrors `TestsTools` users).
2. `e4e6349dc7b` excludes `test/unit/`, `test/integration_selenium/`, `lib/galaxy_test/{api,selenium,workflow}/`, `lib/galaxy/selenium/` from both Integration triggers. No allowlist.

## Decisions

- Refactor over allowlist (John, 2026-10-14): no measured CI difference over 300 PRs, but the exclusion list stays correct as code changes.
- `lib/galaxy/navigation/` stays on the trigger list (`galaxy/tours` imports it at runtime).
- `BaseHistories` moved too rather than kept in the API suite: the alternatives drop the history-contents dump from failure messages or duplicate the helper.
- Push trigger shares the exclusions (same as `client/`, `doc/`); weekly cron still runs everything.

## Evidence

- Emulated GitHub path filter over the last 300 merged dev PRs: Integration triggers on 174 instead of 223 (49 PRs, 22% skip; ~211 runner-min each).
- Import closure from `test/integration/**` and both conftests reaches nothing in the excluded dirs (my AST walk, reviewer's runtime `sys.modules` check, Codex).
- Collection identical to `origin/dev` (939 node IDs; reviewer: 908/908 on its set). isort/black/ruff/flake8 clean; mypy: no errors beyond the `origin/dev` baseline.
- Tests (local, sqlite): `test_legacy_store_by` 2/2, upload sample-sheet 2/2, `test_workflow_tasks` 13/14, API `TestImportExportHistory` 8/8, integration `test_history_import_export` 25 passed/1 skipped. The one failure (`test_workflow_invocation_pdf_report`, "PDF conversion service not available") fails identically on `origin/dev` locally — weasyprint missing.

## Reviews

[Round-1 review](subagents/normal_review_round1.md) · [Round-2 review](subagents/normal_review.md) · [Codex round 1](codex_review_round1.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) — no scope change.

## Open for John

- Regression guard: nothing but the YAML comment stops a future `test/integration`/`base`/`driver` import from `galaxy_test.api` (or selenium/workflow). Options: a `git grep` check in the tox `lint` env or a `.ci/` script like `check_test_class_names.sh`. If skipped, the PR description should state the rule and the residual risk.
- Follow-ups: same treatment for `api.yaml`/`unit.yaml`/`framework_*.yaml`; refresh `shard_durations.json`.

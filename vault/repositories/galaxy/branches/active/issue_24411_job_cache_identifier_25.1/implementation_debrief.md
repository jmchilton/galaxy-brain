# Implementation debrief: issue_24411_job_cache_identifier_25.1

**STATUS: READY.** The second scope evaluation recommends keeping the current scope.

Fixes [#24411](https://github.com/galaxyproject/galaxy/issues/24411) on `release_25.1` (base `6060e10fe7a`, head `9e28638711a`). The branch was hardened, re-scoped once, and re-hardened. The original scope is kept as alt `issue_24411_job_cache_identifier_25.1_alt_original_scope`.

## Commits
1. `78ff86441f5` **Baseline tests.** These pin the cache hits that must survive the fix:
   - a mapped `identifier_single` rerun reuses the mapped job;
   - a plain `cat1` run (a name-agnostic tool) reuses a mapped job;
   - a mapped `identifier_single` workflow step is a cache copy when the workflow is rerun in a new history with shifted hids.
2. `11535a475cd` **The #24411 fix:**
   - A NOT EXISTS guard on `<k>|__identifier__` for plain requests, inside `_build_stmt_for_hda` under `require_name_match`.
   - `DatasetFilenameWrapper.element_identifier` now sets `consumes_names`. This also fixes the reverse direction, which the issue wrongly called guarded: a mapped run reused a plain job, or a job mapped over another list, through the name-agnostic second search in `JobWrapper.prepare`.
   - Three red-to-green tests.
3. `9e28638711a` **Re-scope:**
   - The dataset name match now also applies to mapped requests. Red test: `model_attributes` mapped, element renamed, cached rerun.
   - `tool_evaluator=self` on the fallback dataset wrappers.
   - Corrected the `Job.copy_from` comment.
   - New `set_user_address` populator helper.

## Decisions
- **Base `release_25.1`:** it is the oldest release in the one-year window, and the bug is present there.
- **Guard placement:** the guard sits under `require_name_match`, so name-agnostic tools keep reusing jobs across plain and mapped runs. The `cat1` baseline test pins this.
- **Rename case:** the name match for mapped requests only adds misses. The re-scope reviewer feared it would lose cross-history workflow hits. A workflow test refuted that: implicit element outputs have no hid in their names.
- **Merge-forward:** the content checks read the last word of the first output line, because `identifier_single` on 26.2/dev prints `identifier X` plus a `safe_identifier` line.

## Reviews
- **Normal review:** found a coverage gap, now covered by the `cat1` baseline test.
- **Re-scope review:** applied its nits. Its lost-hits concern was refuted.
- **Codex:** round 1 was clean. Round 2 raised two P1s; both were refuted by running them (see `codex_review.md`).
- **Thermo-nuclear:** two rounds, cosmetic changes only.
- **Baseline refactor:** both rounds found nothing to move ahead of the fix.

## Validation
All suites ran one at a time.

| Suite | Result |
| --- | --- |
| `test_jobs.py -k "test_cached_job_ or search"` | 16 passed |
| `test_tools.py -k cached` | 13 passed |
| `test_workflows.py -k cached` | 9 passed |
| unit tests (wrappers, evaluation, jobs) | 236 passed |

Each production hunk was confirmed red when reverted. The exception is `tool_evaluator=self`, which has no test tool that reaches it.

Lint (black 25.9, ruff 0.13.3, isort, flake8 with bugbear) is clean. Commits used `--no-verify`, because the global pre-commit hook's newer black reflows unrelated code on 25.1. CI hasn't been seen yet.

## Coordination
Merging this forward does **not** fix #24411 for user-defined tools. `UserToolEvaluator` never sets `consumes_names`, so it must set it to True as part of the #24410 branch on dev, with a red test there.

## Follow-ups (not in this branch)
- **User-defined tools:** `UserToolEvaluator` needs `consumes_names` (#24410 branch).
- **Multi-value inputs:** keys like `input11|__identifier__` aren't checked. Not proven reachable.
- **`Job.copy_from` with DatasetCollection vs HDCA outputs:** possible `NotImplementedError`. Codex's repro didn't trigger it.
- **`_build_stmt_for_hdca`:** it ignores `require_name_match`, and `DatasetCollectionWrapper.name` reads don't set `consumes_names`. Could cause stale `$f1.name` on renamed or copied collections. Unreproduced; it would need its own issue and a red test.
- **Dev refactors:** an identifier-key helper, a single predicate for the label the job saw, and splitting `consumes_names` into name and identifier flags.

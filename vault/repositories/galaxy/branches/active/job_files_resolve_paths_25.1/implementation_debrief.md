# Implementation debrief

STATUS: BLOCKED — second scope evaluation recommends one more expansion; John decides.

Branch `job_files_resolve_paths_25.1` on `release_25.1`, head `c7e144050f2`, 4 commits, pushed to `jmchilton`:

- `f9c905af345` Baseline tests: `_post_job_files` helper, class-level `nginx_upload_job_files_store`, `test_write_with_nginx_upload_module` (passes on base).
- `a4360b342fc` `POST /api/jobs/{id}/files` rejects non-absolute or non-string `path` with a 400.
- `6a208e78a38` Job ports registration logs job id + runtime, not request kwargs.
- `c7e144050f2` Invalid upload sources (missing/non-file upload, malformed/unknown/non-string tus session id, nginx path missing, outside the store or unconfigured) return 4xx instead of 500/assert; nginx store containment uses `in_directory` instead of `startswith`. Validation lives in `__nginx_upload_path`/`__tus_upload_path`, named and worded like dev's `JobFilesManager`.

Alt: `job_files_resolve_paths_25.1_alt_original_scope` (first 2 fixes only) — [alts/original_scope.md](alts/original_scope.md).

## Decisions

- Target 25.1: oldest supported release with this code. 26.0/26.1 merge clean; at 26.2/dev the absolute-path check goes into `JobFilesManager.authorize_write` by hand ([index.md](index.md)).
- Reads (`index`) intentionally not path-restricted; reads aren't scoped to the job by design.
- The store-not-configured 403 case is kept by `patch.object` on the in-process config, not by dropping it.

## Scope decision needed

[scope_evaluation.md](scope_evaluation.md) recommends porting dev's read-side and unknown-job 4xx handling (`756b283dcaf`): a missing `dataset_*.dat` with no purged input returns 200 with an empty body today (should 404); other missing files and directories 500 (should 404/400); unknown job id 500s (should 404). ~10 controller lines + three ported dev tests. Shipping as-is is also defensible.

If expanded, still valid: all reviews of the 4 existing commits and their tests. Remaining: implement + red/green the three read tests, a normal review of the new commit, re-run test challenge + codex review on it.

## Hardening

- Normal reviews: [subagents/normal_review.md](subagents/normal_review.md), [subagents/normal_review_rescope.md](subagents/normal_review_rescope.md) (test gap acted on).
- Test challenge: [test_challenges_debrief.md](test_challenges_debrief.md) (stricter nginx rejection assertion).
- Codex: [codex_review.md](codex_review.md) — 3 confirmed 500s from JSON-decoded form values, all fixed with tests.
- Thermo-nuclear: [thermo_nuclear_review.md](thermo_nuclear_review.md) — validation pulled into helpers; dev's single `write()` model left as a recommendation.
- Baseline refactor: [baseline_refactor.md](baseline_refactor.md) — baseline-tests commit split out.
- Performance challenge: skipped; no queries or polling touched.
- Checks: `make format` clean; mypy on touched files adds no errors (pre-existing ones in imported modules match base). `test/integration/test_job_files.py`: 9/10 pass; `test_read_fails_if_input_file_purged` fails identically on base (relies on `input_hda` set only by whichever test runs first).
- Every non-baseline new test verified red without its commit's change.

```
20261029T010802Z-hardening-c7e144050f2f.json
    hunks:   1 carried, 0 changed, 10 new, 2 dropped
    new     f9c905af3453 Baseline tests for job files API nginx upload writes
    new     a4360b342fcf Only accept absolute paths for job files API writes
    new     c7e144050f2f Return 4xx for invalid job files upload sources
```

# Planemo PR #1707 — Write inline test jobs outside source directories

PR: https://github.com/galaxyproject/planemo/pull/1707

Reviewed rebased head: `8e8ca0e4`, plus the coordinator's uncommitted secondary-file fix and isolated composite fixtures.
Worktree: `/Users/jxc755/projects/worktrees/planemo/branch/test-job-files-in-tmpdir`.
Comparison: `origin-https/master..HEAD`.

## Verdict

No remaining actionable findings after the fixes. Suitable to merge once the coordinator's validation passes and fresh CI completes. The secondary-file regression below is resolved by applying the same file-list path abstraction to both `composite_data` and `secondaryFiles`.

The new path/location parametrized regression runs materialization and actual `galactic_job_json()` staging, confirms the uploaded secondary archive contains the original bytes, verifies the primary path exists, and checks that the source job remains unchanged. The composite test now creates fresh files under `tmp_path` while retaining both exact-path and existence assertions.

## Resolved finding

**P1 — Preserve secondary-file paths accepted by Galaxy staging.** In `planemo/engine/interface.py:48–60`, recursive rewriting only recognizes dictionaries with `class: File` or `class: Directory`, with a special exception for `composite_data`. A File input's `secondaryFiles` entries can contain `path` or `location` without a `class`: Galaxy's `galactic_job_json()` accepts them and packages them into the uploaded secondary-files archive. Those entries are left relative when the enclosing inline job is moved into the temporary directory. An input that previously worked now raises `FileNotFoundError` from `tarfile.add()` before upload. Resolve secondary-file paths using their enclosing File context and cover actual Galaxy staging, preserving ordinary parameter dictionaries.

Reproduced with existing Planemo Python 3.12 environment and its installed Galaxy client: create `sample.bam` and `sample.bam.bai` in a source temporary directory; use `{'input': {'class': 'File', 'path': 'sample.bam', 'secondaryFiles': [{'path': 'sample.bam.bai'}]}}`. `galactic_job_json()` succeeds using the source directory before rewriting. `_absolutize_job_paths()` leaves the secondary path unchanged; staging the rewritten job using a different temporary directory raises `FileNotFoundError` for that directory's nonexistent `sample.bam.bai`. Both `path` and `location` need the fix.

## Other observations

The context-manager abstraction is reusable and correctly scopes temporary files to engine execution. Deep copying prevents changes to reusable test-case definitions. Existing job files pass through untouched, and remote URLs, absolute paths, and fragment references are preserved. Collection recursion and composite-data dict/string handling match the existing Galaxy staging representation.

The reported composite fixture existence failure is consistent with test-order interference: Galaxy's `tools/data_fetch.py` passes local composite sources to `datatypes/sniff.py:handle_composite_file()`, which unconditionally moves them into the dataset extra-files directory using `shutil.move`. A preceding composite integration test can consume the shared fixture files. Isolate the path-materialization regression test's fixtures rather than removing the existence assertion.

Standalone `tests/test_engines.py` collection encounters an existing circular import: engine interface imports runnable, runnable imports workflows, workflows imports Galaxy configuration, and configuration imports runnable constants before they are initialized. Master already imports `cases` and `RunnableType` through the identical interface route; the new `TestCase` import does not introduce this cycle.

## Validation limits

Review exercised real Galaxy client staging with a stub upload callback, not a live Galaxy server. The coordinator is running broader tests and pre-commit checks. No live Galaxy server was launched by this reviewer; readiness remains conditional on those checks and fresh CI.

## Final validation and push

Rebased onto master `515e928e` and pushed final head `8e8ca0e4`.
71 configuration, engine, and workflow utility tests passed; three Galaxy startup tests skipped.
New classless secondary-file tests failed before the fix and pass after it.
Targeted mypy and pre-commit checks passed. Fresh CI remains the final merge gate; PR still draft.

## CI verified 2026-10-04

Head `8e8ca0e4` has 14 successful checks and the expected skipped release upload.
GitHub reports mergeable. No remaining review blockers; ready to leave draft and merge.

[pr_552_review_0](https://github.com/jmchilton/pulsar/tree/pr_552_review_0) starts at reviewed commit `4fe464c48b7fb2b665c266def1dacec0c4f7a8db` and fixes both verified P2 findings. It preserves failure notification and restart recovery if postprocessing outcome publication fails, and adds deterministic regression coverage for both persistence failures and the polling publication order. Each fix is under 200 changed lines and has its own commit. The branch is pushed to John's `jmchilton` fork; the author's PR branch is untouched.

- `770948e` — Preserve notification and recovery if postprocessing publication fails. Catch publication failures, attempt one failed callback, retain the recovery index, and test both metadata-write failures plus restart recovery (55 changed lines).
- `47ebb2b` — Guard failure publication ordering with a polling regression. Pause before failure metadata publication and assert pending polling until the failure is recorded (30 added lines).

Verification used GPT-6 (Codex) at medium effort. These added tests were each run individually and passed:

- `test/stateful_test.py::test_postprocessing_publication_failure_notifies_and_remains_recoverable[postprocessed]` — 1 passed; failed with the injected OSError on the reviewed implementation before the fix.
- `test/stateful_test.py::test_postprocessing_publication_failure_notifies_and_remains_recoverable[postprocessing_failed]` — 1 passed.
- `test/stateful_test.py::test_polling_stays_postprocessing_until_failed_outcome_is_persisted` — 1 passed; temporarily restoring the old early completion-marker write made it fail (`complete` instead of `postprocessing`), then it passed again after restoration.

Test command prefix: `UV_CACHE_DIR=/private/tmp/pulsar-545-uv-cache uv run --python /private/tmp/pulsar-545-venv/bin/python --with pytest --with simple-job-files --with webtest --with pytest-timeout --with-requirements requirements.txt --no-project pytest`, followed by the individual node ID and `-q`. Initial collection without `webtest` failed; adding the dependency resolved it. No unchanged tests or full suites were run. Final `UV_CACHE_DIR=/private/tmp/pulsar-545-uv-cache uv run --with tox --no-project make lint` passed; `git diff --check` passed. Worktree is clean.

The revision snapshot initially needed an explicit `--base master`; the required retry succeeded:

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/pulsar/reviews/active/552/differential-review/snapshots/20261027T012813Z-revision-47ebb2ba0c8e.json
  revision @ 47ebb2ba0c8e vs origin/master (merge-base 6ec596a50a19)
  since 20261027T012026Z-review-4fe464c48b7f:
    commits: 1 same, 0 rebased, 0 changed, 2 new, 0 dropped
    hunks:   4 carried, 0 changed, 3 new, 2 dropped
    new     770948e72769 Preserve notification and recovery if postprocessing publication fails
    new     47ebb2ba0c8e Guard failure publication ordering with a polling regression
```

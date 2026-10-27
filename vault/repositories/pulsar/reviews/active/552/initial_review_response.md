

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via GPT-6 (Codex) at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via GPT-6 (Codex) at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via GPT-6 (Codex) at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via GPT-6 (Codex) at medium effort.

</details>

<details><summary>Risks</summary>

This is a two-way door: the change adjusts completion reporting and adds a per-job failure marker, without changing output formats or introducing destructive operations.

<details><summary>Risk Details</summary>

- Clients polling for status will now receive `failed` when output staging fails, matching the terminal callback; this can change downstream retry and failure-handling behavior.
- Completion now depends on recording the staging outcome before writing the `postprocessed` marker. Failures writing job metadata deserve attention because they can leave clients seeing `postprocessing`.
- Rolling back the code leaves harmless failure-marker files behind, but restores the previous polling behavior for affected jobs; rollback cannot retract terminal statuses already consumed by clients.

</details>

<details><summary>Risk Review Advice</summary>

Review the ordering of failure-marker writes, completion-marker writes, and terminal callbacks, including exceptions and restart recovery. Confirm successful recovery clears a stale failure marker and that failed staging is reported consistently to both polling and callback clients.

The added tests cover failed staging and recovery after a recorded failure. Human review should also consider metadata-write failures and restart timing around the completion marker, where filesystem state determines whether staging is retried.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/pulsar/tree/pr_552_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[pr_552_review_0](https://github.com/jmchilton/pulsar/tree/pr_552_review_0) starts at reviewed commit [4fe464c48b7fb2b665c266def1dacec0c4f7a8db](https://github.com/jmchilton/pulsar/commit/4fe464c48b7fb2b665c266def1dacec0c4f7a8db) and fixes both verified P2 findings. It preserves failure notification and restart recovery if postprocessing outcome publication fails, and adds deterministic regression coverage for both persistence failures and the polling publication order. Each fix is under 200 changed lines and has its own commit. The branch is pushed to John's `jmchilton` fork; the author's PR branch is untouched.

- [770948e](https://github.com/jmchilton/pulsar/commit/770948e) — Preserve notification and recovery if postprocessing publication fails. Catch publication failures, attempt one failed callback, retain the recovery index, and test both metadata-write failures plus restart recovery (55 changed lines).
- [47ebb2b](https://github.com/jmchilton/pulsar/commit/47ebb2b) — Guard failure publication ordering with a polling regression. Pause before failure metadata publication and assert pending polling until the failure is recorded (30 added lines).

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

</details>

</details>

### P2 1: Preserve notification and recovery when publishing the outcome fails (implementation verified)

The moved persistence operations in `StatefulManagerProxy.__handle_postprocessing()` run outside the exception handler for staging. If writing `postprocessing_failed` or `postprocessed` raises (for example, the staging filesystem runs out of inodes), the terminal callback is skipped, but the `finally` block still removes the postprocessing index. Polling remains at `postprocessing`, message clients receive no terminal notification, and restart cannot recover the job. Before this change, the completion-marker write was inside `postprocess()` and its failure still led to a failed callback.

The review branch catches publication errors, attempts one failed callback, and retains the recovery index until an outcome can be persisted. Both injected write failures passed focused regressions checking notification, pending polling, retained recovery state, and successful recovery by a fresh proxy after storage becomes writable. The completion-marker regression failed with the original implementation before the fix. The fix changes 55 lines including tests. [Suggested fix commit](https://github.com/jmchilton/pulsar/commit/770948e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via GPT-6 (Codex) at medium effort. Verified via GPT-6 (Codex) at medium effort.

</details>

### P2 2: Test polling before the failed outcome is published (implementation verified)

The PR's polling regression waits for the terminal callback before checking failure, so it cannot detect an early `postprocessed` write that briefly exposes `complete`. This misses the central ordering invariant: the failure outcome must be stored before completion becomes visible.

The review branch adds an Event-controlled regression that pauses before storing the failure outcome, checks that polling still returns `postprocessing` with no completion marker or callback, then releases the worker in `finally` and checks one failed callback and failed polling. The test passes with the PR's ordering and fails with `complete` instead of `postprocessing` when the old early marker write is temporarily restored. The mutation was reverted. This fix adds 30 test lines. [Suggested fix commit](https://github.com/jmchilton/pulsar/commit/47ebb2b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via GPT-6 (Codex) at medium effort. Verified via GPT-6 (Codex) at medium effort.

</details>

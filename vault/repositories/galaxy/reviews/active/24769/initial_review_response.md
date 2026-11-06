

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change only alters how the generated job script writes its internal `_$dir` backups, so a revert restores the old behavior and it doesn't lock Galaxy into particular difficult to change choices (a two-way door).

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24769_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24769_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24769_review_0) branches from `b4d1c730ac79` and closes the remaining way an incomplete backup could reach `_$dir`: a stale `_$dir.partial` that can't be removed now skips the backup instead of publishing a nested copy. It also extends the PR's test to cover restoring from the backup. `test/unit/app/jobs/test_job_script.py` passes in full (7 tests) under pytest on macOS.

- [`c1b7492505a`](https://github.com/jmchilton/galaxy/commit/c1b7492505a) Skip job dir backup when stale .partial can't be removed: chains `rm -rf` to `cp -R` with `&&` in `PREPARE_DIRS_TEMPLATE` and adds a test with a stale `.partial` holding a 0555 subdirectory, which failed before the fix.
- [`8f3da97ec20`](https://github.com/jmchilton/galaxy/commit/8f3da97ec20) Test restore from job dir backup: extends and renames the PR's test to damage `configs/registry.xml`, rerun, and assert restoration, which fails when the restore branch is a no-op.

</details>

</details>

### P2 1: Failed stale-`.partial` cleanup publishes a nested backup that later replaces `$dir` (implementation verified)

`rm -rf` and `cp -R` are separate statements in `PREPARE_DIRS_TEMPLATE`, so `cp` still runs when `rm` fails. The leftover `_$dir.partial` survives, `cp -R` copies into it instead of creating it, and `mv` publishes `_$dir` with the wrong layout. That breaks the PR's invariant that `_$dir` is complete or absent. The next run restores that tree over `$dir`, so `$dir/registry.xml` is gone, the same failure this PR fixes. It needs an earlier interrupted backup plus a failing `rm`, such as a leftover non-writable directory or an unhealthy mount, so it is uncommon, but it is the path the `.partial` cleanup exists for.

<details><summary>Evidence</summary>

PR template at `b4d1c730ac79`, with `configs/registry.xml` and a stale `_configs.partial/sub/f` where `sub` is mode 0555:

```
run 1: _configs/configs/registry.xml, _configs/sub/f, configs/registry.xml
run 2: _configs/configs/registry.xml, _configs/sub/f, configs/configs/registry.xml, configs/sub/f
```

The new test fails under pytest on the PR template (`assert not (tmp_path / "_configs").exists()`) and passes with the fix.

</details>

Chain the cleanup into the copy, so a failed `rm` leaves `_$dir` absent and the job runs without a backup, the same as any other failed copy. Review branch commit `c1b7492505a` does this and adds `test_prepare_dirs_skips_backup_when_stale_partial_cannot_be_removed`.

Fixed on the review branch in [`c1b7492505a`](https://github.com/jmchilton/galaxy/commit/c1b7492505a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: New test does not cover restoring from the backup (implementation verified)

The bug's harm happens in the restore branch, which replaces `$dir` with `_$dir` on rerun, but the new test stops once `_configs` is created and no other test references this template. Replacing the restore branch with a no-op still passes the PR's test.

Extend the test to damage `configs/registry.xml`, rerun, and assert `configs` matches its earlier tree. Review branch commit `8f3da97ec20` does this and renames the test to `test_prepare_dirs_restores_backup_only_created_after_successful_copy`. With the restore branch replaced by `:`, the extended test fails under pytest with `{'registry.xml': b''} != {'registry.xml': b'<registry/>'}`; it passes on the real template.

Fixed on the review branch in [`8f3da97ec20`](https://github.com/jmchilton/galaxy/commit/8f3da97ec20).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

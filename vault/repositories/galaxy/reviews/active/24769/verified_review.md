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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: New test does not cover restoring from the backup (implementation verified)

The bug's harm happens in the restore branch, which replaces `$dir` with `_$dir` on rerun, but the new test stops once `_configs` is created and no other test references this template. Replacing the restore branch with a no-op still passes the PR's test.

Extend the test to damage `configs/registry.xml`, rerun, and assert `configs` matches its earlier tree. Review branch commit `8f3da97ec20` does this and renames the test to `test_prepare_dirs_restores_backup_only_created_after_successful_copy`. With the restore branch replaced by `:`, the extended test fails under pytest with `{'registry.xml': b''} != {'registry.xml': b'<registry/>'}`; it passes on the real template.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

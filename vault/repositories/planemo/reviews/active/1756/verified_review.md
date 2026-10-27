### P3 1: Existing `test_ensure_metadata` passed only because of the crash (implementation verified)

`single_tool_exclude/.shed.yml` lacks `long_description`, so on master `shed_lint --ensure_metadata` exited 1 via the `KeyError` this PR fixes, and `test_ensure_metadata`'s `exit_code=1` was satisfied by the bug. With the fix it still exits 1, now from the missing-field warning at the default `warn` fail level, but nothing asserts that.

Assert the warning so the exit code means a lint failure:

<details><summary>Details</summary>

```diff
         with self._isolate_repo("single_tool_exclude"):
-            self._check_exit_code(
+            result = self._check_exit_code(
                 ["shed_lint", "--skip", "shed_remote_repository_url", "--ensure_metadata"], exit_code=1
             )
+            assert "Missing shed metadata field [long_description] for repository" in result.output
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the strengthened test passes at the PR head and fails with base `planemo/shed_lint.py` (the crash output lacks the warning).

</details>

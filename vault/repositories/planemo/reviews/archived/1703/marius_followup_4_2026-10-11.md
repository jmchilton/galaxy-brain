# jmchilton/planemo #4 review — 2026-10-11

- Fix PR: https://github.com/jmchilton/planemo/pull/4
- Parent PR: https://github.com/galaxyproject/planemo/pull/1703
- Reviewed head: `2bec24f985b1c3efc64581ab6f7e77621506e8e2`
- Compared against parent head: `8da2c41046a54da18d0a5d0cc8dc107d70968edf`
- Parent tracking destination: active/1703.
- Isolated checkout: `/tmp/planemo-marius-oct11/pr-4`; clean after review.

## Recommendation

Merge #4 into `list-all-invocations-rebased`. No blocking ordinary findings in the fix. Marius's unsupported `instance` keyword finding is correct; both filtered and unfiltered paths now use the same BioBlend invocation client method with valid explicit keywords. Autospec is a meaningful improvement over the old unrestricted mock. The command scopes both paths to the current authenticated account, and warning emission uses Planemo's existing stderr warning abstraction.

The claim that admin and user keys always produce the same listing needs qualification: this is true for two keys representing the same Galaxy identity, not for distinct admin/user accounts. The implementation is internally consistent with the pre-existing admin-key-first selection. Track the identity behavior decision rather than treating #4 as a complete solution to every possible profile shape.

## Verification

`PYTHONPATH=$PWD /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -q tests/test_cmd_list_invocations.py`: **9 passed**, 3 existing dependency/Click deprecation warnings (2.64 s).

Inspected the installed BioBlend 1.9.0 `InvocationClient.get_invocations` implementation and signature: `workflow_id`, `user_id`, `limit`, `offset` are supported, `instance` is not. The actual implementation omits absent workflow/user IDs from query parameters and passes limit/offset normally. Planemo requires BioBlend >=1.6.0; the PR author reports checking 1.6.0 and 1.7.0. Local verification used 1.9.0 only.

Additional direct CLI checks, without modifying tests or implementation:

- Both unfiltered `--raw --max-items 1` and workflow-filtered `--raw --max-items 1` returned parseable JSON on stdout, with the warning only on stderr.
- Both filtered and unfiltered profiles containing different admin and user keys selected the admin key and passed the admin account ID as `user_id` (mocked distinct identities).

Inspected local Galaxy `lib/galaxy/webapps/galaxy/services/invocations.py`: regular users are restricted to their own invocation ID; administrators receive all accounts unless `user_id` is supplied. The new explicit `user_id` is honored by both workflows of the CLI.

No live Galaxy integration was run. The changed external integration test is under an existing class-level `@skip("Configuring quay.io/bgruening/galaxy:latest is currently broken")`, so its new call does not currently provide runnable CI coverage.

## Follow-ups for John

1. **Decide identity semantics for profiles containing distinct admin and user keys.** At `planemo/commands/cmd_list_invocations.py:86-92`, the admin key wins and `/api/users/current` therefore identifies the admin. An admin+user profile now lists the admin's own invocations, potentially zero, even when the user key has real runs. This affects both a supplied workflow identifier and the new unfiltered mode. If listing is intended to mean the profile's execution user's runs, prefer the user key for this command or explicitly resolve the user identity via its own connection while retaining administrative transport. If listing intentionally follows the selected credential, document it. Add a distinct-identity regression check when implementing the decision; the current tests cover user-key-only profiles. Also establish behavior for bootstrap/master administrator keys, which do not necessarily represent an ordinary persisted Galaxy account and may not support `/api/users/current`.

2. **Decide workflow version presentation.** Marius's remaining low-priority issue is valid: returned invocation `workflow_id` identifies a concrete workflow instance/version, so several versions of one stored workflow render as several same-name groups (`cmd_list_invocations.py:106-120`). Either retain version groups and include version in the header, or group by stored workflow ID with instance/version information in the rows. Current URLs/header resolve concrete instances, so simply coalescing IDs loses useful version context.

3. **Restore runnable integration coverage later.** The added unfiltered external test assertion only checks for `invocations found.` and would accept zero, and the entire class is currently skipped. When restoring or replacing the live test, assert the expected nonzero invocations for both filtered and unfiltered commands and cover distinct admin/user profiles. This is a pre-existing testing limitation, not a reason to reject the valid API/signature fix.

4. **Pagination warning wording (minor).** Exactly `max_items` matches also triggers the warning, because no extra item is fetched. The current warning honestly says output was limited, but cannot prove more invocations exist. If refining it later, say results reached the requested limit or fetch one extra item to establish truncation. Defaults remain 100, and `--max-items 0` returns no rows; zero does not request an unlimited listing.

No edits, merges, pushes, or broad integration runs were performed by this reviewer.

## Coordinator outcome

Companion #4 merged into list-all-invocations-rebased as 5c4a6defd60b5811ff6b70acc006faeee7ae3f45. Nine focused tests passed; filtered/unfiltered raw output remains JSON and truncation warning is stderr-only.

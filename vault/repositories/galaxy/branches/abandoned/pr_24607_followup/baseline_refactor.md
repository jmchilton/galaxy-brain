Run via Claude Opus 5.5 at high effort.

# Baseline refactor (round 2, after re-scope)

Rebuilt the 9-commit branch as 6 commits on the same base (`ab008a1a7cfe`): two kept test-only commits, a new baseline test for the static "removed from tool config" path, a behavior-neutral helper extraction (with the message-constant hoist folded in), then the uuid-lookup reason fix and the owner role-loss fix. Test rewrites, drops and the mypy fix are folded into the commits they amended. The only deliberate tree change vs `b8db6e84cca` is the new baseline test.

## New history

1. `c82dc579c05` **Baseline tests: queued user tool job fails when user leaves execute-role group.** Kept as-is (same SHA as round 1). It's the only commit touching `lib/galaxy_test/`.
2. `9b767c5e05a` **Spec the JobHandlerQueue mock in startup unit test.** Kept as-is (same SHA). Test-only, passes on dev.
3. `9d4078e9c00` **Baseline tests: startup fails job whose tool left the tool config.** New.
   - `test_job_whose_tool_left_tool_config_fails_at_startup` in `test_handler_startup_user_tool.py`: static job, `has_tool` returns False. Asserts the fail message, no recover, and the exact `(1) Tool 'removed_tool' removed from tool config, unable to recover job` log line.
   - Goes through `JobHandlerQueue._check_job_at_startup`, not the private helper, so it imports cleanly on dev.
4. `76aa14edd1f` **Extract startup tool-availability check into helper.** No behavior change.
   - `_tool_unavailable_reason(app: MinimalManagerApp, job)` from the start (round 2 began with `toolbox: "ToolBox"` and a `TYPE_CHECKING` import, then swapped to `app` in the role-loss commit; that churn is gone).
   - `TOOL_DISABLED_MESSAGE` hoist (old `b8db6e84cca`, incl. the `__verify_job_ready` assert) and the "run" docstring folded in here.
   - No test changes. The Mock-app `test_tool_unavailable_reason_from_has_tool` (added in old `11707246d40`, dropped in old `8d991950781`) never appears.
5. `112eb731fd3` **Log distinct startup reason when dynamic tool uuid lookup fails.** Except branch returns `(uuid …) unavailable: {e}`; startup test gets `uuid4()` and caplog asserts. The startup test file reaches its final state here.
6. `47e2af2f82d` **Log owner's lost execute role as startup reason for user tool jobs.** `DynamicToolManager.ensure_job_owner_can_run` + its call in the helper, the "deactivated dynamic tool" comment, the strengthened manager tests, and the final real-chain `test_startup_fails_job_whose_owner_lost_execute_role` (mypy `union-attr` fix included).
   - The mock-only startup role-loss test and the `_user_tool_job`/`_startup_queue`/`_assert_failed_not_recovered` helpers (added then inlined away) never appear.
   - `test_handler_startup_user_tool.py` isn't touched by this commit.

## Old to new mapping

| Old | New |
|---|---|
| `c82dc579c05` Baseline tests: group removal API test | `c82dc579c05` (unchanged) |
| `9b767c5e05a` Spec the JobHandlerQueue mock | `9b767c5e05a` (unchanged) |
| — | `9d4078e9c00` Baseline tests: static tool left tool config (new) |
| `11707246d40` Extract helper | `76aa14edd1f` (with `app` signature, no helper test) |
| `5c5968935c9` Distinct uuid-lookup reason | `112eb731fd3` |
| `59f2aa5b7be` Owner role-loss reason | `47e2af2f82d` |
| `e6efabbcbf4` Real role deletion test | `47e2af2f82d` |
| `8d991950781` Real-chain test rewrite, drop mock-only tests | `47e2af2f82d` (drops never appear) |
| `cb6749b2335` mypy union-attr fix | `47e2af2f82d` |
| `b8db6e84cca` Hoist TOOL_DISABLED_MESSAGE | `76aa14edd1f` (constant, docstring) |

Old SHAs cited in `codex_review.md`, `thermo_nuclear_review.md`, `test_challenges_debrief.md`, `implementation_rescope_debrief.md`, `subagents/rescope_review.md` and the `e6efabbcbf4e` snapshot stay reachable via local backup branch `pr_24607_followup_pre_baseline_refactor_2` at `b8db6e84cca`. Round 1's backup `pr_24607_followup_pre_baseline_refactor` and alt `pr_24607_followup_alt_original_scope` (`d5f130d73ac`) untouched.

## Reasoning

- **New baseline test.** Round 2's test challenge dropped the only test of the static `has_tool` False → `removed from tool config` path, judging a front-loaded Baseline commit not worth a history rewrite. This round rewrites history anyway, so the cost is gone. Placed ahead of the extraction, it makes that commit's "no behavior change" claim checkable for the branch it rewrites, through the public startup path rather than the private seam. Reverses `test_challenges_debrief.md`'s "net coverage loss" note (file left unedited). Mocked `has_tool` rather than a real toolbox: the branch is purely the has_tool-False contract, and the real-app fixtures in `test_user_defined_tool_loading.py` are user-tool shaped and arrive only in the role-loss commit.
- **Order.** Kept `c82dc579c05` and `9b767c5e05a` first to preserve their SHAs (round 1's API verification stays valid). All three test-only commits precede any lib change, so they can still split into their own PR.
- **Extraction with `app` signature.** `MinimalManagerApp` is already imported in `handler.py` on dev; passing `app` from the start avoids add-then-remove of the `ToolBox` `TYPE_CHECKING` import. Except-branch comment keeps the at-position wording ("owner lost the execution role", true until the role-loss commit) and changes in commit 6.
- **Fixups folded.** Test rewrite/drops (`8d991950781`), mypy fix (`cb6749b2335`) and the real-chain test (`e6efabbcbf4`) all amended the role-loss commit's tests. The hoist is a pure refactor, so it joins the extraction.

## Tree identity

`git diff b8db6e84cca 47e2af2f82d` shows only the new `test_job_whose_tool_left_tool_config_fails_at_startup` (+18 lines in `test/unit/app/jobs/test_handler_startup_user_tool.py`). Deliberate, documented above.

Constraints: `git diff ab008a1a7cfe HEAD -- test/unit/app/jobs/test_job_wrapper_user_tool.py test/unit/app/jobs/test_job_wrapper.py lib/galaxy/jobs/__init__.py` is empty (`prepare()` untouched; #24635).

## Verification

- **Unit tests at every commit** (`test_handler_startup_user_tool.py`, `test_DynamicToolManager.py`, `test_user_defined_tool_loading.py`, `test_job_wrapper_user_tool.py`): 14, 14, 15, 15, 15, 18 passed. At HEAD, adding `test_job_wrapper.py`: 32 passed.
- **New baseline test discriminates:** on dev lib with the log string mutated (`removed` → `gone`), it failed; restored.
- **Red checks:**
  - Final startup test file against `76aa14edd1f` lib: both parametrized cases red (log said `removed from tool config`). Green after `112eb731fd3`'s lib change.
  - Final manager and real-chain tests against `112eb731fd3` lib: 3 red; the real-chain one at the log assertion (`unavailable: Failed to find a tool with uuid […]`). Green after `47e2af2f82d`.
- **mypy:** `handler.py` has 57 errors at both `76aa14edd1f` and HEAD, same as dev's `handler.py` (all pre-existing; none in the helper or constant). At HEAD, the three test files and `managers/tools.py` show only untyped-def / subclass-Any notes, no `union-attr`.
- **Lint:** pre-commit hooks (black, ruff, flake8, isort, etc.) passed on each new commit; ruff/black/isort clean at HEAD.
- **API tests:** not re-run. `lib/galaxy_test/` changes only in `c82dc579c05`, same SHA and content as round 1, which ran all 3 API tests green on port 9437.

## Push

Remote was at `b8db6e84cca`. Pushed with `--force-with-lease=pr_24607_followup:b8db6e84cca` to `jmchilton/pr_24607_followup`, now at `47e2af2f82d`.

## Follow-ups for the coordinator

- `pr_description.md` and `test_challenges_debrief.md` cite old SHAs and say `removed from tool config` has no test; both now stale.

**Status: READY.**

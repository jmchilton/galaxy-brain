Run via Claude Opus 5.5 at high effort.

# Baseline refactor

I rebuilt the branch on the same base as 5 commits. Test-only work that passes on dev comes first: the baseline API test, the drop of the mock-only test, and the spec'd mock. A behavior-neutral extraction of `_tool_unavailable_reason` follows, then the log-message fix, which shrinks to a 3-line diff. The final tree is identical to the old head `f8acb7c66f0`.

## New history

The base is unchanged at `ab008a1a7cfe`. `origin/dev` has since moved to `f80b877`, but I didn't rebase, so the tree-identity check against `f8acb7c66f0` still means something.

1. `c82dc579c05` **Baseline tests: queued user tool job fails when user leaves execute-role group.**
   - Folds `b0a8523d88f` and `7eccb6af993` together: the API test, `_via_group()` yielding the group, the `create_group` reuse, and the "execute access is removed" comment.
   - Passes on dev because #24607's `prepare()` check is already merged.
   - Both files reach their final state here.
2. `f13067d6852` **Drop mock-only prepare() unit test.** Same as `3ac075e8bf6`.
3. `16c3a15173e` **Spec the JobHandlerQueue mock in startup unit test.**
   - Hand-applied to dev's test, so it carries no caplog asserts.
   - The old `5051deefcfd` couldn't be reused because it already contained `f87781f1839`'s caplog asserts, which fail on dev.
4. `506f8c0abde` **Extract startup tool-availability check into helper.** Refactor with no behavior change.
   - Both the `has_tool` False path and the raise path return `"removed from tool config"`, so the log is byte-identical to dev.
   - Adds `test_tool_unavailable_reason_from_has_tool` to pin the True/False branches.
   - The walrus-to-ternary uuid change is noted in the commit message.
5. `d5f130d73ac` **Log distinct startup reason when dynamic tool uuid lookup fails.** The fix.
   - Folds `f87781f1839`, `fa6ae60c00d` and `2a91b2acb42`. The only lib change is that the except branch now returns `f"(uuid {tool_uuid}) unavailable: {e}"`.
   - The unit test gets a `uuid4()` and the caplog asserts.
   - Retitled from "user tool" to "dynamic tool", because Codex showed that deactivated public dynamic tools take this path too.

## Old to new mapping

| Old | New |
|---|---|
| `3ac075e8bf6` Drop mock-only prepare() unit test | `f13067d6852` |
| `f87781f1839` Log distinct startup reason (owner wording) | `d5f130d73ac` |
| `5051deefcfd` Spec the JobHandlerQueue mock | `16c3a15173e` (without caplog) |
| `b0a8523d88f` Group-removal API test | `c82dc579c05` |
| `fa6ae60c00d` Assert uuid and error in log | `d5f130d73ac` |
| `7eccb6af993` Reuse create_group | `c82dc579c05` |
| `2a91b2acb42` Neutral log reason | `d5f130d73ac` |
| `f8acb7c66f0` Extract helper | `506f8c0abde` (dev behavior) + `d5f130d73ac` (reason) |

The old SHAs are cited in `codex_review.md`, `thermo_nuclear_review.md`, `test_challenges_debrief.md` and the `b0a8523d88fa` implementation snapshot. They stay reachable through the local backup branch `pr_24607_followup_pre_baseline_refactor` at `f8acb7c66f0`.

## Reasoning

- **Baseline test first.** `b0a8523d88f` covers behavior that #24607 already put on dev, so it qualifies as a baseline test and comes first. That way commits 1–3 can be split into their own PR if wanted. This reverses the line "Baseline tests: none on this branch" in `test_challenges_debrief.md`.
- **Populator reuse folded into the baseline commit.** It only touched the helper that the baseline test uses, plus a comment on a helper that test introduced. A separate commit would just churn the same lines.
- **Extraction split ahead of the fix, with dev's message kept.** That turns the fix into a reviewable change to one return value. The new direct test of the helper is meaningful at the refactor position.
- **Fixups folded.** `fa6ae60c00d` and `2a91b2acb42` only amended the log string and its assertion from `f87781f1839`, so they belong in one fix commit. The intermediate "not available to the job's owner" wording, which Codex flagged, no longer appears anywhere in history.
- **Tree identity.** `git diff f8acb7c66f0 d5f130d73ac` is empty. There are no deliberate content changes.

## Verification

- **Startup unit test** (`test/unit/app/jobs/test_handler_startup_user_tool.py`) at every commit: 2, 2, 2, 4 and 4 passed.
- **Red check.** I put the final unit test file on top of `506f8c0abde`, and both raise parameters failed at the `(uuid ...) unavailable:` caplog assertion. The log said "removed from tool config". So the fix commit is what turns the test green.
- **Lint and types at `506f8c0abde`.**
  - ruff, black and isort are clean on `handler.py` and the unit test.
  - mypy reports no errors in the new helper or the import region. The remaining errors are untyped-def notes on existing functions and test functions, which dev has as well.
- **API tests** at `c82dc579c05`, run in one sequential pytest invocation on port 9437 with the worktree checked out at that commit. All 3 passed in 58s.
  - `test_queued_job_fails_when_user_is_removed_from_execute_role_group`
  - `test_queued_job_fails_when_execute_role_is_revoked`
  - `test_create_unprivileged_with_group_inherited_role`
  - Commits 2–5 don't touch the API test, the populator or the `prepare()` path; they only change startup recovery and unit tests. So this one run covers every later position.
- **Pre-commit hooks** (black, ruff, flake8, etc.) passed on each commit.

## Push

- The remote was at `f8acb7c66f0` as expected.
- Pushed with `--force-with-lease=pr_24607_followup:f8acb7c66f0...` to `jmchilton/pr_24607_followup`, which is now at `d5f130d73ac`.

**Status: READY.**

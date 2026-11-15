Run via Claude Opus 5.5 at high effort.

No refactoring of the base branch was performed.

Evaluated at `0bbc3e55ae8` on `release_26.0` (`9ae7ab9c1df`). History, head and tree are unchanged, and the child branch `wes_run_state_executor_error_26_0` was not touched.

## Candidates considered

Four of the five fix commits change 3 to 15 service lines: the 403 guard in `_get_invocation`, the terminal-state early return in `cancel_run`, the `NoReplacement`-to-`null` loop in the run log, and the one-line `use_cached_job` call into `_parse_boolean_engine_parameter`. No refactor ahead of them would make them smaller or clearer. Only the rejected-submission commit (`c7b0d3501b6`, +88/-44 in `wes.py`) is large enough to look at.

- **Extract JSON-field parsing (`_parse_json_object` / `_parse_engine_parameters`) before the fixes.** To preserve behavior, the extraction would have to drop the "must be a JSON object" check and keep the parsing after the workflow import. The rejected-submission commit would then only move two calls up and add the check. That removes about 20 lines from a diff that is mostly re-indenting Steps 5 to 8 into the `try` block, and the `try` block is the fix itself. It would also move the `use_cached_job` coercion into the parse helper. Fix 1 would then validate at parse time and take over part of fix 4's ordering change, which blurs two separate fixes. The gain is small, and the helpers exist only because fix 4 moves validation ahead of the import, so they read better introduced with it.
- **Return `(history, created)` from `_get_or_create_history` first.** Nothing on the base branch uses the flag. Only the cleanup does, so it belongs to the fix.
- **Extract Steps 5 to 8 (or workflow resolution, `_resolve_workflow`) from `submit_run` so the fix becomes a `try` around one call.** The cleanup needs `created_history`, which is created inside those steps, so the helper would have to return it or do the cleanup itself. Either way the fix has to reach into the new helper. The thermo-nuclear review declined this restructuring on `release_26.0` because it causes merge-forward conflicts with `dev`, and recommended it as a follow-up on `dev`. A pre-fix refactor would go against that decision.
- **Test-side refactors.** The `_cancel_wes_run` helper commit (`2875e36a82f`) already sits first. `_assert_cancel_leaves_state` serves only the cancel fix's two tests, so it stays in that commit. Per the gx_workhorse "Baseline Tests" rule, no baseline-test commit applies. The branch adds tests for buggy behavior, which would fail on the base branch.

## Tests

None run. No commit or tree changed, so the earlier debriefs' results still apply (`test_challenges_debrief.md`, `thermo_nuclear_review.md`).

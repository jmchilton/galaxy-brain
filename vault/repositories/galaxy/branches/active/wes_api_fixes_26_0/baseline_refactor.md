Run via Claude Opus 5.5 at high effort.

Two behavior-preserving refactor commits now come before the fixes: one shared anonymous-user check (`_require_user`), and `_get_or_create_history` split into `_get_requested_history` and `_create_history`.

Evaluated at `5dfca8c61de` on `release_26.0` (`9ae7ab9c1df`). The new head is `67305c6d0a1`, not pushed. Its tree is identical to `5dfca8c61de`'s. I didn't touch `wes_api_fixes_26_0_alt_original_scope` or the child branch `wes_run_state_executor_error_26_0`. The child still sits on an older head and needs rebasing onto `67305c6d0a1`. The first pass ([earlier_drafts/1/baseline_refactor.md](earlier_drafts/1/baseline_refactor.md)) found no refactor to make. Since then, the re-scope and the thermo pass added two helpers that also make sense on the base branch.

| Commit | Subject |
| --- | --- |
| `e16eaa804e8` | WES tests: add helpers for listing and cancelling runs (unchanged) |
| `be3ffb8e6fd` | WES: share one anonymous-user check (new) |
| `7ec82f1d600` | WES: split history lookup from history creation (new) |
| `3f94ec3906b` | WES: accept a JSON boolean for use_cached_job |
| `06e8d39d589` | WES: answer 403, not 500, for anonymous run-scoped requests |
| `03adee74219` | WES: cancelling a finished run leaves its state alone |
| `df4317ee032` | WES: rejected submissions leave no workflow or history behind |
| `93d55d7dab5` | Report omitted optional parameters as null in invocation output values |
| `5581d4cfcb4` | WES: end paginated lists with an empty next_page_token |
| `67305c6d0a1` | WES: point auth_instructions_url at the API key page |

## Refactors

- **`_require_user` (`be3ffb8e6fd`).** Adds `_require_user(trans, message) -> User`, which `submit_run` and `list_runs` now use in place of `trans.anonymous` and `trans.user is None`. It raises the same `AuthenticationRequired` with the same messages. `list_runs` still checks after decoding the page token, and it reads `user.id` instead of the Optional `trans.user.id`. The 403 fix now only calls the guard from `_get_invocation`, moves the `list_runs` check ahead of token decoding, and puts encoded ids in its error messages. Its `wes.py` diff went from 29 changed lines to 14. Its message now says the run-scoped endpoints use the existing check, rather than introducing a shared one.
- **History lookup/create split (`7ec82f1d600`).** `_get_requested_history -> Optional[History]` and `_create_history -> History` match the final head word for word. `submit_run` calls them where it used to call `_get_or_create_history`, after the workflow import, so behavior is unchanged. The docstring no longer lists `AuthenticationRequired`, which the lookup never raised. The rejected-submission fix now only moves the lookup ahead of the import and creates the history inside the cleanup `try`. Its `wes.py` diff went from 172 changed lines to 126, and what remains is the ordering and the cleanup.

Rebased only, with no content change: the boolean fix and the cancel fix. Their code now differs from the originals only by the two refactors. From the rejected-submission commit on, every tree is identical to its original.

## Considered and not done

- **JSON-field parsing helpers (`_parse_json_object`, `_parse_engine_parameters`).** The first pass's verdict still applies. To preserve behavior, extracting them would mean dropping the "must be a JSON object" check and moving the `use_cached_job` coercion. That would blur fixes 1 and 4.
- **Router-level `DependsOnUser`, `WorkflowsManager.get_invocation`, `InvocationState` constants, file splits.** These are the thermo review's "Not acted on" items. Each changes error codes, messages or admin semantics, or rewrites pre-existing lines on a release branch. They remain follow-ups for `dev`, not baseline refactors.
- **Baseline tests.** As in the first pass, no baseline-test commit applies, because the branch's tests pin buggy behavior that fails on the base.

## Tests

Each run used the worktree's `.venv` and the prescribed environment, one test per pytest invocation, in a temporary detached worktree (since removed).

- At `e16eaa804e8`, before the refactors: an ad-hoc test, never committed, checked that an anonymous `GET /runs` returns 403 with "Listing WES runs requires authentication.", that an anonymous `GET /runs?page_token=junk` returns 400 (the token is decoded first), and that an anonymous `POST /runs` returns 403 with "You need to be logged in to submit workflows.". It passed.
- At `be3ffb8e6fd`: the same ad-hoc test, `test_wes_list_runs_pagination` and `test_wes_submit_run_with_workflow_url` all passed.
- At `7ec82f1d600`: four tests passed. `test_wes_submit_run_with_engine_parameters` covers a new history named by `history_name`. `test_wes_state_mapping` covers an existing `history_id`. `test_wes_cannot_run_against_other_users_history` covers the lookup's 404. `test_wes_submit_run_with_gxworkflow_uri` covers a new history with no import.
- At `06e8d39d589`: `test_wes_run_endpoints_require_authentication` passed.
- `ruff check` and `black --check` passed on `services/wes.py` at every rewritten commit up to the rejected-submission fix. Later commits are byte-identical to the originals. `isort` and `mypy` were clean on `services/wes.py` at both refactor commits.
- The final tree equals `5dfca8c61de`'s, so the earlier debriefs' results at the head still apply.

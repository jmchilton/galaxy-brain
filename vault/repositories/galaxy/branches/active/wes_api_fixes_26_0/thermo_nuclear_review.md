Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear review: wes_api_fixes_26_0 (re-scope pass)

I acted on one finding. A requested `history_id` is now looked up before the workflow import, and a new history is created only inside the cleanup scope. This removes the `tuple[History, bool]` return and the `history_created` flag. The change is folded into the rejected-submission commit, and that commit's message now says so. I didn't act on six other findings, for release-branch proportionality or because the structure predates the branch and the branch doesn't make it worse. Reviewed at `63bb73b0cf6`. The new head is `5dfca8c61de` on `release_26.0` (`9ae7ab9c1df`), not pushed. I didn't touch `wes_api_fixes_26_0_alt_original_scope` or the child branch `wes_run_state_executor_error_26_0`. The child still sits on an older head and needs rebasing onto `5dfca8c61de`.

## Not acted on

- **The anonymous guard belongs in the router (`DependsOnUser`), not in a service helper.** `galaxy.webapps.galaxy.api` already has `get_required_user` / `DependsOnUser`, which raises a 403 `UserRequiredException`, and `api/agents.py` uses it. Declaring the user dependency on the WES routes would delete `_require_user` and its three call sites, and the service could take a typed `User`. That isn't proportionate on `release_26.0`. It would edit the seven non-service-info route signatures in `api/wes.py`, a file the branch doesn't touch. It would also change `err_code` for anonymous submit and list from 403001 to 403008, and replace their existing messages with a generic one. Those two endpoints already returned 403, so the change would fix no bug. Recommended follow-up on `dev`.
- **`_get_invocation` re-implements `WorkflowsManager.get_invocation(..., check_ownership=True)`.** The manager is the canonical lookup and is already what `request_invocation_cancellation` uses. Switching to it would change error types and messages, and admin access to other users' runs, on a release branch. Follow-up on `dev`, together with giving `WesService` real manager dependencies in place of `self._workflows_service._workflows_manager`. The first pass already deferred the dependency change.
- **The `NoReplacement` marker check is now written out in `WorkflowInvocation.to_dict`.** `workflow/run.py:540` and `tools/parameters/basic.py:284` have the same check. A shared predicate can't live in `galaxy.tools.parameters.workflow_utils`, because `galaxy.model` must not import from `galaxy.tools`. This is the same verdict the re-scope review reached. Follow-up on `dev`: put the marker constant and an `is_no_replacement_marker()` predicate somewhere both packages can import.
- **`TERMINAL_GALAXY_STATES` uses raw strings instead of `WorkflowInvocation.states` members.** It matches `GALAXY_TO_WES_STATE` directly above it, which is pre-existing. Switching only the new tuple would make the two neighbours inconsistent, and switching both would rewrite pre-existing lines for no behavior change. Follow-up on `dev`: convert both to `InvocationState`, and add a `_wes_state(invocation)` helper for the three `GALAXY_TO_WES_STATE.get(invocation.state or "", State.UNKNOWN)` copies.
- **File sizes.** `test_wes.py` goes from 968 to 1110 lines on this branch. `services/wes.py` was already 1173 lines and is now 1253. The first pass gave the same verdict: the tests are only appended, and the service additions are small module-level helpers. Splitting either file on `release_26.0` would conflict with every merge forward. Follow-up on `dev`, using the split plan in [earlier_drafts/1/thermo_nuclear_review.md](earlier_drafts/1/thermo_nuclear_review.md).
- **`_get_requested_history` silently accepts a raw database id when decoding fails.** This is the pre-existing "assume it's already decoded" fallback. The lookup is still scoped to the user's own histories. Rejecting undecodable ids would be the cleaner contract, but it changes accepted input on a release branch. Follow-up on `dev`.

## Change made

| Commit (new SHA) | Change |
| --- | --- |
| `92e4cd9bb21` WES: rejected submissions leave no workflow or history behind | Split `_get_or_create_history -> tuple[History, bool]` into `_get_requested_history -> Optional[History]` and `_create_history -> History`. `submit_run` looks up a requested history with the other pre-import validation. Inside the existing `try`, it calls `history = created_history = _create_history(...)` only when no history was named. The commit message now mentions the pre-import lookup. |

Rebased only: `876e86357c4`, `5f6c3f2f1a1`, `5dfca8c61de`. Unchanged: `e16eaa804e8`, `757c1fdeff5`, `f60452053c8`, `17b06c633d7`.

What changes for clients. When a request names another user's `history_id`, or a missing one, it now gets its 404 before Galaxy fetches or imports the workflow. Before, it was rejected after the import, and the cleanup soft-deleted the imported workflow. A request with both a bad `history_id` and a bad workflow now reports the history 404 rather than the workflow error. That is the same validate-first order the commit already applies to `workflow_params` and `workflow_engine_parameters`.

## Tests and lint

- API tests, one per pytest invocation, at `5dfca8c61de`, all passing: `test_wes_failed_submission_leaves_no_workflow_or_history`, `test_wes_submit_run_with_engine_parameters` (new history named by `history_name`), `test_wes_cannot_run_against_other_users_history`, `test_wes_submit_run_use_cached_job_boolean` (existing `history_id`), `test_wes_submit_run_with_gxworkflow_uri` (new history, no import).
- `ruff`, `black --check`, `isort --check`, `flake8` and `mypy` are clean on `services/wes.py`. `ruff` and `black` are also clean on `wes.py` at every rewritten commit. The test files are unchanged.

<details>
<summary>Full review</summary>

Reviewed `git diff origin/release_26.0...HEAD` at `63bb73b0cf6`: eight commits touching `services/wes.py`, `WorkflowInvocation.to_dict`, `test_wes.py`, `test_workflows.py` and `doc/source/dev/ga4gh_wes.md`. I also read the prior debriefs (re-scope, re-scope review, test challenges, Codex, performance, and the first thermo-nuclear pass), `REVIEW_FOCUS.md`, and how `origin/dev` differs from `release_26.0` in `wes.py`. On `dev` the file has only typing changes (`X | None`, `ProvidesHistoryContext`), and none of them touch the history helpers.

### Verdict

The branch is still well shaped. Each fix is local, new logic lives in small pure module-level helpers, and the one native-layer change (`to_dict`) is a single, explained mapping at the only place that produces the API shape. The re-scope deleted complexity: the WES-only `NO_REPLACEMENT_VALUE` loop and three ad-hoc anonymous checks are gone. One piece of control flow that the branch introduced could be made simpler without changing behavior on the paths that succeed, and I made that change. The other items are structural debt that predates the branch, or canonical-layer moves that are too large for `release_26.0`.

### 1. History selection: flag-driven cleanup (fixed)

`_get_or_create_history` returned `(history, created)` only so `submit_run` could do `if history_created: created_history = history` inside the cleanup `try`. The function mixed a validating lookup, which can fail with 404, and a side-effecting create, which commits. Because it sat inside the `try`, the 404 for a bad `history_id` was only "cleaned up" after the workflow had been imported. The branch's own pre-import validation (`_parse_engine_parameters`, `_parse_json_object`) shows the better pattern: reject what you can before creating anything.

The code-judo move is to split by responsibility. `_get_requested_history` returns `Optional[History]` and runs with the other pre-import validation. `_create_history` runs inside the `try` only when nothing was named. The tuple, the flag and its branch disappear. The cleanup scope now covers only what invocation can actually leave behind, and a bad `history_id` no longer triggers an import followed by a soft delete. The first pass rejected "infer created from `"history_id" not in engine_params`" because it duplicated the branch condition. This split doesn't duplicate it: the condition lives once in `_get_requested_history` and comes back as `None`.

### 2. Anonymous guard in the wrong layer (follow-up)

`_require_user` is a clean consolidation of what was there, and it returns a typed `User`, which removes Optional access in `list_runs` and `_get_invocation`. The canonical home is the FastAPI dependency `DependsOnUser` (`get_required_user`). With it, the guard would be declared per route and vanish from the service entirely. On a release branch the cost is seven route signatures, and a visible `err_code` and message change for endpoints that already answered 403. See "Not acted on".

`submit_run` calls `_require_user` but discards the result, while the history helpers still read `trans.user`. This is harmless, and it goes away with the router-level dependency.

### 3. `_get_invocation` duplicates the manager (follow-up)

The ownership check (`invocation.history.user_id != user.id`) re-implements `WorkflowsManager.get_invocation(trans, id, check_ownership=True)` / `check_security`. The branch only changed the messages and the user source on these lines. Delegating would change admin semantics and error types. See "Not acted on".

`self._security.encode_id(run_id)` appears twice in `_get_invocation`, but only on error paths. Hoisting it would put the encode on the success path to save one repeated expression. I left it.

### 4. `NoReplacement` → `null` in `to_dict` (accepted)

This is the right place: `to_dict` is the only producer of the API shape for `output_values`, and storage, export and recovery read the model directly. The `isinstance(value, dict) and value.get("__class__") == "NoReplacement"` check is the third copy of that predicate in the codebase. Package layering, not the branch, prevents sharing it. The comment explains why the mapping exists rather than restating the code.

### 5. Terminal-state guard in `cancel_run` (accepted)

The early return is minimal and the comment says why: Galaxy's `cancel()` rewrites finished invocations. `TERMINAL_GALAXY_STATES` is tied to `GALAXY_TO_WES_STATE` only by a comment. Deriving it from WES states would need either a helper over the three pre-existing `GALAXY_TO_WES_STATE.get(...)` copies or a comprehension, which is more magic than an explicit three-item tuple. Converting both maps to `InvocationState` is the boring fix for `dev`.

### 6. Request parsing helpers (accepted)

`_parse_json_object`, `_parse_engine_parameters` and `_parse_boolean_engine_parameter` are small and pure, each with one job. `_parse_boolean_engine_parameter` takes a `name` it uses only in its error message, and it has a single caller. That is mildly general, but it reads clearly. The typed engine-parameter model stays the larger code-judo move. It is deferred because pydantic's lax bool would widen accepted input on a release branch, as the first pass found.

### 7. Rejected-submission cleanup (accepted)

`_discard_rejected_submission` is the most direct option, given that `build_workflow_from_raw_description`, history creation and `invoke_workflow` each commit. Rolling back, soft-deleting, and logging (but swallowing) a failure inside the cleanup keeps the original error as the response. A transactional submit would mean changing shared workflow-creation code. After fix 1 the cleanup handles fewer cases, but it is still needed for invocation-time validation such as missing required inputs.

### 8. `next_page_token: ""` and `auth_instructions_url` (accepted)

Both are one-line changes at the point where the value is produced, and each comment explains the WES rule. `trans.url_builder("/", qualified=True).rstrip("/")` is the same idiom `sharable.py` and `notifications.py` use. The `assert trans.url_builder` narrows the type for a required field and doesn't hide a fallback. `url_builder("/user/api_key", qualified=True)` would go through `url_for` and the legacy WSGI fallback, which is less direct.

### 9. Tests (accepted)

The helpers earn their keep. `_list_wes_runs` has nine call sites. `_cancel_wes_run` and `_assert_cancel_leaves_state` replace repeated multi-assert blocks. The native and WES `NoReplacement` tests cover different contracts and both use the minimal workflow. `test_wes_failed_submission_leaves_no_workflow_or_history` still covers the cleanup path through its missing-input case. Its other-user-history case is now rejected before the import, and its final assertions still hold. No test was weakened.

### 10. File size and merge-forward (follow-up)

See "Not acted on". The `dev` delta in `wes.py` is typing-only and doesn't overlap the history helpers, so fix 1 adds no merge-forward conflict. The new helpers use `Optional[...]`, which `dev`'s pyupgrade lint will rewrite to `X | None` at merge time, as it will for the rest of the file.

</details>

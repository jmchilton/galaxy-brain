Run via Claude Opus 5.5 at high effort.

**Recommendation: (b) expand modestly, staying on `release_26.0`.** Keep all five fixes, and add two small items to the branch. First, move the `NoReplacement` to `null` mapping out of WES and into Galaxy's invocation serializer (`WorkflowInvocation.to_dict`), so the native invocation API is fixed as well and WES uses that path. Second, return the spec's empty-string `next_page_token` at the end of both WES list endpoints. Two optional riders, each a few lines in the same file, are also worth taking: one anonymous-user guard with encoded run ids in the `_get_invocation` error messages, and a real `auth_instructions_url` in place of `"TODO"`. Don't fold in the stacked bug-5 branch (`wes_run_state_executor_error_26_0`). It still needs John's decision, and the project's own recommendation (D3) is a narrower rule on `dev`. Also leave out integer validation (bug 7), the native `new_history_name` leak, the null-field and `request`/`run_log` "honesty" work, and DRS. These are separate PRs touching shared code or making design changes. The expansion adds roughly 55 lines, mostly tests.

Evaluated at `0bbc3e55ae8` (base `release_26.0` `9ae7ab9c1df`). Six commits, +270/−52 across `services/wes.py`, `test_wes.py` and `doc/source/dev/ga4gh_wes.md`.

## Possible Decompositions

The commits are already one per fix. These are the dependencies between them:

- `2875e36a82f` (test helper `_cancel_wes_run`) must come before the 403 fix and the cancel fix, because both tests use it.
- The rejected-submission commit (`c7b0d3501b6`) depends on the `use_cached_job` commit (`3c2952bba2b`). `_parse_engine_parameters` calls `_parse_boolean_engine_parameter`, and the test relies on the `"maybe"` → 400 rejection.
- The 403, cancel and `NoReplacement` commits touch separate functions. When split, they conflict only where tests are appended to the end of `test_wes.py` and in adjacent lines of the docs' Errors table.
- The child branch `wes_run_state_executor_error_26_0` changes the WES state of `completed` runs. That interacts with the cancel commit's `TERMINAL_GALAXY_STATES` (see "As implemented" details), so it naturally sits on whichever PR carries the cancel fix.

Ways to split:

1. **One PR (as implemented).** All six commits. This is the simplest review if John is comfortable with the three behavior changes (cancel no-op, cleanup of rejected submissions, `null` for omitted parameters) landing together with the two crash fixes.
2. **Two PRs, crashes and cleanup first, then semantics.**
   - PR A: the helper, `use_cached_job` boolean (500 → 200/400), anonymous 403 (500 → 403), and cleanup of rejected submissions. Every change here either turns a 500 into a 4xx or stops leaking objects. None changes how a successful run looks.
   - PR B, stacked on A or independent: cancel on a terminal run is a no-op, and omitted optional parameters come back as `null`. Both change what clients see for runs that are working. The child bug-5 branch would then stack on B.
3. **Three PRs, by kind of change.**
   - PR A, 500s: the helper, `use_cached_job`, anonymous 403.
   - PR B, rejected-submission cleanup, stacked on A. This is the largest commit (+88/−44 in `wes.py`, mostly re-indenting into the `try`), and it deserves its own review of the rollback-plus-soft-delete choice.
   - PR C, result semantics: the cancel no-op and `null` outputs. It is independent of A and B apart from the helper. The child bug-5 branch stacks on C.
4. **Five PRs, one per fix.** Land the helper with the first cancel-using PR (403 or cancel). The `use_cached_job` PR must precede the rejected-submission PR. The others can land in any order. This creates the most merge-forward overhead for the least gain, given how small each fix is.

If the recommended expansion is taken, the native `NoReplacement` change replaces the `NoReplacement` commit wherever it lands. The `next_page_token` change and the `auth_instructions_url` change are each a commit of their own, and either fits PR A in options 2 and 3. The anonymous-guard rider folds into the 403 commit.

## Scopes considered

### As implemented

Five WES-local fixes in `services/wes.py`, each with an API test and a docs line. A JSON-boolean `use_cached_job` is accepted (it was a 500). Anonymous run-scoped requests get 403 (they were 500s). Cancelling a terminal run leaves it alone. Rejected submissions soft-delete the workflow they imported and any history they created. An omitted optional parameter output is reported as `null` in the WES run log only.

| Pros | Cons |
| --- | --- |
| • Every fix is confined to the WES service. Nothing touches shared invocation, model or manager code. | • The `NoReplacement` fix is WES-only. Galaxy's native `GET /api/invocations/{id}` still returns the internal marker, and that is the sibling path the demo notes flagged ("Probably not WES-specific"). |
| • Each bug was reproduced before the fix and has a test that fails without it. | • It leaves two small known spec gaps in the same file: `next_page_token: null` and `auth_instructions_url: "TODO"`. |
| • Merges forward cleanly to `release_26.1`, `26.2` and `dev`. | • The cancel no-op trades away a useful side effect: WES cancel no longer cleans up paused jobs of a completed run, or still-running jobs of a `failed` run. |
| • Already through test, Codex, performance, thermo-nuclear and baseline-refactor passes. | |

<details>
<summary>Details</summary>

The cancel no-op and bug 5 interact. With the child branch, a `completed` run that has paused jobs reports EXECUTOR_ERROR. Because Galaxy's state is still `completed`, this branch's early return then makes WES cancel a no-op for it, and its paused jobs can only be cleaned up through the native `DELETE /api/invocations/{id}`. That is defensible, because WES says terminal states are final. But it is one more reason to decide bug 5 and the cancel semantics together. An alternative for the cancel commit is "delete leftover paused or running jobs but keep the invocation state". It is listed under "Not recommended" below. That would mean new manager code driving `cancel_invocation_steps` without the `cancelling` transition. This is a design change, not a scope tweak.

The implementer kept the `NoReplacement` fix WES-only on purpose, to avoid changing the native API on a release branch. That reason is on the list John has overridden before. See the recommended expansion.

</details>

### Recommended: modest expansion

Everything as implemented, plus the four items below. Items 1 and 2 are the core of the expansion. Items 3 and 4 are optional riders that are cheap enough to take along.

1. **Native `NoReplacement` → `null` (general fix).** In `WorkflowInvocation.to_dict` (`lib/galaxy/model/__init__.py`, the `output_values` loop near line 10274), map the stored `{"__class__": "NoReplacement"}` to `None`. Optionally, name the marker once as a constant in `lib/galaxy/tools/parameters/workflow_utils.py`, used by `workflow/run.py`'s `_record_workflow_output` and the model. That constant is the thermo-nuclear review's suggested home. Revert WES's run-log loop to the original `outputs_dict.update(...)` and drop `NO_REPLACEMENT_VALUE`. Add a native API test in `lib/galaxy_test/api/test_workflows.py` that invokes a workflow with an omitted optional parameter output and asserts `output_values[label] is None`. Keep the existing WES test. Roughly +5/−8 in the model, run.py and wes.py, plus a test of about 25 lines. Storage and model-store export (`WorkflowInvocationOutputValue.serialize`) keep the marker, because recovery and subworkflow replacement need it.
2. **End-of-list `next_page_token: ""`.** In `list_runs` and `get_run_tasks`, return `""` instead of `None` when there are no more results. Galaxy's own generated model describes the field that way ("An empty string indicates there are no more items to return"), and Sprocket's last page currently sends back the string `"None"` and gets a 400. Assert the final-page value in the existing pagination tests, and update the docs example and the Pagination paragraph. Two service lines, about 4 test lines and about 3 doc lines.
3. **Optional rider: one anonymous guard, and encoded ids in messages.** Give `submit_run` (`trans.anonymous`), `list_runs` (`trans.user is None`, which currently runs after token decoding) and `_get_invocation` a single check. Make `_get_invocation`'s "Invocation {run_id} not found / not accessible" messages show the encoded run id the client sent, not the decoded database id. This fits the 403 commit. About ±10 lines. The existing tests cover it.
4. **Optional rider: `auth_instructions_url`.** Replace the literal `"TODO"` with the Galaxy server's API-key page (`/user/api_key` under the configured base URL), and drop the corresponding "Known limitations" bullet in the docs. About 3 service lines, plus one assertion in `test_wes_service_info`. It is a required field in WES service-info, and the project notes list it among the WES request bugs.

| Pros | Cons |
| --- | --- |
| • Fixes the `NoReplacement` leak where it starts. The native API, `tool_util/cwl/util.py`'s `invocation_to_output` (used to verify workflow test outputs) and WES all get `null`, and WES loses special-case code. | • Changes a native API response on a release branch. Nothing in `client/src` or `lib/` reads the marker from `to_dict` (checked), but an external script could. |
| • The two spec fixes are a few lines each, sit in the file the branch already touches, and are on the project's own list of WES gaps. | • `next_page_token: ""` can make a client that loops on `is not None` re-fetch page 1, because an empty `page_token` decodes as "no cursor". Galaxy's docs example currently shows `null`, so a client written from the docs might do that. |
| • No retargeting is needed. Every item fits `release_26.0` and merges forward. | • Items 3 and 4 are polish, not bugs. A reviewer could reasonably ask for them to be dropped. |

<details>
<summary>Details</summary>

The native change is small because `to_dict` is the only place `output_values` gets its API shape: `services/invocations.py` calls `invocation.to_dict(view, ...)`, and WES calls `to_dict(view="element")`. `workflow/run.py` (around line 540) reads the stored marker back from `WorkflowInvocationOutputValue.value`, not from `to_dict`, so recovery is unaffected. `tools/parameters/basic.py` (around lines 272 and 284) serializes its own copy of the marker for tool state. It stays as it is, or uses the shared constant.

On `next_page_token`, the other choice is to omit the field at the end. The spec's wording is explicit about `""`, and omission would just give clients a third case to handle. If John thinks the `is not None` risk matters more on a release branch, item 2 is the one to drop.

</details>

### Further expansion: native `new_history_name` leak (sibling path)

Fix the same leak in native `POST /api/workflows/{id}/invocations` with `new_history_name`. In `build_workflow_run_configs` (`lib/galaxy/workflow/run_request.py`), `_get_target_history` creates and commits a history before `_normalize_inputs` and parameter validation. Then, optionally, route WES's new-history case through `new_history_name`.

| Pros | Cons |
| --- | --- |
| • Same class of bug as bug 2, on the sibling path. Reviewers may ask "what about the native API?" | • Shared invocation code with batch expansion (one history per expanded parameter set). Cleanup has to track several histories. |
| • A thermo-nuclear reviewer considered routing WES through `new_history_name` and rejected it only because the native path leaks too. | • Routing WES through it would change WES behavior. Another user's `history_id` goes through `history_manager.get_mutable` (403) instead of WES's 404, and the branch's test asserts 404. |
| | • WES would still need its own cleanup of the imported workflow, so the WES fix barely shrinks. A separate `release_26.0` PR, with its own native test, is the better shape. |

### Further expansion: fold in bug 5 (`wes_run_state_executor_error_26_0`)

Squash or stack the child branch's EXECUTOR_ERROR mapping for `completed` runs with failed or paused jobs into this PR.

| Pros | Cons |
| --- | --- |
| • It is the bug that matters most to WES clients. A client that trusts COMPLETE reports success for a run whose outputs were never produced. | • It reverses documented behavior ("a failed job does not make the run unsuccessful") and is waiting on John's decision. |
| • It sits next to the cancel fix's terminal-state logic, so deciding both together avoids a second round. | • The project recommends a narrower rule (D3: EXECUTOR_ERROR only when a workflow output is in `error` or `paused`) on `dev`. If that's chosen, this option needs `dev`, not `release_26.0`, for that piece only. |
| | • Bundling it would hold up five uncontroversial fixes. |

### Further expansion: WES "honesty" fixes (D14)

Fill `request` and `run_log`, or omit null optional fields. Accept `gxformat2` and `GALAXY` as "detect the type". Use 401 rather than 403. List collection elements with DRS URIs. Fix the DRS host, the 202 wait and private-dataset access.

| Pros | Cons |
| --- | --- |
| • These changes would let the four third-party WES clients tested in stage 7 work unmodified. | • Each one is a design or contract change. `request` isn't persisted, omitting nulls changes every WES response, 401 contradicts `GET /runs`, submit and the #22347 choice, and DRS is shared with Galaxy's DRS service (`services/datasets.py` builds the same `drs.<host>` URI). |
| | • They are well over the "modest" bar. They belong in their own spec-conformance PR or PRs, probably on `dev`. |

### Further expansion: integer input validation (bug 7)

Reject non-integer values for integer parameter inputs at invocation time. Today `"abc"` is accepted and passed through.

| Pros | Cons |
| --- | --- |
| • A real data-quality bug that also affects the native API. | • The fix is in shared parameter validation (`run_request.py` → `input_param.validate`, `workflow/modules.py`), not in WES. |
| | • It starts rejecting input that every Galaxy API accepts today, which makes it a behavior change better reviewed alone, and arguably on `dev`. |

### Not recommended: smaller ideas

- **Galaxy `failed` → WES `SYSTEM_ERROR`.** This changes the state mapping. It belongs with the bug-5 decision, not here.
- **Cancel on a terminal run deletes leftover jobs but keeps the state.** This keeps the old side effect without rewriting the state, but needs new manager code that bypasses the `cancelling` transition. It is a design change. Native `DELETE /api/invocations/{id}` already does the cleanup.
- **The missing-input 400 names a database step id.** The message comes from `_normalize_inputs` in shared `run_request.py` and affects every API. It is a fine separate one-liner, but it isn't WES code.
- **Typed engine-parameter model, splitting `submit_run`, moving request parsing out of `wes.py`, splitting `test_wes.py`.** These are refactors the thermo-nuclear review already deferred to `dev`, to avoid merge-forward conflicts.

### Contraction: crash and leak fixes only

Keep `use_cached_job`, anonymous 403 and rejected-submission cleanup. Drop the cancel no-op and the `null` mapping, or move them to a second PR (decomposition option 2).

| Pros | Cons |
| --- | --- |
| • The first PR contains only changes no reviewer will argue with: 500s become 4xx, and orphaned objects stop. | • The two dropped fixes are real client-visible bugs: COMPLETE silently becomes CANCELED, and an internal marker leaks into the API. Both are small and tested. |
| • It isolates the two semantics choices (idempotent cancel, `null` for omitted values) for a separate discussion. | • Two PRs for about 270 lines is more process than the change needs, and reviewers here usually push for broader scope, not narrower. |

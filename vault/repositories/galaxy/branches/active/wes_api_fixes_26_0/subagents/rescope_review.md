Run via Claude Opus 5.5 at high effort.

I acted on one finding. `get_run_task`'s "Task … not found in run …" message still named the decoded database id. It now names the encoded id, like `_get_invocation`, and has a test assertion. The fix is folded into the 403 commit (`8cd91d59186`). I left everything else as it is. The re-scope's four changes hold up on spec conformance, release-branch safety and native API compatibility. New head: `5d05171e794`, not pushed.

Not acted on:

- **The `NoReplacement` marker is now a literal in four places** (`basic.py`, `run.py` twice, `model/__init__.py`). A shared constant in `tools/parameters/workflow_utils.py` would mean `galaxy.model` importing from `galaxy.tools`, a layering step in the wrong direction (galaxy-data depending on galaxy-app code). That is worth doing on `dev` with the thermo-nuclear review's other deferred refactors, not on `release_26.0`.
- **`assert trans.url_builder` in `service_info`.** The sibling services (`sharable.py`, `notifications.py`) use `if trans.url_builder else None`, but `auth_instructions_url` is a required string, so there's nothing to fall back to. The FastAPI route always sets `url_builder`, so the assert only narrows the type.
- **The native API change needs a release note.** `GET /api/invocations/{id}` now returns `null` where it used to return the marker. Nothing in `client/src` or `lib/` reads the marker from `to_dict`. `tool_util/cwl/util.py` `invocation_to_output` gets `null`, which is an improvement. This belongs in the PR description and labels, not the code.
- **The WES docs don't mention that parameter outputs can be `null`** in the run log. That is the natural reading, so a note would be minor.
- **The pagination test's echo-empty-token assertion** assumes that no new invocation appears between page 1 and the echo request. The test's earlier `all_ids_page1` checks already make the same assumption, so this adds no new flake risk.

<details>
<summary>Full review</summary>

Reviewed `git diff origin/release_26.0...HEAD` (head `2e5bdaa7a9b`) with extra attention on `git diff wes_api_fixes_26_0_alt_original_scope HEAD`.

## Re-scope delta

### 1. Native `NoReplacement` → `null` in `WorkflowInvocation.to_dict`

- Correct, and in the right place. `to_dict` is the only source of the API shape for `output_values`. `services/invocations.py` and WES both go through it. Storage (`WorkflowInvocationOutputValue.value`), model-store export (`serialize`) and scheduler recovery (`workflow/run.py` around line 540, which reads the stored value) are untouched, so recovery and subworkflow replacement still see the marker.
- `isinstance(value, dict)` is fine for a JSON column. `run.py` uses `MutableMapping`, which is equivalent here.
- Consumers: no code in `client/src` reads `output_values` outside the generated schema. The pydantic `output_values: dict[str, Any]` accepts `None`. `invocation_to_output` now produces `raw_value` `None`, which is what workflow test verification and CWL conformance want. No existing test asserts the marker.
- WES lost its special case (`NO_REPLACEMENT_VALUE` and the loop) and went back to `outputs_dict.update(...)`. That is the reusable fix the scope evaluation asked for, not accretion.
- Tests: the new native test `test_workflow_omitted_optional_parameter_output_is_null` is minimal (format2, one optional text input, no steps) and asserts the exact dict. The WES test still covers the WES path. Both pass.
- Release safety: this is a visible change to the native API on `release_26.0`, which the scope evaluation accepted. Flag it in the PR description.

### 2. `next_page_token: ""` on the last page

- Matches WES 1.1 and Galaxy's generated models ("An empty string indicates there are no more items to return") for both `RunListResponse` and `TaskListResponse`.
- `decode_token("")` returns `None`, so an echoed `""` gives page 1. The docs say so and tell clients to stop on empty. The test locks this in.
- Test changes: `is not None` became truthiness checks, and the test follows every page to the end and asserts `""`. `test_wes_get_run_tasks_list` asserts `""`. Both pass.

### 3. `_require_user` plus encoded ids

- `trans.anonymous` is `self.user is None`, so the `submit_run` change is behavior-neutral. `list_runs` now rejects anonymous callers before decoding the token, so an anonymous caller with a junk token gets 403 rather than 400, which is better.
- Typing: it returns a `User`, which removes the `trans.user.id` Optional access in `list_runs` and `_get_invocation`.
- **Finding (acted on):** `get_run_task` still raised `ObjectNotFound(f"Task {task_id} not found in run {run_id}")` with the decoded int `run_id`. That is the sibling of the two messages the rider fixed. It now uses `self._security.encode_id(run_id)`. `test_wes_get_run_task_not_found` asserts that `err_msg` contains `not found in run <encoded id>`. Folded into the 403 commit. No other WES message carries a decoded id. `_get_or_create_history` echoes the client's `history_id` string.

### 4. `auth_instructions_url`

- `trans.url_builder("/", qualified=True)` returns `request.base_url`, which includes the ASGI `root_path`, so prefixed deployments get `/prefix/user/api_key`. `sharable.py` and `notifications.py` use the same pattern. `/user/api_key` is a real client route (`router.js`).
- It is a required `str` in the WES schema. The assert only narrows the type, since the FastAPI route always provides `url_builder`.
- `build_service_info`'s `organization_url` drops the prefix (`scheme://netloc`). That is a pre-existing inconsistency, out of scope.
- The test compares against `urljoin(self.url, "user/api_key")`, the same pattern used elsewhere in the API tests. It passes.

## Whole branch

- The commit layout is one per fix, and each fix ships with its test and doc line. The rider is folded into the 403 commit as planned. The native commit carries both the native test and the WES test.
- The `use_cached_job`, cancel no-op and rejected-submission commits are unchanged from the original scope and were already through test, Codex, performance, thermo-nuclear and baseline-refactor reviews. Nothing new turned up. `_discard_rejected_submission` swallows cleanup errors with `log.exception` and re-raises the original, which is right.
- Imports are at module top level (`StoredWorkflow`, `User`). The `from galaxy.schema.wes import ...` inside `service_info` predates this branch.
- No obvious comments added. The new comments explain WES-specific choices.
- Spec conformance: `next_page_token`, required `auth_instructions_url`, and terminal-state cancel are all now in line with WES 1.1. The known gaps (401 vs 403, `request`/`run_log` null, DRS) are documented and out of scope.
- Merge-forward: the changes stay in `wes.py`, the WES tests, one `to_dict` loop and one native test, and none conflict with the typing-only differences on `release_26.2`/`dev`.

## Verification

- API tests (each its own Galaxy, one at a time), all passing: `test_wes_get_run_task_not_found` (after the fix), `test_workflow_omitted_optional_parameter_output_is_null`, `test_wes_run_log_omitted_optional_parameter_is_null`, `test_wes_list_runs_pagination`, `test_wes_service_info`, `test_wes_get_run_tasks_list`, `test_wes_run_endpoints_require_authentication`.
- ruff, black, isort and flake8 are clean on `services/wes.py`, `test_wes.py`, `test_workflows.py` and `model/__init__.py`. mypy is clean on those four files.

</details>

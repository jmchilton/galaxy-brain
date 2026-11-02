Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review (round 2, after re-scope)

I acted on one cheap finding. The "This tool was disabled..." literal now lives in a `TOOL_DISABLED_MESSAGE` module constant in `handler.py`, used by both of its call sites, and the helper docstring says "run" instead of "loaded" (`b8db6e84cca`). I declined the rest, with reasons below. Verdict: no structural regressions and no visible code-judo move. READY.

## Not acted on

- **Real-chain startup test lives in `tools/test_user_defined_tool_loading.py`, not `jobs/`.**
  - The real toolbox plus `DynamicToolManager` fixture (`_executor`, `_create`, `_job`) lives in that class. That file already tests job-to-tool resolution through `tool_for_job`.
  - Moving the test would mean a shared fixture base, for example in `app_unittest_utils/toolbox_support`, together with `test_toolbox.py`'s `_persist_user`. That is roughly 40 lines across 3 or 4 files, which is out of proportion for this PR.
  - Good follow-up candidate: there are three hand-rolled `USER_TOOL_EXECUTE` user fixtures.
- **Replacing the two-phase startup check with `toolbox.tool_for_job(job, check_access=True, user=job.user)`.** It's the closest canonical helper, but its semantics differ:
  - it materializes every tool, which costs a full parse per job at startup on the lazy `cached_toolbox`;
  - it raises `ItemAccessibilityException`, which startup doesn't catch, so the job would hit `log.exception` instead of `fail`;
  - it swallows `ToolMissingException` into None, which loses the error text this branch logs.
- **Tests importing `TOOL_DISABLED_MESSAGE`.** The tests keep the literal so they still pin the user-facing text. Importing it would weaken that pin.
- **`ensure_job_owner_can_run` has one caller, and `prepare()` keeps an inline copy.** The constraint blocks this, because #24635 sits next to `jobs/__init__.py:1404-1407`. The follow-up is already in the PR description.
- **Merging the two `try` blocks in `_tool_unavailable_reason` into one.** It would save 2 lines but hide which call raises which exception. The current form is clearer.
- **`Job.user_defined_tool` property, owner id in the log, and the duplicated `(uuid ...)` prefix.** All nits. The property pays off only at the blocked `prepare()` site.
- **`str | None` reason as the return type.** It only feeds one log line, so a typed model wouldn't earn its keep.
- **File-size rule.** It isn't triggered. `handler.py` was already 1416 lines on dev, and `populators.py` is far past 1k and shrinks here.
- **Duplicated delete/purge pairs in the populator's execute-permission context managers.** This predates the branch; the branch only swapped in `create_group`.

<details><summary>Full review</summary>

Scope: `git diff ab008a1a7cfe...cb6749b2335`, which covers 7 files, +148/-56.

### 1. `_tool_unavailable_reason` and `ensure_job_owner_can_run`: right layer, no regression

- The permission rule ("private dynamic tool means the owner needs a live `USER_TOOL_EXECUTE` role") lives on `DynamicToolManager`, next to `ensure_can_use_unprivileged_tool`. The handler adds no predicate of its own and calls it unconditionally.
- That keeps the busy if/elif state dispatch in `_check_job_at_startup` down to one `if unavailable_reason := ...` line.
- The pre-check is required:
  - `get_tool(user=...)` calls `get_unprivileged_tool_or_none`, which swallows `InsufficientPermissionsException`;
  - `_get_tool_by_uuid` filters to public tools;
  - so the lookup ends in `ObjectNotFound`.
- The alternative of surfacing the permission error from `get_tool` would change a toolbox contract that API, workflow and tool-service paths rely on (`services/tools.py:91`, `workflow/modules.py:2679,2719`).
- Cost: one extra `all_roles()` per private-tool job, and only at handler startup. Negligible.
- A module-level function taking `app` is fine. It's stateless, and the spec'd-`Mock` startup tests call `_check_job_at_startup` unbound.

### 2. Code-judo search

- **`tool_for_job`**: rejected. The three semantic differences are in the not-acted list.
- **Let `prepare()` handle role loss and drop the startup check**: rejected. Running jobs are recovered through `dispatcher.recover` without passing through `prepare()`, so #24607's startup failure is load-bearing.
- **One `try` with three `except` clauses**: rejected for legibility.

None of these deletes complexity without changing behavior.

### 3. Duplicated user-facing literal (acted on)

- `handler.py:353` and `:851` each spelled out "This tool was disabled before the job completed.  Please contact your Galaxy administrator."
- They're now hoisted to `TOOL_DISABLED_MESSAGE`, next to the existing `DEFAULT_JOB_RUNNER_FAILURE_MESSAGE` precedent. The `assert` at `__verify_job_ready` collapses from 3 lines to 1.
- `handler.py` isn't touched by #24635 (confirmed with `gh pr diff 24635 --name-only`), so this is merge-safe. This commit doesn't touch `managers/tools.py` or `test_user_defined_tool_loading.py`, which #24635 does.
- The docstring said "can no longer be loaded", but owner role loss isn't a load failure, so it now says "run".

### 4. Tests

- `test_user_defined_tool_loading.py::test_startup_fails_job_whose_owner_lost_execute_role` is a solid real-chain red/green test:
  - it asserts recovery before the role is deleted;
  - after the deletion it asserts the exact fail message, no recovery, and the exact single WARNING line.
  - Placement is debatable; see the not-acted list.
  - `STARTUP_DISABLED_MESSAGE` is a single-use module constant. It's fine as a test-side pin.
- `test_handler_startup_user_tool.py`: the spec'd `Mock(spec=JobHandlerQueue)`, the real uuid and the caplog assertions are strengthenings over #24607.
- `test_DynamicToolManager.py`:
  - The role test uses a persisted role-less user, so it reaches the role predicate rather than short-circuiting on `user is None`.
  - The skip test is "does not raise". It's meaningful because `job.user` is None and would raise if the check ran.
  - Its loop could use `subTest`. Nit.
- API tests: the three helpers remove real duplication. The group test asserts inside the `with`, because the role stays live until exit, and a comment says so. Raw `_delete(groups/.../users/...)` matches `test_group_users.py`.

### 5. Populators

- `user_tool_execute_permissions_via_group` now reuses the canonical `create_group` and yields the group. Good.

### 6. Security

None found.

</details>

## Tests run

- `test_handler_startup_user_tool.py`, `test_handler.py`, `test_DynamicToolManager.py` and `test_user_defined_tool_loading.py`: 23 passed, 31 skipped. The skips are pre-existing in `test_handler.py`.
- ruff, black and isort are clean on `handler.py`, and the pre-commit hooks passed.
- mypy reports no errors on the changed lines. The remaining errors in the file are pre-existing ones on unchanged `def` lines.
- I did not rerun the API tests, because their files are untouched.

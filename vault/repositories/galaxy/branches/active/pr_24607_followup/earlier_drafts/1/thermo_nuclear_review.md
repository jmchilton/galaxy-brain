Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review

I acted on one finding: the startup tool-availability check now lives in a module-level helper, `_tool_unavailable_reason(toolbox, job)`, in `f8acb7c66f0`. I declined the other findings, all nits or non-triggers. Verdict after the fix: no structural regressions. READY.

## Not acted on

- **File-size rule.** It isn't triggered. `handler.py` (1410 lines) and `populators.py` (5434 lines) were already past 1k before this branch, and the branch shrinks both.
- **Collapsing the two queued-job API tests into one, via parametrize or a revoke callback.** It would add indirection. The group test also has to assert inside the `with`, because the role stays live until the context exits, and the code already comments that. The three helpers are direct.
- **Raw `DELETE groups/{id}/users/{id}` in the group test.** It's used once, and no populator helper exists for it. Adding one wouldn't pay off.
- **uuid shown twice in the log for `ObjectNotFound`.** That exception's text already contains the uuid, but `ToolMissingException` ("Tool not found.") doesn't, so the `(uuid ...)` prefix has to stay. Nit.
- **Asymmetric yields.** `user_tool_execute_permissions()` yields None while `_via_group()` yields the group. Not worth the churn.
- **`has_tool` raising instead of returning False for uuid lookups.** This is the root inconsistency, and it predates this branch. Changing the toolbox contract would also drop the error text from the log. Out of scope.

<details><summary>Full review</summary>

Scope: `git diff origin/dev...2a91b2acb42`, which covers 5 files, +64/-79.

### 1. Narrow edge-case handling bolted into a busy function (acted on)

`JobHandlerQueue._check_job_at_startup` is a long if/elif chain over job/runner state. Before the fix, its preamble held three things:
- the uuid derivation;
- a `try` around `has_tool`, which this branch extends with a nullable `unavailable_reason` sentinel and an `if` nested inside the `try`;
- an `except` that #24607 added because uuid lookups raise instead of returning False.

That is about 14 lines of tool-lookup detail on top of the state dispatch. A reader has to hold the raise-vs-False quirk in their head to follow the first branch.

Fix (`f8acb7c66f0`):
- Extracted `_tool_unavailable_reason(toolbox: "ToolBox", job) -> str | None`, which returns a reason string or None.
- It owns the uuid derivation, the `has_tool` call and the except. `tool_uuid` had no other use in the function, which I checked.
- The call site is now `if unavailable_reason := _tool_unavailable_reason(self.app.toolbox, job):`.
- Both log strings are byte-identical, so the existing caplog assertions pass unchanged.
- It is module-level on purpose. The unit test drives `_check_job_at_startup` with `Mock(spec=JobHandlerQueue)`, so a method would come back as a truthy Mock.
- `ToolBox` is a `TYPE_CHECKING` import from `galaxy.tools`, the same one `structured_app` uses.
- Added `test_tool_unavailable_reason_from_has_tool`. It pins the True → None and False → "removed from tool config" branches; before, only the raise path was covered.

This reverses a call in `test_challenges_debrief.md`, which skipped the extraction because no mocks would go away. This review judges it on how legible the busy function is, not on mock count. The unit test kept every assertion.

One small semantic simplification: `job.dynamic_tool.uuid if job.dynamic_tool else None` replaces the walrus form `if job.dynamic_tool and (uuid := ...)`. The two differ only for a falsy non-None uuid, and a `UUIDType` column can't produce one.

### 2. API test restructure (`test_unprivileged_tools.py`), no action

- The three helpers (`_run_slow_job`, `_queue_user_tool_job_behind`, `_assert_queued_user_tool_job_rejected`) remove real duplication between the role-revoked and group-removed tests. Each does one thing.
- A single helper that takes a "revoke" callable would hide the key difference between the tests: where the assertion sits relative to the context manager.
- The file stays at 442 lines.

### 3. Populator (`populators.py`), no action

`user_tool_execute_permissions_via_group` now reuses the canonical `create_group` and yields the group. That's a good move: it deletes a hand-rolled POST.

### 4. Startup unit test, no action beyond #1

- `Mock(spec=JobHandlerQueue)` with explicit `app`/`dispatcher` is a reasonable boundary. Those are instance attributes, so the spec can't cover them.
- The negative `"removed from tool config" not in caplog.text` assertion is cheap and guards against a regression to the old message.

### 5. Dropped `test_job_wrapper_user_tool.py`, no action

It was mock-only and is covered for real by the two API tests. I agree with the drop.

### 6. Security

None found.

</details>

## Tests run

- `test/unit/app/jobs/test_handler_startup_user_tool.py`: 4 passed (the 2 existing plus the 2 new).
- ruff, black, isort and flake8 are clean on the changed files, and the commit pre-commit hooks passed. `mypy lib/galaxy/jobs/handler.py` reports no errors on the new helper; the pre-existing errors are elsewhere in the file.
- I did not rerun the API tests. They never reach startup recovery, as the test-challenges red check showed, and their files are unchanged.

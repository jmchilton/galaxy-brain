Run via Claude Opus 5.5 at high effort.

# Re-scope review: pr_24607_followup (`ab008a1a7cfe...59f2aa5b7be`)

**Verdict: sound, ship after the PR description fix.** I found no correctness bugs. Behavior is unchanged: a role-lost owner's job failed at startup before this commit and still does. The only change is that the admin log now names the cause. The ordering is right and the app types all provide `dynamic_tool_manager`. The extra DB cost is negligible. The #24635 merge-forward stays clean: `git apply --check` of #24635's hunks for `managers/tools.py`, `jobs/__init__.py` and `test_job_wrapper_user_tool.py` onto HEAD succeeds. mypy is clean on the changed lines, and the 14 unit tests in the three touched or kept test files pass.

## Real issues

1. **The PR description is stale** (`BRANCH_DIRECTORY/pr_description.md`). It still says "Drop mock-only `prepare()` unit test", but the re-scope keeps that file. It also attributes owner role loss to the `(uuid ...) unavailable: <error>` reason, but role loss now logs `not usable by the job's owner`. And it never mentions `DynamicToolManager.ensure_job_owner_can_run`. Fix: rewrite it with these bullets:
   - add `ensure_job_owner_can_run`
   - startup checks it before `has_tool` and logs `not usable by the job's owner: ...`
   - `unavailable: <error>` stays as the fallback, e.g. for deactivated tools
   - `test_job_wrapper_user_tool.py` is kept because #24635 extends it
   - one line on why `prepare()` doesn't call the helper yet, because a reviewer will ask

2. **The manager test passes without exercising the role check** (`test/unit/app/managers/test_DynamicToolManager.py:54`). `job.user` is never set, so `ensure_can_use_unprivileged_tool` raises on `user is None`. The test would still pass if the helper only checked `job.user is None` and never looked at roles. Meanwhile, the startup test (`test_handler_startup_user_tool.py:60`) mocks `ensure_job_owner_can_run` itself. So no test runs the real chain, and that chain is what the re-scope fixes: `has_tool` swallowing `InsufficientPermissionsException` and reporting `ObjectNotFound`. Fix: `test/unit/app/tools/test_user_defined_tool_loading.py` already has the fixture this needs, with a real toolbox, `_executor()` (a user with a `USER_TOOL_EXECUTE` role), `_create()` and `_job()`. Add one test there that:
   - creates a tool and a job for the executor
   - asserts `_tool_unavailable_reason(self.app, job) is None`
   - marks the role `deleted` (or removes the `UserRoleAssociation`) and commits
   - asserts the reason starts with `(uuid ...) not usable by the job's owner`

   That makes a real red-to-green check: on the alt branch the reason is `unavailable: Failed to find a tool with uuid`. After that, the manager tests can shrink to the skip case, or the `:54` test can use a real role-less user.

## Answers to the branch-specific questions

- **Startup ordering.** Correct. It has to come before `has_tool`: `get_tool` → `get_unprivileged_tool_or_none` swallows the permission error and falls through to `_get_tool_by_uuid`, which skips private tools (`tool_util/toolbox/base.py:590`), and then raises `ObjectNotFound`. The check is gated on private tools only, so public dynamic tools and static tools don't pay for it. A private tool whose owner lost the role *and* was deactivated now reports the role. Either reason is accurate.
- **`app.dynamic_tool_manager` on real and test apps.** It's declared on `MinimalManagerApp` (`structured_app/__init__.py:152`) and set in `MinimalGalaxyApplication._configure_toolbox` (`app/__init__.py:427`) and in `GalaxyManagerApplication` (`:806`). Integration tests use a real `UniverseApplication`. In unit tests, `test/unit/app/jobs/test_handler.py` builds a `JobHandlerQueue` over `GalaxyDataTestApp` but never calls `start()`, so startup recovery never runs there. The other startup tests use `Mock()` apps. There is no gap.
- **Double role check and the cost of `all_roles()`.** For each private-tool job at startup, there are 2 `all_roles()` queries (here and in `owned_unprivileged_statement`) plus the tool select. This runs only at handler startup and only for private-tool jobs in non-terminal states. It doesn't matter. Not worth threading a "pre-checked" flag through the toolbox.
- **Message wording.** The log line reads `(N) Tool 'x' (uuid U) not usable by the job's owner: User is not allowed to run unprivileged tools, unable to recover job`. It's clear, and keeping the user-facing "This tool was disabled..." text is fine for this PR. See nit 2 for making it more actionable.
- **A manager method with one caller.** It's justified, but only as the intended home for the rule. `prepare()` repeats the same predicate inline at `jobs/__init__.py:1404-1407`, and #24635 adds lines directly after 1407, so changing those lines now would conflict. Deferring is right. Record it as a follow-up for after #24635 merges forward, in the PR description or TASKS.md. Without that, the helper reads as accretion.
- **Reuse of `WorkflowStep.user_defined_tool`.** See nit 1. The "private dynamic tool" predicate `dynamic_tool is not None and not dynamic_tool.public` is now open-coded in four places. They are `managers/tools.py:105`, `jobs/__init__.py:1404`, `workflow/extract.py:92` and `managers/workflows.py:224`. `model/__init__.py:9464` already names it for steps.

## Nits

1. **Mirror `WorkflowStep.user_defined_tool` on `Job`** (`lib/galaxy/model/__init__.py:9464`, `lib/galaxy/managers/tools.py:105`). Add a `Job.user_defined_tool` property with the same body. The helper then becomes `if job.user_defined_tool is not None: self.ensure_can_use_unprivileged_tool(job.user)`, and `prepare()` and `extract._set_step_tool` can use it later. This is optional for this PR. The win is small until the `prepare()` follow-up lands.
2. **Add the owner to the role-loss log** (`lib/galaxy/jobs/handler.py:251`). An admin acting on "not usable by the job's owner" needs to know who the owner is. Suggestion: `f"(uuid {tool_uuid}) not usable by owner (user {job.user_id}): {e}"`.
3. **Duplicated uuid prefix** (`handler.py:251` and `:259`). Both reasons hand-format `(uuid {tool_uuid})`, and `removed from tool config` doesn't. This is fine at two sites, so leave it unless the reasons grow.
4. **Duplicated user-facing literal** (`handler.py:353` and `:851`). "This tool was disabled before the job completed..." appears twice. The scope evaluation (scope 3) already raised this and it's out of scope here. Hoist it to a module constant if this file is touched again.

## Checked and fine

- The imports are at module top. The `ToolBox` `TYPE_CHECKING` import was correctly dropped once the signature took `app`.
- Typing `_tool_unavailable_reason(app: MinimalManagerApp, ...)` matches `JobHandlerQueue.app`.
- The comment update at `handler.py:258` ("e.g. a deactivated dynamic tool") is accurate now that role loss no longer reaches that branch.
- The test helpers `_user_tool_job`, `_startup_queue` and `_assert_failed_not_recovered` are proportionate, and `has_tool.assert_not_called()` pins the ordering.
- No security-sensitive findings.

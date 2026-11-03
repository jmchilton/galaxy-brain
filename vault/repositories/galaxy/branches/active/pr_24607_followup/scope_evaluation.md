Run via Claude Opus 5.5 at high effort.

# Scope evaluation (round 2, after re-scope)

**Recommendation: KEEP the scope as implemented (HEAD `47e2af2f82d`).** The round-1 expansion is in. `DynamicToolManager.ensure_job_owner_can_run` is the job-level home for the owner-role rule. Startup checks it before `has_tool`, so owner role loss now logs `not usable by the job's owner: User is not allowed to run unprivileged tools` instead of the `ObjectNotFound` text. The other uuid failures log `unavailable: <error>`, `TOOL_DISABLED_MESSAGE` is hoisted, and every reason has a test (the static `removed from tool config` path got a new baseline test). The rest of round 1's expansion is blocked by decisions already made: `prepare()` adopting the helper waits on #24635, and the user-facing message stays. Every candidate left is either a pure refactor with no bug behind it, a policy call, or a separate bug outside the role re-check topic. The process default leans toward expansion, but I didn't apply it here: the brief asks for a substantive reason before changing a branch that was just re-scoped, and none of the remaining candidates provides one. They're listed below as follow-ups and open questions.

Checked for this round:
- #24635 (`release_26.2`, OPEN, last updated 2026-11-02) still applies cleanly to HEAD with `git apply --check`, for all four files the two branches share: `managers/tools.py`, `jobs/__init__.py`, `test_job_wrapper_user_tool.py` and `test_user_defined_tool_loading.py`.
- The branch merges cleanly with current `origin/dev` (`38dc259318c`). The only drift in touched files since the merge-base is +5 lines in `populators.py` from #24509.

## Possible Decompositions

About 231 changed lines (+169/-62), none generated. Commits 1–3 are test-only and pass on dev. Commit 4 depends on 3 to back its "no behavior change" claim, and 6 depends on 4–5.

- **Option A: tests, then lib.**
  - PR A: `c82dc579c05` (group-removal API test and `create_group` reuse), `9b767c5e05a` (spec'd mock) and `9d4078e9c00` (static-path baseline test).
  - PR B: `76aa14edd1f` (helper and constant), `112eb731fd3` (uuid reason) and `47e2af2f82d` (role-loss reason and manager helper). Lands after A.
- **Option B: split out the release-eligible API test.**
  - PR A: `c82dc579c05` alone. It covers #24607's behavior, so it could target `release_26.1` or `release_26.2`.
  - PR B: everything else, on `dev`.
- **Option C: log reasons separate from the role rule.**
  - PR A: commits 2–5. This is the startup refactor plus the generic `unavailable: <error>` reason, with no new manager API.
  - PR B: `47e2af2f82d`, the role-loss reason and `ensure_job_owner_can_run`. It could be paired with the `prepare()` adoption once #24635 merges forward, so the helper lands with both of its callers.
- **Option D: one PR as-is.** Six commits, ordered test-first.

## Scopes considered

### 1. As implemented (recommended)

Adds an API test for removing the owner from the execute-role group. Startup recovery logs a distinct reason for each cause: role loss through the new `ensure_job_owner_can_run`, uuid lookup failure, and static removal. The disabled message is hoisted into a constant, and `test_job_wrapper_user_tool.py` is kept.

| Pros | Cons |
|---|---|
| - Fixes the misleading admin log for the cause #24607 was about (#24607 P3 3)<br>- Each reason has a test, and the role-loss test is a real-chain red→green test: red on dev and on the alt<br>- No user-facing behavior change, and it doesn't conflict with #24635<br>- The rule now has a job-level home for `prepare()` to adopt later | - `ensure_job_owner_can_run` has one caller until the `prepare()` follow-up lands<br>- The private-dynamic-tool predicate is still open-coded at 4 sites (scope 3) |

### 2. Finish round 1's expansion: `prepare()` calls `ensure_job_owner_can_run`, and startup role loss shows the `prepare()` message

This is the part of round 1's scope 2 that wasn't built.

| Pros | Cons |
|---|---|
| - The helper gets its second caller<br>- One user-facing message per cause | - Both parts reverse decisions already made: #24635 edits the lines next to `jobs/__init__.py:1404-1407`, and the message stays as is<br>- No new information since those decisions. #24635 is still open |

Not recommended now. Follow-up once #24635 merges forward.

### 3. Modest refactor: add a `Job.user_defined_tool` property

Mirror `WorkflowStep.user_defined_tool` (`model/__init__.py:9466`) on `Job`. Route `managers/tools.py:105`, `workflow/extract.py:92` and `managers/workflows.py:224` through it, leaving `jobs/__init__.py:1404` for the `prepare()` follow-up.

| Pros | Cons |
|---|---|
| - Names a predicate that is open-coded at 4 sites, which is the kind of reusable abstraction John looks for<br>- 3 of the 4 sites don't conflict with #24635 | - A pure refactor that fixes no bug. The gain is small until the `prepare()` site can switch too<br>- `workflows.py:224` checks a step's tool and can use the existing `WorkflowStep.user_defined_tool` today, so only 2 sites (`managers/tools.py:105` and `extract.py:92`) are clean `Job` callers<br>- Every reviewer so far (re-scope review nit 1, thermo review) rated it a nit |

Open question, not a scope change. If John wants it, it fits best with the `prepare()` follow-up, where it covers all the job sites at once.

### 4. Larger: startup defers the role check to `prepare()`

Round 1's scope 4. Startup would stop checking the role and leave that to `prepare()`.

| Pros | Cons |
|---|---|
| - The role would be checked in only one place | - Running jobs are recovered through `dispatcher.recover` without passing through `prepare()`, so the startup check is load-bearing (thermo review §2)<br>- Reverses a design choice in #24607, which mvdbeek authored and has merged |

Rejected, as in round 1.

### 5. Sibling: a uuid-aware "removed from tool config" log in `__verify_job_ready`

Round 1's scope 3. The constant hoist is done (`76aa14edd1f`). What remains is the log text at `handler.py:~851` when `job_wrapper.tool is None` for a dynamic tool.

| Pros | Cons |
|---|---|
| - Same misleading wording, same file | - `tool_for_job` swallows `ToolMissingException` into None, so a real reason needs plumbing through `JobWrapper`<br>- Role loss never reaches this path (`check_access=False`), so it's off #24607's topic |

Follow-up.

### 6. Separate bugs nearby: deactivating a dynamic tool

- A user's own deactivation flips only `UserDynamicToolAssociation.active`. `owned_unprivileged_statement` doesn't filter on it (only `list_unprivileged_tools` does), so the user can still run their deactivated tool by uuid, and queued jobs still recover.
- The admin `DynamicToolManager.deactivate` runs `del toolbox._tools_by_uuid[uuid]`. That cache is per process and lazy (`tool_util/toolbox/base.py:556-599`), so the call likely raises `KeyError` for a tool this process never loaded, and it never clears other processes' caches. I haven't reproduced this.

| Pros | Cons |
|---|---|
| - These are real gaps in `managers/tools.py`, which this branch touches | - They're about deactivation, not the role re-check<br>- Each has its own symptom and needs its own test<br>- The first is a policy question: should a deactivated user tool still be runnable or recoverable? |

Not part of this branch. File them separately, through `GX_QUEUING_ISSUE_CREATION.md`, if John wants.

### 7. After #24635: one job-level gate for user tools

#24635 adds a container-allowlist check to `prepare()` for user tools. `dispatcher.recover` skips `prepare()`, so a running job whose container became disallowed would still recover at startup. A combined job-level gate (role plus container), called from both `prepare()` and startup, is the natural next step.

| Pros | Cons |
|---|---|
| - One home for every job-level user-tool rule, on both paths | - Depends on code that hasn't landed on `dev`<br>- Its scope belongs to #24635<br>- The `not usable by the job's owner` reason is specific to the role. A container rejection would need its own reason text |

Follow-up after #24635 merges forward.

### 8. Contraction: test-only PR (commits 1–3)

| Pros | Cons |
|---|---|
| - Zero lib change | - Drops the fix that round 1 and both reviews endorsed, and the log stays misleading |

Not recommended. If John wants a smaller first PR, decomposition Option A gives him that without contracting the scope.

### 9. Other ideas from earlier reviews (unchanged from round 1)

- An `InsufficientPermissionsException` subclass for the runner catches: #24635 now raises it for container rejections, so leave it there.
- `has_tool` returning False instead of raising for uuid lookups: this changes a toolbox contract with about 11 callers.
- An `EXISTS` query for `ensure_can_use_unprivileged_tool`: no measured need.
- A restart integration test: expensive, and the real-app unit test covers the chain.
- A shared `USER_TOOL_EXECUTE` test-user fixture (thermo review): three hand-rolled copies exist. Better done after #24635, which also edits `test_user_defined_tool_loading.py`.
- The owner id in the role-loss log: the job id is already logged, so this is a nit.

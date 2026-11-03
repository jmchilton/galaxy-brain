Run via Claude Opus 5.5 at high effort.

# Scope evaluation

**Recommendation: EXPAND modestly, with one carve-out.** The startup fix as implemented still doesn't name the cause it was written for. When the owner loses the role, `get_unprivileged_tool_or_none` swallows the permission error and `_get_tool_by_uuid` raises `ObjectNotFound`, so the admin log reads `(uuid X) unavailable: Failed to find a tool with uuid [X]`. That repeats the uuid and never mentions the role. The user also sees "This tool was disabled..." where `prepare()` says "User is not allowed to run unprivileged tools". The expansion has two parts. First, give the "may this job's owner run its private dynamic tool" rule one home, e.g. `DynamicToolManager.ensure_job_owner_can_run(job)`. Second, call it from both `prepare()` and `_check_job_at_startup`, so the startup path logs the role loss and fails the job with the same message as `prepare()`. This was reviewer P3 1 from #24607. It was filtered out only because #24607 targeted a release branch, and this branch targets `dev`. The carve-out: hold back `f13067d6852` (drop `test_job_wrapper_user_tool.py`). Open upstream #24635 (mvdbeek, `release_26.2`) extends that exact file with container-allowlist tests built on its fixture, so deleting it would cause a modify/delete conflict when 26.2 merges forward.

## Possible Decompositions

The branch is about 174 changed lines (+87/-87), none of them generated.

- **Option 1: by layer, following the existing commit order.**
  - PR A, test-only: commits 1–3 (`c82dc579c05` baseline group-removal API test plus populator reuse, `f13067d6852` drop of the mock-only test, `16c3a15173e` spec'd mock). These pass on dev.
  - PR B: commits 4–5 (`506f8c0abde` helper extraction, `d5f130d73ac` log reason), plus the expansion if taken. Lands after A.
- **Option 2: three pieces.**
  - PR A: `c82dc579c05` alone. This is the P2 coverage the #24607 review asked for, and it could target `release_26.1`/`release_26.2`, since it tests behavior documented there.
  - PR B: `16c3a15173e` plus commits 4–5 (and the expansion), on `dev`.
  - PR C: `f13067d6852`, deferred until #24635 lands, then rebased to remove only the role test method (or dropped).

## Scopes considered

### 1. As implemented

A baseline API test for removing the user from the execute-role group, the startup log reason `(uuid ...) unavailable: <error>`, the mock-only `prepare()` unit test dropped, and the startup mock spec'd.

| Pros | Cons |
|---|---|
| - Small, and every piece is verified (red checks, tree identity)<br>- Closes the #24607 P2 coverage gap<br>- No behavior change | - For role loss, the log still doesn't say "role". The message is `ObjectNotFound` text, and the uuid appears twice<br>- The user message on the startup path still differs from `prepare()`<br>- The deleted file conflicts with open #24635 |

### 2. Modest expansion: one owner-access rule shared by prepare() and startup (recommended)

Add a `DynamicToolManager` helper (e.g. `ensure_job_owner_can_run(job)`: private dynamic tool → `ensure_can_use_unprivileged_tool(job.user)`). `prepare()` calls it. `_check_job_at_startup` (or `_tool_unavailable_reason`) calls it before `has_tool`, logs that the owner lacks the execute role, and fails the job with the exception message. Extend the startup unit test to cover that message. Hold back the test-file deletion (see scope 6).

| Pros | Cons |
|---|---|
| - Fully fixes #24607 P3 3 (the admin log names the role) instead of half-fixing it<br>- One user-facing message per cause, on both paths<br>- The rule gets one home (#24607 P3 1). #24635 is about to add a second user-tool gate in `prepare()`, so a named helper there is timely<br>- Roughly 15 lib lines; existing tests cover most of it | - Changes the user-facing startup message for role loss. The #24607 verified review said to keep it, but that was release-branch caution<br>- Touches `prepare()`, which #24635 also edits, so a small textual conflict is possible<br>- Needs a fresh red check and review |

<details><summary>Details</summary>

- The startup path for a role-lost owner runs `has_tool(..., tool_uuid, user)` → `get_tool` → `get_unprivileged_tool_or_none` (swallows `InsufficientPermissionsException`) → `_get_tool_by_uuid` → `dynamic_tool_manager.get_tool_by_uuid`, which filters on `public == true()`. The lookup returns None and the call raises `ObjectNotFound(f"Failed to find a tool with uuid [{uuid}]")`. The branch's message carries that text, so for this cause the log names neither the role nor the owner.
- Codex's P2 (public deactivated dynamic tools also raise here) still holds. The generic `unavailable: <error>` reason should stay as the fallback for cases that aren't about the role, such as a deactivated tool or a definition that no longer loads.
- Workflow module resolution and `create_unprivileged_tool` already call `ensure_can_use_unprivileged_tool` directly. The new helper only needs to cover job-level callers, not replace those.

</details>

### 3. Expansion: also fix the sibling "removed from tool config" log in `__verify_job_ready`

`handler.py:852` logs `Tool '...' removed from tool config, unable to run job` when `job_wrapper.tool` is None. For a dynamic tool, that means it was deactivated or its definition no longer loads (`tool_for_job(check_access=False)` → `dynamic_tool_to_tool` returns None). The fix is a uuid-aware reason, plus hoisting the twice-duplicated "This tool was disabled before the job completed..." string into a constant.

| Pros | Cons |
|---|---|
| - Same misleading message, same file, same class of tool<br>- The constant removes a literal that is copied in two places | - The path isn't reached by role loss, so it drifts away from #24607's topic<br>- `tool_for_job` returns None without a reason, so a good message needs plumbing or a re-lookup |

Reasonable to fold into scope 2 if it stays a few lines. Not required.

### 4. Larger: startup defers the role check to prepare()

Startup would load dynamic tools with `tool_for_job(job, check_access=False)` the way `JobWrapper` does, and re-queue new or queued jobs so that `prepare()` is the single role checkpoint.

| Pros | Cons |
|---|---|
| - Removes the `has_tool`-raises quirk for dynamic tools at startup<br>- Ends the restart-dependent behavior: today a running job of a role-lost owner fails only if Galaxy restarts | - Reverses a deliberate #24607 choice to fail at startup. This is the merged author's design call<br>- Already-running jobs would continue after a restart. That is a policy question for John or mvdbeek |

Not recommended without a policy decision. Listed because it's the root inconsistency.

### 5. Out of scope: other ideas from the reviews

- **Narrow `InsufficientPermissionsException` subclass for the runner catches** (#24607 filtered P3 2). #24635 now raises the same exception for container rejections, and it reworks Pulsar's handling. Leave this to #24635.
- **`has_tool` returning False instead of raising for uuid lookups** (thermo review). Changes the toolbox contract across about 11 callers.
- **`EXISTS` query for `ensure_can_use_unprivileged_tool`** (#24607 perf review). Dev-only cleanup with no measured need. Separate PR if ever.
- **Restart integration test for startup recovery, Pulsar branch test.** Expensive. #24635 adds a Pulsar rejection unit test anyway.
- **Populator helper for `DELETE groups/{id}/users/{id}`.** Used once.

### 6. Contraction: drop or defer `f13067d6852` (the test_job_wrapper_user_tool.py deletion)

Open #24635 (`release_26.2`, updated today) adds `_prepare()` and three container-allowlist tests to `test/unit/app/jobs/test_job_wrapper_user_tool.py`, reusing its `setUp` fixture. Deleting the file on `dev` causes a modify/delete conflict when 26.2 merges forward, and removes the fixture #24635 builds on.

| Pros | Cons |
|---|---|
| - Avoids a merge-forward conflict for whoever merges 26.2 into dev<br>- Doesn't step on an in-flight PR from the merged PR's author | - The mock-only role test stays for now (minor; it can be removed as one method later) |

Recommended as part of the overall call: defer it, or narrow it to deleting only `test_prepare_fails_when_owner_lost_execute_role_after_wrapper_was_created` after #24635 lands.

### 7. Contraction: test-only PR (commits 1–3), drop the log change

| Pros | Cons |
|---|---|
| - Smallest possible PR, with zero lib change | - Leaves the misleading startup log, the main follow-up the #24607 review raised<br>- Goes against the guidance to default toward expansion |

Not recommended.

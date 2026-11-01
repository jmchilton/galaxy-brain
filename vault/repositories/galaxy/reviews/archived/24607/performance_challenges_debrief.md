# Performance challenge debrief: #24607

Profile: gx_performance_challenger. Model: Claude Opus 5.5, low reasoning effort (none was set explicitly). Reviewed commit: `1c0f219f3f4e774b897620c44c318f0c987fe95c` (base `release_26.1`).

Static review only. The worktree has no `.venv`, so no Galaxy server or query counting was run. Every point below comes from reading the code, not from measurements.

## What the PR adds on hot paths

1. **`MinimalJobWrapper.prepare` (`lib/galaxy/jobs/__init__.py:1283`)**: runs for every job, but it only does extra work when `job.dynamic_tool` is non-public.
   - For ordinary jobs, `job.dynamic_tool_id` is NULL, so SQLAlchemy can tell the many-to-one is empty without issuing a SELECT. These jobs pay nothing extra.
   - For a user-defined tool job, the PR adds at most one PK lookup of `dynamic_tool` (if the row is not already in the identity map), plus one `User.all_roles()` query. That query is a single SELECT with joinedloads across user→roles and user→groups→group roles. Because it joinedloads two collections, it returns a cartesian product of direct roles × group roles. That product is bounded by one user's role and group memberships, which are small in practice.
   - The check runs once per job prepare. A map-over of N elements therefore adds N of these queries. This is not a new pattern: `all_roles()` is already called on many request paths (histories, rbac, security agent, context). Each query is indexed by user id and should be sub-millisecond. A single `prepare` already issues dozens of queries, and it also runs `dynamic_tool_to_tool` when the wrapper is built. That call parses YAML and builds a tool, which costs far more than one role lookup.
   - The check does not duplicate an earlier one. `JobWrapper.__init__` calls `tool_for_job(..., check_access=False)`, so the role is not checked when the wrapper is created.
2. **`JobHandlerQueue._check_job_at_startup` (`lib/galaxy/jobs/handler.py:325`)**: the PR only adds an exception catch around the existing `has_tool` call. That call already reaches `owned_unprivileged_statement` → `ensure_can_use_unprivileged_tool` for each uuid-backed job recovered at startup. The PR does not change the query count.
3. **Runner except clauses (`runners/__init__.py`, `runners/pulsar.py`)**: these only reclassify an exception type. There is no performance effect.
4. **`ensure_can_use_unprivileged_tool` (`managers/tools.py`)**: the only change is an early return for `None`. There is no performance effect.

## Patterns checked against the lessons list

- Unbounded queries or Python-side slicing: none added.
- Per-row round trips on a shared list endpoint: none. The check runs per job, not per API listing, and only for private dynamic tools.
- Flush/commit in loops: none added.
- Async handlers doing sync DB work: not applicable, because this runs in the job handler and runner threads.
- Client polling: not touched.

## Possible micro-optimization (not recommended as a finding)

`ensure_can_use_unprivileged_tool` could replace the materialization of every role with an `EXISTS` query filtered on `role.type == USER_TOOL_EXECUTE AND NOT deleted`, checking both direct and group roles. The query cost is too small for this to be worth a release-branch change. It would fit better in a dev-branch cleanup of all `ensure_can_use_unprivileged_tool` callers.

## Measurement plan (if anyone wants data)

1. Bootstrap the worktree and point it at Postgres. Create a user with the `Custom Tool Execution` role, about 10 groups, and about 20 roles.
2. Run a user-defined tool mapped over a 1000-element list. Attach a SQLAlchemy `before_cursor_execute` counter around `prepare` for these jobs, on this branch and on the base.
3. Expect +1 query per job (+2 if `dynamic_tool` is not in the identity map) and a negligible change in prepare wall time. Run `EXPLAIN ANALYZE` on the `all_roles` SELECT for that user to confirm it uses index lookups.

Run via Claude Opus 5.5 at high effort.

# Performance challenge debrief

Branch diff reviewed: `67305c6d0a1..14ca2eb99a8`. The branch's query shape held up: no performance problem needed a code change. Acted on one thing, a regression guard: added `test/unit/webapps/test_wes_service_queries.py`, which asserts `list_runs` issues one SQL statement for a page that holds completed runs. I checked that it fails (`assert 3 == 1`) when the `joinedload` is swapped for `lazyload`. It is amended into the single branch commit, now `c2778435ffa`.

Not acted on:

- **Extra completion query in `get_run_status` / `get_run_log`.** I left it alone. It only runs for `completed` invocations, it is a lookup on a unique index, and a client stops polling once the run is terminal. Joinedloading in `_get_invocation` would add a LEFT JOIN to every caller, including cancel and the task endpoints. That is shared parent code, and the change would not be a clear win.
- **Size of `job_state_summary`.** No change needed. It holds at most one count per job state, so it stays at a few hundred bytes. The joinedload also pulls `hooks_executed` and `completion_time`, which are just as small.
- **History load in `_get_invocation`.** Parent code, recorded under Parent findings below.

<details>
<summary>Full review and measurements</summary>

## Method

`/tmp/.../scratchpad/perf/measure.py` (in the session scratchpad, not committed) builds the Galaxy model in an in-memory SQLite database with 25 invocations: one third `completed` with a completion record, the others `scheduled` or `failed`. It builds `WesService` with a stub `trans` and counts statements with a `before_cursor_execute` listener. A second copy patches `wes.joinedload` to `lazyload` to get the pre-branch loading behaviour. The `list_runs` query was also compiled against the PostgreSQL dialect so I could read the generated SQL.

These are query counts and SQL shape only. I did not run a PostgreSQL plan or time anything at production scale.

## Relationship configuration

`WorkflowInvocation.completion` is `relationship("WorkflowInvocationCompletion", back_populates="workflow_invocation", uselist=False)` with the default `lazy="select"`. `workflow_invocation_completion.workflow_invocation_id` has a unique index, created by its alembic migration with `index=True, unique=True`. So the relationship is truly one-to-one.

## `list_runs`: joinedload with keyset and LIMIT

Generated PostgreSQL SQL (FROM onward):

```sql
FROM workflow_invocation JOIN history ON history.id = workflow_invocation.history_id
LEFT OUTER JOIN workflow_invocation_completion AS workflow_invocation_completion_1
  ON workflow_invocation.id = workflow_invocation_completion_1.workflow_invocation_id
WHERE history.user_id = 1 AND workflow_invocation.id < 100
ORDER BY workflow_invocation.id DESC
LIMIT 11
```

- The relationship is scalar (`uselist=False`), so SQLAlchemy does not wrap the query in a subquery. The `LIMIT` applies directly to the rows.
- The completion join key is unique, so the LEFT OUTER JOIN cannot fan out. `LIMIT page_size + 1` still means `page_size + 1` invocations, and the `has_more` / `next_page_token` logic is unaffected.
- The join probes the unique `workflow_invocation_id` index once per row, at most 101 rows. That is negligible next to the existing `history` join and the `id DESC` keyset scan.
- An invocation with no completion record comes back with `completion` loaded as `None`, so it never triggers a lazy load later.

Measured statement counts for a page of 10 (4 of them completed):

| Loading | Page 1 | Page 2 |
|---|---|---|
| Branch (`joinedload`) | 1 | 1 |
| `lazyload` (what you get without the option) | 5 | 4 |

Without the option, the cost is 1 + the number of completed runs on the page, so up to 101 statements at `page_size=100`. The joinedload is needed and works. The new unit test pins it at one statement.

## Single-run paths

`get_run_status` on a `completed` invocation took 3 statements: the invocation, its history (lazy-loaded for the owner check, which predates the branch), and the completion. On a `failed` invocation it took 2. `_invocation_wes_state` only reads `invocation.completion` when the state is `completed`, so non-terminal runs, which are the ones clients poll, pay nothing extra. A completed run pays one indexed lookup per status call, usually once per run, because polling stops at a terminal state.

I did not measure `get_run_log` because it needs a fuller `trans`. It reads the completion the same way, so it adds the same single lookup for completed runs. That endpoint already loads steps, outputs and output collections, so one more indexed lookup is noise. That conclusion comes from reading the code, not from a measurement.

## `job_state_summary` size

`compute_recursive_job_state_summary` builds `{job_state: count}`, so the number of keys is bounded by the number of job states (about 15). The JSON is a few hundred bytes at worst, whatever the workflow size. `hooks_executed` is a short list of hook names. Loading the whole completion row is fine, and a `load_only` would add complexity for no benefit.

## Patterns checked

- Unbounded query: no. `list_runs` already uses SQL `LIMIT` with keyset pagination.
- Per-row round trips on a list endpoint: avoided by the joinedload, and now pinned by a test.
- Fan-out join: not possible, because the join key is unique.
- Expensive aggregates per request: none. The summary is precomputed once, at completion time, by `WorkflowCompletionManager`.

## Parent findings

- `_get_invocation` (parent code) checks ownership through `invocation.history.user_id`. That lazy-loads the full `History` row, including History's correlated `max(history_audit.update_time)` column property, on every single-run WES call: `get_run`, `get_run_status`, cancel and tasks. Joining `History` and filtering on `History.user_id` in the invocation query, as `list_runs` does, would avoid both the second round trip and the audit subquery. This is a small cost per call and predates this branch, so I did not change it.

</details>

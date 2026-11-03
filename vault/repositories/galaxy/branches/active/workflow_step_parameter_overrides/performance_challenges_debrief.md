Run via Claude Opus at high effort.

# Performance challenges debrief: workflow_step_parameter_overrides

I measured each surface on an in-process integration Galaxy (SQLite), using a temporary benchmark test that I didn't commit. It counted SQL statements with an engine listener and timed the HTTP calls. All numbers below come from it, apart from the ones marked as reasoning. I didn't use Postgres. Query counts don't depend on the database, but the timings do: over a network, each saved query saves more.

I fixed four problems, three backed by data and one by reasoning, and folded each fix into the commit it belongs to:

1. **Invocation endpoint, N+1 per overridden tool step.** About 4 lazy loads per step, now 6 queries per workflow level.
2. **Run form data, repeated subworkflows rebuilt.** A subworkflow used by several steps, at any depth, was built once per use. It is now built once per request.
3. **"Rerun with this changed", one request per poll.** `/api/invocations?job_id=` fired every 3 s while a single-job step ran, and once per expanded step. It now fires once per invocation.
4. **Pop-out workflow view, duplicate download.** It and the run form's graph panel both downloaded the same editor-style workflow. They now share the store cache. This one rests on reasoning: the code path is plain, so I didn't measure it.

I didn't find any unbounded queries, async handlers running sync DB code, or flush/commit loops. All the touched endpoints are sync `def`.

## Not acted on

- **Making `subworkflow_steps` opt-in** (the #23076 pattern). The field costs about 1 ms of server time per inner tool step, and about 3.4 KB of compact JSON (about 12 KB as served, since this legacy endpoint pretty-prints). That's the same order as what `dev` already pays per top-level tool step. Lazy loading would need a new API parameter and a second request when the picker opens, and rerun and links would also have to resolve inner keys before load. Worth doing only if run forms of large subworkflows prove slow.
- **A lighter inner step builder than `Tool.to_json`.** The profile puts about 30% of the time in work the inner steps throw away: `swap_inf_nan` over the whole model, `to_dict` and the panel entry, and `url_for`. Help rendering is cached. Saving about 0.3 ms per step isn't worth duplicating `to_json`'s internals.
- **Dropping data inputs from inner steps.** The client ignores them already, but they're only about 0.5 KB each, and dropping them would tie the server to the client's filter.
- **`dev`'s run form cost on subworkflows.** It issues about 112 queries for one subworkflow with 20 tools, and 282 for five subworkflows with 10 tools each, before this branch adds anything. The branch adds 2 to 7.
- **`module_factory.from_workflow_step` per overridden step** still recovers each tool's state. After the fix that's about 0.7 ms per step, which is fine.

## Changes and SHAs

| Fix | Folded into | Main branch SHA | Extraction branch SHA |
|---|---|---|---|
| Prefetch the relationships of overridden tool steps (`_load_tool_step_relationships`), plus a unit query-count test | API 1, Add step_parameter_overrides | `043fb9f6ec8` | `1f75a352c98` |
| (unchanged, rebased) | API 2, parameters_display path | `ab108f5a147` | `6c8ccdcc2d6` |
| Memoize `_subworkflow_run_steps` by workflow id | API 3, subworkflow_steps | `56697bad36e` | `7e3404915d1` |
| (unchanged, rebased) | picker | `5bf75a1a4e7` | n/a |
| `useWorkflowRunGraph` uses `getFullWorkflowCached` | pop-out workflow view | `029d8d68dc6` | n/a |
| `isTopLevelInvocation` cached per invocation; `JobStep` watches primitive sources; vitest | Rerun with this changed | `19876df4179` | n/a |
| (unchanged, rebased) | E2E | `7a9b02f885e` | n/a |

The extraction branch `workflow_step_parameter_overrides_api` was re-synced. It keeps its `origin/dev` base, `38dc259318c`. `git range-diff` against the new API series shows the same differences as before: the dev-only lines in commit 1 and diff context in commit 3. The squash into commit 3 conflicted in context only, because `dev` lacks #24176's `request_input_labels` line.

## Tests

- **Unit**: `test/unit/workflows/` 201 passed, 1 skipped. This includes the new `test_step_parameter_overrides.py`, which shows 15 or more lazy-load queries for 5 steps without the prefetch and 0 with it.
- **API, main branch**:
  - `test_workflow_step_parameter_overrides.py` + `test_jobs.py -k parameters_display` + `test_workflows.py -k step_parameter`: 17 passed.
  - The 27 existing step-parameter tests, using phase B's selection: 27 passed.
- **API, extraction branch**: the new file + `parameters_display`, 13 passed. The unit tests (with `test_run_parameters.py`) passed 10. I didn't rerun the 6 known gxformat2-pin failures.
- **Vitest**: the 38 files matching the brief's suites, 239 tests, pass. That includes 2 new `JobStep` tests. The polling test fails on the old code, with 5 requests where it expects 1.
- **Lint and types**: vue-tsc, eslint (0 errors) and prettier are clean. ruff, black and isort are clean. mypy shows only the known `notification.py:862` error.
- **E2E**: `test_workflow_run_step_parameter_overrides.py` 9/9 passed with Playwright, against a rebuilt `static/dist` on a single Galaxy (:8091, now stopped).

<details>
<summary>Full measurements and analysis</summary>

## Method

The harness was a temporary `IntegrationTestCase`. Its tool conf was the sample `tool_conf.xml.sample` plus the functional test tools.

- **Tools.** `sort1` has a 3.4 KB RST help, a data input, a `data_column`, selects and a repeat. `echo_step_parameters` is the branch's test tool.
- **Query counts** come from a `before_cursor_execute` listener on the app engine.
  - Listeners on the engine see background job-handler threads too. Where that mattered, I filtered to the request thread, or waited for jobs to finish before measuring.
  - "Before" counts for the apply step weren't thread-filtered. The four per-step lazy loads alone made up 221 of them.
- **Timings** are medians of 5 calls after 2 warm-ups. Run form timings between runs varied by ±30 ms, so treat run form deltas below about 30 ms as noise.

## 1. Invocation endpoint: validate and merge overrides

`apply_step_parameter_overrides` builds a `ToolModule` per overridden tool step and reads `step.input_connections`. Every step lazy-loaded four things:

- `workflow_step_input`;
- `workflow_step_connection`, once per step input;
- `workflow_output`, in `ToolModule.from_workflow_step`;
- `post_job_action`, also there.

| Overrides | Before | After |
|---|---|---|
| 1 inner step | 5-6 queries, 3-5 ms | same (the prefetch skips a single step) |
| 50 inner steps in 5 subworkflows | ~322 queries, 358-420 ms | 30 queries, 33-40 ms |

The statements behind the 322, by count: connection 66, workflow_output 53, post_job_action 51, workflow_step_input 51.

**Fix.** `_apply` now runs `_load_tool_step_relationships` for the overridden tool steps at each level. It is one `select(WorkflowStep)` with `selectinload` for inputs → connections, workflow outputs and post-job actions, and it populates the already-loaded identity-map objects. Each level costs 6 queries, whatever its number of steps. The unit test pins it: 0 queries to read those relationships after the prefetch, and 15 or more without it.

Recursion through subworkflows lazy-loads `step.subworkflow.steps` once per overridden subworkflow. That is bounded by the payload, since unknown steps are rejected. Batch requests apply the overrides once, before expansion.

## 2. `/api/invocations/{id}/request`

| Recorded overrides | Queries | Time |
|---|---|---|
| 1 inner step | 13 | 57 ms |
| 50 inner steps in 5 subworkflows | 17 | 62 ms |

There is no N+1. `stored_step_parameter_overrides` loads each overridden subworkflow's steps once, and the subtraction is pure Python over the stored rows. The detached copies (`set_committed_value`) never enter the session. No change.

## 3. `parameters_display` rows

Each row gains a tuple path and an `is_dynamic` check: constant work per parameter, with no queries. No change.

## 4. Run form data: recursive `subworkflow_steps`

These are `GET /api/workflows/{id}/download?style=run&history_id=…` calls. The "base" column patches `_subworkflow_run_steps` to return `[]`, in the same server and the same run.

| Workflow | Branch ms | Base ms | Branch / base queries | Branch / base bytes |
|---|---|---|---|---|
| 1 subworkflow × 20 `sort1` | 103-140 | 118-130 | 114-116 / 112 | 273,441 / 31,808 |
| 5 subworkflows × 10 `sort1` | 230-372 | 200-272 | 289 / 282-287 | 638,393 / 34,328 |
| 1 subworkflow × 20 `echo_step_parameters` | 113-142 | 116 | 114 / 113 | 358,461 / 31,808 |
| 4 nested levels × 5 `sort1` | 144-168 | 160-167 | 134-136 / 132-133 | 336,355 / 31,806 |

- **Queries.** The branch adds 2 to 7, with no N+1. Inner steps already have modules from `dev`'s `inject_all`, which recurses into subworkflows. That injection is where `dev`'s own ~5 queries per inner step come from.
- **Server time.** Measured inside `_subworkflow_run_steps`, 50 distinct inner `sort1` steps take 40-67 ms per request, about 0.8-1.3 ms per step.
- **Payload.** About 3.4 KB of compact JSON per `sort1` inner step and 4.6 KB per `echo_step_parameters` step. The endpoint pretty-prints, so the served bytes are about 3.5× that. The data input's `options` are empty, because connected values skip the history scan (#22927's `_is_connected_value`). So history size doesn't enter, unless an inner data input is optional and left unconnected, in which case it pays one paged query.

**Repeated subworkflows.** I built a native workflow whose 5 subworkflow steps all reference the same `Workflow` row by `content_id`, as the editor does when the same stored workflow is inserted twice. Building took 31.6 ms per request before memoization and 10.0 ms after, with the response unchanged (5 × 10 inner steps). Inner `WorkflowStep` rows are shared by all their uses, so their injected modules and state are shared too, and the memoized output is the same as building each use. With nesting, the saving goes from exponential to linear: a subworkflow used twice at each of three levels was built 8 times. The response still lists every use, because the client's tree keys on the step path.

**Profile of the inner step build.** The full `Tool.to_json` runs per inner step, and the branch keeps only `inputs`. Roughly:

| Work | Share |
|---|---|
| `swap_inf_nan` over the whole tool model | 22% |
| `populate_model` | 14% |
| `find_conversion_destination_for_dataset_by_extensions` (data params' `to_dict`) | 10% |
| `populate_state` | 6% |
| Tool `to_dict` and panel entry | 5% |
| `url_for` | 5% |

Help rendering is cached. A lighter builder would save about 30%, roughly 0.3 ms per step. Not worth duplicating `to_json`.

## 5. Client fetching

**"Rerun with this changed" (`JobStep.vue`).**

- **The poll bug.** The watcher's source was a getter returning a new array. While a step runs, `WorkflowInvocationStep` polls the step every 3 s, which replaces `jobs`. Each poll re-ran the getter, the new array always counted as changed, and the callback fired. Each callback sent another `/api/invocations?job_id=…&include_nested_invocations=false` and briefly hid the rerun column.
- **The per-step cost.** Every expanded single-job step asked again, although the answer depends only on the invocation. If the invocation is a subworkflow invocation, every job of its own steps gets an empty list back.
- **Fix.**
  - The watcher now has separate sources (job id, invocation id, step index, job count), which Vue compares one by one. An `onCleanup` guard drops stale answers.
  - `isTopLevelInvocation(invocationId, jobId)` caches the promise per invocation and evicts it on error.
  - The vitest mounts a step, replaces `jobs` 3 times as polling does, then mounts a second step of the same invocation. That is 1 request now, against 5 before. A second test checks that a subworkflow invocation offers no rerun.
- **The server query** is cheap: the `workflow_invocation_step.job_id` index, plus `NOT EXISTS` on the indexed `subworkflow_invocation_id`.

**Pop-out workflow view (`StepParameterWorkflowView.vue`).**

- **The duplicate download.** The view fetches the editor-style workflow through `getFullWorkflowCached`, but the run form's graph panel (`useWorkflowRunGraph`) used uncached `getWorkflowFull`. Opening both downloaded the same editor-style workflow twice. That download is the run form's heaviest request for a large workflow.
- **Fix.** `useWorkflowRunGraph` now uses `getFullWorkflowCached`, as `useInvocationGraph` already does. Its step decoration spreads, so it doesn't mutate the shared object.
- **No other duplicates.** The view's scoped stores load once per scope (`fromSimple` is guarded), the datatypes mapper is store-cached, and the graph counts are recomputed client-side per toggle, O(leaves).

**Run form picker.** It makes no extra requests. The tree is a computed over the run data, and the filter and cards are client-only.

## Patterns checked and found clean

- **Unbounded queries and Python-side slicing**: none added.
- **Expensive fields on shared list endpoints**: `parameters_display`'s path is constant. `subworkflow_steps` is on the run form only (see "Not acted on").
- **Flush/commit loops**: none. The overrides are recorded as one meta row through the existing `add_parameter` path.
- **Sync DB in async handlers**: `invoke`, `invocation_as_request`, `parameters_display_by_*` and the legacy download are all sync.
- **Recursive SQL or CTEs**: none.

</details>

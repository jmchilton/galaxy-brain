# Show a workflow step's results across all invocations of that workflow

From any invocation, a user should be able to click a step and see that step's results in every other run of the workflow — which run, which workflow version, inputs, outputs, job state, and whether the job was reused.

Today answering "what did this step produce last week with the old parameter?" means opening invocations one at a time, finding the step in each graph, and clicking through to datasets.

What it should look like — a third tab **All runs** on the invocation step card, next to Jobs and Outputs:

| Invoked              | Version      | State | Reused | Inputs              | Outputs    | Parameters |
| -------------------- | ------------ | ----- | ------ | ------------------- | ---------- | ---------- |
| 2026-11-12 ★ current | v5 (current) | ok    |        | `sample_counts.tsv` | `counts` ▸ | ▸          |
| 2026-11-10           | v5           | ok    | reused | `sample_counts.tsv` | `counts` ▸ | ▸          |
| 2026-11-03           | v3           | ok    |        | `sample_counts.tsv` | `counts` ▸ | ▸          |

- Expanding an output shows the standard history item (peek, eye/edit/download); one click to its history.
- Expanding Parameters loads what the job actually ran with (the existing job parameters display). Mapped-over steps show "parameters of job 1 of N".
- Each row links to its invocation **with the same step selected** (see `invocation_step_deep_link.md`).
- Rows survive workflow edits: steps are matched across versions by uuid. Optionally, "include possible matches" adds label/position matches, badged as such.
- Deleted/purged outputs and deleted histories are shown honestly; subworkflow steps link to the subworkflow invocation.
- Paginated, sorted by invocation time, owner's runs only.

## Context

This is 🎯 #10039 (see outputs of previous invocations of a workflow) approached from the invocation graph rather than the editor. Pairs with `rerun_single_step_from_invocation.md`: a rerun's result is exactly a new row here. Reuse is currently only visible on the job information page — `JobBaseModel` doesn't carry `copied_from_job_id` — so the "reused" column is new information in any list view.

## Proposed Approach

One new read-only endpoint plus a store-independent table component. `GET /api/workflows/{workflow_id}/step_runs?step_uuid=...` resolves the step per workflow version, then pages over `WorkflowInvocationStep` rows joined to the caller's invocations, batch-loading outputs, job state counts and a `reused` flag. Parameters stay lazy via `/api/jobs/{id}/parameters_display`. No migration; everything needed is already linked and indexed.

<details><summary>Endpoint sketch</summary>

- Step identity: `step_uuid` (preferred), or `step_label`, or `order_index` + `version`.
- `match`: `uuid` (default) or include label/position fallbacks; each row carries `matched_by`.
- `limit`/`offset`, `sort_by` (`create_time`, `update_time`), `state` filter, `view=summary|detail` (detail inlines the invocation's inputs).
- Row: invocation (id, state, times, history, version), invocation step (state, job / implicit collection jobs, `representative_job_id`), job state counts, `reused` / `partially_reused`, tool id + version from the job, outputs and output collections.
- Expected cost: a handful of statements per page regardless of invocation count; check with `EXPLAIN` against a workflow with hundreds of invocations.

</details>

<details><summary>Follow-ups this leaves room for</summary>

- A standalone per-workflow Runs page (read-only graph + version picker + the same table), linked from the workflow list.
- Per-node run-count / last-state badges.
- Side-by-side comparison of two rows (outputs and parameter diff) — the row model already carries every id a diff needs, and the table takes props only so two can sit side by side.

</details>

## Alternative Approaches

Extending `GET /api/invocations?step_details=true` was rejected: it serializes every step of every invocation to show one step. Per-row client fetches (as the current step card does per output) would be 20–100 requests per page. Uuid-only matching silently drops runs of pasted or re-imported steps; position-only breaks when a step is inserted — hence uuid by default with labelled opt-in fallbacks.

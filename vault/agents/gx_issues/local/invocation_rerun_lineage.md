# RFC: record which invocation (and which edited step) a rerun came from

When an invocation is created by rerunning another one, Galaxy doesn't record that link, so a series of reruns is just a pile of unrelated invocations.

Proposal: persist two optional fields on the invocation request — `rerun_of_invocation_id` and `rerun_step_index` (order index of the edited step, if any) — and expose them in the request export and invocation API.

What it enables:

- A banner on the new invocation: "Rerun of invocation I with step 5 edited", linking back.
- Lineage navigation (I → J → K) and "derived runs" grouping in any cross-invocation view (see `step_runs_across_invocations.md`).
- A "newer iteration exists" hint computed when a view is drawn, by comparing a run against the latest in its lineage — never stored as state on the old run.
- API/script users can pass the fields too, so programmatic parameter sweeps get the same traceability.

## Context

Needed by `rerun_single_step_from_invocation.md`. Opened as an RFC because it's the one model-facing addition in that work and reviewers may prefer a different shape.

## Proposed Approach

Store them as two more named meta parameters on `WorkflowRequestInputParameter`, next to `use_cached_job`, `copy_inputs_to_history` and the preferred object stores. Two optional schema fields on the invoke payload, a persist line in `run_request.py`, an export line in the request serializer, API tests. No migration.

## Alternative Approaches

Columns on `workflow_invocation` are cleaner to query (e.g. "all reruns of I") but need a migration and model review; easy to move to later if reviewers prefer. A client-only `?rerun_of=` query parameter costs nothing server-side but is lost on reload and invisible to the API.

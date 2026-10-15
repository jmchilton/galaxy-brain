# Debrief: invocation_rerun_lineage

Source: `internally_managed/invocation_rerun_lineage.md` → `to_file/proposed_invocation_rerun_lineage.md`. Verified read-only against `origin-https/dev` `36fe2ce8428` (2026-10-14). No worktree created, nothing run, nothing posted.

## Verdict

Proposed, not rejected. Premise holds; no duplicate found. RFC framing kept; storage shape (meta param vs FK column) posed as explicit reviewer question.

## Verified

- No rerun → source link anywhere on dev:
  - `WorkflowInvocation`: no self-ref besides subworkflow association; only `source_invocation_id` on dev is on `Page` (notebooks, unrelated).
  - `InvokeWorkflowPayload`: no such field. Has `landing_uuid`, `on_complete`, `effective_outputs`, etc.
  - `WorkflowRerun.vue` mounts `WorkflowRun` without the invocation id; `WorkflowRunFormSimple.onExecute` payload has no source field.
  - `serialize_workflow_invocation_to_request` exports no such thing.
  - Job-level: `copied_from_job_id` = job cache; `rerun_remap_job_id` = tool remap. Neither is invocation lineage.
- Both rerun entry points (`WorkflowNavigationTitle.vue` button, invocations grid "Rerun" column) route to `/workflows/rerun?invocation_id=`.
- `WorkflowRequestInputParameter` = name/value/type rows; `META_PARAMETERS` holds `copy_inputs_to_history`, `use_cached_job`, 3 preferred object store ids, and `effective_outputs` (draft omitted the last). New names need no migration. Scheduler/export only read names they know.
- Model store import copies `input_parameters` verbatim (`model/store/__init__.py` ~L1213); import never restores invocation `uuid`; `workflow_invocation.uuid` unindexed.
- Precedent #20960 (mvdbeek, merged 2025-09-29): `landing_uuid` on payload → `landing_request_to_workflow_invocation_association` table + migration → `landing_uuid` on invocation view.
- `WorkflowsManager.get_invocation` raises `ObjectNotFound` and checks ownership by default.

## Related issues/PRs (none duplicates)

#20032 (rerun option, fixes #11340; no lineage), #18696 (rerun w/ cached jobs UX), #10039 (outputs of previous invocations), #22144 (read-only step form in invocation graph), #20223 (closed; rerun used wrong version), #23292 (rerun shouldn't require history switch — not cited, different concern), #23560 (RO-Crate provenance, dataset-level). ~14 search phrasings tried.

## Changes from draft

- Opener rewritten as plain single sentence; added illustrative today-vs-lineage table plus a "where the link is dropped" code walk in details.
- **Request export dropped** as an exposure point: export is the template for the next run; carrying `rerun_of` would mislabel K as rerun of I when J's export is reposted. Expose on invocation view next to `landing_uuid` instead.
- Added: server-side access validation; batch invocations share source; model store import must drop/remap the param (raw id would point at unrelated invocation); full `WorkflowRunForm` must also send it; test list.
- `rerun_step_index` demoted to open question (client-asserted, derivable by diffing request exports, order index tied to new invocation's workflow version).
- Alternatives reframed: FK column is main counter-option backed by #20960 precedent; association table and client-only query param listed.
- Local-file references replaced by descriptions of the related planned features; no client/deployment context.

## Reviewer (one fresh subagent, one round)

No pushback; premise and claims 1–7 confirmed. Fixes applied in place:

- Validation: `_create_landing_request_association` only checks existence, not access → now cites `WorkflowsManager.get_invocation` (I confirmed ownership check default).
- "Rerun page round-trips the export" overstated → page prefills, scripts post back.
- Invocations have no deleted flag → "null when viewer can't access source".
- Removed wrong "job reuse (#18696)" attribution and unsupported "many users".
- #20223 cited as past (fixed) bug.
- Alternatives: explicit RFC question; added cost of loading request params per row in invocations list.

## Left over

- Ownership vs mere accessibility for the source invocation (draft assumes `get_invocation` default = owner check).
- Whether lineage should survive history/invocation export-import.
- Side finding, not in issue: `effective_outputs` meta param stores DB step ids and is copied verbatim on model store import — likely wrong after import. Unverified by running; possible separate bug.
- UI claims in the table are illustrative; no server was run.

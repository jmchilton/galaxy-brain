# Drop `ToolRequestImplicitCollectionAssociation`; tighten TES back-pops to `uselist=False`

## Goal

Remove the last producer-side row anchored on `ToolRequest`. Outputs of a tool execution are recoverable end-to-end via the `TES → ICJ → HDCA` chain that this branch already establishes. While doing so, tighten the four TES back-pop relationships from `list[...]` to `Optional[...]` — TES is a per-execution-event row, so every back-pop is genuinely 1..[0,1].

## Why

`TRICA` was added when `ImplicitCollectionJobs` was not minted before constituent jobs ran, so the only way to find a tool-request's output HDCAs at queued/grey/empty time was through TRICA. On this branch, `precreate_output_collections` (`lib/galaxy/tools/execute.py:646`) unconditionally mints an ICJ, attaches `icj.tool_execution_state = tes` (lines 647–648), wires `hdca.implicit_collection_jobs = icj` (line 678), and sets `hdca.implicit_output_name` (line 675) — all in the same transaction as the TRICA append. TRICA's `(tool_request_id, dataset_collection_id, output_name)` shape is fully redundant with `HDCA.implicit_collection_jobs_id` + `HDCA.implicit_output_name` plus `ICJ.tool_execution_state_id`.

## Scope

Unreleased branch — the four existing migrations have not shipped. Add a fifth revision on top of `395148707459`; the chain will be rebased together at a later point.

## Audits already done (this conversation)

- **Read-side audit** — all consumers either (a) walk through TR purely as a bridge to TES (history_graph collection-join, extract.py:638/797/914), or (b) read TR-only state in one place: `services/workflows.py:348` reads `tool_request.history` for the auth check. That walk becomes `hdca → icj → tes → tool_requests[0] → history` after the drop. Wire surface (`ToolRequestImplicitCollectionReference` = `{src:"hdca", id, output_name}`) is buildable from `(hdca.id, hdca.implicit_output_name)` directly.

- **Write-side audit** — sole production writer is `execute.py:681-685`, and in that same scope it already wires HDCA→ICJ→TES and sets `implicit_output_name`. No backfill scripts, no Celery tasks, no library-import/data-manager flows mint TRICA. Two test helpers and one mock construct it directly — trivial refactors.

Verdict: drop is safe.

## Schema

- Drop table `tool_request_implicit_collection_association` (FKs `fk_trica_tri`, `fk_trica_dci`; PK).
- Drop ORM class `ToolRequestImplicitCollectionAssociation`.
- Drop relationships:
  - `ToolRequest.implicit_collections` (back-pop on TR).
  - `HistoryDatasetCollectionAssociation.tool_request_association` (back-pop on HDCA, `lib/galaxy/model/__init__.py:8180`).

## TES back-pop tightening

All four TES back-pops are 1..[0,1] in the writer. Change relationship shape on `ToolExecutionState`:

| Back-pop | Current | New | Justification |
|---|---|---|---|
| `tool_requests` → `tool_request` | `list[ToolRequest]` | `Optional[ToolRequest]` | `services/jobs.py::create` mints exactly one TR per TES. TR↔TES is 1:1 in the writer. |
| `jobs` → `job` | `list[Job]` | `Optional[Job]` | Per ICJ-supersedes invariant, a TES has at most one direct Job FK (the simple-job case). Under an ICJ, Jobs have NULL TES. |
| `implicit_collection_jobs` → `implicit_collection_jobs` (rename optional) | `list[ICJ]` | `Optional[ICJ]` | `precreate_output_collections` mints one ICJ per call. |
| `workflow_invocation_steps` → `workflow_invocation_step` | `list[WIS]` | `Optional[WIS]` | `_capture_workflow_tool_request_state` mints one WIS per step execution; TES is per-execution-event. |

### DB enforcement

Partial unique constraint on `tool_execution_state_id` for each of `tool_request`, `job`, `implicit_collection_jobs`, `workflow_invocation_step`. PostgreSQL + SQLite both allow multiple NULLs under unique, so the import-path NULL-TES rows stay legal. The constraint ADD will fail loudly on duplicates if any legacy data violates the invariant — surface and fix before promoting.

## Migration

New revision `<rev>_drop_trica_and_tighten_tes_backpops.py`, `down_revision = "395148707459"`.

**Upgrade:**

1. `op.drop_table("tool_request_implicit_collection_association")`.
2. `op.create_unique_constraint("uq_tool_request_tool_execution_state_id", "tool_request", ["tool_execution_state_id"])`.
3. Same for `job`, `implicit_collection_jobs`, `workflow_invocation_step`.

**Downgrade:**

1. Drop the four unique constraints.
2. Recreate `tool_request_implicit_collection_association` (mirror the original `1d1d7bf6ac02` create_table). Backfill from `(hdca.implicit_collection_jobs_id → icj.tool_execution_state_id → tes.tool_requests[0])` joined with `hdca.implicit_output_name`. Skip rows where any link is NULL.

Downgrade backfill query sketch:

```sql
INSERT INTO tool_request_implicit_collection_association
  (tool_request_id, dataset_collection_id, output_name)
SELECT tr.id, hdca.id, hdca.implicit_output_name
FROM history_dataset_collection_association hdca
JOIN implicit_collection_jobs icj ON icj.id = hdca.implicit_collection_jobs_id
JOIN tool_execution_state tes ON tes.id = icj.tool_execution_state_id
JOIN tool_request tr ON tr.tool_execution_state_id = tes.id
WHERE hdca.implicit_output_name IS NOT NULL;
```

## Writers

| Site | Change |
|---|---|
| `lib/galaxy/tools/execute.py:680-685` | Delete the `if tool_request: assoc = ToolRequestImplicitCollectionAssociation(); ...` block. HDCA→ICJ wiring at line 678 and `implicit_output_name=output_name` at line 675 already carry the data. |

That's it for production writers.

## Readers

| Site | Change |
|---|---|
| `lib/galaxy/managers/history_graph.py:409-425` | Drop the TRICA join. Collection-side producer query becomes `HDCA → ICJ → TES → ToolSource`. Unifies shape with the job-side producer query (both walk to TES). |
| `lib/galaxy/workflow/extract.py:638` | `output_hdcas = tool_request.output_collections` (helper, see below). |
| `lib/galaxy/workflow/extract.py:797` | Replace `o.tool_request_association.tool_request` detection. Two shape options below. |
| `lib/galaxy/workflow/extract.py:914` | Same shape as `:638`. |
| `lib/galaxy/webapps/galaxy/services/workflows.py:316-325, 348` | Auth walk: `hdca.implicit_collection_jobs.tool_execution_state.tool_request.history` (after `uselist=False`, `tool_request` is `Optional[TR]` not a list). |
| `lib/galaxy/webapps/galaxy/services/base.py:230-244` `tool_request_detailed_to_model` | Build `ToolRequestImplicitCollectionReference[]` from `(hdca.id, hdca.implicit_output_name)` off `icj.output_dataset_collection_instances`. Wire-transparent. |

### `extract.py:797` TR-backed detection — two shape options

**OPTION_DETECT_AT_HDCA:** keep per-HDCA detection. Walk `hdca.implicit_collection_jobs.tool_execution_state.tool_request` — non-None → TR-backed. Mirrors current shape; localized change.

**OPTION_DETECT_AT_SERVICE:** lift detection to the service layer. The wire payload already distinguishes `tool_request_ids` vs `implicit_collection_jobs_ids` — pass that distinction down to extract. Simpler downstream; no per-HDCA walk needed.

Recommend OPTION_DETECT_AT_SERVICE: the service already knows which input bucket the ID came from, and threading that through removes the only place extract.py needs to peek through HDCA back-pops. The current per-HDCA detection exists because TRICA's presence was the only signal.

### `ToolRequest.output_collections` helper

Add `@property` on `ToolRequest`:

```python
@property
def output_collections(self) -> list["HistoryDatasetCollectionAssociation"]:
    tes = self.tool_execution_state
    icj = tes.implicit_collection_jobs if tes else None
    return icj.output_dataset_collection_instances if icj else []
```

Replaces the three readers that today walk `tool_request.implicit_collections`. Keeps the walk in one place; `uselist=False` on both `tes.implicit_collection_jobs` and `tes.tool_request` makes the chain read naturally.

## Tests

- `test/unit/app/managers/test_HistoryGraphBuilder.py:178-186, 1552-1558` — drop `_link_implicit_collection` helpers; rewrite affected tests to set `hdca.implicit_collection_jobs = icj` + `hdca.implicit_output_name = name`.
- `test/unit/workflows/test_extract_by_ids_validation.py:45` — replace the `tool_request_association=SimpleNamespace(...)` mock with `implicit_collection_jobs=...` + `implicit_output_name=...` on the mock HDCA.
- New unit test: assert TES back-pops are scalar (`tes.tool_request`, `tes.job`, `tes.implicit_collection_jobs`, `tes.workflow_invocation_step` all `Optional`).
- New migration test (parity with existing migrations): upgrade-then-downgrade leaves equivalent state; downgrade backfill repopulates TRICA correctly for the standard async-tool-request shape.

## Validation

1. `pytest test/unit/app/managers/test_HistoryGraphBuilder.py` — history-graph fixtures touched.
2. `pytest test/unit/workflows/test_extract_tool_request_state.py` and `test_extract_by_ids_validation.py` — extract walks.
3. `pytest test/unit/webapps/test_tool_request_payload_tolerance.py` — tolerance reader.
4. `pytest test/unit/data/model/` — model relationships, migrations.
5. Migration round-trip (upgrade/downgrade) via `manage_db.sh`.
6. API integration: `pytest test/integration/test_tool_requests.py` (or equivalent if named differently) — wire payload still matches `ToolRequestDetailedModel` schema.

## Visual update

Update both docs after this lands:

- **BOOKKEEPING_MODELS.md**: remove TRICA from the schema list; in the History Graph / extract sections, replace the "TRICA → TR → TES" walk with "HDCA → ICJ → TES" everywhere; update the migration table.
- **MODELS_VISUAL_TOUR.md**: keep TRICA in the BEFORE diagram (historical truth); drop it from the AFTER diagram; update the History Graph flowchart (4a) to drop the `TR --> "resolve_structured_request(tool_request=...)"` arm; update the extract flowchart (4b) so `TR_IDS` flow joins the ICJ shape; redraw the convergence cluster to show one producer query path; remove TRICA glossary entry; update the migration-at-a-glance table.

## Out of scope

- Renaming `ImplicitCollectionJobs` to a more execution-event-oriented name. Real follow-up; not this PR.
- Folding `precreate_output_collections` into `_execute` directly (separate refactor).
- Adding a unique constraint on `ICJ.tool_execution_state_id` would also let us drop the `_strict_check_before_flush__` Job/ICJ guard — but that guard catches *Job-level* duplication (Job with TES under an ICJ that also has TES), which the unique constraint doesn't reach. Keep the guard.

## Unresolved questions

1. OPTION_DETECT_AT_SERVICE vs OPTION_DETECT_AT_HDCA for the TR-backed ICJ detection at `extract.py:797`?

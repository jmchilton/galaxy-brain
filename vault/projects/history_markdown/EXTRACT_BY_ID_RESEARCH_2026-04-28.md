---
type: research
parent_plan: "[[EXTRACT_BY_ID_PLAN]]"
created: 2026-04-28
---

# Research: open questions before resuming Step 1 (tool-job branch) and Step 2

Branch: `history_notebook_extract`. Last commit `1787213de2`. Stub for `extract_steps_by_ids` raises `NotImplementedError` for `job_ids`. This note resolves the three open questions blocking forward motion.

## Q1 — DCE → parent HDCA navigation: **not needed**

### Design call (2026-04-28)

We do **not** recover the parent HDCA from a DCE input. The workflow format has no clean way to express "pick element N of a collection" anyway — if a user wants that, they should use the `extract_dataset` tool (which produces its own HDA with its own creating job). A DCE manually fed to a `DataToolParameter` is, for extraction purposes, just an HDA.

### Resulting per-input-type rule

| Job input source                                  | Resolution                                                              |
|---------------------------------------------------|-------------------------------------------------------------------------|
| `Job.input_datasets` (HDA)                        | param walk over `tool.get_param_values`; emit `("dataset", hda.id, name)` |
| `Job.input_dataset_collections` (HDCA)            | iterate DB rows directly; emit `("collection", hdca.id, assoc.name)`     |
| `Job.input_dataset_collection_elements` (DCE)     | resolve to leaf HDA via `dce.hda` (or `dce.first_dataset_instance()` for nested); emit `("dataset", hda.id, assoc.name)` — **no HDCA recovery** |

Plus implicit-map override (Q2): when the job is implicit-map, `output_hdca.find_implicit_input_collection(name)` overrides per-job input rows with the actual input HDCA the mapping consumed.

### Implementation note for `__cleanup_param_values`

The existing HID-path `__cleanup_param_values` flattens `DataCollectionToolParameter` values via `first_dataset_instance()` (`extract.py:464`), losing the HDCA. For the ID path:

- Skip the `DataCollectionToolParameter` branch entirely in the (ID-flavored) cleanup walk. Collection inputs come from `Job.input_dataset_collections` instead.
- Keep the `DataToolParameter` branch — but route values to a leaf HDA: `model.HistoryDatasetAssociation` → emit directly; `DatasetCollectionElement` → use `dce.hda or dce.first_dataset_instance()`.

The HID path stays unchanged; we add a sibling helper rather than refactoring the original.

### Model facts (for reference)

- `DatasetCollectionElement` (`__init__.py:8283`): `dataset_collection_id` FK + `.collection` relationship; **no direct HDCA back-ref**.
- `DatasetCollection` (`__init__.py:7096`): no `back_populates` to HDCA.
- `HistoryDatasetCollectionAssociation` (`__init__.py:7829`): `find_implicit_input_collection(name)` (`:8141`) returns the input HDCA the mapped output came from. This is the only HDCA-recovery primitive we use.

## Q2 — Implicit-map representative-job logic in ID path

### Model

- `ImplicitCollectionJobs` (`__init__.py:2928`) — owns a list of jobs via `ImplicitCollectionJobsJobAssociation` rows
- `Job.implicit_collection_jobs_association` (`:1677`, `uselist=False`) — back-ref from a job to its ICJ-association row
- `HistoryDatasetCollectionAssociation.implicit_collection_jobs_id` (`:7853`) — FK on the **output** HDCA pointing at the same ICJ

So given any participating `job_id`:

```python
job = sa_session.get(Job, job_id)
icj_assoc = job.implicit_collection_jobs_association
if icj_assoc is None:
    # not an implicit-map participant; treat as singleton tool job
    ...
else:
    icj_id = icj_assoc.implicit_collection_jobs_id
    # representative job: pick a deterministic one (first-by-id), matches HID path's cja[0] behavior
    representative_job = (
        sa_session.execute(
            select(Job)
            .join(ImplicitCollectionJobsJobAssociation)
            .where(ImplicitCollectionJobsJobAssociation.implicit_collection_jobs_id == icj_id)
            .order_by(Job.id)
            .limit(1)
        ).scalar_one()
    )
    # output HDCAs of the mapping
    output_hdcas = sa_session.scalars(
        select(HistoryDatasetCollectionAssociation)
        .where(HistoryDatasetCollectionAssociation.implicit_collection_jobs_id == icj_id)
    ).all()
```

### How to wire connections

Mirrors HID path exactly, just keyed differently:

- For each `(input_name, ?)` association from the representative job's param walk:
  - if the job is implicit-map, look up *input HDCA* via `output_hdcas[0].find_implicit_input_collection(input_name)`. Plan §2 already calls this out — same logic, just keyed by `("collection", input_hdca.id)` instead of `input_collection.hid`.
- For each `assoc` in `representative_job.output_datasets + .output_dataset_collection_instances`:
  - if implicit-map: scan `output_hdcas` (or the `summary.jobs[representative_job]` list — same content) for the matching `assoc.name`; key as `("collection", output_hdca.id)`.
  - else: key as `("dataset", hda.id)` or `("collection", hdca.id)` from the assoc.

### Deduplication

If user passes multiple jobs from the same ICJ, collapse to one representative. Mirror HID path's `job_id2representative_job` dict — but keyed by ICJ id rather than building it from a `history.visible_contents` walk:

```python
icj_to_representative: dict[int, Job] = {}
for job_id in job_ids:
    job = ...accessible...
    icj_assoc = job.implicit_collection_jobs_association
    icj_id = icj_assoc.implicit_collection_jobs_id if icj_assoc else None
    if icj_id is not None:
        if icj_id not in icj_to_representative:
            icj_to_representative[icj_id] = pick_representative(icj_id)
        # silently skip non-representative participating jobs
        continue
    # singleton job — process directly
```

This is cleaner than HID path because we don't iterate the whole history.

## Q3 — Test-strategy reconciliation

User decision: keep unit tests small and targeted; move the DB-heavy cases to API/integration.

### Recommended split

**Unit (`test/unit/workflows/test_extract_by_ids.py`)** — keep tight, focus on input-step construction + permission rejection. Already implemented:
- `test_extract_steps_by_ids_basic_inputs_only` ✅
- `test_invalid_dataset_id_raises_object_not_found` ✅
- `test_inaccessible_dataset_rejected` ✅
- `test_extract_steps_by_ids_collection_input_only` ✅
- `test_invalid_collection_id_raises_object_not_found` ✅
- `test_inaccessible_collection_rejected` ✅

Add only one or two more unit tests, both narrow:
- `test_job_ids_not_yet_supported` placeholder removable once Step 1 lands.
- `test_extract_steps_by_ids_dedupes_implicit_map_participants` — pure dict logic on a small mocked ICJ structure (does not require a real DB; can stub `Job.implicit_collection_jobs_association`).

**Drop from unit, move to API:**
- ~~test #2 collection-through-tool~~ → API
- ~~test #5 implicit-map~~ → API
- ~~test #6 copied dataset~~ → API (already has `test_extract_with_copied_inputs` for HID; add ID parallel)
- ~~test #6b paired collection~~ → API
- ~~test #6c DCE-as-data-param~~ → reworked: API test asserting that a DCE manually fed to a `DataToolParameter` flows through as the leaf HDA (no HDCA recovery, no special workflow representation). The extracted workflow should connect to whatever upstream step produced that HDA — or treat it as an `Input Dataset` if the user passed the leaf HDA's id directly. If neither, the connection is silently dropped (same as HID path's behavior for unknown HIDs).

**API (`lib/galaxy_test/api/test_workflow_extraction.py`)** — add a sibling class `TestWorkflowExtractionByIdsApi` with a parallel helper `_extract_and_download_workflow_by_ids` that posts to `POST /api/workflow/extract`. Port the existing HID test bodies one-for-one — same setups, swap `dataset_ids=hids` → `hda_ids=encoded_ids`, swap endpoint. Existing HID class becomes a regression baseline.

Tests to write at API level (replacing former unit cases #2/#5/#6/#6b/#6c plus the pre-planned API set):
- happy path single HDA + cat1 job — covers #1 + #7
- mapping over a paired HDCA (random_lines) — covers #2 + #5 + #6b
- copied input — covers #6 (both pre-copy and post-copy id directions)
- DCE-as-data-param flows through as leaf HDA — covers #6c (run a tool whose `DataToolParameter` is fed a single element from a list; pass the leaf HDA's id in `hda_ids`; assert the connection wires correctly through that HDA, with no HDCA reference in the workflow)
- cross-history happy path — #9
- inaccessible HDA from foreign user — #10
- copied-dataset no-foreign-jobs regression (#9161) — #11
- request without `from_history_id` — #8
- empty payload → 400 — #13
- back-compat: legacy endpoint untouched — #12

Job-cache cross-history (#14) and roundtrip (#15/#15b) stay as planned.

### Why this split is safer than the original plan

The original plan called #2/#5/#6 "unit" but they need a real `tool.get_param_values` cycle, real `JobToInput*` rows, real implicit-map structures, real copy chains. Mocking those would be brittle and would catch the wrong things (mock contract drift, not real behavior). API tests already have all the populator helpers (`run_tool`, `run_random_lines_mapped_over_pair`, `__copy_content_to_history`) that build these structures correctly.

## Concrete next-step sequence

1. **Step 1 finishing — tool-job branch.**
   - Implement `step_inputs_by_id` as a thin variant of `step_inputs`: same param walk for HDA params; for HDCA, append from `Job.input_dataset_collections` directly; for DCE-as-data-param, append from `Job.input_dataset_collection_elements` keyed by parent HDCA.
   - Implement implicit-map dedup + representative-job selection (pure DB queries, no `visible_contents`).
   - Build `id_to_output_pair: dict[tuple[Literal["dataset","collection"], int], (WorkflowStep, str)]`.
   - Wire connections.
   - Replace the `if job_ids: raise NotImplementedError` block.
2. **Add API test class** `TestWorkflowExtractionByIdsApi` with the helper. First red test: happy-path cat1 (#7).
3. **Land tests one at a time** in the order listed above; each goes red → green per existing convention.

## Open ambiguities still unresolved

- **Subworkflow extraction parity**: roundtrip test #15b — verify nested workflow extraction with the new path. Subworkflow steps in source workflows are stored with their own param state; the param walk should handle them, but worth a single API-level smoke test.
- **`/api/workflow/extract` (singular) naming** — leave for PR review, per plan.

No blockers identified. Recommend resuming with Step 1's tool-job branch.

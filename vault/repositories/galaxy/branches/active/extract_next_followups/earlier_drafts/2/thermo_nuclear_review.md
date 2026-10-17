# Thermo-nuclear code quality review — extract_next_followups

**Top line.** Acted on #1 (`IdKey` folded into `ContentRef`), #2 (one `HistoryBoundary` on the closure result; cross-history rows in their own helper) and the `tool_for_job` annotation nit. Behavior unchanged; existing suites are the guard. Listed, not done: #3, #4 and the remaining #5 nits. No file crosses 1k lines because of this branch.

## Not acted on

- **#3 copies-to-one-input rule in three layers.** The fix moves name validation into `extract_steps_by_ids` or adds a shared grouping helper. Either way the extraction contract changes, so it's a moderate redesign. Candidate follow-up.
- **#4 move content-ref helpers out of `workflow/extract.py`.** A pure move, but it churns five files for a layering win. Better as its own commit or PR if John wants it.
- **#5 `exposed`/`referenced_by_report` from one value.** These are two API facts (preselected vs locked) that happen to be equal today. Kept separate on purpose.
- **#5 feature text in `PageManager.get_accessible_notebook`.** Extraction is the only caller and no test asserts the message. Low value; fold it in with the `ChatManager.get_accessible_page` dedupe (already on the upstream list).
- **#5 client star `:disabled` expression.** A cosmetic nit. Not worth touching the template the E2E tests drive.
- **Already decided** (earlier_drafts/1 "Not acted on", plus H2/H3/M7, `creating[:1]`, zero-input boundaries): not re-reviewed.
- **Upstream dev bug, new.** On `/api/workflows/extract` (by-ids), a non-empty `dataset_names` (or `dataset_collection_names`) shorter than `hda_ids`/`hdca_ids` raises IndexError (500) in `extract_steps_by_ids` (`dataset_names[i] if dataset_names`). The payload has no length check. Pre-existing; fixing it changes behavior, so it's out of scope here.

<details>
<summary>Full review</summary>

Scope: `git diff origin/dev...a895d1d4e5f` (34 files, +2206/-1043).

**1k-line check.** No file crosses 1000 lines because of this branch. `workflow/extract.py` (1131 -> 1145), `markdown_util.py` (1637 -> 1645), `populators.py`, `selenium/framework.py` and `test_workflow_extraction.py` (2325 -> 2756) were already over on dev. All extraction manager modules stay under 560.

Overall: the branch mostly deletes complexity (the `_reject_unquotable` layer, three private copies of `_resolve_content`/`_tool_for_job`/`_content_key`, the `content_kind` parameter threaded through naming and report, the `_load_report_page` duplicate, sleep-based selenium waits). The findings below are what it left behind or added.

### 1. Two vocabularies for one concept: `IdKey` vs `ContentRef` (structural, missed code-judo)

`extract.py` keys extraction wiring by `IdKey = ("dataset" | "collection", original_id)`; everything else the branch touched now speaks `ContentRef = ("hda" | "hdca", id)`. The branch even adds a comment explaining the split and keeps `output_label_to_id_key` to translate. `ExtractionLabelIndex.step_for_content` translates on every lookup; `extract_steps_by_ids` translates each output label. Both encode "original HDA/HDCA id". Delete `IdKey` and `output_label_to_id_key`; key `id_to_output_pair` / `IdAssociations` / `content_to_step` by `ContentRef`. A concept, a type alias, a function and an explanatory comment disappear.

### 2. Page-seeding concerns leak into the plain-history serializer (spaghetti growth)

`_serialize_summary(..., closure=None, local_keys=None)` takes two optionals that are only ever both set or both unset, and `_summary_rows` takes `history_id` + `local_keys` only to call `_produced_elsewhere(job, history_id, local_keys)` — the same triple is threaded through `_backward_job_closure`, the job-ref loop and `_summary_rows`. The cross-history branch (per-item rows, a `seeded_copies` set) sits inline in the row loop of an otherwise uniform map. Fix: one boundary object (`history_id`, `local_keys`, `produced_elsewhere(job)`) carried by the closure result, so the plain-history path knows nothing about it; pull the cross-history rows into their own helper.

### 3. "Copies of one original are one input" is encoded three times (boundary / layering)

Client `selectedInputSteps` (one name per card), service `_distinct_input_names` (re-fetches each HDA/HDCA through the accessibility managers to normalize to its original, then keeps `names[len(content_ids):]` so an over-long names list still reaches validation — a magic tail), and the skip in `extract_steps_by_ids`. The service is predicting what extraction will do so it can validate names before extraction runs. The canonical home is extraction: either `extract_steps_by_ids` validates the input names it actually assigns, or one shared helper groups `(ids, names)` by original and both layers consume it. Either changes the `extract_steps_by_ids` contract.

### 4. Content-ref helpers live in `workflow/extract.py` (layering)

`get_original_hda/hdca`, `original_content_ref`, `resolve_content`, `tool_for_job`, `skip_output_assoc_name` are now public in an already 1145-line module, and three `managers/` modules import history-item helpers from `galaxy.workflow.extract`. A small dedicated module (content identity for extraction) would be the cleaner home and would shrink `extract.py`. Pure move, but churn across five files.

### 5. Small type/contract nits

- `tool_for_job(...) -> Optional["Tool"]` — the only `Optional` in the module; the rest of the diff uses `X | None`.
- `_extraction_row` computes `index in referenced` twice to fill `exposed` and `referenced_by_report`; one value, two names.
- `PageManager.get_accessible_notebook` raises "Workflow extraction is only available for history-backed pages" — feature text in a generic manager method (its only callers are extraction; `ChatManager.get_accessible_page` is a near-duplicate, already listed as upstream).
- Client: the star's `:disabled` is a four-term inline expression next to a `reportLockTitle` helper; acceptable.

### Not re-reviewed (decided by John, see earlier_drafts/1 "Not acted on")

H2 three-pass instance-reference sweep and dropping (not rewriting) embeds/visualizations; H3 quote acceptance; M7 lock + server warning; `creating[:1]`; zero-input cross-history boundaries; endpoint naming; `report_title`; HTML notebooks; M3.

</details>

## Commits (on top of `a895d1d4e5f`, pushed to `jmchilton/extract_next_followups`)

- `90209a0f9c5` Key extraction wiring by ContentRef; drop IdKey and its translator. Deletes `IdKey` and `output_label_to_id_key`; also `tool_for_job -> "Tool | None"`. `test_extract_report.py` fixture keys renamed `("dataset", n)` -> `("hda", n)` (rename of an internal key, no assertion change).
- `6a7a93ec715` Carry the notebook history boundary on the closure result. `HistoryBoundary(history_id, local_keys).produced_elsewhere(job)` replaces `_produced_elsewhere` and the `history_id`/`local_keys` threading. `_serialize_summary`/`_summary_rows` take only `closure`. `_boundary_producer_rows` holds the cross-history branch. The unit test `_closure` helper builds a `HistoryBoundary`.

## Test runs (after both commits)

- Unit: `test/unit/workflows/`, `test_workflow_extraction_summary.py`, `test_markdown_validate.py`, `test_markdown_export.py`: 278 passed, 1 skipped.
- mypy (from `lib/`) on extract.py, the three extraction managers, services/workflows.py and services/pages.py: clean except `galaxy/managers/notification.py:862` (untouched on this branch, env noise).
- ruff and pre-commit hooks: clean.
- API `test_workflow_extraction.py`: 107 passed, 1 skipped (10m).
- API `test_pages_history_attached.py`: 56 passed.
- Client and E2E not run: no client or selenium code touched.

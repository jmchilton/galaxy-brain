Run via claude-opus-5-5 at medium effort.

# Rescope review: pages_extraction_summary_rename_26.2

Scope: `git diff origin/release_26.2...HEAD`, focus on 701daf4174c (hint `kind` → `src`). Commit 1 (d4a265d39c3) not re-reviewed for changes per cross-branch byte-identity constraint.

## Verdict

Approve. Mechanical, complete rename; no bugs found. A couple of optional cheap nits on internal naming.

## Real bugs

None.

## Completeness of `kind` → `src` (checked)

- Schema: `OutputLabelHint.src: Literal["hda","hdca"]`, `StepLabelHint.src: Literal["job","implicit_collection_jobs"]` (lib/galaxy/schema/workflows.py). Titles changed to "Source", matching `schema/jobs.py`, `schema/tasks.py`, `schema/invocation.py:522`.
- Service (lib/galaxy/webapps/galaxy/services/workflows.py ~498-541): all `.kind` reads and error messages updated.
- lib/galaxy/workflow/extract.py: both `.kind` reads updated (step hint loop ~884, output label loop ~1024).
- Client: `WorkflowExtractionForm.vue` both producers updated; vitest expectations updated. `data-step-kind` / `stepKind()` / `navigation.yml mapped_tool_card` are UI-only card attributes, unrelated to the API field - correctly left alone.
- client/src/api/histories.ts uses generated types only; no literal `kind`.
- schema.ts: only the two hint interfaces change in commit 2; field reorder is openapi-typescript alphabetical sort - consistent with regeneration.
- API tests: all 23 payload literals in test_workflow_extraction.py updated; grep finds no remaining `"kind"` hint payloads in lib/galaxy_test (api, selenium, populators), test/, or doc/.
- `workflow_extraction_report.py` `kind` locals are about markdown `ReferencedContent` refs, not the hint API - out of scope.
- Tests only renamed keys; no assertions weakened.
- No import changes; nothing to flag on import placement.

## src value conventions

- `"job"`: matches `ToolRequestJobReference.src: Literal["job"]` (schema/schema.py:4546) and `services/base.py:228` `{"src": "job", ...}`. Good.
- `"hda"`/`"hdca"`: match `DataItemSourceType` values. Could be typed as `Literal[DataItemSourceType.hda, DataItemSourceType.hdca]` like schema/invocation.py:521, but plain string Literals are equally common (schema.py:3322, history_graph.py `NodeSrc`) and generate identical OpenAPI. Not worth changing.
- `"implicit_collection_jobs"`: no existing public `src` literal for ICJ anywhere in Galaxy schemas. Closest precedents: `markdown_util.py:1386` `ref_object_type = "implicit_collection_jobs"`, model store key `implicit_collection_jobs`, the sibling payload field `implicit_collection_jobs_ids`, and summary rows' `implicit_collection_jobs_id`. The snake_case table-name form is the most consistent choice; `"ImplicitCollectionJobs"` (`IMPLICIT_COLLECTION_JOBS_MODEL_CLASS`) is a `model` class field, a different convention, and should not be reused here. No existing alias to reuse.

## Nits (optional, cheap)

1. extract.py ~1024: `kind = output_label.src` now reads oddly; renaming the local to `src` (3 uses in that loop + the error f-string) is a free consistency win confined to commit 2:
   ```python
   for output_label in output_labels:
       src = output_label.src
       ...
       normalized_src, normalized_content_id = normalize_output_label_key(trans, src, content_id)
       id_key = output_label_to_id_key(normalized_src, normalized_content_id)
       ...
           f"output_labels includes {src} id {content_id} that was not produced by a selected extraction step"
   ```
2. `OutputLabelKind` alias (extract.py:704) and `kind` param names on `normalize_output_label_key` / `output_label_to_id_key` / `content_label_arg` / `step_for_content`, plus the import in `workflow_extraction_report.py:52`: internal-only, so not API-freezing. Renaming to `OutputLabelSrc` would align vocabulary but touches the report module and widens the diff; fine to leave. Could also make `OutputLabelHint.src` use the alias (`src: OutputLabelKind`) so the Literal is defined once - small reuse win, but optional.
3. `OutputStepKey` uses `"icj"` internally while the API uses `"implicit_collection_jobs"`; internal only, leave.
4. Field order: `StepLabelHint` declares `src` first, `OutputLabelHint` declares `id` first. Cosmetic (OpenAPI sorts); could put `src` before `id` in both to mirror `(src, id)`. Skip unless touching anyway.

## Test coverage

Rename is covered by existing API tests (would 400/422 on the old key since `src` is required) and vitest payload assertions. No explicit test that legacy `kind` is rejected; not needed since the field never shipped.

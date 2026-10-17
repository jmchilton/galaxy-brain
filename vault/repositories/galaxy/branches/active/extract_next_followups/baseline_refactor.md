No further refactoring this pass. The four first-pass refactors still sit right after the two "Baseline tests" commits; boundary `3d0a94fe38e`; head unchanged `9330c4c8feb` (no rebase, no push).

First pass: `earlier_drafts/2/baseline_refactor.md` (PageManager `get_accessible_notebook`, public `get_original_hda`/`get_original_hdca`/`skip_output_assoc_name`, public `walk_directives`, `DatasetPopulator.run_cat1`).

## Test applied

A candidate moves only if it changes code already on dev, keeps dev behavior, and doesn't force reworking feature commits.

## Candidates considered, not moved

- **`copy_library_dataset` populator** (`dce789aa030`). Cherry-picks cleanly, but nothing on dev would call it at the boundary — dead code, not a refactor. Making it one means converting unrelated dev tests (`test_datasets.py`, `test_histories.py`, objectstore library-import integration test). Scope creep.
- **`_accessible_content`** (`df78226dea9`, E1). Born inside the feature commit; takes `ContentKind`, not on dev.
- **`HistoryBoundary`** (`d4d504fb3c1`, `05ab09a4b2c`). Reshapes `local_keys`/cross-history producer state the branch adds (`3ee8b909ea5`); zero hits on dev.
- **`9330c4c8feb` tidy.** Touches a branch-added function and a docstring for branch-extended validation.
- **ContentKind/ContentRef vocabulary** (`f46e1b22043`). Still carries behavior: `tool_for_job` narrows naming's catch-all to `InsufficientPermissionsException`; `suggested_output_name` changes from id+kind (missing row → None) to content. Cherry-pick onto the boundary conflicts in 5 files (20 hunks). An aliases-only slice (schema `ContentKind`/`ContentRef` replacing `OutputLabelKind`/`OutputLabelKey`/`OutputContentKind`/markdown_util alias/inline `Literal`) would pass the test, but needs hand-splitting interleaved hunks, reworking `aa13aab937a`, and a new mypy check (narrows `tuple[str, int]` to a `Literal` tuple) for ~20 lines of alias consolidation. Declined.
- **IdKey → ContentRef** (`32832c19bd3`). Depends on the schema `ContentRef` above; ~8 intermediate commits (`586aed86e42`, `c4d86acfa02`, `b49cb6450a6`, `6545eb88d2d`, …) touch the `("dataset"|"collection", id)` keys and would need rework.
- **Shared extraction test helpers** (`e42576bd387`). Unchanged from first pass: built around branch-added tests.

## Verification (fresh)

- Boundary `3d0a94fe38e` unit: `test_extract_report`, `test_extract_summary`, `test_workflow_extraction_summary`, `test_markdown_export` — 95 passed; `test_extract_parameters` — 18 passed.
- Boundary `3d0a94fe38e` API (`GALAXY_TEST_TOOL_CONF` sample + functional, `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1`), one run: `TestNotebookWorkflowExtractionReport` + `TestNotebookWorkflowExtractionSummary` (incl. both 403 baselines and the rollback baseline) — 18 passed, 0 skipped.
- Head `9330c4c8feb` unit (same five files) — 128 passed.

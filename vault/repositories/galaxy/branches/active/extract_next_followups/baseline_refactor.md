Four behavior-neutral refactor commits were pulled forward to sit right after the two "Baseline tests" commits and before all feature/fix work: PageManager notebook access check, public copy-normalization helpers, public `walk_directives`, `DatasetPopulator.run_cat1`.

- Backup of the pre-restructure branch: `backup/extract_next_followups_pre_refactor_baseline` = `6a7a93ec715`.
- New head: `d4d504fb3c1`. Final tree identical to `6a7a93ec715` (`git diff 6a7a93ec715 HEAD` empty).
- Refactor-only boundary: `3d0a94fe38e` (dev + baselines + refactors, no feature work).

## New series start

```
74d1d014267 Baseline tests: from_page_id extraction refuses inaccessible page or history
d5f6696cc6a Baseline tests: failed notebook report rewrite creates no workflow
800ec3ca5f5 Move notebook page+history access check onto PageManager
4b983d9e172 Make copy-normalization helpers of workflow extract public
509436851d9 Make directive walk public: walk_directives
3d0a94fe38e Add DatasetPopulator.run_cat1; delegate the four cat1 setup helpers to it   <- boundary
7a020aed471 Accept quotes and line breaks in extraction labels again                   <- feature/fix work starts
...
```

## Pulled forward

- **`get_accessible_notebook` on PageManager** (was `3081b5344fe`). Dev already had the same page+history check twice (`PagesService` summary endpoint, `WorkflowsService._load_report_page`). On dev it is a pure dedup; the `74d1d014267` baseline pins the 403s. One visible delta: the from_page path's 400 text for a history-less page goes from "Workflow report extraction is only available…" to "Workflow extraction is only available…" (summary endpoint's wording). No test asserts either string.
- **Public `get_original_hda` / `get_original_hdca` / `skip_output_assoc_name`** (was `5e6d5eec179`). Dev's naming and summary modules already imported the underscore names across modules. Regenerated on the base as the mechanical perl rename (verified identical to the original commit's transform).
- **Public `walk_directives`** (was `a290ebe298b`). Dev's report rewriter and `referenced_content_ids` already called `_walk_directives` from outside the class. Rename plus type hints/docstring.
- **`DatasetPopulator.run_cat1`** (was `409cb628053`). Test-only; cherry-picks cleanly onto dev; the four existing cat1 helpers keep their signatures.

## Left in place

- `5ff34078369` ContentKind/ContentRef vocabulary: narrows naming's catch-all to `InsufficientPermissionsException` — a behavior change.
- `90209a0f9c5` IdKey→ContentRef: depends on `5ff34078369`.
- `6a7a93ec715` HistoryBoundary: reshapes `local_keys` state the branch introduces; not on dev.
- `59e34d471a6` unquotable chars: widens character coverage — behavior.
- `6c17f57d99f` shared extraction test helpers: built around branch-added tests; heavy churn across intermediate commits.

## How

`git rebase -i` with a scripted todo: the four refactors placed after the baselines; after every later pick an `exec` re-applied the renames (so no intermediate commit references a dropped name); conflicts resolved as transform(original file) only when HEAD equaled transform(original parent file). Every intermediate commit before the original refactor positions differs from its original by the same constant delta (14 files, +99/-118); from `a94ee02c574`'s replacement (`4c8415bd359`) onward every tree is byte-identical to the original.

## Verification

- Every commit in `origin/dev..HEAD`: `ruff --select F` clean on touched extraction modules/tests; no stale `_original_hda`/`_skip_output_assoc_name`/`_load_report_page` from their rename commits on; `summary_from_page` def and caller agree in every commit.
- Boundary `3d0a94fe38e`: extraction unit tests (`test_extract_report`, `test_extract_summary`, `test_workflow_extraction_summary`, `test_markdown_export`) 95 passed.
- Boundary `3d0a94fe38e` API, one run: `TestNotebookWorkflowExtractionReport` (incl. both 403 baselines, rollback baseline, history-less 400), `TestNotebookWorkflowExtractionSummary`, `TestWorkflowExtractionByIdsApi` — 72 passed.
- Head `d4d504fb3c1`: extraction unit tests (above + `test_extract_parameters`) 128 passed. Pushed with `--force-with-lease` to `jmchilton`.

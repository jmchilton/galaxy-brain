# Codex review — tool_form_job_count

Acted on the single finding (confirmed): nested collection counts lost multiplicity when one child collection is referenced by several parent elements. Fixed in `81d3d9146d6` with a red-to-green model test. Nothing left un-acted.

Scope: `git diff origin/dev...HEAD` after rebasing onto `origin/dev` `5ff1e46b8c3` (head before fix `f7f512e33a5`). Codex ran read-only; brief described intent only.

## Not acted on

- None.

## Details

**P2 correctness, `lib/galaxy/model/__init__.py` `element_count_at_depth` — CONFIRMED.**
`DatasetCollectionManager.__load_element` with `src: hdca` returns the existing `hdca.collection` (`lib/galaxy/managers/collections.py`), so a `list:list:paired` can hold the same `list:paired` twice. The count walked levels with `IN`/`= ANY(array)` id subqueries, which collapse duplicates; `_split_dataset_collection` visits each path. Codex reproduced preview `job_count=2` vs 4 expanded jobs.

Fix: `element_count_at_depth` now walks one query per level, carrying a per-collection weight (references from the level above), and sums `weight × element count` at the target depth. Still no HDA loads; lookups stay on the indexed `dataset_collection_id`; no DCE self-joins (the PostgreSQL planner problem noted in `_build_nested_collection_attributes_stmt`). Since the count no longer shares the id-subquery helpers, the branch's refactor of `_subcollection_ids_stmt` into `_nested_collection_ids_selects` / `_ids_in` was reverted to dev's form, shrinking the model diff.

Test: `test_element_count_at_depth_shared_child` in `test/unit/data/model/db/test_misc.py` — red before (`2 == 4`), green after. `test_misc.py` + `test_meta_expansion.py`: 42 pass; mypy clean on `galaxy/model/__init__.py`.

Codex coverage note: 41 backend + 19 client tests run by codex; API and Selenium tests inspected, not run.

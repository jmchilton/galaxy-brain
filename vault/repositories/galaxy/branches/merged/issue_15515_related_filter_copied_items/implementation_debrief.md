# Implementation debrief: second-round review (2026-10-15)

**Status: READY.** The earlier debrief is in `earlier_drafts/1/`.

## Request

John asked to address mvdbeek's second review of `4d82165af62`. Every dataset click built two recursive CTEs over every copied HDA in the history:
- `_collection_output_hda_ids(history_id)`;
- the `copies_historydatasetassociation` mapping seed.

Collection elements count as copies, and so do the outputs of filter/relabel, `pick_value` and the job cache. So never-imported histories paid this cost too.

## Change (`6c8b5b22a29`)

- **Ownership check:** `_collection_output_hda_ids` takes a seed WHERE clause and a CTE prefix instead of a history id. One instance is seeded from the clicked HDA and one from the mapping candidates.
- **HDA mapping candidates:** this history's copied HDAs with `dataset_id` in the related HDAs' datasets, as the reviewer suggested. The chain walk and the job and collection boundaries are unchanged, so pass-through outputs and sibling copies stay excluded.
- **HDCA mapping:** unchanged. Copied collections get new `DatasetCollection` rows, so there is no narrowing key.
- **Metadata `count(copied_from) > 0`:** kept. An `EXISTS` form measured the same (10–12 ms at 100k). The hid lookup scans the history's rows anyway, on dev too, because there is no `(history_id, hid)` index.
- **New test:** `test_related_hids_sibling_copy_is_not_related`. It guards against reducing the logic to "a shared dataset means related". It is not red-to-green: `4d82165af62` passes it too.

## Evidence

[history_size_probe.py](history_size_probe.py) rebuilds the reviewer's fixture on PostgreSQL 18; results are in [history_size_results.json](history_size_results.json). Dataset click, original / copied history, wall medians:

| Per history (background) | dev | 4d82165af62 | 6c8b5b22a29 |
| --- | --- | --- | --- |
| 3k (54k) | 3.8 / 2.6 ms | 77 / 112 ms | 11.6 / 12.4 ms |
| 30k (540k) | 5.0 / 4.3 ms | 786 / 1,179 ms | 12.7 / 14.4 ms |
| 100k (3.2M) | 8.6 / 8.6 ms | 845 / 1,830 ms | 17.7 / 23.7 ms |

- **Execution:** the relationship statement now runs in 0.45–1.2 ms with no JIT. The prior head took 0.9–1.3 s and used JIT. The remaining gap to dev is planning plus SQLAlchemy compilation.
- **Existing probes still pass:**
  - 10k importers: 1.6 ms. The candidate lookup uses the `history_id` index, with no `dataset_id` fan-out.
  - Real `History.copy()` with 750 hidden copies sharing the related dataset, the worst case for narrowing: 9.1 ms (6.3 ms before).
- **Tests:**
  - 28/28 manager tests pass.
  - 8/8 related API tests pass on PostgreSQL 18 and on SQLite.
  - The first two SQLite runs timed out in `_run_cat`'s 60 s `wait_for_history`, before any filter call, while machine load averaged 60–90. The rerun passed.
- **Static checks:** mypy from `lib` shows only the 4 pre-existing TypeAdapter errors. Pre-commit hooks pass.

## Tradeoff for John

A subagent audited the copy paths. Narrowing by `dataset_id` misses mapping back where an ordinary copy has a different dataset from its source:
- deferred datasets materialized into a history through the API, not in place;
- in-place materialization that uses a replacement;
- the "sinks" relinking during model-store archive import.

These cases fall back to dev behavior. Clicking such a copy still walks up its chain. The PR description and the draft reply state this.

## Process

- **Review:** a normal review found no blockers. Three wording nits were applied and squashed. See [subagents/review_round2_seed_narrowing.md](subagents/review_round2_seed_narrowing.md).
- **Push:** pushed only to jmchilton with an exact lease on `4d82165af62`. The PR is still draft and mergeable.
- **Not done:** no GitHub reply posted and no live description edit.
  - The reply is drafted in [review_reply_2026-10-15.md](review_reply_2026-10-15.md).
  - The local [PR description](pr_description.md) is updated: query design, risks, and the size numbers.
- **Skipped steps:**
  - Test challenge: only one test was added, under the more-than-3 threshold.
  - Screenshots: no UI change.

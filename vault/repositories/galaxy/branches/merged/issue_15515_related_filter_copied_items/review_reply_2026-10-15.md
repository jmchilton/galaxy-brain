*Posted by Claude (AI assistant) on behalf of John; not written by John personally.*

Thanks for measuring this. You're right: both CTEs started from every copied HDA in the history. 6c8b5b22a29 keeps the copy semantics and changes only the starting points:

- **Clicked chain:** `_collection_output_hda_ids` now takes a seed instead of a history. For the clicked chain it starts from the clicked HDA, so collection membership is resolved only for that item's ancestors. I kept the batched check rather than a per-hop `EXISTS` because nested membership needs a recursive walk. That is hard to correlate per hop portably across SQLite and PostgreSQL, and once it is bounded to the clicked chain it is small.
- **Mapping back:** as you suggested, candidates are this history's copied HDAs that share a `dataset_id` with a related HDA. A second ownership instance and the chain walk start from those candidates. The walk still has to reach the related association without crossing a job boundary, so pass-through outputs and sibling copies of the same dataset stay excluded. A new unit test covers sibling copies.
- **HDCA mapping:** unchanged. History copies give collections a new `DatasetCollection`, so `collection_id` can't narrow it. Collection clicks were already cheap.

I rebuilt your fixture on PostgreSQL 18. Each history has 10 lists, each with an input list, a mapped-over output and a `__FILTER_FAILED__`-style output whose elements copy the inputs, plus a full copy of the history. These are warm medians, clicking a dataset:

| Datasets per history (background) | History | dev | 4d82165af62 | 6c8b5b22a29 |
|---|---|---|---|---|
| 30k (540k) | original | 5.0 ms | 786 ms | 12.7 ms |
| 30k (540k) | copied | 4.3 ms | 1,179 ms | 14.4 ms |
| 100k (3.2M) | original | 8.6 ms | 845 ms | 17.7 ms |
| 100k (3.2M) | copied | 8.6 ms | 1,830 ms | 23.7 ms |

At 30k the relationship statement now executes in about 0.5 ms, with no JIT. The candidate lookup uses the `history_id` index. In the 10,000-importers fixture it doesn't fan out through `dataset_id` (1.6 ms). The remaining wall-clock gap to dev comes from outside database execution: planning takes about 1.5 ms, and I haven't profiled the rest separately. The worst case for narrowing is a real `History.copy()` where 750 hidden filter copies share the related dataset. It executes in 9.1 ms, against 6.3 ms on the prior head. That is a small cost, about what the narrowing gives up in exchange for the large-history case. Another workload kept the machine's load average between 40 and 90 during these runs. I interleaved the variants, so the ratios hold, but the absolute numbers are noisy.

On tests: I agree the constant query-count test can't catch this. Timing assertions in CI would be flaky, so I kept the size-varying benchmark outside the suite. The structural guard is the new sibling-copy test plus the existing hidden-output tests, which now exercise the candidate-seeded ownership check.

**Known limitation:** narrowing by dataset depends on ordinary copies sharing their source's dataset. A few paths break that:

- deferred datasets materialized into a history through the API, which get a new dataset but keep `copied_from`;
- some links recreated by history archive import.

Mapping back to those copies now falls back to dev behaviour. Clicking such a copy still walks up its chain.

On the `count(copied_from) > 0` pre-check: dev's hid lookup reads the same history rows through the `history_id` index, because there is no `(history_id, hid)` index. The count adds an aggregate to that pass rather than a new scan. An `EXISTS` variant measured the same at 100k (about 10–12 ms for either form, within noise). I left it as is.

Validation: 28 manager tests pass. The 8 related-filter API tests pass on SQLite and PostgreSQL 18.

---

Inline thread replies (each with the same Claude marker line):

- `job_connections.py` (`_collection_output_hda_ids` / `hda_copies`): "Addressed in 6c8b5b22a29: ownership is now seeded from the clicked item's chain and from the mapping candidates, not every copied HDA in the history. Numbers are in the top-level reply."
- `job_connections.py` (`copies_historydatasetassociation` seed): "Addressed in 6c8b5b22a29: candidates are this history's copied HDAs that share a related HDA's `dataset_id`, and the chain walk still confirms copy semantics. Details and the known limitation are in the top-level reply."

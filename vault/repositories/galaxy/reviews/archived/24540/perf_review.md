# PR #24540 performance review

Profile: ad-hoc performance analysis (requested by John)
Model: Opus 5.5 (claude-opus-5-5), effort high
Reviewed commit: `613265a0d2f0ed31a93d2487ce9e9fd9b3796284` (merge-base with `origin/dev`: `11b5df98451`)

## Verdict

**Negligible.** No P-labeled findings.

The PR adds one projected column, `history_dataset_association.purged`, to the two existing
per-collection summary queries. There are no new joins, subqueries, predicates, or ORDER BY terms,
and no new queries on any path. Query count is unchanged on every caller, because `elements_purged`
reads the same per-object cached summary as `elements_deleted`, `elements_states`, and
`elements_datatypes`. The client makes no new fetches.

The measured cost is about 0.3 µs per leaf element (SQLite, 10k-element list: about 3 ms on top of
about 40 ms). That cost is inside an already O(leaves) query that the history panel runs once per
HDCA. The PR's "no extra query" claim is accurate. One wording nit: the "count" is a Python loop
over rows, not a SQL aggregate.

## 1. SQL before vs after

Both summaries come from `DatasetCollection._build_nested_collection_attributes_stmt`, which the PR
does not touch. The PR changes only the `hda_attributes` argument:

| Caller | Before `hda_attributes` | After |
|---|---|---|
| `DatasetCollection.dataset_states_and_extensions_summary` | `_metadata, extension, deleted` | `+ purged` |
| `HDCA.dataset_dbkeys_and_extensions_summary` | `_metadata, extension, deleted` | `+ purged` |

I compiled both versions with the PR's builder, using the base and PR argument tuples, for `list`,
`list:paired`, and `list:list:list`, on the SQLite and PostgreSQL dialects. For PostgreSQL I forced
the ARRAY-walk branch by faking `object_session().bind.dialect.name`. In all 12 combinations the
**only** textual delta is in the SELECT list:

```diff
-SELECT history_dataset_association.metadata AS _metadata, history_dataset_association.extension AS extension, history_dataset_association.deleted AS deleted, dataset.state AS state
+SELECT history_dataset_association.metadata AS _metadata, history_dataset_association.extension AS extension, history_dataset_association.deleted AS deleted, history_dataset_association.purged AS purged, dataset.state AS state
```

The HDCA variant has the same delta, followed by `dataset.object_store_id, dataset.create_time`.

Representative after-SQL, PostgreSQL `list:paired` (ARRAY walk):

```sql
SELECT history_dataset_association.metadata AS _metadata, history_dataset_association.extension AS extension,
       history_dataset_association.deleted AS deleted, history_dataset_association.purged AS purged, dataset.state AS state
FROM dataset_collection_element AS dataset_collection_element_1
  JOIN history_dataset_association ON history_dataset_association.id = dataset_collection_element_1.hda_id
  JOIN dataset ON dataset.id = history_dataset_association.dataset_id
WHERE dataset_collection_element_1.dataset_collection_id = ANY (array((
  SELECT dataset_collection_element_2.child_collection_id FROM dataset_collection_element AS dataset_collection_element_2
  WHERE dataset_collection_element_2.dataset_collection_id = 2)))
ORDER BY (SELECT dataset_collection_element_3.element_index FROM dataset_collection_element AS dataset_collection_element_3
          WHERE dataset_collection_element_3.child_collection_id = dataset_collection_element_1.dataset_collection_id LIMIT 1),
         dataset_collection_element_1.element_index
```

Flat lists, and nested collections on SQLite, use the plain `dc JOIN dce [LEFT JOIN dce ...] JOIN hda
JOIN dataset WHERE dc.id = ? ORDER BY element_index...` form. The only change there is the same
SELECT-list column.

- **Joins:** none new. HDA and `dataset` were already inner-joined, because `deleted`, `_metadata`,
  and `state` were already selected.
- **GROUP BY, aggregates, CASE, FILTER:** none, before or after. The query returns one row per leaf
  and Python counts the rows.
- **`HDA.purged` vs `Dataset.purged`:** the query uses `history_dataset_association.purged`. That is
  the right column for "this history's copy is gone":
  - It matches what the history panel already shows per dataset. `dictify_element_reference` emits
    `element_object.purged`, the HDA column, for leaf elements. The HDA serializer's `purged` is also
    the HDA column.
  - `Dataset.purged` flips only after every association is purged, so it would under-report purges
    of a shared dataset in a copied collection.
  - The three adapters in `adapters.py` also use `hda.purged`, so the SQL and adapter paths agree.
  - Pre-existing asymmetry, not introduced here and not a finding: the adapters compute `deleted` as
    `hda.deleted or hda.dataset.deleted`, while the SQL path uses only `hda.deleted`.

## 2. Call paths and frequency

Neither summary property is batched across items. Each HDCA or DatasetCollection object runs its own
query and caches it in an instance attribute (`_dataset_dbkeys_and_extensions_summary` /
`_dataset_states_and_extensions_summary`). Nothing else pre-populates those attributes. This N+1
pattern predates the PR, and the PR does not change its query count.

| Path | Summary used | Queries per request | Change |
|---|---|---|---|
| History panel `GET /api/histories/{id}/contents?v=dev&offset&limit=100` (default `summary` view, `historyItemsStore.ts`) | HDCA summary via `HDCASerializer` | 1 per HDCA on the page (≤100), shared by `elements_datatypes/states/deleted/purged`, `store_times_summary` | +1 column; same count |
| Same endpoint with explicit `keys=...elements_purged` | HDCA summary | 1 per HDCA, the same query `elements_deleted` alone would trigger | none |
| HDCA detail/element views via `dictify_dataset_collection_instance` → `HDCA.to_dict` → `_base_to_dict` | DC summary via `collection.elements_*` | 1 per HDCA, already triggered by `elements_datatypes` on the line above | none; `elements_purged` hits the cache |
| Drilldown `GET /api/dataset_collections/{hdca}/contents/{parent}` (`recursive=False`, paginated) | DC summary per child collection on the page | 1 per sub-collection element | +1 column; same count |
| `element-reference` view (`recursive=True`, fuzzy-count bounded) | DC summary per visited sub-collection at every level | 1 per visited sub-collection | +1 column; same count |
| Tool form collection matching (`dataset_matcher.py:223`), job input checks (`tools/__init__.py:3885`), tool action conversion (`tools/actions/__init__.py:340`) | DC summary | 1 per candidate or input collection | +1 unused column; same count |
| `get_converters_for_collection` (`managers/collections.py:422`) and the legacy `to_dict(view="dbkeysandextensions")` | HDCA summary | 1 | rename only |

Every in-repo consumer uses attribute access (`summary.states`, `.extensions`, ...). I grepped the
whole worktree, `test/` included and `node_modules` excluded, for positional
`extensions_summary[` indexing and tuple unpacking. Nothing remains. The HDCA tuple growing from 5
to 6 fields, with `store_times_summary` moving from index 4 to index 5, therefore cannot silently
misread anything in-tree. The `HDCAStateSummary` NamedTuple prevents that class of bug going
forward.

## 3. Indexes and scaling

- `purged` appears only in the SELECT list, not in any WHERE, JOIN, or ORDER BY clause, so no index
  is involved. The existing `ix_history_dataset_association_purged` is irrelevant here.
- **SQLite `EXPLAIN QUERY PLAN` is identical before and after**, for both a flat 10k list and a
  100×100 `list:list`:
  - `dataset_collection` PK
  - `ix_dataset_collection_element_dataset_collection_id`, once per level
  - HDA PK, dataset PK
  - `TEMP B-TREE FOR ORDER BY`
- **PostgreSQL:** no server is available locally (only the libpq client), so I made the following
  argument instead of running `EXPLAIN`.
  - The HDA heap tuple is already fetched by PK, because `metadata` is selected. That already ruled
    out an index-only scan, so the plan shape cannot change.
  - `purged` is a 1-byte bool stored inline in the main tuple, not in TOAST.
  - The only plan-visible effect is about 1 byte of extra width on the Sort node's input rows. Those
    rows are dominated by the `metadata` blob, typically hundreds of bytes to a few KB. In theory
    this could tip a borderline sort past `work_mem`, but the change is well under 1% of row width.
- **Scaling** is unchanged in shape: O(leaf elements) per summary, times the number of HDCAs or
  sub-collections serialized. 10k-element lists and nested `list:list` cost what they did before,
  plus the constant per-row overhead measured below.

## 4. Python-side cost

The per-row additions are one more Row column and one `if row.purged` check. Each summary already
deserializes the `_metadata` JSON for every row, and that remains the dominant per-row cost.

Interleaved before/after benchmark: SQLite in memory, 50–60 alternating reps, median, full
query + loop. These numbers are a relative signal only, not a production measurement.

| Collection | Summary | Before (median) | After (median) |
|---|---|---|---|
| flat list, 10k | DC | 39.4 ms | 43.0 ms |
| flat list, 10k | HDCA | 43.2 ms | 46.0 ms |
| list:list 100×100 | DC | 40.0 ms | 42.8 ms |
| list:list 100×100 | HDCA | 43.9 ms | 46.9 ms |

Splitting the roughly 3 ms per 10k delta: about 1 ms comes from fetching the extra column and about
2 ms from the Python attribute check. Run-to-run spread was ±2 ms on minimums, and p90 was
dominated by GC/OS noise near 115–125 ms for both versions.

Real `metadata` blobs are much larger than my 17-byte fixture, and production PostgreSQL adds
network round-trip time. Both shrink the PR's relative share well below the roughly 7% seen here.

- **Eager loading:** unchanged. **Lazy loads:** none added on the session paths.
- `DatasetCollection.elements_purged` has a sessionless fallback that walks `self.dataset_instances`
  in memory. It is used only by detached objects, such as remote tool evaluation. It adds one more
  O(n) in-memory walk next to the three sibling properties that already do the same. No DB access is
  possible there.
- Cached properties: no invalidation changes. `elements_purged` gets its own `_elements_purged`
  cache, like its siblings.

## 5. Client

- No new requests. `elements_purged` arrives in the existing contents and drilldown payloads, at
  about 20 bytes of JSON per HDCA.
- `ContentItem.vue` adds an `isPurged` `computed()`, and `CollectionDescription.vue` adds
  `deletedCount` and `purgedCount` computeds. Each builds a `DatasetStateSummary` or reads the
  existing one. The work is O(number of distinct states), usually 1–5 keys, per rendered item, and
  only for virtual-scroller-visible rows. It reruns only when the item prop changes. This is
  negligible.

## Optional, pre-existing (not findings; not introduced by this PR)

- The history panel's per-HDCA summary is the real cost center: up to 100 queries per page, each
  O(leaves), each shipping every leaf's `metadata` blob to Python just to read `dbkey`. Moving the
  counts into SQL (`COUNT(*) FILTER (WHERE hda.deleted)`, `... purged`, `GROUP BY state`) or
  batching across HDCAs would be a large win. The `dbkey`-from-JSON extraction makes that a separate
  refactor, and this PR is not the place for it.
- `HDCA.to_dict(view="dbkeysandextensions")` calls `.pop()` on the cached `dbkeys` and `extensions`
  sets, which mutates the cached summary. The PR only renamed these lines; the behavior is
  unchanged. This is a correctness nit, not a performance issue.

## Method

Throwaway venv at `/private/tmp/claude-503/pr24540-perf/.venv` with the pinned requirements and the
worktree's `lib` on `PYTHONPATH`. Scripts are in the same directory: `render_sql.py` (SQL rendering,
`EXPLAIN`, fixture), and `bench2.py` and `bench3.py` (interleaved timings). No Galaxy server or API
tests were run, and the worktree was not modified.

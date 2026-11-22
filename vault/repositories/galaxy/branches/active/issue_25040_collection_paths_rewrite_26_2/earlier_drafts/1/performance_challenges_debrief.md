Run via Claude Opus 5.5 at high effort.

# Performance challenge debrief

The branch adds no SQL and drops one redundant batched query. It did regress repeated metadata-file access, though. Every `all_metadata_files`, `serialize()` or `element_identifiers_extensions_paths_and_metadata_files` access reloaded each metadata file with one query, and repeated the compute environment rewrite and Pulsar's INFO log line. `serialize()` paid this twice per call. This is fixed in place in `df635626f44`: `DatasetFilenameWrapper.all_metadata_files` is now a `cached_property`, `data_collection_input_to_staging_path_and_source_path` builds the rows once, and a unit test checks that metadata files are loaded and rewritten once per wrapper. The "Baseline tests" commit is still first.

## Measurements

Script: `/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/c004b6a4-a500-42b4-a346-fa925c0e1502/scratchpad/bench_collection_paths.py`. It uses in-memory sqlite and the real model mapping. The collection is `list:paired`: each forward element is a `bam` with a real `bam_index` `MetadataFile`, and each reverse element is a `txt`. The compute environment is a real `PulsarComputeEnvironment` with a real `PathMapper` and a `transfer` default action. It is built with `object.__new__`, which skips the job wrapper. Queries are counted with a `before_cursor_execute` hook, and INFO lines from `galaxy.jobs.runners.pulsar` are counted too. The three trees compared are base (`origin/release_26.2`), branch HEAD before the fix (`ba7f4c7d9b5`), and the fix (`df635626f44`). Timings are from in-memory sqlite, so on a real database only the query counts carry over, and the latency per query will be higher.

N=5000 pairs (10,000 datasets, 5,000 metadata files), Pulsar:

| step | base | before fix | after fix |
|---|---|---|---|
| constructor (pre-existing) | 12.6 s / 40,002 q | 12.8 s / 40,002 q | 12.5 s / 40,002 q |
| `all_paths` 1st | 2.15 s / 5,001 q | 22 ms / 0 q | 22 ms / 0 q |
| `all_paths` 2nd | 1 ms / 0 q | 20 ms / 0 q | 16 ms / 0 q |
| `all_metadata_files` 1st | 0 q (cached by `all_paths`) | 2.13 s / 5,000 q / 5,000 logs | 2.16 s / 5,000 q / 5,000 logs |
| `all_metadata_files` 2nd | 0 q | 2.03 s / 5,000 q / 5,000 logs | 7 ms / 0 q |
| `serialize()` (each call) | 22-25 ms / 0 q | 4.2 s / 10,000 q / 10,000 logs | 57-62 ms / 0 q |
| template doing 3x `zip(all_paths, all_metadata_files)` | 6 ms / 0 q | 6.2 s / 15,000 q / 15,000 logs | 67 ms / 0 q |
| `data_style="paths"` | 0.5 ms | 20 ms / 0 q | 15 ms / 0 q |
| metadata files registered for Pulsar staging | 0 (the bug) | 5,000 | 5,000 |

N=100 gives the same shape. Base `all_paths` costs 101 queries the first time. Before the fix, `serialize()` cost 200 queries on every call. After the fix, the only queries are the 100 on the first metadata access.

## Findings

1. **Repeated accessors re-queried every metadata file (fixed).** `HDA.get_metadata_file_paths_and_extensions()` resolves each `FileParameter` through `FileParameter.wrap`. For uuid-keyed metadata, which is the modern default, that is a `select ... where uuid=` that the identity map can't answer, so each call cost one query per metadata file. The old model property paid this once and cached it on the wrapper. The branch paid it on every access, and twice in `serialize()`, because `data_collection_input_to_staging_path_and_source_path` evaluated the row property twice. The fix caches per `DatasetFilenameWrapper`. That covers the collection accessors, single-dataset `serialize()`, and collection elements shared between accessors. The cache is safe because a wrapper's `compute_environment` and dataset are fixed at construction, and the Pulsar rewrite is deterministic and idempotent. `$input.metadata.<name>` already caches the same way through `MetadataWrapper.__getattr__`'s `setattr`.
2. **Path-only accessors got cheaper.** `all_paths` and `<inputs data_style="paths"/>` used to cost N+1 queries the first time: the nested-collection query plus every metadata file. Now they cost 0, because `false_path` is computed once in each `DatasetFilenameWrapper.__init__`. Nothing is cached at the collection level, so each call does a Python walk: about 20 ms at 10k datasets, against about 1 ms for the base's cached list. That is negligible next to the constructor, so I left it uncached.
3. **The batched query was redundant, so dropping it costs nothing.** The wrapper constructor already loads every element, HDA and dataset: 8 queries per pair here, 40,002 at N=5000, 12.5 s on sqlite. The old property issued one extra query to re-read rows already loaded. This per-element constructor cost is the real scaling problem for collections with tens of thousands of elements. It predates this branch and is out of scope. It comes from lazy-loading `collection.elements`, `element_object`, `hda.dataset` and `tags` for each element, plus `columns`. A follow-up could eager-load these with `selectinload` before wrapping.
4. **Pulsar does per-call work and logs at INFO (not changed; speculative impact).** `PulsarComputeEnvironment.input_metadata_rewrite` does not consult `path_rewrites_input_metadata` before calling `path_mapper.remote_input_path_rewrite`. That call runs the action mapper's path matching, which can mean regex or glob scans of the configured `paths`. It then logs one INFO line per call. After the fix, this happens once per metadata file per wrapper, which matches what `$input.metadata.bam_index` in a `#for` loop already did on base. For a 10k-element BAM collection, that is about 10k INFO lines per job. Each line corresponds to a file Pulsar will transfer, so the transfers dominate, but logs can grow. Recommendation for a separate change: lower that line to `debug` and return early from the dict. I didn't change `pulsar.py` because the behaviour predates this branch and operators may grep for that line.
5. **Memory.** The cache keeps one small list of tuples per dataset wrapper for the lifetime of the job evaluation. That is tiny next to the wrappers and ORM objects already held. No unbounded query is added; one is removed.
6. **The patterns checklist doesn't apply otherwise.** There are no API endpoints, no client polling, no ORM flush loops, no CTEs, and no async handlers in this change.

## Not acted on

- The constructor's 8 queries per pair predate this branch and are out of scope (finding 3).
- The Pulsar INFO log and the missing rewrite memo predate this branch (finding 4).
- Collection-level memoization of `all_paths` and the row list isn't worth it (finding 2).
- Not measured on Postgres or a production-size database. The query counts are what transfers, and the absolute timings are sqlite-only.

## Validation

- `PYTHONPATH=lib pytest -p no:postgresql test/unit/app/tools/test_wrappers.py`: 38 passed, including the new `test_collection_wrapper_metadata_files_are_loaded_and_rewritten_once`.
- ruff, black and isort are clean on the touched files. mypy reports no errors on the changed lines; the errors it does report on these files are pre-existing ones.

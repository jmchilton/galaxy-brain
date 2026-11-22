Run via Claude Opus 5.5 at high effort.

# Performance challenge debrief (round 2, after the re-scope)

Round 1's conclusions still hold at head. The branch adds no SQL and drops one redundant batched query. Metadata files are loaded and rewritten once per dataset wrapper, and `serialize()` and repeated template access cost no queries. The re-scope changes added no query and no per-call database work: the once-per-call collection name segment, the input-only rewrite guard, the parallel identifier list, and the tuple cache.

This round found one new, smaller regression and fixed it in place. Because nothing is cached at the collection level, a template that indexes `$input.all_paths[$i]` or `$input.all_metadata_files[$i]` inside a loop re-walks the nested collection and recomputes every element's path on each access. That costs no queries, but it is quadratic with a large constant: 33x slower than base for `all_paths` at 2,000 datasets. The fix is new commit `d0a2d77b062`, which caches the flattened `(identifiers, element, path)` rows per collection wrapper and returns a fresh list on each call. It adds `test_collection_wrapper_paths_are_computed_once`. I also folded one assertion into `765f0a5f43e`'s caching test: path-only accessors (`all_paths`, `get_all_staging_paths`) never load metadata files. The "Baseline tests" commit is still first.

Head: `d0a2d77b062` (8 commits on `origin/release_26.2`).

## Measurements

Script: `/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/c004b6a4-a500-42b4-a346-fa925c0e1502/scratchpad/bench_collection_paths_r2.py`. This is round 1's script plus four things: the `include_collection_name` staging paths, the row property, an `io_type="output"` wrapper, and an optional indexed loop (`INDEXED=1`). The setup is unchanged from round 1. It uses in-memory sqlite with the real mapping and a `list:paired` collection whose forward elements are `bam` files, each with a real `bam_index` `MetadataFile`. The compute environment is a real `PulsarComputeEnvironment` and `PathMapper` with the `transfer` action. Queries and Pulsar INFO lines are counted. The trees, all exported with `git archive`, are base `4cc69d30122` (`origin/release_26.2`), head before this round `64d66d54ec3`, and head after it `d0a2d77b062`. Only the query counts carry over to a real database; the timings are from sqlite and are noisy.

N=5000 pairs (10,000 datasets, 5,000 metadata files), Pulsar:

| step | base | head before | head after |
|---|---|---|---|
| constructor (pre-existing) | 12.7 s / 40,002 q | 12.8 s / 40,002 q | 12.6 s / 40,002 q |
| `all_paths` 1st | 2.19 s / 5,001 q | 23 ms / 0 q | 27 ms / 0 q |
| `all_paths` 2nd | 1.2 ms / 0 q | 19 ms / 0 q | 0.3 ms / 0 q |
| `all_metadata_files` 1st | 0 q (loaded by `all_paths`) | 2.19 s / 5,000 q / 5,000 logs | 2.24 s / 5,000 q / 5,000 logs |
| `all_metadata_files` 2nd | 0.7 ms / 0 q | 10 ms / 0 q | 4.5 ms / 0 q |
| `serialize()` (each call) | 22-24 ms / 0 q | 59-68 ms / 0 q | 33-41 ms / 0 q |
| template 3x `zip(all_paths, all_metadata_files)` | 5 ms / 0 q | 78 ms / 0 q | 11 ms / 0 q |
| `data_style="paths"` | 0.5 ms | 17 ms | 0.3 ms |
| `get_all_staging_paths(include_collection_name=True)` | 30 ms | 25 ms | 20 ms |
| staging JSON with collection name | 36 ms | 54 ms | 32 ms |
| output wrapper `all_metadata_files` 1st | 5,001 q | 5,000 q, 0 staged | 5,000 q, 0 staged |
| metadata files registered for Pulsar staging | 0 (the bug) | 5,000 | 5,000 |

At this size, the row property `element_identifiers_extensions_paths_and_metadata_files` once took about 620 ms with 0 queries, at both heads. On a rerun it took 9-12 ms with GC on and 5-6 ms with GC off. The 620 ms was a one-off generation-2 GC pause across the large ORM heap, not work this code does.

Indexed loop at N=1000 (2,000 datasets), one access per element:

| pattern | base | head before | head after |
|---|---|---|---|
| `all_paths[i]` for each i | 182 ms | 5,938 ms | 104 ms |
| `all_metadata_files[i]` for each i | 182 ms | 2,882 ms | 1,083 ms |

At N=100, the head's first metadata access costs 100 queries and every later call costs 0. Base's `all_paths` costs 101 queries the first time.

## Findings

1. **Round 1's fix still holds (confirmed).** The first `all_metadata_files` access costs one query per metadata file, because uuid-keyed `MetadataFile` rows can't be served from the identity map. Every later `all_metadata_files`, row property, `serialize()` or template access costs 0. The `_job_metadata_files` tuple cache with a fresh list per call costs nothing measurable. Copying 5,000 short lists takes milliseconds.
2. **The re-scope additions add no database work (confirmed).** The collection name segment is computed once per `get_all_staging_paths` call, and the name allowance is hoisted out of the loop. The staging paths are slightly faster than base. The input-only guard keeps an output wrapper from registering anything for Pulsar staging: 0 of 5,000 registered. An output wrapper still loads its metadata files on access, one query per file, which base also does (5,001 queries). Outputs normally have no metadata files at evaluation time, so this doesn't matter in practice. The parallel identifier list is one string per element.
3. **Indexed template access was quadratic with a large constant (new; fixed in `d0a2d77b062`).** Each access to `all_paths`, `all_metadata_files`, the row property, or `get_all_staging_paths` walked the nested wrappers again and called `str(element)` on every element. Profiling at 2,000 datasets put a third of the cost in the walk and two thirds in `is_deferred`, which is evaluated inside `str()`. Base was quadratic for this pattern too, but its per-call cost was a comprehension over a cached list. The fix caches `(identifiers, element, path)` per collection wrapper, which is what the old model-backed row list effectively did. Elements, `false_path` and deferred state are fixed for the wrapper's lifetime. Every accessor still returns a new outer list, so a template that mutates what it gets can't affect later calls; the test checks this.

   `all_metadata_files[i]` in a loop is still about 6x base, because each call copies every element's small list. I left it. Base handed out shared inner lists that a template could corrupt, and this pattern is speculative. A public code search found no tool template that uses the collection `all_paths` or `all_metadata_files` at all. The only `tools-iuc` hit is an unrelated usher output named `all_paths`. These accessors are reached almost entirely through `wrapped_json` and `serialize()`, which call each one once.
4. **Pulsar logs at INFO for every metadata file (unchanged; predates the branch).** `PulsarComputeEnvironment.input_metadata_rewrite` still runs path mapping and logs one INFO line per call, without checking `path_rewrites_input_metadata` first. With the per-wrapper cache, that is one line per metadata file per job: 5,000 lines at N=5000. That matches what `$input.metadata.bam_index` in a `#for` loop already does on base. The recommendation stands for a separate change: lower the line to `debug` and return early on a dict hit.
5. **The constructor is the real scaling cost (unchanged; predates the branch).** It takes 8 queries per pair, or 40,002 at N=5000, from lazy loads of `collection.elements`, `element_object`, `hda.dataset`, tags and `columns`. Eager loading with `selectinload` before wrapping would be a separate follow-up.
6. **The rest of the patterns checklist doesn't apply.** The change has no API endpoint, no client polling, no flush loops, no CTEs or joins, and no async handlers. No unbounded query is added, and one is removed.

## Not acted on

- `all_metadata_files[i]` in a loop is still about 6x base (finding 3). Closing that gap means caching nested lists and either sharing them, which is mutation-unsafe like base, or deep-copying them, which costs the same as now. The pattern is speculative.
- The Pulsar INFO log and the rewrite memo predate the branch (finding 4).
- The constructor's per-pair queries predate the branch and are out of scope (finding 5).
- Nothing was measured on Postgres or a production-size database. Only the query counts transfer.

## Validation

- `PYTHONPATH=lib pytest -p no:postgresql test/unit/app/tools/test_wrappers.py` passes at every commit: 38, 38, 38, 38, 39, 40, 41 and 42 tests. The new test fails without `d0a2d77b062`'s wrapper change. A mutation that routes `all_paths` back through the row property fails the strengthened caching test.
- ruff, black and isort are clean on the touched files. `cd lib && ../.venv/bin/mypy . ../test` reports no issues in 2,612 files.
- Nothing has been pushed.

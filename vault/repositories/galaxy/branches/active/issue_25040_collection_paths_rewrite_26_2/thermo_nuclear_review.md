Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review (round 2, after the re-scope)

I reviewed `d0a2d77b062` against `origin/release_26.2` fresh. The branch passes the approval bar. The question for this round was whether the caches added since round 1 form one design or a pile of patches. They form one design with two layers, and each cache lives on the object that owns its data:

- `DatasetFilenameWrapper._job_metadata_files` caches one dataset's metadata files, loaded and rewritten once.
- `DatasetCollectionWrapper._dataset_rows` caches the flattened collection, with each dataset's identifiers, element wrapper and path.

Every public accessor (`all_paths`, `all_metadata_files`, the row property, `get_all_staging_paths`, and through them `serialize()` and `data_style="paths"`) derives from these two and hands out fresh lists. No file crosses 1,000 lines: `wrappers.py` is at 957 (902 on base). No conditionals were added to unrelated flows.

I acted on one finding. The collection layer still had two members for one concept. `_dataset_elements_with_identifiers` was a recursive generator that threaded `parent_identifiers` down the tree, and `_dataset_rows` wrapped it to add `str(element)`. The rows were also an anonymous `tuple[tuple[tuple[str, ...], DatasetFilenameWrapper, str], ...]` that every accessor unpacked by position (`for _, _, path in ...`, `for _, element, _ in ...`).

- `_dataset_rows` now recurses itself. It extends with each child collection's own cached rows, prefixing the child's identifier. The generator and its `parent_identifiers` parameter are gone.
- The rows are a private `_DatasetRow(identifiers, element, path)` NamedTuple. The accessors read `row.path`, `row.element` and `row.identifiers`.

Output is unchanged. A nested child wrapper (`$input.sample1`) now caches its own rows, and the parent reuses them. The change is a fixup into `d0a2d77b062`; the new head is `b36849cea7d`, and the earlier commits weren't touched. The "Baseline tests" commit is still first.

## Not acted on

- **The parallel `__element_identifiers` list.** It is still needed. Reading identifiers off the children would either trip `consumes_identifiers` through `element_identifier` or reach into `_element_identifier`. Pairing the two lists would mean churn in `__iter__`, `__getitem__`, `has_single_item` and `__bool__`. This is round 1's call, and nothing has changed it. The comment explains why the dict isn't enough.
- **`all_metadata_files` + `_job_metadata_files` on the dataset wrapper.** This is two members for one concept, but deliberately so: an immutable cached tuple, with a fresh list on each access, so a template can't corrupt the cache. Passing `None` as the compute environment for outputs is a little terse, but it is commented and keeps a single expression. Left as is.
- **Caching the path on the element instead of in the row.** This would make the row `(identifiers, element)` and match how metadata is cached. But the dataset wrapper's `__str__` backs `#for $e`, command lines and `paths_as_file`. Caching it would change those paths on a release branch for no gain here.
- **Unconditional `max_len >= 1` assert in `get_all_staging_paths`.** Dropping the `if include_collection_name` guard would remove a branch, but it adds an assertion where base had none. It differs only for extensions of 254 characters or more, which is unreachable but still a behavior change. Kept as base had it.
- **Public row shape `list[list[Any]]` stays.** Cheetah templates outside this repository may index into it. `_DatasetRow` now covers the internal side.
- **Pre-existing, recorded only:**
  - The collection extension alias is computed through `datatypes_registry`, and `DatasetFilenameWrapper.file_ext` computes it through `unsanitized.datatype` plus a safe-string-wrapped extension. These are two routes to one value, and they can disagree.
  - `DatasetCollectionWrapper.get_datasets_for_group` builds new wrappers from the model instead of reusing the element wrappers. Its cache test (`if not cache.get(group)`) also recomputes groups that matched nothing.
  - The per-identifier name-length allowance is stale, as round 2's review noted.
  - The Pulsar INFO log fires on every metadata rewrite, and the constructor runs per-pair queries (see the performance debrief).

## Validation

- `PYTHONPATH=lib pytest -p no:postgresql test/unit/app/tools/test_wrappers.py`: 42 passed at the head. Only the last commit changed, so the other commits keep their earlier results.
- `test/integration/test_pulsar_embedded_rewrite_parameters_input_paths.py`: 1 passed.
- `test/integration/test_remote_files.py`: `test_export_remote_tool_nested_collection_with_collection_name` and `test_export_remote_tool_collection_structure` passed. Both use nested `list:list` rows through the new recursion under remote tool evaluation.
- ruff, black and isort are clean. `cd lib && ../.venv/bin/mypy . ../test`: no issues in 2,612 files.

<details>

## Full review

### 1. Structural regressions

None. Since round 1, the branch moved the collection walk from a SQL query in the model to the wrapper tree. The wrapper tree already owns the compute environment, so `all_paths`, `serialize()` and `#for $e in $collection` agree by construction. Round 2 added nothing that breaks this. The input-only guard sits inside the per-dataset cache, and it is the only place that guard can live without a new flag.

### 2. Code-judo

- **Done:** the generator plus cached wrapper became one recursive cached property built on the children's caches, and the anonymous triple became a named row. Readers now hold one concept, "the rows", instead of three: a generator, a cache, and positional tuple slots.
- **Considered, rejected:** building rows at construction time. This would make `_dataset_rows` a plain attribute. But it would call `str(element)` (and `is_deferred`) for every element of every collection input, even when a template never reads the path accessors. Laziness is what keeps "paths-only accessors are cheap" and "unused accessors are free" true together.
- **Considered, rejected:** routing `wrapped_json.data_collection_input_to_staging_path_and_source_path` through `_dataset_rows` directly instead of the public row property. That would reach a private member across modules to save one list build per `serialize()` call.

### 3. Spaghetti / branching

`get_all_staging_paths` became flatter. The collection name segment and the length allowance are hoisted out of the loop, and the inner loop is now a comprehension. The one remaining `if include_collection_name:` around the assert is base behavior (see Not acted on). `_dataset_rows` has one type dispatch, nested collection versus dataset, which is the shape of the data.

### 4. Boundaries and types

- `_DatasetRow` replaces the nested anonymous tuple type.
- `_job_metadata_path` gives `MetadataWrapper.__getattr__` and the bulk accessor one rewrite rule. Codex's suggestion of a shared per-file memo was turned down in its own debrief, and I agree: Pulsar deduplicates by source path.
- The public `list[list[Any]]` row property is unchanged on purpose.

### 5. File size

`wrappers.py` is at 957 lines, up from 902 on base and under 1,000. `wrapped_json.py` shrank. `test_wrappers.py` is at 689.

### 6. Caching coherence (the round's focus)

| Cache | Owner | Holds | Invalidation |
|---|---|---|---|
| `_job_metadata_files` | dataset wrapper | metadata `(ext, path)`, rewritten for inputs | none needed: dataset, io_type and compute environment are fixed at construction |
| `_dataset_rows` | collection wrapper (each level) | identifiers, element wrapper, `str(element)` | none needed: elements, `false_path` and deferred state are fixed at construction |
| `_dataset_elements_cache` | collection/list wrapper | group-tag lookups (pre-existing) | n/a |

The first two are immutable tuples behind accessors that copy, so the earlier contracts hold. Repeated identifiers are kept, because rows come from the parallel list rather than the dict. Fresh lists are handed out on every call. Paths-only accessors never touch `_job_metadata_files`. Metadata is loaded and rewritten once per dataset. Flat-list staging output is unchanged, which the baseline test `test_collection_wrapper_staging_paths_with_the_collection_name` pins. The pre-existing `_dataset_elements_cache` name now sits beside `_dataset_rows`. It's a slightly confusing neighbour, but renaming it is unrelated churn.

### 7. Tests

The unit tests check behavior rather than structure. The caching tests count calls on the real seams (`get_metadata_file_paths_and_extensions` and `_path_or_uri`), so they survived this restructure unchanged, which is good evidence they aren't coupled to the implementation.

</details>

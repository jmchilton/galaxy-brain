Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review

Reviewed `32b065a1174` against `origin/release_26.2`. The branch passes the approval bar. It deletes more structure than it adds: the model's duplicate SQL walk of the collection (32 lines plus its sessionless fallback) and the wrapper's result cache are gone. Every path accessor now reads the element wrappers the collection already builds, so `all_paths`, `serialize()` and `data_style="paths"` agree with `#for $e in $collection` by construction. No file crosses 1,000 lines (`wrappers.py` is at 935), and no special-case branches were added to unrelated flows.

I acted on one finding. `data_collection_input_to_staging_path_and_source_path` transposed the rows with `zip(*rows)`, needed an empty-collection branch for that, then zipped everything back together. It now pairs each staging path with its row in one `zip`, and the empty branch is gone. The `{staging_path}.{ext}` metadata-file layout was written out twice, once for single datasets and once for collections. Both builders now share `_metadata_files_to_staging_path_and_source_path`, which unpacks `(ext, path)` by name instead of `mf[0]`/`mf[1]`. The output is unchanged, and the unit test that compares the full `serialize()` output still passes. Commit `cb4e8562bbf`, which is the new head. The "Baseline tests" commit is still first and wasn't touched.

## Not acted on

- **Parallel `__element_identifiers` list next to `__element_instance_list`.** Two parallel lists are usually a smell, and one list of `(identifier, wrapper)` pairs would read better. This list was a deliberate fix from the Codex review (repeated identifiers), though, and `__element_instance_list` also backs `__iter__`, `__getitem__` and `has_single_item`. Merging the two would mean churn in all of those for a cosmetic gain. Reading `_element_identifier` / `name` off the child wrappers would remove the list entirely, but it would reach into another class's private state. Kept as is.
- **The `all_metadata_files` + `_job_metadata_files` pair.** This is two members for one concept. The pair is deliberate: the cache holds a tuple and each access returns a fresh list, so templates can't mutate cached state. The comment explains why. Kept.
- **The `element_identifiers_extensions_paths_and_metadata_files` row shape (`list[list[Any]]`).** A NamedTuple would be clearer. The property is public, though, and Cheetah templates outside this repository may index into its rows. Changing the shape on a release branch isn't justified.
- **`get_all_staging_paths` reads the extension through the wrapper's registry, while `DatasetFilenameWrapper.file_ext` reads it through `unsanitized.datatype`.** Two routes compute the same alias. This predates the branch, and unifying them could change staging names when the two registries disagree. Out of scope.
- **`get_all_staging_paths(include_collection_name=True)` on nested collections (pre-existing, possible bug).** From reading the code, the collection-name prefix is applied at every identifier level, so a `list:paired` gives `input1/sample1/input1/forward.bam`. The same code is on the base, and the branch only changed where the identifiers come from. Not fixed, because it changes behavior and is outside #25040. It may be worth its own issue after checking it with a test.
- **The `sample_datatypes_registry` test fixture sets the global `model` datatypes registry without restoring it.** This matches the common pattern in Galaxy unit tests, and the registry is a sample registry that other tests also install. The fixture lives in the baseline commit, so changing it would need a fixup and rebase for no behavior gain.
- **`_job_metadata_path` is a module-level helper rather than a `ComputeEnvironment` method.** The `None` means "not rewritten" fallback is the caller's policy, and the helper has two real callers (`MetadataWrapper.__getattr__` and `_job_metadata_files`). Moving it onto the abstract base would widen a shared interface on a release branch. The explicit `str | None` annotation stays, because `input_metadata_rewrite` is untyped.

## Validation

- `PYTHONPATH=lib pytest -p no:postgresql test/unit/app/tools/test_wrappers.py`: 39 passed.
- `test/integration/test_pulsar_embedded_rewrite_parameters.py` (embedded Pulsar, `rewrite_parameters: true`): 1 passed (35 s).
- ruff, black and isort are clean on `wrapped_json.py`. mypy on `wrapped_json.py` and `wrappers.py` gives 878 errors both before and after the change. These are strict-mode errors across imported modules.

<details>

## Full review

### 1. Structural regressions

None. The branch moves the collection walk from the model layer (a SQL query plus a separate sessionless fallback with the same output) to the wrapper layer. The wrapper layer already owns the compute environment and the per-element `DatasetFilenameWrapper`s. This is the canonical home: the bug was that path accessors bypassed those wrappers. Deleting `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` also removes a same-named trap that could have brought the bug back.

### 2. Code-judo opportunities

- **Done:** `data_collection_input_to_staging_path_and_source_path` unzipped its rows into four tuples, branched on the empty case, then re-zipped the tuples with the staging paths. Zipping `staging_paths` with the rows directly removes the transposition and the branch.
- **Done:** the metadata-file staging layout (`f"{staging_path}.{ext}"`) was duplicated between the single-dataset and collection builders. It is now one helper, so the convention lives in one place.
- **Considered, rejected:** building collection `serialize()` from `data_input_to_staging_path_and_source_path` for each element. The two builders differ on purpose. Collections emit the identifier tuple, the raw extension in `ext`, and nested staging directories. Single datasets emit the identifier string and the alias extension. Merging them would change the output.
- **Considered, rejected:** a single walk producing staging paths and rows together. `get_all_staging_paths` is a public accessor in its own right, and the two walks over in-memory wrappers cost nothing measurable (see the performance debrief).

### 3. Spaghetti / branching

No new conditionals in shared flows. `MetadataWrapper.__getattr__` lost a nested `if`, because the rewrite fallback moved into `_job_metadata_path`. `_dataset_elements_with_identifiers` is a small recursive generator with one type dispatch and an early return for an unsupplied input.

### 4. Boundaries and types

- The `all_metadata_files` annotation on the collection was corrected from `list[list[str]]` to `list[list[tuple[str, str]]]`.
- `element_identifiers_extensions_paths_and_metadata_files` stays `list[list[Any]]` (see Not acted on).
- The parallel identifier list is noted above.

### 5. File size

`wrappers.py` went from 902 to 935 lines (under 1,000). `model/__init__.py` shrank. `test_wrappers.py` is at 644 lines.

### 6. Modularity

`_job_metadata_path` is shared by both metadata-path routes, so `$input.metadata.<name>`, `all_metadata_files` and `serialize()` can't drift apart again.

### 7. Tests

- The baseline tests pin nested flattening, identifier tuples, the full `serialize()` dicts, the unset-collection case and repeated identifiers. These are good regression nets for the refactor above, which they exercised.
- `StagingComputeEnvironment` is a small, honest fake that records metadata rewrites, which is the behavior under test.
- The integration test compares each accessor against the `#for $e` rendering instead of hard-coding Pulsar paths, so it checks the invariant rather than the layout.
- The framework tool's `<tests>` block is a smoke check, which is acceptable because the tool exists for the integration test.

</details>

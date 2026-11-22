# Normal review

Run via Claude Opus 5.5 (inherited) at default effort, on `6d2f2cabcf4` (fix commit before review changes).

The review found no correctness, regression or security problems. I acted on the over-staging finding: `all_paths` and `get_all_staging_paths` now skip building metadata file lists, and a unit test checks they never call `input_metadata_rewrite`. I also deleted the now-unused model property `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` and its `test_galaxy_mapping` assertion, fixed the `all_metadata_files` annotation (`list[list[tuple[str, str]]]`), dropped the wrapper's result cache (building the rows is now cheap), and moved the datatypes-registry setup into a fixture. Head after changes: `7a484fe459a`.

Not acted on:

- NamedTuple for the row type: optional, and it would change the row shape `wrapped_json.py` and Cheetah templates rely on.
- Dropping `test_dataset_wrapper_metadata_files_keep_paths_the_compute_environment_does_not_rewrite`: kept as the only unit check of the `None` fallback; left for test challenges to weigh.
- `consumes_identifiers` not being set when `serialize()` embeds element identifiers in staging paths: predates the branch, out of scope.
- Integration test relying on `1.bam` producing only `bam_index`: noted; acceptable while `1.bam` indexes cleanly.

<details>

## Verdict

The fix is correct and ready. No correctness, regression or security problems. Everything below is low severity or a note.

## What was run

- `test/unit/app/tools/test_wrappers.py` passes at HEAD (39 tests).
- Red/green: the 3 baseline tests pass on pre-fix code; the 2 `*_follow_compute_environment` tests fail before the fix and pass after.
- `test/integration/test_pulsar_embedded_rewrite_parameters.py` passes (35s).
- Parity script on an in-memory sqlite session with a session-backed `list:paired`, outer elements inserted in reverse `element_index` order: old model property and new wrapper accessor give identical order, identifier tuples, extensions and paths (3 and 100 pairs).
- ruff clean; mypy strict-mode errors in `wrappers.py` all pre-existing.

## Findings

1. **Low — `all_paths` / `data_style="paths"` rewrite metadata paths for every element as a side effect** (`wrappers.py` `element_identifiers_extensions_paths_and_metadata_files`). Under `PulsarComputeEnvironment`, `input_metadata_rewrite` adds the file to `path_rewrites_input_metadata`, and each entry is staged as an `INPUT_METADATA_PATH` ClientInput (`pulsar.py:501`). A tool reading only `$bams.all_paths` on a 1,000-BAM list would transfer 1,000 unused `.bai` files and log one line per file. Low because default Pulsar mode (`rewrite_parameters: false`) already stages every metadata file of every input. Suggested: build `all_paths` from `str(element)` directly and compute metadata only for `all_metadata_files` and `serialize()`.
2. **Low — model property is now dead code** (`model/__init__.py` `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files`). Only caller left is `test_galaxy_mapping.py:196`; same name as the wrapper method, so a future caller could reintroduce the bug. `dataset_elements_and_identifiers` must stay (`has_deferred_data` uses it).
3. **Low — typing**: `DatasetCollectionWrapper.all_metadata_files` annotated `list[list[str]]` but returns `list[list[tuple[str, str]]]` (pre-existing). Optional NamedTuple for rows.

## Domain checks

- **Parity (non-rewriting path):** order, nested flattening, identifier tuples unchanged; extension still raw `hda.extension`; path matches (`HDA.get_file_name()` delegates to `Dataset.get_file_name()`); sessionless remote evaluation works (identifiers now always a tuple, previously a list there; JSON identical).
- **Intended changes, now matching `$e`:** output collections get `output_path_rewrite` paths; unmaterialized deferred elements render the source URI (only under `PartialToolEvaluator`); LDDA elements now included (old inner join on HDA dropped them); a DCE with no element object would yield a NoneDataset wrapper (theoretical).
- **Job-cache flags:** unaffected; new code never reads `element_identifier` or `name`. Pre-existing gap: `serialize()` embeds identifiers without setting `consumes_identifiers`.
- **Pulsar bookkeeping:** `path_rewrites_input_metadata` is keyed by Galaxy path; `$e.metadata.bam_index` and `all_metadata_files` register the same key and remote name. Registration happens during `prepare`, before ClientInputs are assembled, so the files are staged on a remote host.
- **Performance:** no new per-element queries. 100 pairs: constructor 802 queries (pre-existing); new accessor 0 queries; old accessor 202 on a fresh session. `HDA.dataset` is `lazy="joined"`.
- **Other bypasses:** none found. `get_datasets_for_group` and `DatasetListWrapper` pass `compute_environment` through kwargs; `$e.extra_files_path` goes through `input_extra_files_rewrite`; `serialize()` has no extra-files field.

## Test quality

- Baseline commit is tests-only and green before the fix; rewriting tests are a real red/green pair.
- `test_dataset_wrapper_metadata_files_keep_paths_the_compute_environment_does_not_rewrite` passes before and after (guard-only); could be dropped.
- `test_dataset_wrapper_metadata_file_accessors_follow_compute_environment` overlaps the integration test but is a fast red test.
- `model.set_datatypes_registry(...)` called inside tests changes global state; a fixture would be cleaner (nit).
- Framework tool assertions are smoke checks only; fine since the tool mainly drives the integration test.
- Integration test compares `COLL_ALL_METADATA_FILES` with `bam_index` only; holds because `1.bam` never gets a `bam_csi_index`. The tool also reads `$e.metadata.bam_index`, so it can't show that `all_metadata_files` alone triggers staging; equivalent because both register the same key.
- A dedicated integration file is appropriate: existing `rewrite_parameters` tests need AMQP.

## Minor

- `_job_metadata_path` is a sensible shared helper; ignores `io_type` as `MetadataWrapper` did.
- Commit messages clear; scope matches the issue table; base `release_26.2` appropriate.
- No security findings.

</details>

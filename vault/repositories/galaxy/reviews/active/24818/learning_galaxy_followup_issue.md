# Research follow-up — #24818

- Profile: learning_galaxy · Model: Claude Opus 5.5, effort medium · Reviewed commit: `efa3e7bbdaf10581dc1ffb037ec762d879dd8869`

## Stale documentation (already out of date on `dev`, before this PR)

`vault/research/Component - YAML Tool Runtime.md`:

1. **`setup_for_runtimeify` signature and return.** The note shows `setup_for_runtimeify(app, compute_environment, input_datasets)` returning `(hda_references, adapt_dataset)`, with `adapt_dataset(value)` looking up `hdas_by_id` directly. On `dev` it takes `input_dataset_collections`, `shell_quotable` and `element_identifiers`, returns `(hda_references, adapt_dataset, adapt_collection)`, and `adapt_dataset(value, extensions)` resolves implicit conversions through `find_input`, handles DCE references, sets `element_identifier`, emits `class: Directory` for directory datatypes, and leaves `path` unset for deferred datasets, which get `location` set to the source URI instead.
2. **The `build_param_dict` snippet** under "Two Paths to Runtime State" shows the two-tuple call and a `to_cwl(incoming, hda_references=..., compute_environment=...)` call. `setup_for_runtimeify` now also receives the job's collections and DCE associations, plus `shell_quotable` and `element_identifiers`. `runtimeify` takes `adapt_collections` and `yaml_origin`. `to_cwl` receives `remap(incoming, ...)` and also passes `shell_quotable` and `element_identifiers`.
3. **The `DataInternalJson` model block** lists `class_: Literal["File"]`, a required `path: str` and no `element_identifier`. On `dev`, `class_` is `File | Directory`, `path` is optional (unset for deferred datasets), and `element_identifier` exists.
4. **"Current Gaps: Collection inputs raise `NotImplementedError`".** On `dev`, `setup_for_runtimeify` returns an `adapt_collection` callback and `runtimeify` adapts collection inputs, so this gap is closed.

## Post-merge activities (if #24818 merges)

- `Component - YAML Tool Runtime.md`: document `secondaryFiles` on `DataInternalJson`, `secondary_files_json`, the evaluator's `_datasets_with_secondary_files` set shared by `runtimeify` and `to_cwl`, and the opt-in rule. Reading a metadata rewrite is what makes Pulsar stage the file, so inputs must ask for it.
- `Component - User-Defined Tools.md`: the open question "Reference data / metadata files in UDTs" is now half answered: an input that sets `secondary_files: true` exposes its indexes. Record the `secondary_files` option, the staging-not-placement semantics, and the per-dataset strictness (`[]` for unindexed formats and deferred datasets, a job-build error when an indexed format lacks its index).
- `Component - Pulsar Input Staging.md`: step 3 says `input_metadata_rewrite` is called from `tools/wrappers.py:339`. Add `tools/runtime.py` (`secondary_files_json`) as a second caller, so UDT jobs can now stage `INPUT_METADATA_PATH` inputs.
- Pending request `vault/agents/gx_research/todo/dataset_metadata_files.md`: once it is ingested, the note should cover `Data.secondary_file_suffixes` / `secondary_file_suffix()` as the datatype-level declaration of which metadata files are indexes, and the BAM CSI index stored in `bam_index`.

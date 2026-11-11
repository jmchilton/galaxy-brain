Profile: gx_test_challenger · Model: Claude Opus 5.5 · Effort: medium · Reviewed commit: efa3e7bbdaf10581dc1ffb037ec762d879dd8869

# Test challenge debrief: #24818

Review mode (REVIEW_DIRECTORY given): nothing in the PR was edited; each item below is a recommendation.

## What the PR tests

- `test/unit/app/tools/test_runtime.py`: six new tests around `secondary_files_json`, `setup_for_runtimeify`, `to_cwl` and `UserToolEvaluator._datasets_with_secondary_files`.
- `lib/galaxy_test/api/test_unprivileged_tools.py`: BAM index linked and checksummed via `/api/tools` and tool requests; `multiple`, collection (both paths), map-over (`/api/tools` only), and the "not asked / not indexed" empty-list case.
- `test/integration/test_pulsar_embedded_containers.py`: index path is under the Pulsar staging directory and its bytes match Galaxy's copy.
- `test/unit/tool_util/test_user_tool_authoring_help.py`: help examples get a stub `secondaryFiles` entry.
- New populator `get_history_dataset_metadata_file`, used by both the API and integration tests. Good reuse; no raw `metadata_file` GETs in the new tests.

## Unit test challenges

| Test | Verdict | Why |
|---|---|---|
| `test_adapt_dataset_lists_and_registers_the_index` | Keep | Pins the serialized shape (alias `secondaryFiles`, `nameroot`/`nameext`) and that the rewrite is requested. Cheap, and the shape is not asserted as a whole anywhere else. |
| `test_adapt_dataset_names_the_index_by_its_format[csi-kept-in-bam_index]` | Move | The logic is `Bam.secondary_file_suffix`; test it directly in `test/unit/data/datatypes/test_bam.py` against a real CSI index (`pysam.index("-c", ...)` on `1.bam` into `tmp_path`) instead of fake bytes threaded through `setup_for_runtimeify`. |
| `...[one-per-suffix]` | Keep | Dedup by suffix lives in `secondary_files_json`; no other layer reaches it. |
| `...[cram]` | Drop after API coverage | A dict lookup with a fake index; an API test on `2.cram` proves the metadata name is the one `CRAM.set_meta` actually populates. |
| `test_adapt_dataset_without_secondary_files[not-opted-in]`, `[datatype-without-index]` | Drop | Same behaviour as `test_run_secondary_files_empty_unless_asked_for_and_indexed`. |
| `...[deferred]` | Keep | Not reachable cheaply through the API. |
| `test_adapt_dataset_rejects_a_missing_index` | Keep | An indexed-format dataset with no index is hard to produce through the API (changing datatype re-runs `set_meta`). |
| `test_to_cwl_lists_the_index_for_user_tools_only` | Trim | `opted_in`/`opted_out` duplicate the `/api/tools` API tests; only the `secondary_file_datasets=None` (non-UDT caller, key absent) assertion is unique. |
| `test_user_tool_finds_a_converted_input_of_an_input_with_secondary_files` | Rewrite at API layer | Calls a private method with a `Bunch` tool and `Bunch` parameters standing in for real `DataToolParameter`s, relying on `visit_input_values` treating Bunches like parameters. The behaviour (implicit conversion keeps the index) is user-visible and easy to drive through the API with `1.sam` into a `format: bam` input (`sam` -> `bam` converter exists). If a unit test is kept, extract `_datasets_with_secondary_files` to a module-level function taking `(inputs, incoming, input_datasets)` and use small dataclasses rather than Bunch. |

## API / integration test challenges

- Helpers: `_run_user_tool`, `_new_bams`, `_new_bam_list`, `_user_tool_history` are reasonable. `_run_user_tool` overlaps `_run_mapped_over_list` / `_tool_request_mapped_over_list` and `test_run_plain_dataset_element_identifier_falls_back_to_name`; folding those onto it is optional cleanup of pre-existing tests, not a finding.
- Only BAM is exercised end to end. `cram_index`, `bcf_index`, and `tabix_index` (vcf_bgzip, interval tabix) keys are never checked against real `set_meta` output. test-data has `2.cram`, `bcf_index_metadata_test.bcf`, `test.vcf.gz`.
- The PR claims map-over and `multiple` work through both `/api/tools` and tool requests, but those two are only tested through `/api/tools`. Collections and single inputs are tested both ways.
- Implicit conversion: no API test, though the PR description lists "after implicit conversion" as a behaviour and it has its own code path in `_datasets_with_secondary_files` plus the conversion resolution in `setup_for_runtimeify`.
- `test_run_mapped_over_list_lists_secondary_files` uses a one-element list and reads the newest history dataset; with two elements and `get_collection_element_contents` it would show each mapped job got its own element's index.
- Pulsar integration test: good, asserts both staging location and content. PR notes CI is its first container run.

## E2E

Not needed. The only client changes are the schema JSON, the generated API schema and authoring help; the authoring help is covered by `test_user_tool_authoring_help.py`.

## Test plan

1. Add `test_run_converted_input_lists_secondary_files` (+ tool-request variant): upload `1.sam`, input `format: bam, secondary_files: true`, assert `secondaryFiles[0].format == "bai"` (or link and checksum against the converted dataset's `bam_index`). Drop the Bunch unit test.
2. Parametrize an API test over `(2.cram, cram, cram_index, .crai)`, `(bcf_index_metadata_test.bcf, bcf, bcf_index, .csi)`, `(test.vcf.gz, vcf_bgzip, tabix_index, .tbi)`, linking the index and comparing bytes with `get_history_dataset_metadata_file`. Drop the `cram` unit param.
3. Move the BAI/CSI magic-byte check to `test_bam.py` with a real CSI index.
4. Drop `not-opted-in` and `datatype-without-index` unit params; trim `test_to_cwl_...` to the `None` case.
5. Run `multiple` and map-over through tool requests too (`via_tool_request` parameter; map-over uses `{"__class__": "Batch", ...}` and the tool request's implicit collection); use two elements for map-over.

Profile: gx_test_challenger · Model: Claude Opus 5.5 · Effort: medium · Reviewed commit: efa3e7bbdaf10581dc1ffb037ec762d879dd8869

# Test challenges review: #24818

Full reasoning and test plan: [test_challenges_debrief.md](test_challenges_debrief.md).

Overall the API and Pulsar integration tests are good: they link a real index the way an author would and compare bytes with Galaxy's copy, through a new populator method. The gaps are in what the API layer leaves to unit tests with fakes.

## P2 1: Implicit conversion is only tested through a private method with Bunch stand-ins

`test_user_tool_finds_a_converted_input_of_an_input_with_secondary_files` calls `UserToolEvaluator._datasets_with_secondary_files` with a `Bunch` tool whose inputs are `Bunch` objects with a `secondary_files` attribute, so it depends on `visit_input_values` accepting fakes and never exercises how `setup_for_runtimeify` / `to_cwl` pick the converted dataset. The PR description lists "after implicit conversion" as a behaviour, and it is easy to reach through the API: `test-data/1.sam` into a `format: bam, secondary_files: true` input goes through the `sam` -> `bam` converter.

Fix: add an API test (via `/api/tools` and tool requests, using the existing `_run_user_tool(..., via_tool_request)`) that runs a SAM dataset into the BAM input and asserts the index is listed (`bai`) and linkable. Drop the unit test. If a unit test is still wanted, extract `_datasets_with_secondary_files` to a module-level function taking `(inputs, incoming, input_datasets)` and build it from real parameters or small dataclasses, not Bunch.

## P2 2: Only BAM is exercised against real metadata

`secondary_file_suffixes` names `cram_index`, `bcf_index` and `tabix_index` (vcf_bgzip and the interval tabix types), but no test checks those names against what `set_meta` actually stores. The one non-BAM case is the `cram` unit param, which sets a fake `cram_index` by hand, so a misnamed key or a type that doesn't populate its index would pass.

Fix: parametrize an API test over `2.cram`/`cram` (`.crai`), `bcf_index_metadata_test.bcf`/`bcf` (`.csi`) and `test.vcf.gz`/`vcf_bgzip` (`.tbi`), link the index, and compare bytes with `get_history_dataset_metadata_file`. Then drop the `cram` unit param.

## P3 1: Test the BAI/CSI magic-byte detection on the datatype, with a real CSI index

The `csi-kept-in-bam_index` unit case passes `b"\x1f\x8b\x08\x04bgzf compressed CSI index"` through `setup_for_runtimeify`, though the logic is `Bam.secondary_file_suffix`. A test in `test/unit/data/datatypes/test_bam.py` that builds a real CSI index from `1.bam` (`pysam.index("-c", ...)` into `tmp_path`) and calls `Bam().secondary_file_suffix("bam_index", path)` tests it directly against the real format. Keep the `one-per-suffix` case in `test_runtime.py`.

## P3 2: Drop unit cases already covered by API tests

`test_adapt_dataset_without_secondary_files[not-opted-in]` and `[datatype-without-index]` check what `test_run_secondary_files_empty_unless_asked_for_and_indexed` checks end to end; keep only `[deferred]`. In `test_to_cwl_lists_the_index_for_user_tools_only`, the `opted_in` / `opted_out` assertions duplicate the `/api/tools` API tests; only the `secondary_file_datasets=None` case (non-UDT callers get no key) is unique.

## P3 3: `multiple` and map-over are only tested through `/api/tools`

The PR says these work "through both `/api/tools` and tool requests", but `test_run_multiple_input_lists_secondary_files` and `test_run_mapped_over_list_lists_secondary_files` only use `/api/tools`, while single and collection inputs are tested both ways. Add `via_tool_request` variants (map-over needs `{"__class__": "Batch", ...}` and the tool request's implicit collection, as in `_tool_request_mapped_over_list`). The map-over test also uses a one-element list and reads the newest history dataset; two elements read with `get_collection_element_contents` would show each job got its own element's index.

## Not findings

- No E2E test needed: client changes are schema/help only, and the help example is covered by `test_user_tool_authoring_help.py`.
- `test_adapt_dataset_rejects_a_missing_index` and the `deferred` case stay as unit tests; neither is cheaply reachable through the API.

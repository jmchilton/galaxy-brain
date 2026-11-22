# Test challenges debrief — galaxy#25023

Profile gx_test_challenger · Claude Opus 5.5 · effort low · reviewed `ff96b8bb47c49cd0886b04747bc1825bc8e25601`. Reasoned from code; no tests run (no .venv).

## Layers
- Integration (strong core): `test_pulsar_embedded_remote_tool_eval.py` runs real framework tools on embedded Pulsar under extended and directory metadata (subclass), plus command-line, object-store-conf, deferred-input checks. `test_remote_tool_evaluation_directory_metadata.py` covers local-runner remote eval with directory metadata. Right layer for this fix.
- Functional tools `command_reads_input_size`, `command_reads_configfile`, and new source_path asserts in `inputs_as_json_with_staging_path_and_source_path.xml` — good; they assert behavior through Pulsar paths.
- Unit: `test_command_factory.py` new tests execute the generated shell for real (exit-code and run-once semantics) — keep; hard to observe at integration layer.
- No E2E needed (backend job execution).

## Unit test challenges
- `test_wrapped_json.py::test_load_contents_reads_galaxy_file_before_compute_path_exists` — duplicates integration `param_value_from_file` (load_contents expression tool on Pulsar, both metadata strategies). Recommend drop.
- `test_wrapped_json.py::test_null_expression_json_read_before_compute_path_exists` — not covered by an integration tool. Recommend moving to integration by adding a tool/param case producing `expression.json` `null` input on Pulsar (or keep, but replace `_Dataset`/`SimpleNamespace` fakes with a small dataclass).
- `test_remote_evaluation_paths.py` — covers uuid-less datasets/metadata files. Both Pulsar integration classes force `object_store_store_by = "uuid"`, so the id-keyed fallback has no integration coverage. Preferred: add an integration variant with `store_by: id` (metadata_bam is already in TOOL_IDS) and drop the unit test with its 5 hand-rolled fakes. If kept, collapse fakes into dataclasses.
- `test_pulsar_runner.py` one-line fixture update — fine.

## Integration helper challenges
- `run_tool("command_reads_input_size", …)` + `wait_for_job` + decode/session.get Job repeated in 3 tests across 2 files. Extract a helper (e.g. `_run_input_size_job(history_id) -> Job`) / reuse.
- `test_command_line_recorded` regex `echo '(\d+) \1' > '` passes for any equal pair; input is "abc" so assert `echo '3 3'` (or 4 with newline — whatever the upload yields) for a stricter check.
- `TOOL_IDS` in the local-runner file overlaps the Pulsar list; acceptable (different runner), no action.

## Red-on-base
PR description claims red-on-base per test; not re-verified here (coordinator/verifier may check).

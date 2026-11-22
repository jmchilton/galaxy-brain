# Test challenges review — galaxy#25023

Profile gx_test_challenger · Claude Opus 5.5 · effort low · reviewed commit `ff96b8bb47c49cd0886b04747bc1825bc8e25601`. Details: [test_challenges_debrief.md](test_challenges_debrief.md).

Verdict: testing is solid and mostly at the right layer (embedded-Pulsar integration under both metadata strategies, functional tools that read inputs/configfiles via Pulsar paths, real shell execution for command-factory). Findings are minor.

## P2 1 — uuid-less path fallback covered only by a fake-heavy unit test
`test/unit/app/jobs/test_remote_evaluation_paths.py` builds 5 hand-rolled fakes to test datasets/metadata files without UUIDs, while both Pulsar integration classes set `object_store_store_by = "uuid"`, so the id-keyed path never runs end to end. Add an integration variant with `object_store_store_by = "id"` (e.g. a third subclass of `TestPulsarRemoteToolEvaluation`, `metadata_bam` already listed) and drop the unit test; if kept, replace fakes with dataclasses.

## P3 1 — `test_wrapped_json.py` load_contents test duplicates integration
`test_load_contents_reads_galaxy_file_before_compute_path_exists` repeats what `param_value_from_file` proves on Pulsar under both strategies; drop it. The `null` `expression.json` case is not covered elsewhere — keep, or move to integration; replace `_Dataset`/`SimpleNamespace` with a small dataclass.

## P3 2 — repeated run/wait/fetch-Job boilerplate in integration tests
`run_tool("command_reads_input_size")` + `wait_for_job` + `session.get(Job, decode_id(...))` appears in three tests across `test_pulsar_embedded_remote_tool_eval.py` and `test_remote_tool_evaluation_directory_metadata.py`. Extract a shared helper.

## P3 3 — loose command-line assertion
`test_command_line_recorded` asserts `re.search(r"echo '(\d+) \1' > '", ...)`, which passes for any equal pair. Input content is fixed (`"abc"`), so assert the exact size.

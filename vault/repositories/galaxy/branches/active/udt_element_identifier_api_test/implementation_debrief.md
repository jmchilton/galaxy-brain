# Implementation debrief

STATUS: BLOCKED. Waiting on John's scope decision. The fix works; the second scope evaluation recommends a job-cache guard.

Branch `udt_element_identifier_api_test` on `jmchilton`, base `dev` `51e0a80a0db`:
- `22568e89198` Baseline tests: plain dataset renders `null`; workflow map-over already gets identifiers.
- `791a5e46b83` UDT fix: `UserToolEvaluator` gets `{dataset id: identifier}` from the persisted `<name>|__identifier__` job params via `ElementIdentifierMapper.identifiers_by_dataset_id` and feeds it to `setup_for_runtimeify` and `to_cwl`. Red→green API tests for `/api/tools` and `/api/jobs`. `to_cwl` also sets `element_identifier` for DCE Files.
- `d5ddac3f416` Re-scope: copies the transient identifier onto implicitly converted HDAs (`actions/__init__.py` `process_dataset`). Red→green csv→tabular API test.
- Alt `udt_element_identifier_api_test_alt_original_scope` has the first two commits only.

Validation: `-k element_identifier` API tests pass (5); labels and UDT workflow tests pass; unit `test_runtime`/`test_evaluation`/`test_modules`/`test_actions` pass (183); black and ruff clean; mypy count unchanged (checked before `d5ddac3f416`).

Decisions for John:
1. **Job-cache guard** (Codex P1, reproduced with a throwaway API test on `d5ddac3f416`: the plain run is served from the cache (`copied_from_job_id` set) and writes `sample_a\n`; second scope evaluation says to add the guard). With `use_cached_job`, a plain UDT run can reuse a mapped job's output (`sample_a` instead of `null`), because `_build_stmt_for_hda` ignores `|__identifier__` when the request has none. Proposed fix: NOT EXISTS on `{k}|__identifier__` for identifier-less requests, plus a red→green cache test. This is stricter for XML tools too (extra misses only). It could also ship as its own PR first.
2. **Plain-dataset fallback**: keep `null` (CWL-ish), or fall back to the HDA name (parity with labels and Cheetah)? This doesn't settle 1.
3. **Cheetah converted-input lookup** (optional): `ElementIdentifierMapper` misses converted inputs (keyed on converted, queried with original).
4. Backport: none planned; release branches diverge heavily.

Still applies after any of these: normal reviews, test challenge, Codex, thermo, baseline-refactor debriefs for the current commits. Remaining validation after a change: rerun `-k element_identifier` API tests plus any new cache test, and another review.

Not handled: per-input (not per-dataset) identifier keying (Codex pass 1); `{"src":"dce"}` job state.

Issue text: `vault/agents/gx_issues/to_file/udt_element_identifier_null_on_map_over.md`.

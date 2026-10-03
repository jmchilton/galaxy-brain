# PR 518 — Record file staging metrics for Galaxy job metrics

Reviewed local `pulsar-transfer-metrics` at `392c870` against its PR branch point `3e455c8`. The implementation reuses the existing job metrics filename convention and `ResultsCollector`; imports are at module scope. I found two counting defects.

## Findings

1. **Count only output actions that actually transfer a file** (`pulsar/managers/staging/post.py:152–173`). `PulsarServerOutputCollector.collect_output` calls `metrics.record_file` after `execute` even when `action.staging_needed` is false. For an `output` mapped to `none` on a shared filesystem, `BaseAction.write_from_path` returns without copying, but the file and its full size are still reported as a Pulsar stage out. Check `staging_needed` (and successful execution) before recording; add a `none` action test.

2. **Do not count an output skipped on cancellation** (`pulsar/managers/staging/post.py:153–173`). `action_if_not_cancelled` returns early when `was_cancelled()` is true, but the unconditional `record_file` still increments `files` and `bytes` if the local source exists. Have the callback report whether it transferred, then record only on success; cover cancellation in `staging_metrics_test.py`.

## Test status

## Resolution

Both findings are fixed on the PR branch. Transfer metrics now require a staging action and a completed, uncancelled callback. Regression tests cover shared filesystem and cancelled outputs. The new test files pass (15 tests), as do the existing client staging tests (12 tests); Ruff and `git diff --check` pass.

## Test audit (2026-10-03)

Audited at PR head (`e2c8cd9`). 16 new tests: 7 in `test/job_metrics_test.py`, 9 in `test/staging_metrics_test.py`. Nothing in `test/` called `preprocess`/`postprocess` with real transfers before this PR. `stateful_test.py` uses an empty `remote_staging`. `integration_test.py` (through `pulsar/client/test/check.py`) runs the full path but asserts nothing about metrics. So the pre/post wiring tests are new coverage, not duplicates. A check in `check.py` that `__instrument_pulsar_transfer_postprocess` lands in `temp_metadata_dir` could cover the stage-out for remote modes. The integration suite is slow and depends on the environment, though, so I would add it alongside the unit test, not instead of it.

### `job_metrics_test.py`

| Test | Verdict | Reason |
|---|---|---|
| `test_missing_config_file_keeps_the_default_of_core_only` | KEEP | Covers the early-return branch. A Pulsar with no `job_metrics_conf.xml` is the default setup. |
| `test_yaml_config_loads_plugins` | MERGE → `unknown_plugin_is_skipped` | The skip test already loads YAML and asserts `core` loads. Nothing extra here. |
| `test_xml_config_loads_plugins_with_their_options` | MERGE → XML row of the skip test | The `verbose` passthrough (XML attrs → dict) is worth keeping. Fold it into the XML case. |
| `test_unknown_plugin_is_skipped_rather_than_fatal` | KEEP (parametrize yaml/xml) | This is the core behaviour. Drop the `pytest.raises(Exception)` on raw `JobMetrics`, which tests Galaxy, not Pulsar. `get_configured_plugin("not_a_real_plugin") is None` can never fail on its own: an unskipped unknown plugin raises first. |
| `test_unknown_plugin_is_skipped_in_xml_too` | MERGE → XML row of the skip test | Same behaviour in the other format. Make it a parametrize row. |
| `test_a_config_of_only_unknown_plugins_configures_nothing` | KEEP (marginal) | The only test of `conf_dict=[]` (no instrumenter) vs `None` (falls back to `core`). It would catch an `available or None` refactor. |
| `test_a_galaxy_side_plugin_never_instruments_the_job_script` | MERGE → skip test | The installed `galaxy-job-metrics` has no `pulsar` plugin, so this runs the skip path again. Against a Galaxy that has the plugin, it would test Galaxy's plugin instead. Use `pulsar` as the unknown plugin in the skip test instead; that is the case that motivated the code. |

### `staging_metrics_test.py`

| Test | Verdict | Reason |
|---|---|---|
| `test_file_name_matches_the_galaxy_plugin` | KEEP | Pins the file name Galaxy reads, a contract across both repos. `e2c8cd9` changed exactly this name. |
| `test_records_files_and_bytes` | DROP | The preprocess and postprocess tests assert the same `files`/`bytes` through real paths. `seconds >= 0` cannot fail. |
| `test_records_a_file_that_cannot_be_sized` | MERGE → `records_what_a_failed_phase_managed` | That test already records the same missing `gone.dat`. Add `bytes == 0` there. |
| `test_records_what_a_failed_phase_managed` | KEEP | Checks the metrics file is still written when the phase fails. Swap `try/except Exception: pass` for `pytest.raises`: as written, the test still passes if `record_transfer` swallows the exception. |
| `test_preprocess_records_staged_inputs` | KEEP | The only test of the `pre.py` wiring. |
| `test_postprocess_records_and_stages_out_its_own_metrics` | KEEP | Covers the `post.py` wiring and `__stage_out_transfer_metrics`. |
| `test_postprocess_does_not_count_shared_filesystem_output` | KEEP | Regression test for finding 1. It fails if the `staging_needed` check is removed. |
| `test_postprocess_does_not_count_cancelled_output` | KEEP | Regression test for finding 2. Optionally parametrize it with the shared-filesystem test (same setup, `files == 0`). |
| `test_postprocess_does_not_retry_its_metrics_stage_out` | KEEP | The only test of the no-retry rule and of a failed stage-out being swallowed. |

### Recommendation

KEEP 10, MERGE 5, DROP 1, REPLACE 0. Net: **16 → 10 test functions**:
- `job_metrics_test.py`: 7 → 3. The skip test becomes one test parametrized over yaml/xml (2 cases).
- `staging_metrics_test.py`: 9 → 7, or 6 if the shared-filesystem and cancelled tests are parametrized together.

No test is tautological against mocks. The weak spots are individual assertions, listed above, not whole tests. The `staging_action_local` and missing-`metadata_directory` early returns in `__stage_out_transfer_metrics` are untested. They are cheap, so I would not add tests for them.

### Resolution
Applied in `a030789` (pushed): job_metrics 7 → 3 functions (YAML/XML skip test parametrized, `pulsar` as the unknown plugin, raw `JobMetrics` raise and unfailable `is None` assert dropped); staging_metrics 9 → 7 (`test_records_files_and_bytes` dropped, unsizable-file case folded into failed-phase test, now `pytest.raises`). Shared-fs/cancelled tests left separate. 11 cases pass; ruff/isort clean.

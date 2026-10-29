# Debrief: prepare to file

## Research

- Rechecked on fresh `origin/dev` 18296103e03 (detached temp worktree), `pulsar-galaxy-lib` 0.16.0. Raw's B15 analysis holds.
- Unit repro: real `PulsarComputeEnvironment`, mocked job wrapper; `none` → both extra-files hooks raise `TypeError`, `transfer` fine.
- Integration repro (embedded Pulsar, existing `embedded_pulsar_none_job_conf.yml`):
  - `composite_output_tests` ❌ (output hook, `wrappers.py:560`).
  - `dataset_path` index 1 (Directory input) ❌ (`runtime.py:84` → `input_extra_files_rewrite`).
  - `create_directory_index` ✅ (`from_work_dir`, never asks for path) and `dataset_path` index 0 (txt) ✅.
  - Gotcha: `integration_tool_runner` runs only test index 0 per tool, so a Directory case needs its own test.
- Not run: Directory *output* path, data-manager bundle path. Inferred from code.
- Duplicates: none. Related: #21566 / fix PR #21578 (added the `none` test, which only covers tools that don't touch extra files).
- PR #24564 (job files API write-path validation on 25.1): unrelated code path. Same research scan (`Component - Pulsar Input Staging.md`) surfaced both, but #24564 is the private security finding on `/api/jobs/{id}/files`; this bug is in command building, never reaches that API. Not security-relevant.

## Rewrite

- Corrected raw: REST runner defaults `rewrite_parameters` on, legacy runner off (raw said REST/MQ/embedded; review added coexecution/k8s).
- `Directory.content_path` already handles `None`, so the Directory input caller needs no change; `DatasetFilenameWrapper.__getattr__` and `_bundle_path_rewrite` do.
- Sample `job_conf.sample.yml` drift (raw's B8) kept as a collapsed "Related" section, not the headline.
- Review subagent (one round): no egregious issues; narrowed opener to "asks for an extra-files path", replaced an unbacked transfer/copy row, added #21578, softened alternative-approach convention claim. Its one open item (Directory unconfirmed) closed by the extra integration run above.

## Left over

- Alternative Approaches lacks the nested "In Detail" block; single short alternative, judged unnecessary.
- Labels: `kind/bug`, `area/jobs`; `area/configuration` deliberately omitted.

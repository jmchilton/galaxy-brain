Run via Opus at low effort.

# Thermo-nuclear code quality review: issue_24600_pulsar_none_extra_files_25.1

**Top line: nothing acted on, no new commits.** The production change is two guard clauses (+6 lines) in `PulsarComputeEnvironment`. It sits at the narrowest point where Pulsar's "no rewrite" (`None`) meets a caller that needs a `str`. No structural regression, spaghetti growth, or file-size boundary crossing turned up (`pulsar.py` was already 1300 lines before the branch). The one real code-judo move would change the `None`-means-unchanged contract of `PathMapper`/the rewrite hooks. That is out of scope for a release_25.1 fix. Unit tests (2/2), ruff, black, isort and mypy are all clean at `4d18da26fee`.

## Not acted on

1. **Duplicated `None` fallback across the input and output hooks.** A shared `_remote_extra_files_path(dataset, remote_path)` helper wouldn't delete any branch. The input hook still needs its own `None` check to skip recording `path_rewrites_input_extra`. The result would be about the same size with one more indirection.
2. **The root cause is a nullable-mode contract.** `PathMapper` returns `None` for "unchanged", and the wrapper relies on `None` to mean "no false path". Making the hooks always return a concrete path would delete the guards, but it means touching `wrappers.py` false-path handling and the primary-path flow. That is too broad for a release backport. It could be a dev-branch follow-up.
3. **The new integration module and job conf nearly copy `test_pulsar_embedded_none.py` and its conf** (the YAML differs only in `remote_metadata`). Subclassing the existing instance would save about 4 lines but couple two test modules. A one-line YAML diff is easier to read than a shared base. The separate module is already justified in the initial debrief: under `none`, `remote_metadata: true` can't run metadata.
4. **Unit-test fakes depend on Pulsar internals** (`FakePulsarClient` mirrors the attributes `FileActionMapper` reads). This is an accepted trade-off for exercising the real `PathMapper`/`FileActionMapper`. The alternative, mocking `PathMapper`, would test nothing meaningful.
5. **Only the input hook has an explanatory comment.** The two hooks sit next to each other and the comment covers both. Not worth a commit.
6. **The unit-test module docstring names integration test paths** (some risk of going stale). Minor and accurate today.
7. **Fallback to `dataset.extra_files_path` rather than `local_path_config.*_extra_files_rewrite`.** This was already settled in `codex_review.md` and `subagents/normal_review.md`: it matches the primary-path fallback. There's no new reason to reopen it.

<details>
<summary>Full review</summary>

### Scope
`git diff origin/release_25.1...HEAD`: `lib/galaxy/jobs/runners/pulsar.py` (+8/-2), the new `test/integration/embedded_pulsar_none_local_metadata_job_conf.yml`, the new `test/integration/test_pulsar_embedded_none_local_metadata.py`, and the new `test/unit/app/jobs/test_pulsar_compute_environment.py`.

### 1. Structural regressions
None. The change stays inside the two methods that own extra-files path rewriting for Pulsar. No feature checks leak into shared code. `wrappers.py`, `compute_environment.py` and the base ABC are untouched.

### 2. Missed code-judo opportunities
- The guards exist because `input_path_rewrite`/`output_path_rewrite` return `Optional[str]`, where `None` means "Pulsar didn't move the file". A cleaner model would have the Pulsar compute environment always return the effective remote path (the local path when unchanged). The extra-files hooks would then become a single unconditional `dataset_path_to_extra_path(...)`, like `SharedComputeEnvironment`. But `DatasetFilenameWrapper` sets `false_path` only when the rewrite is truthy, and `input_metadata_rewrite`/`unstructured_path_rewrite` follow the same `None` convention. So that change is cross-cutting and belongs on dev, if anywhere. For a release backport, local guards in the owning class are the right altitude.
- `input_path_rewrite` and `output_path_rewrite` already duplicate the "local rewrite or `get_file_name()`" fallback. That is pre-existing and not made worse.

### 3. Spaghetti / branching
Two early-return guards, one per hook, at the point where the `None` contract meets a `str` consumer. They aren't scattered and they aren't in an unrelated flow. A shared helper doesn't remove the input-side branch (see item 1 above).

### 4. Boundary / types
`-> str` on both overrides tightens the contract to what every caller already assumes. That's an improvement. `dataset` stays untyped, consistent with the rest of the class and the ABC. mypy is clean.

### 5. File size
`pulsar.py` went from 1294 to 1300 lines. It was already over 1k on the base, so the PR doesn't cross the threshold. Decomposing the file is out of scope for this fix.

### 6. Tests
- Unit: a real `PulsarComputeEnvironment` with the real `PathMapper`/`FileActionMapper` and small, typed fakes. Two tests cover the `rewrite` action, both path-changing and unchanged. The second also asserts the `None` precondition, which documents why the guard exists. 115 lines for two tests is mostly fixture setup that can't really be smaller.
- Integration: a near-copy of `test_pulsar_embedded_none.py` with a one-key YAML difference. It's acceptable, since each integration module is one Galaxy instance and the configs genuinely differ in a behavior-relevant key.

### 7. Legibility
Good. The comment on the input guard explains the `none` case. The output guard is self-evident beside it.

### Verdict
Approve for a release-branch fix. The only high-conviction structural suggestion (drop the `None`-means-unchanged contract) is a dev-branch follow-up, not a blocker here.

</details>

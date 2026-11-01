Run via Opus at low effort.

# Thermo-nuclear code quality review (re-harden round 2): issue_24600_pulsar_none_extra_files_25.1

**Top line: nothing acted on, no new commits.** I reviewed the current `git diff origin/release_25.1...HEAD` at `bf1ec9728a6` independently of the round 1 debrief. The production change is still two guard clauses (+6 lines, plus `-> str` annotations) in `PulsarComputeEnvironment`. They sit where Pulsar's `None` ("not rewritten") meets a caller that needs a `str`. The only new material since round 1 is `bf1ec9728a6`, a comment-only fix to the sample job confs. I checked the action list it adds against pinned `pulsar-galaxy-lib==0.15.14` (`pulsar/client/action_mapper.py`). It matches every user-configurable `action_type`, and correctly leaves out the internal `message` action. `test_job_configuration.py`, which parses `job_conf.sample.yml`, still passes. Unit tests (47 passed across both modules), ruff, black, isort and mypy are clean.

## Not acted on

1. **The root cause is the `None`-means-unchanged contract** of `PathMapper` and the Pulsar rewrite hooks. Making the hooks always return a concrete path would delete both guards. But `DatasetFilenameWrapper` sets `false_path` only when the rewrite is truthy, and `input_metadata_rewrite`/`unstructured_path_rewrite` share the convention, so the change would be cross-cutting. That belongs on dev, not in a release_25.1 fix. Same conclusion as round 1, reached independently.
2. **The `None` fallback is duplicated across the input and output hooks.** A shared helper wouldn't remove the input-side branch, which must also skip recording `path_rewrites_input_extra`. It would just add an indirection.
3. **The sample confs now hard-code Pulsar's action list in comments,** so the list will drift when Pulsar adds actions. The obvious alternative is to delete the list and point at the Pulsar docs, which already sit in the same comment. But the enumerated list is what operators scan for, and the previous list was wrong rather than merely incomplete. It is accurate today. I'm keeping it.
4. **The sample-conf commit is scope-adjacent** to a runner bug fix. It is docs only, sits in its own commit, and touches the same `default_file_action: none` setting the bug is about. It can be split out if a reviewer objects. Commenting out the YAML `default_file_action: none` matches the surrounding "Uncomment ..." prose and the XML sample.
5. **The new integration module and job conf nearly copy `test_pulsar_embedded_none.py`.** The YAML confs differ only in `remote_metadata`. One Galaxy instance per integration module makes a separate module the natural unit. A one-key YAML diff is easier to read than a shared base class.
6. **Only the input guard carries a comment.** The two hooks are adjacent, and the comment explains both.
7. **Unit-test fakes mirror the client attributes `FileActionMapper` reads.** This is the accepted cost of exercising the real `PathMapper`/`FileActionMapper` instead of mocking out the code under test.

<details>
<summary>Full review</summary>

### Scope
- `lib/galaxy/jobs/runners/pulsar.py` (+8/-2): `input_extra_files_rewrite` / `output_extra_files_rewrite` return `dataset.extra_files_path` when the primary rewrite is `None`, and are annotated `-> str`.
- `test/unit/app/jobs/test_pulsar_compute_environment.py` (new, 115 lines): `rewrite` action, both path-changing and unchanged.
- `test/integration/test_pulsar_embedded_none_local_metadata.py` and its job conf (new): `default_file_action: none` with `remote_metadata: false`, running the `composite` and `composite_output_tests` tools.
- `lib/galaxy/config/sample/job_conf.sample.yml` and `job_conf.xml.sample_advanced`: comment fixes (typo, a corrected file-action list, and commenting out `default_file_action: none` in the YAML example).

### 1. Structural regressions
None. The logic stays in the class that owns Pulsar extra-files rewriting. `wrappers.py`, `compute_environment.py` and the ABC are untouched, and no feature checks leak into shared paths.

### 2. Code-judo opportunities
The only plausible one is changing the `None` contract (item 1 above), which is cross-cutting and out of scope for a backport. Within the current contract, an early return at the point of consumption is the smallest correct shape. It mirrors how `input_path_rewrite`/`output_path_rewrite` already fall back to the local path.

### 3. Spaghetti / branching
Two early returns, one per hook, inside the methods whose job is exactly this mapping. They aren't scattered, and they don't add a mode flag.

### 4. Boundary / types
`-> str` tightens the overrides to what every caller (`DatasetFilenameWrapper`, `ToolEvaluator`) already assumes. That's a net improvement. `dataset` stays untyped, as in the rest of the class and the ABC. mypy is clean.

### 5. File size
`pulsar.py` was already about 1.3k lines on the base. The branch adds 6, so it crosses no threshold.

### 6. Tests
- Unit: the real `PulsarComputeEnvironment`/`PathMapper`/`FileActionMapper` with small typed fakes. The unchanged-rewrite test asserts the `None` precondition, which documents why the guard exists. The module docstring routes `none`/staging coverage to the integration modules, so the two layers don't overlap.
- Integration: as discussed, a near-copy with one behaviorally meaningful key difference.

### 7. Sample confs
- The list matches the `action_type` values in pinned Pulsar 0.15.14: `none`, `transfer`, `copy`, `rewrite`, `remote_copy`, `remote_transfer`, `remote_transfer_tus`, `remote_object_store_copy`, `remote_rsync_transfer`, `remote_scp_transfer`. `message` is internal and correctly left out. `http` was never a valid action and is removed.
- The YAML example previously disabled staging while its prose said "uncomment to disable". It is now consistent with the prose and with the XML sample.
- `test_job_configuration.py` loads the YAML sample and passes.

### Verdict
Approve for a release-branch fix. No blockers. The `None`-contract cleanup remains a possible dev-branch follow-up.

</details>

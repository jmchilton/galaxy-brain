Run via claude-opus-5-5 (effort not exposed to the agent).

Reviewed `e21894abae9` against `origin/dev` (merge-base `5ab3087a566`). The verdict is approve after small cleanups: there is no presumptive blocker. No file crosses 1k lines because of the branch. `pulsar.py` (1551→1589), `runners/__init__.py` (1190→1208) and `jobs/__init__.py` (3386→3391) were already over 1k and grew only a little. The design reuses the existing `FATAL_OOM` → `MEMORY_LIMIT_REACHED` path and doesn't add a new one. I made 4 behavior-preserving commits, pushed at `05c139c38a0`:

- **`d1d382b8736`** splits a pure `oom_kill_line()` finder out of `oom_kill_job_messages`. Slurm used to build and log a job message just to test it for truth; it now calls the finder.
- **`81be752b517`** types `check_output`/`check_tool_output` as returning `DETECTED_JOB_STATE`, so `_handle_detected_failure` drops `| str`.
- **`d095cff09d3`** sends Pulsar's `.ec` file and its saved job streams through a single `galaxy_<id>.<extension>` path helper.
- **`05c139c38a0`** drops the Unmappable test's `setUp`, which became redundant once the branch hoisted it to the base class.

Nothing under `job_script/` changed.

Not acted on:

- **One shared "user ended this job" state tuple.** `NOT_RESUBMITTABLE_JOB_STATES`, the inline tuple in `local.py:160` and htcondor's `_USER_CANCELLED_STATES` overlap. A single `model.Job` constant would serve all three, but that widens scope into other runners. This is a question for John.
- **Storing job streams on the job row instead of side files.** For FINISHING recovery, the streams could be written to the job's `job_stdout`/`job_stderr` columns rather than to `galaxy_<id>.job_*` files. `set_streams` truncates to `DATABASE_MAX_STRING_SIZE`, though, and the write would have to land before the metadata step. That is riskier than the settled side-file fix (codex review), so it's a question, not a change.
- **Pulsar's separate `!= OK` commit guard.** Dropping it would mean an unconditional commit on every successful Pulsar finish. The guard is the cheaper equivalent, and the normal review (P3 4/5) settled it.
- **`job_script/` seams.** These are the `cgroup_mount`/`proc_cgroup` test-only kwargs, the `_galaxy_report_oom_kills` name shared between the `.sh` and the `.py`, and the two template slots versus the `instrument_*` slots. The normal review settled the first. The slots are explicit and boring, which is preferable to splicing into the instrumenter strings. Any change here would also force a Pulsar mirror for little gain.
- **Running Pulsar through `_finish_or_resubmit_job`.** The two finish paths differ in where the exit code comes from, in remote metadata and metrics directories, and in how stdio read errors and cleanup are handled. Merging them would change behavior, which makes it out of scope.

<details><summary>Full review</summary>

# Thermo-nuclear review: `issue_24545_oom_kill_detection` @ `e21894abae9`

## Verdict

**Approve after the cleanups above.** The structural shape is right. A single detector in the canonical output-check layer (`tool_util/output_checker.py`) emits an ordinary `FATAL_OOM` job message. The probe reports through the same job-stderr channel instead of a new transport. Slurm's CANCELLED post-mortem reuses the same patterns. Pulsar now shares `_handle_detected_failure` with the generic path instead of keeping its own branch. I found no spaghetti growth, file-size explosion or wrong-layer logic. What remained were three boundary and duplication issues and one test leftover, all fixed.

## Findings acted on

### 1. A message builder used as a predicate (boundary)

Before (`slurm.py`):

```python
if oom_kill_job_messages(tail):
    return OUT_OF_MEMORY_MSG
```

That call built a `RegexJobMessage` list and logged "Job processes were killed for exceeding memory" every time it ran. Slurm then discarded the list and logged its own "Job hit memory limit" line. The primitive both callers need is "find the kill line". The fix makes `oom_kill_line(job_stderr) -> str | None` the primitive, builds `oom_kill_job_messages` on top of it, and has slurm call the finder.

- The matching order is unchanged: patterns are tried in order and the first pattern that matches wins.
- The list return type is kept, because it matches its sibling `runtime_environment_job_messages` and `check_tool_output` extends with it.

Commit `d1d382b8736`.

### 2. `DETECTED_JOB_STATE | str` hid a loose upstream annotation (types)

`_handle_detected_failure` accepted `| str` because `check_output` was annotated `tuple[str, ...]`, even though every path returns the enum. The fix:

- annotates `check_output` with the real return type
- annotates `MinimalJobWrapper.check_tool_output` with `-> DETECTED_JOB_STATE`
- narrows the helper to `DETECTED_JOB_STATE`

`JobWrapper.finish(check_output_detected_state: str | None)` is pre-existing and left alone. Mypy over the touched modules plus `set_metadata.py` and `app_unittest_utils/job_runner_support.py` reports 360 errors both before and after, with no new ones. That count comes from running `.venv/bin/mypy <files>` directly under the repo's strict `mypy.ini`. The debrief's figure of 22 came from a different invocation, so the two counts aren't comparable. Commit `81be752b517`.

### 3. Pulsar built `galaxy_<id>.<ext>` paths in three places (duplication)

The branch added `__job_stream_path` next to two inline `galaxy_{job_id}.ec` constructions in the same two methods. The fix replaces all three with a single `__job_file_path(job_wrapper, extension)`. `default_exit_code_file` in `output_collect` was considered for `.ec`. It would have left two mechanisms for sibling files, so it wasn't used. Commit `d095cff09d3`.

### 4. A redundant subclass `setUp` (test leftover)

The branch hoisted `dataset_populator` and its `setUp` into `_BaseResubmissionIntegrationTestCase`. `TestJobResubmissionUnmappableIntegration` still carried an identical copy, so I removed it. Commit `05c139c38a0`.

## Considered, not acted on

- **One "user ended" state constant.** See the top. The three tuples differ slightly: local omits ERROR; htcondor splits deleted from cancelled. Any shared constant would have to be designed around those differences.
- **Persisting job streams on the job row.** See the top.
- **Moving the OOM scan into `check_output`.** `set_metadata.py` also calls `check_output` and has no job stderr, so a new parameter would be dead there. The 3-line override in `check_tool_output` is the direct form. The normal review settled the synthetic-`ToolStdioRegex` variant.
- **A single alternation regex instead of the pattern tuple.** That would change which line gets reported when several match: the earliest by position would win instead of the first pattern. It would also lose the per-pattern provenance comments.
- **The Pulsar finish sequence versus the generic one.** This was settled (normal review P3 4/5). The guard now lives only in `_handle_detected_failure`.
- **`__read_job_stream` is an instance method while its siblings are static.** This is cosmetic.

## Not findings

- **Sample job conf block.** It is long, but it is documentation.
- **Imports.** All are at module top.
- **Comments.** They are short and non-obvious.

## Tests

- **Unit set** (`test_output_checker`, `test_runner_output_collection`, `test_slurm_runner`, `test_pulsar_runner`, `test_job_script_oom_kills`, `test_runner_finishing_state`, `test_runner_local`): run after each commit, 134 passed and 2 failed. The two failures are `test_galaxy_lib_on_path` and `test_timelimit_kills_job`, which also fail on base.
- **Doctests** for `job_script` and `output_checker`: pass.
- **Integration**: `TestJobResubmissionPulsarJobStderrOomKillIntegration` and `TestJobResubmissionJobStderrOomKillIntegration` pass, run one at a time. `TestJobResubmissionUnmappableIntegration` was not run. Its only change is deleting an override identical to the parent's.

</details>

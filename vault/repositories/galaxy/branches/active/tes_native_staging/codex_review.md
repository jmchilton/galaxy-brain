Run via gpt-6.1-sol (Codex CLI 0.169.0; it reported reasoning effort `none`).

# Codex review

Codex raised four findings. I confirmed all four in the code and fixed them in four commits: `95591a24d93`, `863b67bb908`, `532ea740fbb` and `04085eef707`. I also found one bug myself while triaging, a token expiry longer than 4,300 digits answering 500. I fixed it too, but dropped my commit, because the test challenge had already committed the same fix as `253b5cdc2de`.

Not acted on: nothing. Codex reported no duplicated logic. Its only reuse finding is the metadata one (P3).

**How it was run.** Codex's sandbox fails on this host: bubblewrap isn't on `PATH`, and the bundled one can't run local commands. So the prompt carried everything:

- the full `git diff tes_task_state_polling...tes_native_staging` at `9737781e408`;
- the full files after the change: `api/job_files.py`, `managers/job_files.py`, `runners/tes.py`, `runners/util/tes_task.py`;
- context excerpts: `galaxy.util.in_directory`, `galaxy.util.path` (`safe_contains`), `JobWorkingDirectory`, and the `AsynchronousJobState`/`AsynchronousJobRunner` part of `runners/__init__.py`.

The 178 KB prompt went in on stdin (`codex exec -s read-only --output-schema … -`), because as an argument it overflowed argv. The brief asked Codex to pay particular attention to authorization, path handling, token verification and races.

The fixes were made in a temporary worktree on `9737781e408`, then cherry-picked onto the branch after the test challenge. The cherry-pick needed two adaptations, because the test challenge had moved `test_tes_runner.py` onto the shared fake TES server (`tes_fakes.py`). The walltime test was rewritten on that harness, which also gained `has_limits`/`check_limits` on `FakeJobWrapper`. The new wrapper symlink test replaced the challenge's copy of the old one.

## Findings and fixes

- **P1, confirmed: tool dependencies next to a staged script were missing** (`referenced_tool_files`). The runner staged only tool directory files that the job's own files name. A tool script that imports a sibling module or reads data beside itself failed in the task. ``04085eef707`` stages the whole tool directory when it has at most 200 files, without `test-data` and hidden directories (`tool_directory_files`, `MAX_TOOL_DIRECTORY_FILES`). Larger directories, such as some Tool Shed repositories, still stage only the named files. Tested by `test_staged_input_paths`, which now includes an unreferenced `helper.py` and excluded `test-data`/`.hg`, and by `test_staged_input_paths_of_a_large_tool_directory`.
- **P1, confirmed: DIRECTORY outputs lost files that tools link to.** The wrapper deleted every symlink in a DIRECTORY output. A tool linking `default.html` to `index.html` in an extra files directory lost `default.html`.
  - ``532ea740fbb`` replaces each link to a regular file inside the job directory with a copy of that file (`REPLACE_LINKS`, run by `find -exec sh -c`). Links that leave the job directory, dangle or name a directory are removed, as before. TESK still sees no symlinks, and Funnel no links leaving the task.
  - The wrapper test now covers a file link in each directory, a directory link, a dangling link and a link outside the job.
  - I also ran the step under busybox 1.36.1 in a throwaway container (`docker run --rm`), with busybox's own `readlink`, `cp` and `mv`: the link became a copy, and the other links were removed.
- **P1, confirmed: Galaxy job limits were never enforced** (`check_watched_item`). The runner never called `check_limits`, so a destination's walltime didn't apply to TES-native jobs. ``863b67bb908`` checks limits on every monitor pass, as the DRMAA runner does, and queues `fail_job`, which cancels the TES task because `check_limits` sets `stop_job`. The new unit test `test_job_over_its_walltime_fails_and_its_task_is_cancelled` fails against the previous `tes.py`.
- **P3, confirmed: metadata ran twice** with `embed_metadata_in_job: false`. The runner's `finish_job` ran external metadata and then called the base class, which ran it again. ``95591a24d93`` drops the override and sets `always_handle_metadata_externally = True`, as the Kubernetes and GCP Batch runners do. There is no new test, because it would only assert a class attribute.

## Also found while triaging

- A `job_token` whose expiry had more than 4,300 digits made `int()` raise, and the API answered 500 instead of 403. The test challenge's `253b5cdc2de` fixes it, so my equivalent commit was dropped.

<details>
<summary>Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/jobs/runners/pulsar.py",
      "lib/galaxy/jobs/runners/tes.py",
      "lib/galaxy/jobs/runners/util/tes_task.py",
      "lib/galaxy/managers/job_files.py",
      "lib/galaxy/security/job_files_tokens.py",
      "lib/galaxy/webapps/galaxy/api/job_files.py",
      "test/integration/test_job_files.py",
      "test/unit/app/jobs/test_tes_runner.py",
      "test/unit/app/managers/test_JobFilesManager.py",
      "test/unit/data/security/test_job_files_tokens.py"
    ],
    "notes": "Reviewed the pasted diff, full files, and surrounding excerpts only. No local commands or tests were run; repository context beyond the supplied material was not inspected."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy/jobs/runners/tes.py",
      "line": 174,
      "title": "Tool dependencies referenced by staged scripts are omitted",
      "detail": "referenced_tool_files finds paths only in job-directory texts. It stages a directly referenced tool script but never examines that script's dependencies or stages the containing tool directory.",
      "failure_scenario": "The job command invokes /tools/example/main.py, which imports sibling helper.py. Only main.py is named in the job script, so helper.py is absent from TES inputs. The container fails with ModuleNotFoundError even though the tool runs successfully with Galaxy's tool directory available.",
      "confidence": "certain"
    },
    {
      "severity": "P1",
      "category": "data-loss",
      "file": "lib/galaxy/jobs/runners/tes.py",
      "line": 240,
      "title": "Directory stage-out deletes valid output files represented by symlinks",
      "detail": "The wrapper unconditionally removes every symlink from directory outputs after execution. It does not materialize the linked contents, so valid extra files and discovered outputs disappear before upload.",
      "failure_scenario": "With tes_directory_outputs enabled, a tool writes dataset_2_files/data.txt and creates dataset_2_files/index.txt as a symlink to data.txt. The wrapper deletes index.txt, and Galaxy receives an incomplete extra-files directory despite successful tool execution.",
      "confidence": "certain"
    },
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy/jobs/runners/tes.py",
      "line": 451,
      "title": "TES polling never enforces Galaxy job limits",
      "detail": "check_watched_item never invokes AsynchronousJobState.check_limits. The supplied base monitor only dispatches to this method, so configured Galaxy runtime limits never trigger the existing failure and cancellation mechanism.",
      "failure_scenario": "A destination has a Galaxy walltime limit and its TES task remains RUNNING past that limit. Every poll returns the job state without checking limits; Galaxy leaves the job running and never cancels the TES task.",
      "confidence": "certain"
    },
    {
      "severity": "P3",
      "category": "reuse",
      "file": "lib/galaxy/jobs/runners/tes.py",
      "line": 516,
      "title": "Use the existing external-metadata hook to avoid running metadata twice",
      "detail": "finish_job explicitly calls _handle_metadata_externally and then calls the parent finish_job. When embed_metadata_in_job is false, the parent calls _handle_metadata_externally again. AsynchronousJobRunner already provides always_handle_metadata_externally for this requirement.",
      "failure_scenario": "A TES destination sets embed_metadata_in_job: false. Each completed job executes external metadata processing twice before finishing, unnecessarily repeating metadata work.",
      "confidence": "certain"
    }
  ]
}
```

</details>

After the cherry-pick: 102 unit tests passed (the four TES and job files unit files), and `test/integration/test_tes_runner.py` passed 5 of 5 end to end against the fake TES server.

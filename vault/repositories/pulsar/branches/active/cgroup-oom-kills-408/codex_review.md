Run via gpt-6-sol at medium effort.

Read-only Codex review of `git diff origin/master...8490345`. Codex raised two P2 findings, and verification refuted both, so this round changed no code and added no commits. `make lint` and the targeted tests are green on that head (69 passed).

Not acted on:

- **P2: an early shell `exit` skips the OOM report** (refuted). `$command` must not `exit` the job shell, and that contract predates this branch: `$instrument_post_commands` sits after `$command` and has the same exposure. Galaxy's `command_factory` honours the contract. It runs the tool as a child (`bash ../tool_script.sh`), always calls `capture_return_code`, and ends with `sh -c "exit $return_code"` (`YIELD_CAPTURED_CODE`) so the job script keeps going. The suggested fix is an EXIT trap through `ExitHandlers` / `$exit_handler_setup`. That exists only in Pulsar's template, not in Galaxy's, so using it would split the mirrored template. If it is ever wanted, it should start on the Galaxy side.
- **P2: hybrid cgroup hosts pick the wrong counter** (refuted). In systemd hybrid mode, `/sys/fs/cgroup` is a tmpfs with v1 controllers mounted under it, and the unified v2 hierarchy sits at `/sys/fs/cgroup/unified`. So `$cgroup_mount/cgroup.controllers` is absent and the script correctly takes the v1 `memory/.../memory.oom_control` branch. Codex's scenario needs cgroup2 mounted at the root with v1 memory mounted inside it, a non-standard layout that neither systemd nor the major distros produce.

<details><summary>Full review</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "app.yml.sample",
      "pulsar/client/client.py",
      "pulsar/client/destination.py",
      "pulsar/manager_endpoint_util.py",
      "pulsar/managers/base/__init__.py",
      "pulsar/managers/base/directory.py",
      "pulsar/managers/unqueued.py",
      "pulsar/managers/queued_cli.py",
      "pulsar/managers/base/base_drmaa.py",
      "pulsar/managers/util/cvmfsexec.py",
      "pulsar/managers/util/job_script/__init__.py",
      "pulsar/managers/util/job_script/CGROUP_OOM_KILLS_STATEMENT.sh",
      "pulsar/managers/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh",
      "pulsar/web/routes.py",
      "setup.py",
      "test/client_test.py",
      "test/job_script_oom_kills_test.py",
      "test/manager_cgroup_oom_kills_test.py",
      "test/manager_endpoint_util_test.py",
      "test/wsgi_app_test.py"
    ],
    "notes": "The full diff and relevant surrounding code were reviewed."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "pulsar/managers/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh",
      "line": 64,
      "title": "An early shell exit skips the OOM report",
      "detail": "The report runs only after $command. If that command calls `exit`, the shell never reaches the report, even though the script already has an ExitHandlers abstraction for actions that must run on exit.",
      "failure_scenario": "With the check enabled, a command increments the cgroup's oom_kill counter and then executes `exit 0`. Job stderr contains no OOM message, so Galaxy cannot identify the kill from stderr.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "pulsar/managers/util/job_script/CGROUP_OOM_KILLS_STATEMENT.sh",
      "line": 7,
      "title": "Hybrid cgroup systems can select the wrong memory counter",
      "detail": "The existence of `cgroup.controllers` selects the v2 path without checking which hierarchy owns the memory controller. A system with a v2 mount and memory on v1 has `cgroup.controllers`, but its OOM counter is in v1 `memory.oom_control`.",
      "failure_scenario": "On a hybrid host with memory mounted at `/sys/fs/cgroup/memory`, an OOM kill increments `memory.oom_control`. The function tries a nonexistent v2 `memory.events`, suppresses the read error, and emits no OOM message.",
      "confidence": "likely"
    }
  ]
}
```

</details>

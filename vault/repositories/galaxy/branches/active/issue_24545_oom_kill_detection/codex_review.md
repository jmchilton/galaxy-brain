Run via gpt-6-sol at medium effort.

Independent read-only Codex review (codex-cli 0.164.0) of `git diff origin/dev...HEAD` at `7d6d62ccd10` raised one P2 finding, which was confirmed and fixed. Recovering a Pulsar job left in FINISHING (Galaxy restarted during the Celery external metadata step) rebuilt the result with `job_stdout=None, job_stderr=None`. An OOM kill reported only on the job's stderr was therefore missed: the job skipped `memory_limit_reached` resubmission and, with no resubmit rule, finished OK. Re-fetching the streams from Pulsar isn't an option because the remote job may already be cleaned. Fix `e21894abae9` saves both streams as `galaxy_<id>.job_stdout`/`.job_stderr` beside the `.ec` file before the metadata step, and `_finish_staged_job` reads them back (`None` when absent, so jobs from before the upgrade behave as before). Red-to-green test: `test_staged_job_recovered_during_metadata_keeps_oom_kill` in `test/unit/app/jobs/test_pulsar_runner.py`.

Not acted on:

- None. Codex's coverage note says it didn't review the mirrored Pulsar copy of the job-script changes (galaxyproject/pulsar, `pulsar/managers/util/`). That's informational, not a finding.

<details><summary>Full review</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/config/sample/job_conf.sample.yml",
      "lib/galaxy/jobs/__init__.py",
      "lib/galaxy/jobs/command_factory.py",
      "lib/galaxy/jobs/runners/__init__.py",
      "lib/galaxy/jobs/runners/local.py",
      "lib/galaxy/jobs/runners/pulsar.py",
      "lib/galaxy/jobs/runners/slurm.py",
      "lib/galaxy/jobs/runners/state_handlers/resubmit.py",
      "lib/galaxy/jobs/runners/util/job_script/CGROUP_OOM_KILLS_STATEMENT.sh",
      "lib/galaxy/jobs/runners/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh",
      "lib/galaxy/jobs/runners/util/job_script/__init__.py",
      "lib/galaxy/model/__init__.py",
      "lib/galaxy/tool_util/output_checker.py",
      "packages/app/MANIFEST.in",
      "test/integration/test_job_resubmission.py",
      "test/unit/app/jobs/test_job_script_oom_kills.py",
      "test/unit/app/jobs/test_pulsar_runner.py",
      "test/unit/app/jobs/test_runner_local.py",
      "test/unit/app/jobs/test_runner_output_collection.py",
      "test/unit/app/jobs/test_slurm_runner.py",
      "test/unit/tool_util/test_output_checker.py"
    ],
    "notes": "Reviewed the changed hunks and relevant surrounding paths. The separate galaxyproject/pulsar repository was outside the requested diff."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/jobs/runners/pulsar.py",
      "line": 936,
      "title": "Recovered Pulsar jobs lose the stderr needed to detect an OOM kill",
      "detail": "The new Pulsar failure check reads `result.job_stderr`, but `_finish_staged_job` reconstructs the result with `job_stderr=None`. Recovery runs when a job was interrupted during external metadata handling, before `_finish_pulsar_job` checked and stored the streams. The recovered job therefore cannot detect an OOM report that appeared only on the job's stderr.",
      "failure_scenario": "A Pulsar job exits 0 after Slurm writes `Detected 1 oom-kill event(s)` to its job stderr. Galaxy restarts while the job is in FINISHING during external metadata handling. Recovery supplies `job_stderr=None`; `check_tool_output` returns OK, and the `memory_limit_reached` resubmission handler is never called.",
      "confidence": "certain"
    }
  ]
}
```

</details>

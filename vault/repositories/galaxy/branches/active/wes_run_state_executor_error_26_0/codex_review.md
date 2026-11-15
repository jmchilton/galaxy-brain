Run via gpt-6.1-sol at high effort.

# Codex review: wes_run_state_executor_error_26_0

Codex found one real problem and I fixed it. The docs' "Known limitations and gotchas" section still had the old rule: "a failed job does not make the run fail ... Only an invocation that fails to schedule maps to `EXECUTOR_ERROR`". That contradicts the new mapping. I rewrote that bullet, and while there I corrected the state table's `completed` → `COMPLETE` row. It had said "every job finished successfully", but skipped, deleted and stopped jobs also give COMPLETE; it now says "no job failed or is paused". Both are amended into the branch commit, now `24f37801ebd`.

Codex reviewed `c2778435ffa`, the diff `67305c6d0a1..c2778435ffa`. It ran read-only through `codex exec`, following the `jmchilton:codex-review` skill, with `-c model_reasoning_effort=high` and the findings schema. The brief gave it the intended behavior and house style, and nothing of the implementer's reasoning or earlier review results. Its read-only sandbox can't run shell commands on this host (bwrap fails), so the material went on stdin instead:
- the full diff;
- the full text at `c2778435ffa` of `services/wes.py`, `test_wes.py`, `managers/workflow_completion.py` and `doc/source/dev/ga4gh_wes.md`;
- excerpts of `galaxy.model`: the `Job` state groups, the `WorkflowInvocation.completion` relationship, `is_complete`, `compute_recursive_job_state_summary`, `WorkflowInvocationStep.is_complete` and `WorkflowInvocationCompletion`;
- the completion notification hook's use of `job_state_summary`.

Codex reviewed only what it was given and ran no tests. Its payload didn't include the performance step's new unit test, `test/unit/webapps/test_wes_service_queries.py`. That step ran at the same time, and the test was committed after the payload was built.

## Triage

- **CONFIRMED, fixed.** P2, documentation: the "Known limitations and gotchas" bullet at `doc/source/dev/ga4gh_wes.md:432` contradicted §4.

## Not acted on

Nothing. There was only the one finding.

<details>
<summary>Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/webapps/galaxy/services/wes.py",
      "lib/galaxy_test/api/test_wes.py",
      "doc/source/dev/ga4gh_wes.md",
      "lib/galaxy/managers/workflow_completion.py",
      "lib/galaxy/model/__init__.py",
      "lib/galaxy/workflow/completion_hooks/notification.py"
    ],
    "notes": "Model and notification code were reviewed only through the supplied excerpts. Test populator and fixture implementations, API router, and schemas were not supplied. Tests could not be run."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "documentation",
      "file": "doc/source/dev/ga4gh_wes.md",
      "line": 432,
      "title": "The known-limitations section still documents the reversed behavior",
      "detail": "The first bullet under 'Known limitations and gotchas' still says failed jobs do not make a run fail and only scheduling failures map to EXECUTOR_ERROR. This directly contradicts the new mapping and the updated section 4.",
      "failure_scenario": "A completed invocation with job_state_summary={\"error\": 1} now returns EXECUTOR_ERROR from all three endpoints, while the known-limitations guidance tells clients that this run remains COMPLETE.",
      "confidence": "certain"
    }
  ]
}
```

</details>

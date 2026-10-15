# PR #24130 — Add a gpus job resource parameter to the sample resource params and job configs

- PR: https://github.com/galaxyproject/galaxy/pull/24130
- Reviewed commit: `67ec6b8cd56506dee166e280320e82eddba21d10`
- Review date: 2026-10-14
- Delivery status: **UNPOSTED** — review draft below; no GitHub review submitted.
- Recommendation: **Approve**; no actionable ordinary findings.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24130`

## Review

The change adds one optional integer resource parameter, includes it in matching YAML/XML sample resource groups, and documents the existing GCP Batch behavior. It reuses the generic resource-parameter mechanism without introducing runner or API changes. The new test exercises both sample job configuration formats through inheritance and checks the actual conditional XML produced for a mapped tool.

Checked the surrounding resource-group lookup, tool parameter conversion and persistence, job resource extraction, GCP resource precedence, and existing GPU batch-spec tests. Blank values persist as `None`, explicit zero persists as zero, and the existing runner distinguishes them correctly. The docs correctly distinguish the sample's `memory`/`time` names from the runner's directly consumed `mem`/`walltime`; those existing differences are not introduced here. Fixed G2 machine types still carry their physical GPUs regardless of a zero resource request; this is existing runner behavior, not changed by this PR.

Read the PR body, issue discussion, submitted review, and inline review comments (none). `afgane` has approved this same head. Latest head and OPEN state were rechecked after validation.

## Validation

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=lib /Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest -p no:cacheprovider test/unit/app/jobs/test_job_configuration.py test/unit/app/jobs/test_gcp_batch_runner.py -q
```

**288 passed** in 11.62 seconds on Python 3.13.12. One existing collection warning concerns the helper `TestApplicationStack`. After successful pytest completion an atexit cleanup callback encountered a sandbox-denied process-list operation; pytest exited zero and all tests passed.

An additional direct check instantiated `IntegerToolParameter` from the actual sample XML, validated and round-tripped blank/None/0/1/8 through JSON persistence, and confirmed -1 and 9 are rejected. No cloud job was submitted.

GitHub unit tests (3.10 and 3.14), docs, Python linting, API, tool framework, and workflow framework checks passed at inspection. Package CI on both Python versions fails in unchanged `galaxy/security/ssh_util.py:18` because mypy considers `publickey()` untyped. Downloaded integration shard 2 results show failures in the existing cached explicit Singularity container resolver's tool execution and install tests; these do not exercise the modified sample resource parameters. Other integration/browser work was still pending when checked. This is not an assertion that the full CI suite is green.

## Risks

Risks are minimal: this is a sample configuration, documentation, and test change that is inexpensive to revert (a two-way door). Deployments must opt into the sample resource configuration and resource-group mapping; the precedence of zero versus blank already exists in the runner. No database, API, workflow-format, or tool-format change is introduced.

## Proposed GitHub review — UNPOSTED

Looks good to me. The optional integer preserves the distinction between leaving GPUs unset and explicitly requesting zero, and both sample job configuration formats include the field consistently. I ran the job configuration and GCP Batch runner tests: 288 passed, and separately checked blank/zero parameter persistence and range validation against the sample XML.

Risks are minimal: this extends opt-in sample configuration and documentation using the existing resource-parameter mechanism, with no runner or API behavior change.

## Tracking ended — 2026-10-15

GitHub confirms MERGED at `2026-10-15T08:45:40Z`, final PR head `67ec6b8cd56506dee166e280320e82eddba21d10`. Archived after merge and removed from the queue. The clean worktree HEAD matched or was an ancestor of the final PR head and was removed with `ghwt rm galaxy 24130`. Cleanup did not re-review later commits or post the draft.

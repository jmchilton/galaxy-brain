Run via gpt-6-sol at medium effort.

Codex found no defects at `fcf41a60`; nothing to act on.

<details><summary>Full review</summary>

Read-only `codex exec` over `git diff origin/master...HEAD`, brief limited to the intended behavior (untyped format2 inputs treated as data in `workflow_job_init`/`workflow_test_init` templates).

- Findings: none.
- Coverage: `planemo/galaxy/workflows.py`, both init commands, the fixture, both CLI test modules, `tests/test_galaxy_workflow_utils.py`; also gxformat2 normalization and input schema code for omitted types. Its focused run passed 25 tests.

</details>

```
  hardening @ fcf41a605d2e vs origin/master (merge-base 2a8158086c42)
  since 20261029T161627Z-implementation-fcf41a605d2e:
    commits: 1 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   6 carried, 0 changed, 0 new, 0 dropped
```

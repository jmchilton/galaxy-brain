---
upstream_base_branch: main
pr: 299
---

# Restrict pytest to `tests/`; ship lint/schema-rule YAMLs

- [PR #299](https://github.com/galaxyproject/gxformat2/pull/299)
- [View on GitHub](https://github.com/jmchilton/gxformat2/tree/ci_restrict_pytest_testpaths)
- [PR description](pr_description.md)

## Status

Merged 2026-11-12 as `3547f99` ([#299](https://github.com/galaxyproject/gxformat2/pull/299)).

## Notes

- Cause: IWC #1541 (merged 2026-11-11 14:15Z) added `scripts/tests/`, importing planemo. The 3.13 job checks IWC out into `iwc/` and runs bare `pytest`, so it collected it. That import loaded installed gxformat2 before the source tree, and the installed copy lacks `schema_rules.yml`, so `tests/test_schema_rules_catalog.py` failed too.
- Every open gxformat2 PR (and main, on its next run) hits this 3.13 red until it lands; rerunning won't help.
- Worktree: `~/projects/worktrees/gxformat2/branch/ci_restrict_pytest_testpaths`.

---
upstream_base_branch: release_26.2
---
# Deployment test documentation and decorator audit

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:deployment_test_docs_decorators_26_2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/deployment_test_docs_decorators_26_2)

## Status

Rebased onto `release_26.2` and pushed at `a674af1a43f` on 2026-11-06, after parent #24489 merged.

Fork CI has not been reviewed. Local decorator unit tests passed (23 tests).

## Notes

Updates `doc/source/dev/writing_tests.md` for deployment test selection, external runs, and requirement decorators. Adds `.agents/skills/check_python_test_decorators/SKILL.md` to check annotations whenever Python API or Selenium tests are added or edited.

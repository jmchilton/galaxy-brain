---
upstream_base_branch: release_26.2
parent_branch: deployment_test_fixes_26_2
---
# Deployment test documentation and decorator audit

- [Open PR](https://github.com/jmchilton/galaxy/compare/deployment_test_fixes_26_2...deployment_test_docs_decorators_26_2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/deployment_test_docs_decorators_26_2)

## Status

Implemented and pushed at `246bf9cedbd` on 2026-10-26. Stacked on `deployment_test_fixes_26_2`.

Fork CI has not been reviewed. Local decorator unit tests passed (23 tests).

## Notes

Updates `doc/source/dev/writing_tests.md` for deployment test selection, external runs, and requirement decorators. Adds `.agents/skills/check_python_test_decorators/SKILL.md` to check annotations whenever Python API or Selenium tests are added or edited.

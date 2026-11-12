Fix the Python 3.13 CI red caused by IWC's new `scripts/tests/`.

The 3.13 job checks IWC out into `iwc/` at the repo root and runs bare `pytest`. Since galaxyproject/iwc#1541 added `scripts/tests/` (which imports planemo), pytest collects it and errors. That import also loads the installed gxformat2 ahead of the source tree, and the installed copy has no `schema_rules.yml`, so `tests/test_schema_rules_catalog.py` fails as well.

- Set `testpaths = ["tests"]` so bare `pytest` collects only gxformat2's tests. Without `iwc/` the collection is unchanged (971 tests).
- Add `lint_profiles.yml` and `schema_rules.yml` to package data. Neither ships in the sdist or wheel today, so `load_lint_profiles()` and `load_schema_rules()` fail on an installed gxformat2.

Verified locally with a fresh IWC clone at `iwc/`: `tox -e py313-unit` reproduces both collection errors on `main`, and `py313-unit`, `py313-mypy` and `py313-iwc` pass with this branch.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

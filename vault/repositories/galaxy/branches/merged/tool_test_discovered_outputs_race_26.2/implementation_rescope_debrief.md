# Rescope debrief

The scope evaluation recommended a modest expansion and the user approved it. Commit `5ebad012d73` adds `DISCOVERED_OUTPUT_PREFIX`, `discovered_output_name` and `is_discovered_output` in `tool_util/verify/interactor.py`. They replace the hand-built `__new_primary_file_` names in `verify_output_dataset`, `split_declared_job_outputs` and `galaxy_test/selenium/framework.py`, and two unit tests pin the name format.

- The original version is kept as an alt; see `alts/original_scope.md`.
- Galaxy core (`output_collect.py`, `store/discover.py`, `model/__init__.py`) is left alone. It is out of reach of `tool_util`, so unifying it is a possible `dev` follow-up through `galaxy.util`.
- The review approved the change; see `subagents/rescope_review.md`.
- Tests: `test/unit/tool_util/verify/` 160 passed; ruff, black, isort and pre-commit all pass.

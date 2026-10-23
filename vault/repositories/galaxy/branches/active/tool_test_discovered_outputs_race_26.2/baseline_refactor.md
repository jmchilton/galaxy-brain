Two behavior-preserving refactor commits now sit on `release_26.2` ahead of the fix: `split_declared_job_outputs` extraction, then shared discovered-output name helpers. The fix commit adds only the skip + unit test.

- `e7eda4a98db` Extract split_declared_job_outputs from resolve_tool_submission - unchanged from earlier draft.
- `9bae7a94ac5` Share discovered output name helpers in tool test verification - moved before the fix (was `9b2fd1671c3`, after it). Adds `DISCOVERED_OUTPUT_PREFIX`, `discovered_output_name`, `is_discovered_output` in `interactor.py`; uses them in `GalaxyInteractorApi` discovered-dataset count/lookup and in `galaxy_test/selenium/framework.py`. Base behavior unchanged.
- `fc70b831522` Skip discovered datasets when resolving tool request outputs - skip now written with `is_discovered_output` directly + `test_split_declared_job_outputs_skips_discovered_datasets`.

Final tree identical to prior HEAD `9b2fd1671c3`. `pytest test/unit/tool_util/verify/`: 157 / 157 / 158 passed per commit. Force-pushed to `jmchilton`.

Extracted `split_declared_job_outputs` (behavior-preserving) into its own commit on `release_26.2`; the fix commit now only adds the `__new_primary_file_*` skip + unit test.

- `e7eda4a98db` Extract split_declared_job_outputs from resolve_tool_submission - moves the inline outputs/collections loop in `GalaxyInteractorApi.resolve_tool_submission` to a module-level function in `lib/galaxy/tool_util/verify/interactor.py`; no skip, base behavior unchanged.
- `31462df5561` Skip discovered datasets when resolving tool request outputs - adds the skip + `test_split_declared_job_outputs_skips_discovered_datasets`.

Final tree identical to prior HEAD `a21117ee072`. `pytest test/unit/tool_util/verify/`: 157 passed on refactor commit, 158 on HEAD. Force-pushed to `jmchilton`.

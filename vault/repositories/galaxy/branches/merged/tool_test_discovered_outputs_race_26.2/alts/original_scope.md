# original_scope

Branch `tool_test_discovered_outputs_race_26.2_alt_original_scope` (`31462df5561`) is the branch before the rescope. It has the refactor that extracts `split_declared_job_outputs` and a fix that skips `__new_primary_file_*` outputs with an inline prefix check. It doesn't have the shared `discovered_output_name` / `is_discovered_output` helpers, so `interactor.py` and the selenium `framework.py` still build the name by hand.

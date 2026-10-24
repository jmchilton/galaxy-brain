# Filtered findings: planemo#1748

- generic_test_challenger P3 1, "`_ShutDownRunResponse` duplicates an existing run-response stub": filtered as not worth acting on. The reviewer marked it optional. `MockRunResponse` in `tests/test_test_checker.py` predates the PR, the PR doesn't touch it, and it differs from this stub: it has no runnable constructor, fixed `log` and `job_info` values, and a real `outputs_dict`. Consolidating them means changing an untouched test module for little gain.

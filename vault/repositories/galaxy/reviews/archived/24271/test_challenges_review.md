# Test challenges review — PR #24271

Profile: gx_test_challenger. Model: claude-opus-5-5. Effort: medium. Reviewed commit `2959dfdd4dce4a85e69c6a5b6a2b0c181981eb28`. Details/test plan: [test_challenges_debrief.md](test_challenges_debrief.md). Tests not run (worktree has no `.venv`).

The new `queue_with_limit` tests (`test_destination_tag_limit_counts_dynamic_destinations`, `test_destination_user_tag_limit`) are good and cover the new per-user tag limit. Main gap is the handler path.

### P2 1: Handler tag-limit checks changed but untested

`JobHandlerQueue.__check_user_jobs` and `__check_destination_jobs` (`lib/galaxy/jobs/handler.py`) now count via `get_destination_ids_for_tag`. This is the main enforcement path with `track_jobs_in_database`, yet no test covers tag limits there, dynamic or not. `test/unit/app/jobs/test_handler.py` already has a real-DB harness (sqlite param) testing id and user limits (`test_ordinary_limits_keep_front_window_and_cached_destinations`).

Suggested fix: add a tag-limit test(s) there. Tag the harness destination, set a total (and a user) tag limit, create a running job in an id known only through the dynamic registry. Assert the new job waits, then dispatches once the limit is lifted.

### P3 1: Dynamic-registry tests overlap

`test_dynamic_destination_tags` is mostly covered by `test_dynamic_destination_tags_replaced_per_source`. Its only distinct assertion is a tag known only from a dynamic source. Both parse the full advanced sample config, and both run twice (XML + YAML subclasses), to test an in-memory map. Fold the first into the second.

### P3 2: Extract tag registry so tests use the real thing, not a re-implemented fake

The source -> tag -> ids map plus its lock is a standalone abstraction embedded in `JobConfiguration`. `MockJobConfig.get_destination_ids_for_tag` in `test_queue_limit.py` re-implements it, so the "dynamic" part of those tests lives only in the fake. No test shows `set_dynamic_destination_tags()` output reaching a limit check.

Suggested fix: extract a small class (e.g. `DestinationTagRegistry`) that `JobConfiguration` delegates to. Test it directly without parsing config. Have `MockJobConfig` and the handler harness hold a real instance.

### P3 3: Use a real `JobDestination` in `test_queue_limit.py`

`create_mock_destination()` is a `Mock()`, and the new tests reuse it. `JobDestination(id="one", runner="test_runner", tags=["one", "two"])` drops the mock at no cost. The mock is pre-existing, so this is optional.

### Note for bug reviewer (not a test finding)

A tagged dynamic destination that is never registered (TPV before #212) won't have its own id in `get_destination_ids_for_tag`, so its own running jobs aren't counted toward the tag. No test pins the intended behavior here.

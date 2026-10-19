# Test challenges debrief — PR #24271

Profile: gx_test_challenger (claude-opus-5-5, medium effort). Reviewed commit `2959dfdd4dce4a85e69c6a5b6a2b0c181981eb28`. Worktree `~/projects/worktrees/galaxy/pr/24271` (no `.venv`; tests reasoned about, not run).

## Tests added/changed

`test/unit/app/jobs/test_job_configuration.py` (run under both XML and YAML parser subclasses):

- `test_destination_ids_for_tag` — parse-time registry fill from sample advanced config. Keep. Running under both formats is legitimate: it checks both parsers feed the registry.
- `test_dynamic_destination_tags` — union of config + one dynamic source. Mostly subsumed by the next test (which also asserts the config union for `longjobs`). Only distinct assertion: a tag known solely from a dynamic source (`dynamic`). Recommend folding into the next test.
- `test_dynamic_destination_tags_replaced_per_source` — per-source replace, other-source isolation, empty-mapping removal. Keep; this is the real contract of `set_dynamic_destination_tags`.
- The two dynamic-registry tests don't touch parsing, but each runs twice (XML + YAML) and parses the full advanced sample config to test a pure in-memory map. Symptom of the registry being embedded in `JobConfiguration` (see refactor below).

`test/unit/app/jobs/test_queue_limit.py`:

- `MockJobConfig.get_destination_ids_for_tag` — hand-rolled fake reimplementing registry lookup. Fine for `queue_with_limit` SQL coverage, but the "dynamic" in the test names lives entirely in the fake: nothing proves `set_dynamic_destination_tags()` output reaches the limit check.
- `test_destination_tag_limit_counts_dynamic_destinations` — total tag limit counts jobs in an unregistered-in-config id. Keep; would fail on base (base used `get_destinations()`, config only).
- `test_destination_user_tag_limit` — new per-user tag limit in `queue_with_limit`, incl. other-user isolation. Keep; strongest new test, covers genuinely new behavior.
- `create_mock_destination()` (pre-existing) is a `Mock()`; a real `JobDestination(id="one", runner="test_runner", tags=["one", "two"])` is trivial and removes the mock. New tests reuse it.

## Gaps

1. Handler path untested. `JobHandlerQueue.__check_user_jobs` and `__check_destination_jobs` (`lib/galaxy/jobs/handler.py` ~1043, ~1108) were switched to `get_destination_ids_for_tag` — the primary enforcement path when `track_jobs_in_database` is on — but no test covers tag limits there (before or after). `test/unit/app/jobs/test_handler.py` already has a real-DB `HandlerHarness` (sqlite via `@pytest.mark.parametrize("handler", ["sqlite"], indirect=True)`) with `test_ordinary_limits_keep_front_window_and_cached_destinations` covering id/user limits; a tag-limit variant is a small addition.
2. No test wires real registry -> limit. Every limit test uses a fake job_config. One test using a real `JobConfiguration` registry (or extracted registry object, below) + `set_dynamic_destination_tags(...)` + a limit check would prove end-to-end wiring.
3. Unregistered dynamic destination. If a TPV destination has tags but TPV (pre-#212) never registers it, `get_destination_ids_for_tag` won't include the job's own destination id, so its own running jobs aren't counted. Not hunting bugs here, but no test pins intended behavior for this (likely common during rollout) case. Flag for the bug reviewer.

## Integration / E2E

- E2E/Selenium: not applicable (no UI).
- Integration: real TPV registration lives in total-perspective-vortex#212 (not yet released), so an integration test can't exercise it. A custom dynamic rule calling `set_dynamic_destination_tags` in an integration job conf is possible but heavy relative to the handler-harness unit test; not recommended.

## Test plan (recommendations; PR not edited)

1. (P2) Add handler-level tag-limit test(s) in `test_handler.py` on the sqlite harness: destination `JobDestination(id="local", runner="local", tags=["grp"])`, `destination_total_concurrent_jobs["grp"] = 1` (and a `destination_user_concurrent_jobs` variant), a running job with `destination_id="dynamic_x"`, registry mapping `grp -> {"local", "dynamic_x"}`; assert new job is not dispatched, then dispatched after limit cleared/registration removed. Harness `job_config` is a `SimpleNamespace`; give it `get_destination_ids_for_tag` backed by a real registry (see 3).
2. (P3) Merge `test_dynamic_destination_tags` into `test_dynamic_destination_tags_replaced_per_source`.
3. (P3) Refactor: extract the source -> tag -> ids map + lock into a small class (e.g. `DestinationTagRegistry` with `set_source(source, tags)` / `ids_for_tag(tag)`), owned by `JobConfiguration` which delegates. Registry tests become plain unit tests (no config parse, no XML/YAML double run); `MockJobConfig` in `test_queue_limit.py` and the handler harness hold a real registry instead of reimplementing lookup, which also closes gap 2.
4. (P3) Replace `create_mock_destination()`'s `Mock()` with a real `JobDestination`.

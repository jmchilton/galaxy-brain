# Test challenges review — PR #25003

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `e9fa3cda0899fe6de6fa53b13064a12905b97620`
- Details: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: test strategy is sound. Unit tests use a real in-memory model with no mocks and target exactly what the API can't drive (commit timing, savepoints, rollback, batching, resync). Integration tests are red-green against the new behavior. No unit tests to drop; no E2E warranted for a backend-only PR. Findings are helper reuse and a few uncovered routing branches. Unit tests pass locally (13/13); integration tests not run.

## P2 1 — Add populator helpers for `events/history-subscriptions`

POST/DELETE against `events/history-subscriptions` now appears five times: `BasePopulator._subscribe_to_history_owned_by_others` and the `wait_on_sse` cleanup in `lib/galaxy_test/base/populators.py`, `_subscribe_as_viewer` in `test/integration/test_invocation_sse.py`, and the POST and DELETE in `test/integration/test_history_sse.py`. Add `subscribe_history_viewer(history_ids)` / `unsubscribe_history_viewer(history_ids)` on the populator (asserting 204) and use them in all three places.

## P3 1 — Unit-test the `invocation_update` / `job_update` queue-worker handlers

The new handlers in `lib/galaxy/queue_worker/__init__.py` have branches no test reaches: excluding owners from viewer pushes (an owner subscribed to their own history should get one event), anonymous delivery via `push_to_session` (populator waits poll for anonymous users), and resync fan-out to users, sessions and history viewers (the publisher unit test stops at the dispatcher call). `SSEConnectionManager()` builds with no arguments (`test/unit/app/managers/test_sse_stream.py`), so a unit test with a real manager and `IdEncodingHelper` needs no mocks. The two handlers duplicate their grouping loop; extracting it into one helper would shrink both the code and the tests. Optional.

## P3 2 — Share SSE integration test scaffolding

`_listener(api_key)` is duplicated in `test_invocation_sse.py` and `test_job_sse.py`, and `test_job_sse.py::_states_for` is identical to `test_invocation_sse.py::_job_states_for`. Move the listener factory to a shared base or `galaxy_test.base.sse`, with `job_states_for` / `invocation_states_for` beside it; `test_history_sse.py` can use the factory too.

## P3 3 — Tidy `RecordingDispatcher` and the dispatcher type

In `test/unit/app/managers/test_change_events.py`, `job_calls` holds 4-tuples, so each assertion repeats `([...], [], [], [])`. Record a dataclass (`updates`, `resync_user_ids`, `resync_session_ids`, `resync_history_ids`) so assertions name their fields. Every `register` call needs `# type: ignore[arg-type]`; typing `ChangeEventPublisher.__init__` against a two-method `Protocol` (`invocation_update`, `job_update`) drops the ignores and records what the publisher depends on.

## P3 4 — `test_dispatch_failure_does_not_fail_commit` never reaches `job_update`

`BrokenDispatcher.job_update` is unused because the transaction has no job. Add a job to the same transaction so the test covers both guarded sends. A dispatcher that records calls and then raises would also show the job dispatch is still attempted after the invocation dispatch fails.

## P3 5 — Malformed subscription ids are skipped, untested

`EventsService._is_accessible_history` returns `False` for `MalformedId` / `ObjectNotFound`. Send `[published_history_id, "notanid"]` in the viewer's subscription in `test_viewers_of_accessible_histories_receive_invocation_and_job_updates` to cover the skip path and show a bad id doesn't drop the good one.

# Test challenges debrief — PR #25003

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `e9fa3cda0899fe6de6fa53b13064a12905b97620`
- Mode: REVIEW_DIRECTORY (recommendations only; PR not edited)

## Inventory

| File | Layer | Tests |
|---|---|---|
| `test/unit/app/managers/test_change_events.py` | unit (real in-memory sqlite model, recording dispatcher) | 13 |
| `test/integration/test_invocation_sse.py` | integration | 5 across 3 classes (+ viewers class) |
| `test/integration/test_job_sse.py` | integration | 3 |
| `test/integration/test_history_sse.py` | integration | 1 edited (viewer history made public) |
| `lib/galaxy_test/base/populators.py`, `lib/galaxy_test/base/sse.py` | test framework | event-driven waits; exercised by the integration tests above |

Ran: `pytest test/unit/app/managers/test_change_events.py` — 13 passed (using the main clone's venv with `PYTHONPATH=lib`; the PR worktree has no `.venv`). Integration tests were not run (slow; shared machine).

## Unit tests (`test_change_events.py`)

Overall these are good unit tests: no mocks, a real mapped model on in-memory sqlite, and a small recording double for the dispatcher. They cover what the API can't drive deterministically: commit timing (flush vs commit), rollback, released/rolled-back savepoints, per-transaction batching, the resync threshold, anonymous routing, and dispatch failure. None test implementation directly in a way worth dropping.

Per-test challenge:

- `test_set_state_is_published_only_once_committed` — keep. Flush-vs-commit timing not reachable from API.
- `test_rolled_back_change_is_not_published` — keep.
- `test_unchanged_state_is_not_published` — keep; also pins `set_state` not reverting a completed invocation.
- `test_changes_of_one_transaction_are_sent_together` — keep (batching).
- `test_released_savepoint_is_published_with_the_root_transaction` / `test_rolled_back_savepoint_is_not_published` — keep; the core subtle semantics.
- `test_message_is_published_with_the_current_state` — partially overlaps the integration cancel test (cancellation adds a message), but isolates the message source; keep.
- `test_invocation_in_an_ownerless_history_is_published_for_its_viewers` — keep.
- `test_dispatch_failure_does_not_fail_commit` — keep, but `BrokenDispatcher.job_update` is dead: the transaction has no job. Add a job in the same transaction and assert the commit still lands; a recording-then-raising dispatcher could also show the job dispatch is still attempted after the invocation dispatch fails (`_after_commit` calls both, each guarded separately).
- `test_job_state_change_is_published_only_once_committed`, `test_job_state_assignment_is_published_with_the_state_at_commit` — keep; the `mark_deleted` / direct `SKIPPED` assignment paths (no `JobStateHistory`) aren't distinguishable at the API layer.
- `test_anonymous_job_is_routed_to_its_session` — keep (publisher side only; see handler gap below).
- `test_too_many_job_changes_for_one_recipient_become_a_resync` — keep; 500+ jobs in an integration test is not worth it.

Readability / design recommendations:

1. `RecordingDispatcher.job_calls` stores 4-tuples, so every job assertion repeats `([...], [], [], [])`. Record a small dataclass (`JobDispatch(updates, resync_user_ids, resync_session_ids, resync_history_ids)`) or add an `_job_update(job, user=..., session=..., history=...)` builder; assertions become one line and say what the empty lists mean.
2. Every `register` call carries `# type: ignore[arg-type]` because the doubles aren't `SSEEventDispatcher`s. `ChangeEventPublisher` only uses `invocation_update` and `job_update`; typing its constructor against a two-method `Protocol` removes the ignores and documents the publisher's actual dependency.

## Gaps

### Queue-worker handlers `invocation_update` / `job_update` (routing) — no direct tests

`lib/galaxy/queue_worker/__init__.py` adds two near-identical routing functions with logic the integration tests don't reach:

- owner exclusion from viewer pushes (`exclude_user_ids=owners_by_history[...]`) — an owner subscribed to their own history should get one event, not two;
- anonymous session delivery (`push_to_session`) — integration waits poll for anonymous users, so the session branch is never exercised end to end;
- resync delivery to users, sessions and history viewers (`resync_*_ids`) — the unit test stops at the publisher's dispatcher call.

`SSEConnectionManager()` constructs with no arguments (see `test/unit/app/managers/test_sse_stream.py`), so these handlers can be unit tested with a real manager, a real `IdEncodingHelper`, and registered fake connections/queues — no mocks. Extracting the shared grouping logic (`by_user` / `by_session` / `by_history` / `owners_by_history`) into one helper used by both handlers would shrink both the code and the test matrix. Note there is no precedent unit test for the existing `history_update` handler either, so this is new coverage, not parity.

### History-subscription access check

New behavior: `POST /api/events/history-subscriptions` skips histories the requester can't access and malformed ids. Covered: published history (viewer receives), private history of another user (outsider receives nothing, including `history_update` — a good red test, since before the PR any id was accepted), owned history (populator skips subscribing). Not covered: a malformed or nonexistent id still yields 204 and does not break subscription to the other ids in the same request. Cheap to fold into `test_viewers_of_accessible_histories_receive_invocation_and_job_updates` by sending `[published_history_id, "notanid"]` for the viewer. Shared-with-user and anonymous-current-history branches defer to `HistoryManager.is_accessible`, which is tested elsewhere; no new test needed.

### Integration helpers

- `POST/DELETE events/history-subscriptions` now appears 5 times across `populators.py` (`_subscribe_to_history_owned_by_others`, `wait_on_sse` cleanup), `test_invocation_sse.py::_subscribe_as_viewer`, and `test_history_sse.py` (POST and DELETE). Per the helper rule, add populator methods (e.g. `subscribe_history_viewer(history_ids)` / `unsubscribe_history_viewer(history_ids)`) and use them in all three places.
- `_listener(api_key)` is copied verbatim into both new integration files; `_states_for` in `test_job_sse.py` is byte-identical to `_job_states_for` in `test_invocation_sse.py`. Move the listener factory into a shared SSE integration base (or `galaxy_test.base.sse` as `listener_for(url, api_key)`) and the state extractors into `galaxy_test.base.sse` (`invocation_states_for`, `job_states_for`); `test_history_sse.py` could adopt the listener factory too.

### Red-green sanity (reasoned, not run)

- `test_scheduling_a_step_of_a_ready_invocation_sends_an_event` — without step recording the invocation emits a single `ready`, so `count("ready") >= 2` fails. Red.
- Viewer/outsider test — without the access check the outsider would receive `history_update` for the private history. Red.
- `test_cancelling_an_invocation_sends_its_job_deleting` — without the `RETURNING`-based `record_job_change` in `cancel_invocation_steps`, no `deleting` event; the wait is the assertion. Red.

### E2E

Backend-only PR; the PR states client consumers follow separately. No Selenium/Playwright test is warranted now. The client PR should carry an E2E that an invocation/job view updates without polling.

### CI exposure of event-driven waits

The new SSE branch in populator waits only activates when the server reports `enable_sse_updates`, which CI enables only for these integration classes (and `test_history_sse.py`). That's adequate coverage of the framework code; not a finding.

## Test plan (recommendations)

1. P2 — add populator helpers for history-subscription POST/DELETE and use them in populators, `test_invocation_sse.py`, `test_history_sse.py`.
2. P3 — unit-test the `invocation_update` / `job_update` queue-worker handlers with a real `SSEConnectionManager` (owner exclusion, session delivery, resync fan-out); optionally extract shared grouping first.
3. P3 — share `_listener` and the state extractors across the SSE integration files.
4. P3 — `RecordingDispatcher` dataclass records; `Protocol` for the publisher's dispatcher dependency.
5. P3 — extend `test_dispatch_failure_does_not_fail_commit` to include a job (currently `BrokenDispatcher.job_update` is unused).
6. P3 — malformed id in the viewer subscription request is skipped without failing the others.

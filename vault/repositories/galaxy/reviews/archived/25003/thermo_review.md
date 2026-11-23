# Thermo review — galaxy#25003 (Send invocation_update and job_update SSE events)

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `e9fa3cda0899fe6de6fa53b13064a12905b97620` (base `dev`)
- Scope: reuse/refactoring only; code not run.

## Verdict

The core design (collect per transaction in `session.info`, send on root `after_commit`) is the right
shape and is well contained in `galaxy.managers.change_events`. The structural debt is downstream of
it: the same change data has three representations (positional tuples, TypedDicts, grouped dicts),
the two new queue-worker consumers are near copies of each other, and the test-framework SSE waits
accrete into the already 5.5k-line `populators.py`. No file crosses 1k lines because of this PR
(`queue_worker/__init__.py` 739 -> 874; `model/__init__.py` and `populators.py` were already far over).

## Findings

### P2 1 — `invocation_update` and `job_update` consumers are copy-pasted fan-out

`lib/galaxy/queue_worker/__init__.py` `invocation_update` and `job_update` (~80 lines together)
repeat the same algorithm: build `{"id": encode(...), "state": ...}`, group into `by_user` /
`by_history`, track `owners_by_history`, local `event_for` closure, push to users, then
`push_to_history_viewers(..., exclude_user_ids=owners_by_history[...])`. They differ only in event
name, list key (`invocations` / `jobs`), the id field, and that jobs also route by session and have
resync lists. A third entity event (e.g. tool request, dataset) would copy it again.

Suggested fix: one helper, e.g.
`_push_entity_updates(sse_manager, event: str, list_key: str, entries: Iterable[tuple[routing, dict]])`
where `routing` carries `user_id`, `session_id`, `history_id`. `invocation_update` passes
`session_id=None`; `job_update` calls it then sends the resync events. If the update TypedDicts share
routing fields (see P2 2) the helper can take them directly. Keep `history_update` separate (its
payload is pre-grouped by the audit monitor) but consider whether its owner/session/viewer loop can
reuse the same helper.

### P2 2 — Pending changes stored as positional tuples, then re-packed into TypedDicts

`lib/galaxy/model/pending_changes.py` stores
`invocations: dict[int, tuple[int | None, int | None, str]]` and
`jobs: dict[int, tuple[int | None, int | None, int | None, str]]`, documented only by comments.
`ChangeEventPublisher._send_invocation_updates` / `_send_job_updates` unpack these by position and
rebuild `InvocationUpdate` / `JobUpdate` TypedDicts defined in `queue_worker`. The job tuple has three
adjacent `int | None` ids (user, session, history), so a swapped argument in any of the three call sites
of `record_job_change` (`_record_job`, `WorkflowInvocation._delete_jobs`, tests) type-checks silently.

Related asymmetry: `record_job_change` lives in `pending_changes.py`, but `record_invocation_change`
lives in `galaxy/model/__init__.py` (14k lines) only because it reads `invocation.history.user_id`.

Suggested fix: define the update records once (move `InvocationUpdate` / `JobUpdate` into
`galaxy.model.pending_changes` or a small neutral module that both `model` and `queue_worker` import),
store them directly as `dict[int, JobUpdate]` keyed by id, and give both recorders keyword-only
signatures in `pending_changes.py` (`record_invocation_change(session, *, invocation_id, user_id,
history_id, state)`; the model call site passes `history.user_id`). `_send_invocation_updates` then
becomes `list(pending.invocations.values())` filtered for routability, and the tuple-unpack loops
disappear. Same applies to the stringly `("user", id)` / `("session", id)` owner keys in
`_send_job_updates`; a grouping over `(update["user_id"], update["session_id"])` reads more directly.

### P2 3 — Test-framework SSE waiting accretes onto `BasePopulator` in a 5.5k-line file

`lib/galaxy_test/base/populators.py` gains ~150 lines: `_sse_listener` (default on `BasePopulator`,
overridden on `GalaxyInteractorHttpMixin` with a class-level `_sse_updates_enabled` cache),
`wait_on_sse`, `_subscribe_to_history_owned_by_others`, `_current_user_id`, `wait_on_job_update`,
`wait_on_history_update`, plus `wait_on_invocation` on `BaseWorkflowPopulator`. The logic is
transport (open stream, subscribe/unsubscribe as viewer, event predicates) and belongs with
`SSELineListener` / `wait_on_events` in `lib/galaxy_test/base/sse.py`.

Specific smells:
- `wait_on_job_update(job_id: str | None, ..., history_id: str | None)` is a nullable-mode API:
  `job_id=None` means "any job, history required", enforced by an `assert` inside a closure. Two
  methods (one per job, one per history) or one predicate argument would make the contract explicit.
- Every wait opens a new SSE connection and, when `history_id` is given, issues
  `GET histories/{id}` and `GET users/current` before waiting; the current user id is never cached.

Suggested fix: an `SSEWaiter` (or similar) in `galaxy_test/base/sse.py` constructed from the
interactor, owning the enabled check, listener lifecycle, viewer subscription and the three predicate
factories (job, invocation, history). The populator keeps thin `wait=partial(self._sse.wait_job, ...)`
hooks into `wait_on_state`. This also gives integration tests (P3 2) the same subscribe helper.

### P3 1 — `_delete_jobs` adds a publisher-presence branch to the model

`WorkflowInvocation._delete_jobs` branches on `pending_changes(sa_session) is None` to choose between a
plain bulk `UPDATE` and `UPDATE ... RETURNING` + `record_job_change`. That is feature logic (is SSE on?)
leaking into model code, with two code paths for one operation. Galaxy already uses `RETURNING`
unconditionally (e.g. the HID counter in `model/__init__.py`, `managers/notification.py`,
`celery/base_task.py`), and `record_job_change` is already a no-op
without a publisher, so always using `RETURNING` deletes the branch. Optional: the PR describes the
current behavior as deliberate, so weigh against the extra rows fetched when SSE is off.

### P3 2 — SSE integration-test scaffolding copied again

`test/integration/test_job_sse.py` and `test/integration/test_invocation_sse.py` each define the same
`enable_sse_updates` config hook, populator `setUp`, and `_listener()`; `_states_for` in
`test_job_sse.py` is a verbatim copy of `_job_states_for` in `test_invocation_sse.py`; and
`_subscribe_as_viewer` duplicates the populator's new `_subscribe_to_history_owned_by_others` POST.
`test_history_sse.py`, `test_notification_sse.py` and `test_entry_point_sse.py` already each carry
their own stream-URL/listener helper, so this PR adds the fourth and fifth copies. Suggested fix: a
shared `SSEIntegrationTestCase` (or mixin in `galaxy_test/driver`) with the config hook, `_listener`,
and state-extraction helpers; at minimum have `TestJobSSEIntegration` reuse
`BaseInvocationSSEIntegrationTestCase`'s base and helpers.

### P3 3 — Viewer de-duplication diverges from `history_update`'s documented policy

`history_update`'s docstring states viewer dispatch is additive and owners may get duplicates on
purpose ("cheaper than maintaining a dedup index"). The new consumers add
`exclude_user_ids` to `SSEConnectionManager.push_to_history_viewers` and skip owners, but only for
users (sessions are not excluded) and only for the new events. Pick one policy for all history-viewer
fan-out: either pass owners for `history_update` too and update its docstring, or drop
`exclude_user_ids` and rely on idempotent client refresh. If P2 1's helper exists, the policy lives in
one place.

### P3 4 — `SSELineListener` now has two waiting mechanisms

`lib/galaxy_test/base/sse.py` adds a `threading.Condition`-based
`wait_for_matching_event_count_above`, while the existing `wait_for_event` / `wait_for_event_where`
still poll via `wait_on`. Optional: re-implement the older two on the condition so the class has one
wait primitive.

## Notes (not findings)

- Two producer mechanisms now exist for SSE (`HistoryAuditMonitor` polling the audit table vs session
  listeners here). The PR justifies the listener approach; not asking to change it.
- `EventsService._is_accessible_history` could use `HistoryManager.get_accessible(...,
  current_history=...)` (`managers/secured.py`), but the `by_id` + `is_accessible` form avoids
  exception flow and is equivalent.

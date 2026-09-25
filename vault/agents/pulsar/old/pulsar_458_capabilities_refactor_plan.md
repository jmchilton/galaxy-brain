# PR #458 follow-up plan: lazy capability collection + de-mocked tests

Target: `galaxyproject/pulsar#458` (branch `pulsar-capabilities`).

This plan combines two coupled changes:

* **Part A — make capability collection lazy** (resolves review issue #2: collection
  runs unconditionally in `PulsarApp.__init__` for every deployment mode, but is only
  ever consumed by the relay publish path). Also incidentally deletes review issue #1
  (the stale `get_capabilities` comment lives in the method Part A removes).
* **Part B — re-anchor the new tests on real, constructible Pulsar objects** instead of
  bespoke duck-typed fakes, reusing existing test abstractions and adding one small,
  broadly-useful extension.

The two are deliberately rolled together: Part A deletes the cache attribute that the
heaviest mocks in Part B exist to satisfy, so doing them separately would mean writing
mock scaffolding in Part B only to delete it.

---

## Current state (verified against the branch)

* `pulsar/core.py:54` calls `self.__setup_capabilities()` from `PulsarApp.__init__`
  (between `__setup_managers` and `__setup_file_cache`). The method:
  ```python
  def __setup_capabilities(self):
      # Snapshot of static config + host probes that get_capabilities  <-- issue #1: no such symbol
      # publishes to the relay. Computed once; stays valid for this
      # process's lifetime since pulsar doesn't reload app.yml.
      self.capabilities_by_manager = collect_all_capabilities(self)
  ```
* `pulsar/core.py:18`: `from pulsar.capabilities import collect_all_capabilities`.
* `pulsar/messaging/bind_relay.py:publish_manager_capabilities_to_relay` reads the
  precomputed cache:
  ```python
  capabilities = (getattr(app, "capabilities_by_manager", {}) or {}).get(manager.name)
  if capabilities is None:
      log.warning("No cached capabilities for manager %s; skipping relay publish.", manager.name)
      return
  ```
* `pulsar/messaging/__init__.py:bind_app` relay branch already passes `app, manager,
  relay_transport, merged_conf` into the publisher — no signature change needed.
* Only non-test consumers of the capabilities module are `core.py:131` (collect) and
  `bind_relay.py:281` (read). No web/REST endpoint, no AMQP path, no client use.
* `pulsar.capabilities` runtime imports are stdlib + `galaxy.tool_util.deps.resolvers.conda`
  + `pulsar.__version__` only (no `pulsar.core` / `pulsar.messaging` at runtime; `core`
  is `TYPE_CHECKING`-only). A top-level `from pulsar.capabilities import collect_capabilities`
  in `bind_relay.py` introduces **no import cycle**.

### Existing test abstractions available (verified)

* `test/test_utils.py::minimal_app_for_managers()` → `Bunch(staging_directory,
  authorizer, job_metrics, dependency_manager=TestDependencyManager(),
  user_auth_manager, object_store)`. **Missing** `persistence_directory`; its
  `TestDependencyManager` has **no** `dependency_resolvers` / `default_base_path`.
* `test/test_utils.py::TestDependencyManager` — only `dependency_shell_commands`.
* `test/persistence_test.py::_app()` — near-duplicate of `minimal_app_for_managers()`
  but already adds `persistence_directory` and constructs **real**
  `StatefulManagerProxy(QueueManager('test', app, num_concurrent_jobs=N))`. This is the
  canonical lightweight real-manager pattern (no web boot, no job recovery).
* `pulsar/managers/queued.py`: `QueueManager.manager_type = "queued_python"` is a
  **class attribute** (so `getattr(type(underlying), "manager_type", ...)` works on a
  real instance); `__init__` builds `self.work_threads` of length `num_concurrent_jobs`
  (so `len(work_threads)` is exercised for real).
* Blast radius of touching shared helpers is tiny: `minimal_app_for_managers()` has 2
  consumers (`manager_factory_test.py:62`, `BaseManagerTestCase.setUp`);
  `TestDependencyManager` has 2 (`persistence_test.py:129`, inside
  `minimal_app_for_managers`). Both proposed changes are purely additive.

---

## Part A — lazy collection

### A1. `pulsar/core.py`
* Delete the `from pulsar.capabilities import collect_all_capabilities` import (line 18).
* Delete the `self.__setup_capabilities()` call (line 54).
* Delete the `__setup_capabilities` method entirely (this removes the issue-#1 stale
  comment as a side effect — no separate fix needed).

### A2. `pulsar/messaging/bind_relay.py`
* Add top-level import: `from pulsar.capabilities import collect_capabilities`.
* Rewrite the body of `publish_manager_capabilities_to_relay` so it collects on demand
  and preserves the "advisory, must not block bind" guarantee for **both** collection
  and POST failures:

  ```python
  def publish_manager_capabilities_to_relay(app, manager, relay_transport, conf):
      if not conf.get("message_queue_publish_capabilities", True):
          return
      try:
          capabilities = collect_capabilities(app, manager)
      except Exception:
          log.exception(
              "Failed to collect capabilities for manager %s; skipping relay publish.",
              manager.name,
          )
          return
      relay_topic_prefix = conf.get('relay_topic_prefix', '')
      topic = __make_capabilities_topic_name(relay_topic_prefix, manager.name)
      payload = capabilities.to_dict()
      payload["published_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
      try:
          relay_transport.post_message(topic, payload)
          log.info("Published capabilities for manager %s to relay topic %s", manager.name, topic)
      except Exception:
          log.exception(
              "Failed to publish capabilities for manager %s to relay topic %s",
              manager.name, topic,
          )
  ```
* The `getattr(app, "capabilities_by_manager", {})` lookup and the
  `"No cached capabilities"` warning branch are deleted (the concept no longer exists).

### A3. `pulsar/capabilities.py`
* Remove `collect_all_capabilities` (now unused — single consumer, single trigger).
  Keep `collect_capabilities` and all helpers/dataclasses unchanged.
  * If a reviewer prefers to keep `collect_all_capabilities` as public API, the
    fallback is to leave it but mark it unused; default recommendation is removal to
    avoid dead code.

### A4. `pulsar/messaging/__init__.py`
* No change (already passes `app, manager, relay_transport, merged_conf`).

### Net behavior after Part A
Collection happens **iff** relay messaging mode is active **and**
`message_queue_publish_capabilities` is true **and** for each manager actually being
bound. AMQP, web-only, and coexecution deployments do zero capability work and emit no
capability log noise. The wire payload and topic naming are byte-for-byte unchanged
(resilience scenario `test/resilience/scenarios/test_capabilities_publish.py` stays
valid as-is — but the implementer must actually re-run that scenario, since it is the
only end-to-end coverage of the relocated collect→publish path).

This is **not** new error-isolation behavior: a per-manager collection failure already
resulted in no snapshot for that manager (today via the "No cached capabilities"
warning). Post–Part A it is the collect-time `try/except` instead, logged as an
exception. The Galaxy-visible outcome is identical (no snapshot ⇒ Galaxy keeps using
operator-supplied params); only *where* the failure is contained moves.

---

## Part B — de-mock the tests

### B1. `test/test_utils.py` (additive, reusable beyond this PR)
* Extend `TestDependencyManager` so it satisfies the collector contract and can inject
  resolvers for tests that need them:
  ```python
  class TestDependencyManager:
      def __init__(self, dependency_resolvers=None, default_base_path=None):
          self.dependency_resolvers = dependency_resolvers or []
          self.default_base_path = default_base_path
      def dependency_shell_commands(self, requirements, **kwds):
          return []
  ```
  (Default-constructed behavior is unchanged for the 2 existing consumers.)
* Add `persistence_directory` to `minimal_app_for_managers()` (mirrors what
  `persistence_test._app()` already does; additive — neither existing consumer breaks).
* Promote the publisher test's `_RecordingTransport` into `test_utils` as a shared
  `RecordingRelayTransport` fake (records `(topic, payload)`; optional `raise_on_post`).
  Rationale: the relay HTTP transport is a genuine external boundary — a recording
  **fake** (not a `mock.Mock`) is the correct and reusable double for it.

> Non-goal / out of scope: consolidating `persistence_test._app()` into `test_utils`.
> Noted as a future cleanup; not done here to keep blast radius minimal.

### B2. Rewrite `test/capabilities_test.py`
* **Keep unchanged** (these are good — real logic, only OS-boundary `shutil.which`
  patched, real `CondaDependencyResolver` subclass instance):
  * `test_conda_*` (5 cases), `test_detect_container_runtime_cross_product`,
    `test_collects_dependency_resolver_attributes`,
    `test_resolver_without_resolver_type_is_skipped`,
    `_make_conda_resolver` helper (real subclass via `__new__` is acceptable: `__init__`
    is genuinely heavy and `isinstance` is the production contract).
* **Delete** the bespoke `_Manager` / `_App` classes and the genuinely tautological
  tests that only assert a hand-built fake is read back (each is fully covered by the
  real-`QueueManager` test below, which a real object exercises authentically):
  * `test_minimal_app_collects_clean_payload`,
    `test_stateful_manager_proxy_unwrap_for_manager_type`,
    `test_num_concurrent_jobs_prefers_work_threads_len`,
    `test_collect_all_capabilities_returns_per_manager_dict`.
* **Keep, narrowed to a minimal `_collect_manager` unit** (do **not** delete):
  `test_num_concurrent_jobs_falls_back_to_attr` and
  `test_num_concurrent_jobs_none_when_neither`. These cover the
  `getattr(underlying, "num_concurrent_jobs", None)` fallback at
  `pulsar/capabilities.py:186-188`. **No in-tree production manager sets a
  `num_concurrent_jobs` instance attribute** (verified: grep of `pulsar/managers/` is
  empty), so this branch is *unreachable by any real object* — it exists purely as a
  defensive hook for hypothetical third-party manager subclasses. A tiny duck-typed
  stub is therefore the **correct** tool here, not mock theater: the real-object test
  *cannot* reach this branch, so deleting these would be a genuine branch-coverage
  regression, not removal of a tautology. Retarget them at `_collect_manager` directly
  with a 3-line stub and a comment stating exactly why a stub is appropriate for an
  intentionally-third-party-only branch.
* **Replace** with real-object equivalents using existing patterns
  (`persistence_test.py` style), e.g.:
  ```python
  def test_collect_capabilities_against_real_queue_manager():
      app = minimal_app_for_managers()              # extended in B1
      proxy = StatefulManagerProxy(QueueManager('_default_', app, num_concurrent_jobs=4))
      try:
          caps = collect_capabilities(app, proxy)
          assert caps.manager.type == "queued_python"   # real class attr
          assert caps.manager.num_concurrent_jobs == 4   # real work_threads len
          assert caps.staging_directory == app.staging_directory
          assert caps.persistence_directory == app.persistence_directory
          assert caps.dependency_resolvers == []
      finally:
          proxy.shutdown()
  ```
  This exercises the real `StatefulManagerProxy` → `_proxied_manager` → class
  `manager_type` → `work_threads` contract, so it actually fails if that contract drifts.
* `test_to_dict_round_trips_through_json` — keep, retargeted onto the real-manager caps
  (still a cheap, valuable serialization guard).
* `collect_all_capabilities` tests removed (function deleted in A3). The
  failure-isolation behavior it tested now lives in the publisher's collect-time
  `try/except` — covered by a new publisher test in B3.

### B3. Rewrite `test/messaging_capabilities_test.py`
* Delete `_FakeApp`, `_FakeManager`, `_RecordingTransport` (the first two only existed
  to satisfy the now-deleted cache; the transport moves to `test_utils`).
* Build the publisher's inputs from the same real objects as B2 + the shared
  `RecordingRelayTransport`. The transport is the only fake — and it is the *correct*
  thing to fake (external HTTP boundary).
* **Keep** (retargeted onto real app/manager + `RecordingRelayTransport`):
  * one POST with expected topic + `schema_version` + `manager_name` + `published_at`
  * topic prefix applied
  * non-default manager → suffixed topic
  * off-switch (`message_queue_publish_capabilities: False`) skips POST
  * `RelayTransportError` from `post_message` swallowed (real exception type)
  * `published_at` is ISO-8601 with tzinfo
  * `test_make_capabilities_topic_name_examples` (pure function — unchanged)
  * Python <3.10 module skip guard — unchanged.
* **Delete** `test_missing_capabilities_logs_warning_does_not_post` (cache concept
  removed). **Replace** with a collect-failure test that pins the new bind-must-not-block
  guarantee enforced at collect time in A2: assert that when collection raises, no POST
  happens, the error is logged, and **no exception propagates**. A correctly-built real
  `StatefulManagerProxy(QueueManager(...))` cannot make `collect_capabilities` raise, so
  this test deliberately patches the seam:
  `mock.patch("pulsar.messaging.bind_relay.collect_capabilities", side_effect=RuntimeError(...))`.
  This is a legitimate seam patch — the subject under test is the *publisher's error
  isolation*, not the collector — but it **is** a remaining mock and must be counted as
  one (see inventory below), not hand-waved away.

### Resulting mock inventory
After the rewrite the doubles are, in full:
* `RecordingRelayTransport` — a recording **fake** for the real external relay HTTP
  boundary (correct and now shared/reusable).
* `mock.patch(shutil.which)` — an OS-boundary patch in the pure detector tests (correct).
* `mock.patch("pulsar.messaging.bind_relay.collect_capabilities", side_effect=...)` —
  exactly **one** seam patch, in the single collect-failure publisher test, because no
  correctly-built real object can force a collection failure (correct: the seam is the
  right place to inject the fault when the subject is the publisher's error isolation).
* A 3-line duck-typed stub in the two `_collect_manager` `num_concurrent_jobs`-fallback
  unit tests, because that branch is unreachable by any in-tree real manager (correct:
  a stub is the only way to test an intentionally-third-party-only defensive branch).

This is the honest, complete list — the goal is *minimal, justified* doubles at real
boundaries, not zero doubles.

No `_App`, `_FakeApp`, `_Manager`, `_FakeManager`, `_DepMgr`, `_Resolver`. The collector
and publisher are tested against real `PulsarApp`-shaped bunches and real
`StatefulManagerProxy(QueueManager(...))`, so the tests now catch real contract drift.

---

## Verification

```
tox -e py310-test test/capabilities_test.py test/messaging_capabilities_test.py \
                   test/persistence_test.py test/manager_factory_test.py
tox -e lint
tox -e mypy
```
Plus confirm the resilience scenario is unaffected (no code change to the wire path):
`test/resilience/scenarios/test_capabilities_publish.py` should still pass in the
`relay` mode it already targets.

### Pre-flight checks the implementer must confirm
1. No import cycle from the new top-level `bind_relay → pulsar.capabilities` import
   (expected clean per analysis above; verify `python -c "import pulsar.messaging"`).
2. `minimal_app_for_managers()` gaining `persistence_directory` does not perturb
   `manager_factory_test.py` or `BaseManagerTestCase` (expected: additive, no reader).
3. Real `QueueManager` worker threads are shut down in every new test (`try/finally
   proxy.shutdown()`), so the suite doesn't leak threads.

## Explicit non-goals
* No change to the capability wire schema or topic naming (`schema_version` stays 1).
* No consolidation of `persistence_test._app()` into `test_utils` (future cleanup).
* No introduction of a heavy real-`PulsarApp` boot in unit tests — the lightweight
  `minimal_app_for_managers()` + real `StatefulManagerProxy` is the intended weight.

## Why this is better, not just different
* Collection is now provably coupled to its only consumer; non-relay operators stop
  paying for and log-spamming a feature they don't use (issue #2 resolved; issue #1
  deleted for free).
* The collector tests now assert against the real
  `StatefulManagerProxy`/`QueueManager`/dependency-manager contracts for the paths a
  real object exercises (`manager_type`, `work_threads` length, staging/persistence
  dirs, resolver list) — these fail on real contract drift where the current
  hand-built fakes encode the same assumptions as the code and would stay green. The
  one branch a real object *cannot* exercise (`num_concurrent_jobs` fallback) keeps a
  deliberately-minimal stub test, by design, not omission.
* The one added abstraction (`TestDependencyManager` resolver fields +
  `persistence_directory` on `minimal_app_for_managers` + shared
  `RecordingRelayTransport`) is reusable by future manager/relay tests, not
  capabilities-specific scaffolding.

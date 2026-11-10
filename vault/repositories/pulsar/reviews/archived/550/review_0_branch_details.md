`pr_550_review_0` builds on the reviewed commit `3245226` in `/Users/jxc755/projects/worktrees/pulsar/pr/550`. It is pushed to [jmchilton/pulsar:pr_550_review_0](https://github.com/jmchilton/pulsar/tree/pr_550_review_0).

The branch makes three kinds of change:
- **Test challenger's plan.** It implements the whole test plan: client/HTTP/integration coverage of collection acknowledgment, FIFO ordering, a fake `docker_cmd`, a local callback server, a pure reconciliation planner, and test-helper cleanup.
- **Two bugs found by the new tests.** Stopped commands could record negative return codes, or codes that depended on whether the supervisor was replaced. Staging for attempts that failed before getting a manifest was never cleaned.
- **Structural findings.** The proxy now uses manager hooks instead of capability sniffing, the base manager has an `acknowledge_collection` default, the manager has a narrower base class, a shared request-stop helper and `configs_directory()` reads.

Every added or edited test passes locally. The `detached_local` integration test passes in its simple, mq and direct configurations. `tox -e lint` and `tox -e format` are clean.

- `9bb5168` (P2 1) Test stop return codes after TERM and SIGKILL escalation — red tests that pin `137` for SIGKILL escalation (with and without supervisor replacement) and `143` for TERM.
- `f8ee819` (P2 1) Record stable nonnegative return codes for signalled commands — the gate maps negative `Popen` codes to `128+N`, and a stop with no exit record records `137`.
- `9217f05` (P2 9) Test collection acknowledgment through client, HTTP route and Pulsar app — a client test pins `PUT`, and the `detached_local` integration run asserts that staging survives `clean()` until the ack.
- `21b713b` (P2 10) Test queued detached jobs start in submission order across managers — adds the FIFO test and renames the capacity-only test.
- `cf5aa4a` (P3 9) Hoist detached manager test imports and share blocking-prepare/app helpers — module-level imports, `StagingOnlyApp` and `BlockingPrepare`.
- `2f5dda6` (P3 6) Test detached policy snapshot survives config rewrite; pin stderr failure suffix — rewrites the policy after launch and still expects the walltime failure.
- `8c1777f` (P3 7) Test container config snapshot into detached manifest — covers the `entry_point_config` snapshot and the `working/import` and `working/tmp` directories.
- `2a44fea` (P3 8) Replace worker test SimpleNamespace fixture with DetachedExecution; reuse test_utils.wait_for — a fixture dataclass with helper methods, and stop records built by `_base_record`.
- `8037f03` (P3 10) Replace signal Mocks with a recording fake in detached worker tests — the `Recorder` asserts `calls == []`.
- `2003529` (P3 11) Split aggregate limit test; add direct per-file output limit test — the subprocess per-file test is kept.
- `6a529f6` (P2 13) Test entry-point callback payload against a local HTTP server — pins the POST body, headers and request counts, and checks the persisted `LIVE_FILE`.
- `be4f449` (P3 7) Test entry-point publication without callback and wildcard host resolution — covers `container_runtime.json`, the `::` skip and `get_ip_method`.
- `0e8207f` (P2 12) Drive detached Docker tests through a fake docker_cmd instead of monkeypatching — exercises TERM-then-KILL escalation against the immutable ID, plus a real-subprocess unknown-daemon case.
- `927907c` (P2 2) Test detached staging is cleaned after preprocessing failure — a red test through `StatefulManagerProxy`.
- `4ad5be0` (P2 2) Clean manifest-less detached attempts after a recorded preprocessing failure — `clean()` falls back to the base cleanup when `preprocessing_failed` is recorded.
- `e28a82a` (P1 1) Replace detached capability sniffing in StatefulManagerProxy with manager hooks — `BaseManager` hooks with a default of `False`, and one guarded `_record_launch_accepted`.
- `17a3893` (P2 4) Declare acknowledge_collection on ManagerInterface with a BaseManager default — the collection route returns `{"acknowledged": true}` on plain managers instead of a 500.
- `aad122b` (P2 5) Derive DetachedLocalManager from BaseUnqueuedManager — drops the unused PID and job-lock runtime and stubs `_monitor_execution`.
- `baaee13` (P3 5) Share one _request_stop_locked across detached stop paths — removes four copies of the stop sequence and the duplicate Stop write.
- `38b0851` (P3 2) Read detached policy files via configs_directory() — replaces the hardcoded `root / "configs"`.
- `eeee577` (P2 11) Extract pure plan_reconcile from detached pool reconciliation — adds `PoolEntry`, `ReconcilePlan` and planner tests; the host-mismatch stub now uses `monkeypatch`.
- `5c02f4b` (P1 1) Declare cancel-before-launch hooks on ManagerInterface and forward both in ManagerProxy — keeps the two cancel hooks consistent with `acknowledge_collection`.
- `7179f16` (P2 11) Type detached PoolEntry.state as a Literal — the new planner state is a `Literal` rather than a bare string.

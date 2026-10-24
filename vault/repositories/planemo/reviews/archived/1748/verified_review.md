# Verified review: planemo#1748

Reviewed commit `14c205f7` (merge-base `b1ac9ac5`). Fixes are on review branch `pr_1748_review_0`, see [review_0_branch_details.md](review_0_branch_details.md).

### P2 1: New test doesn't exercise `GalaxyEngine._run`, so collecting outputs after shutdown wouldn't fail it (implementation verified)

The fix depends on `GalaxyEngine._run` calling each output collector inside `with self.ensure_runnables_served(...)`. The test's `_ShutDownEngine` overrides `_run` and does that ordering itself, so it only checks that `BaseEngine.test()` reuses stored data. If `GalaxyEngine._run` moved the collector calls after the `with` block, the test would still pass and real Galaxy runs would hit the iwc#1416 failure again.

<details><summary>Evidence</summary>

With the collector calls in `GalaxyEngine._run` moved after the `ensure_runnables_served` block exits, the PR's test still passes (7 passed). The rewritten test fails on that mutant with `bioblend.ConnectionError: Connection refused`, and fails the same way with `planemo/engine/interface.py` from `b1ac9ac5`. It passes on the PR head.

</details>

Replace `_ShutDownEngine` with a `GalaxyEngine` subclass that keeps the real `_run`. Its `ensure_runnables_served` marks the responses stopped on exit, and the test monkeypatches `planemo.engine.galaxy.execute` to return `_ShutDownRunResponse`. Then the only fakes are Galaxy serving and Galaxy executing.

<details><summary>Details</summary>

```python
class _StubGalaxyEngine(galaxy_engine.GalaxyEngine):
    """Real GalaxyEngine._run; the serving context stops every response's Galaxy on exit."""

    def __init__(self, ctx, **kwds):
        super().__init__(ctx, **kwds)
        self.responses = []

    @contextlib.contextmanager
    def ensure_runnables_served(self, runnables):
        yield None
        for run_response in self.responses:
            run_response.engine_running = False


def test_test_results_do_not_need_engine_after_shutdown(tmp_path, monkeypatch):
    ...
    engine = _StubGalaxyEngine(create_test_context())

    def fake_execute(ctx, config, runnable, job_path, **kwds):
        run_response = _ShutDownRunResponse(runnable, outputs)
        engine.responses.append(run_response)
        return run_response

    monkeypatch.setattr(galaxy_engine, "execute", fake_execute)
    ...
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Rationale comments repeated (implementation verified)

The design is explained twice more than it needs to be: a two-line comment on `RunResponse.collected_test_data` that points to `BaseEngine._run_test_cases`, and a four-line docstring on `_collect_test_data`. The project style is one line saying what the code does, with the reasoning in the PR or commit message.

Trim each to one line. Keep the fallback comment in `BaseEngine.test()`, because it explains a non-obvious branch.

<details><summary>Details</summary>

```python
# runnable.py
    # Structured test data built by the test output collector while the engine ran.
    collected_test_data: Optional[Dict[str, Any]] = None

# interface.py
def _collect_test_data(test_case, run_response):
    """Build and store a test's structured data while the engine still serves outputs."""
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

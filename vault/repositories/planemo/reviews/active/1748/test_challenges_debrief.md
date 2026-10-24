# Test challenges debrief: planemo#1748

- Profile: generic_test_challenger
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `14c205f7` (merge-base `b1ac9ac5`)

## Tests in scope

One new unit test, `tests/test_engines.py::test_test_results_do_not_need_engine_after_shutdown`, with two test doubles: `_ShutDownRunResponse` (a `SuccessfulRunResponse` whose `get_output` raises `bioblend.ConnectionError` once `engine_running` is False) and `_ShutDownEngine` (a `BaseEngine` whose `_run` calls the collectors, then flips `engine_running`).

## What I ran

Venv borrowed from `worktrees/planemo/pr/1751/.venv`, `PYTHONPATH` pointed at the tree under test. A scratch worktree at `b1ac9ac5` (since removed) was used for base and mutation runs; the PR worktree was not modified.

- PR head: `tests/test_engines.py` + `tests/test_test_checker.py`, 9 passed.
- Base `b1ac9ac5` with the PR's test file: new test fails with `bioblend.ConnectionError: Connection refused`. Red-to-green confirmed.
- Mutant (PR head, `GalaxyEngine._run` moved to call collectors after the `ensure_runnables_served` block exits): the PR's test still passes.
- Prototype test driving the real `GalaxyEngine._run` (below): passes on PR head, fails on the mutant, fails on base `interface.py`.

Side note: `tests/test_engines.py` (and `test_test_checker.py`) can't be collected alone on master or this PR. `import planemo.engine` cold hits a `planemo.runnable` <-> `planemo.galaxy.config` circular import (`GALAXY_TOOLS_PREFIX`). Pre-existing, same failure on base, so not this PR's. I worked around it by importing `planemo.galaxy` first. `tests/test_last_failed.py` already has a comment about the same problem.

## Challenges

### Is it testing the implementation directly? Partly.

The test goes through the public `BaseEngine.test()` and checks the structured output, which is good. But the property that matters is that Galaxy builds results before it shuts down. That ordering lives in `GalaxyEngine._run`: collectors are called inside `with self.ensure_runnables_served(...)`. `_ShutDownEngine._run` writes that ordering itself, so the test checks that `BaseEngine` reuses data a collector stored, given an engine that collects before it stops. If `GalaxyEngine._run` ever collected after the context exits, which is exactly the regression class here, this test stays green. Verified with the mutant above.

Recommendation: rewrite the test so the double is the Galaxy service, not the engine. Subclass `GalaxyEngine` and keep its real `_run` and `test()`. Implement `ensure_runnables_served` as a context manager that marks the run responses stopped on exit, and monkeypatch `planemo.engine.galaxy.execute` to return `_ShutDownRunResponse`. Then the only fakes are "Galaxy serving" and "Galaxy executing", and the test pins both halves of the fix. Prototype (passed on head, red on mutant and base):

```python
class _StubGalaxyEngine(galaxy_engine.GalaxyEngine):
    """Real GalaxyEngine._run; serving context marks every response's Galaxy as stopped on exit."""

    def __init__(self, ctx, **kwds):
        super().__init__(ctx, **kwds)
        self.responses = []

    @contextlib.contextmanager
    def ensure_runnables_served(self, runnables):
        yield None
        for run_response in self.responses:
            run_response.engine_running = False


def test_galaxy_engine_collects_results_before_galaxy_stops(tmp_path, monkeypatch):
    ...
    def fake_execute(ctx, config, runnable, job_path, **kwds):
        run_response = _ShutDownRunResponse(runnable, outputs)
        engine.responses.append(run_response)
        return run_response

    monkeypatch.setattr(galaxy_engine, "execute", fake_execute)
    structured_results = engine.test([runnable], test_timeout=None)
    ...
```

This replaces `_ShutDownEngine` instead of adding to it. Its test-only `_run` override goes away and `GalaxyEngine` stays the subject under test. `monkeypatch` on `execute` is the one mock; it's narrower than overriding `_run`.

### Is it silly? No.

It reproduces the reported iwc#1416 failure shape with the real `wf20_undefined_output.yml` definition and a real output file, and asserts the exact `output_problems` message. The PR body notes the existing Galaxy test from #1728 passes on master, so an integration test can't catch this without forcing a cache miss after shutdown. A unit-level test is justified here. Don't move it to integration.

### Can mocks be replaced with reusable doubles? Yes, partially.

No `MagicMock`/`SimpleNamespace`, which is good. But `_ShutDownRunResponse` re-declares the same four abstract properties (`log`, `job_info`, `invocation_details`, `outputs_dict`) as `MockRunResponse` in `tests/test_test_checker.py`. `tests/test_last_failed.py::MinimalEngine` is another hand-rolled `BaseEngine` stub. Recommendation: move a configurable `SuccessfulRunResponse` stub into `tests/test_utils.py` (an `outputs_dict` constructor arg, overridable `get_output`), and have `_ShutDownRunResponse` subclass it and add only the `engine_running` guard. That's a small consolidation, not a blocker.

### Restructure code to remove mocks? Not needed.

`_collect_test_data` is already a module-level helper wrapped in `partial`, which is the right shape. A direct unit test of that helper would only test the implementation, so don't add one.

## Coverage gaps (not test rewrites)

- The fallback branch in `BaseEngine.test()` (`collected_test_data is None`) is covered by the existing cwltool/toil `planemo test` cases. The embedded-tool-test branch, where `run_response` is a dict, is covered only by Galaxy tests. That's acceptable, nothing to add.
- The PR changes no assertions and drops no tests.

## Test plan

1. Replace `_ShutDownEngine` with a `GalaxyEngine` subclass that keeps the real `_run`, as prototyped above. Confirm it's red on `b1ac9ac5` and red with collectors moved outside `ensure_runnables_served`.
2. Optional: hoist the run-response stub into `tests/test_utils.py` and reuse it from `test_test_checker.py` and `test_engines.py`.

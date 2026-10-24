# Test challenges review: planemo#1748

- Profile: [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `14c205f7` (merge-base `b1ac9ac5`)

Verdict: the test is good. It's red on master (`bioblend.ConnectionError`) and green on the PR, uses a real test definition and output file, and needs no `MagicMock`. One real gap: it fakes the engine layer that owns the ordering this fix depends on. Details and a prototype are in [test_challenges_debrief.md](test_challenges_debrief.md).

## P2 1: New test doesn't exercise `GalaxyEngine._run`, so moving collection after shutdown wouldn't fail it

The fix only works because `GalaxyEngine._run` calls each output collector inside `with self.ensure_runnables_served(...)`. `_ShutDownEngine` overrides `_run` and does that ordering itself, so the test only checks that `BaseEngine.test()` reuses stored data. I moved the collector calls in `GalaxyEngine._run` to after the `with` block exits. With that change the PR's test still passes, and a real Galaxy run would hit the iwc#1416 failure again.

Suggested fix: subclass `GalaxyEngine` and keep its real `_run`. Implement `ensure_runnables_served` as a context manager that marks the responses stopped on exit, and monkeypatch `planemo.engine.galaxy.execute` to return `_ShutDownRunResponse`. This replaces `_ShutDownEngine`. I prototyped it in a scratch worktree. It passed on `14c205f7`, failed on the mutant above, and failed with the base `interface.py`.

<details><summary>Details</summary>

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


def test_test_results_do_not_need_engine_after_shutdown(tmp_path, monkeypatch):
    output_path = tmp_path / "wf_output_1.txt"
    output_path.write_text("Hello World!\n")
    outputs = {"wf_output_1": {"path": str(output_path)}}
    engine = _StubGalaxyEngine(create_test_context())

    def fake_execute(ctx, config, runnable, job_path, **kwds):
        run_response = _ShutDownRunResponse(runnable, outputs)
        engine.responses.append(run_response)
        return run_response

    monkeypatch.setattr(galaxy_engine, "execute", fake_execute)
    runnable = for_path(os.path.join(TEST_DATA_DIR, "wf20_undefined_output.yml"))

    structured_results = engine.test([runnable], test_timeout=None)

    (test_data,) = structured_results.structured_data["tests"]
    assert test_data["data"]["status"] == "failure"
    assert test_data["data"]["output_problems"] == ["Expected output [wf_output_typo] not found in results."]
```

</details>

## P3 1: `_ShutDownRunResponse` duplicates an existing run-response stub

`_ShutDownRunResponse` re-declares the same abstract properties (`log`, `job_info`, `invocation_details`, `outputs_dict`) as `MockRunResponse` in `tests/test_test_checker.py`. `tests/test_last_failed.py::MinimalEngine` is a third hand-rolled engine stub.

Suggested fix: hoist a small configurable `SuccessfulRunResponse` stub into `tests/test_utils.py`. Then `_ShutDownRunResponse` only adds the `engine_running` guard on `get_output`. This is optional cleanup.

## Not findings

- Moving to an integration test isn't viable. The existing Galaxy test from #1728 passes on master, and reproducing this needs a cache miss after Galaxy stops. The unit test is the right layer.
- The PR removes no tests and weakens no assertions.
- Pre-existing problem: `tests/test_engines.py` can't be collected alone (`planemo.runnable` <-> `planemo.galaxy.config` circular import on a cold `import planemo.engine`). It fails the same way on `b1ac9ac5` and isn't this PR's to fix.

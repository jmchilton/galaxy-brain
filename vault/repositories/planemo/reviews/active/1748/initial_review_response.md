

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: generic_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 14c205f7

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). It adds an internal `RunResponse.collected_test_data` attribute and reuses the collector's result in `BaseEngine.test()`; the test report JSON format, CLI and engine return shapes are unchanged, and a revert restores the old post-shutdown recomputation.

<details><summary>Risk Review Advice</summary>

Check that every engine that calls output collectors does so while outputs are still reachable, and that the fallback (`collected_test_data is None`) still covers cwltool, toil and embedded Galaxy tool tests. Expect small textual conflicts with #1707 and #1708.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/planemo/tree/pr_1748_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Review branch [`pr_1748_review_0`](https://github.com/jmchilton/planemo/tree/pr_1748_review_0)

This branch is based on PR head `14c205f7`. It rewrites the PR's new unit test so that it runs the real `GalaxyEngine._run` instead of a hand-written `_run`. Only Galaxy serving and `execute` are faked, so the test now fails if output collection ever moves outside the served context. It also trims two rationale comments to a single line each. The production logic is unchanged.

- [`88fa39d5`](https://github.com/jmchilton/planemo/commit/88fa39d5) Drive real GalaxyEngine._run in shutdown test: replaces `_ShutDownEngine` with a `GalaxyEngine` subclass and a monkeypatched `planemo.engine.galaxy.execute`. The test passes on the PR head and fails on the mutant and on base `interface.py`.
- [`f45c16e6`](https://github.com/jmchilton/planemo/commit/f45c16e6) Trim rationale comments on collected test data: shortens the `RunResponse.collected_test_data` comment and the `_collect_test_data` docstring to one line each.

</details>

</details>

### P2 1: New test doesn't exercise `GalaxyEngine._run`, so collecting outputs after shutdown wouldn't fail it (implementation verified)

The fix depends on `GalaxyEngine._run` calling each output collector inside `with self.ensure_runnables_served(...)`. The test's `_ShutDownEngine` overrides `_run` and does that ordering itself, so it only checks that `BaseEngine.test()` reuses stored data. If `GalaxyEngine._run` moved the collector calls after the `with` block, the test would still pass and real Galaxy runs would hit the iwc#1416 failure again.

<details><summary>Evidence</summary>

With the collector calls in `GalaxyEngine._run` moved after the `ensure_runnables_served` block exits, the PR's test still passes (7 passed). The rewritten test fails on that mutant with `bioblend.ConnectionError: Connection refused`, and fails the same way with `planemo/engine/interface.py` from `b1ac9ac5`. It passes on the PR head.

</details>

Replace `_ShutDownEngine` with a `GalaxyEngine` subclass that keeps the real `_run`. Its `ensure_runnables_served` marks the responses stopped on exit, and the test monkeypatches `planemo.engine.galaxy.execute` to return `_ShutDownRunResponse`. Then the only fakes are Galaxy serving and Galaxy executing. Fixed in [`88fa39d5`](https://github.com/jmchilton/planemo/commit/88fa39d5).

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

Trim each to one line. Keep the fallback comment in `BaseEngine.test()`, because it explains a non-obvious branch. Fixed in [`f45c16e6`](https://github.com/jmchilton/planemo/commit/f45c16e6).

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

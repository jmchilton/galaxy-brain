# Initial review: planemo#1748 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `14c205f7` (base `master`, merge-base `b1ac9ac5`)

## Verdict

Approve, with optional nits. Small, correct fix. The output collector already ran while Galaxy was up, and its result was thrown away. Now it's stored on the run response and `BaseEngine.test()` reuses it, so the report no longer needs Galaxy after shutdown. It also stops building each test's structured data twice. I found no real bugs.

Verified locally:
- The new test `test_test_results_do_not_need_engine_after_shutdown` passes on `14c205f7`.
- With the new `tests/test_engines.py` copied onto `b1ac9ac5` (in a scratch worktree), it fails with `bioblend.ConnectionError: Connection refused`, so it's a real red-to-green test.
- The rest of `test_engines.py` passes on head.

Paths I checked:
- **Managed and external Galaxy** (`GalaxyEngine._run`). It calls `collect_output(run_response)` for every response, including `ErrorRunResponse`, inside `ensure_runnables_served`. `collected_test_data` is always set, and `test()` uses it.
- **Embedded tool tests.** These results are plain dicts. `getattr(..., None)` returns `None`, the code falls back to `ExternalGalaxyToolTestCase.structured_test_data`, which is the identity, and the output is unchanged.
- **cwltool and toil.** `_run` ignores `output_collectors`, the attribute keeps its class default of `None`, and the code falls back to the old behavior.
- **Collector exceptions.** These propagate out of `_run` just as before, because the collector was already being called. No new failure mode.
- **Side effects of a single pass.** `_check_output` mutates `output_test["name"]` and `output_value["path"]`. Running it once instead of twice is no worse.

## Findings

### P3 1: Rationale comments repeated in three places

The design is explained three times: the class-attribute comment on `RunResponse.collected_test_data`, the 4-line docstring on `_collect_test_data`, and the comment inside `BaseEngine.test()`. The project style is one line for what the code does, and the reasoning goes in the PR or commit message. Suggested trim:

```python
# runnable.py
    # Structured test data built by the test output collector while the engine ran.
    collected_test_data: Optional[Dict[str, Any]] = None

# interface.py
def _collect_test_data(test_case, run_response):
    """Build and store a test's structured data while the engine still serves outputs."""
```

Keep the fallback comment in `test()`. It explains a non-obvious branch: the no-collector engines and the dict results.

## Notes (not findings)

- **Optional follow-up:** `CwlToolEngine._run` and `ToilEngine._run` accept `output_collectors` but ignore them. That's pre-existing and is why `test()` still needs a fallback. If they called the collectors the way `GalaxyEngine._run` does, the fallback would only be needed for embedded dict results, and every engine would follow the same `_run` contract. Out of scope here.
- **Test design.** `_ShutDownEngine` and `_ShutDownRunResponse` are a minimal fake. They exercise the real `SuccessfulRunResponse.structured_data` and `BaseEngine.test()`, and use the real `wf20_undefined_output` fixture from #1728. That's appropriate: the existing Galaxy integration test from #1728 passes on master, so it can't catch this. Imports are at module top.
- **Overlap.** #1707 (open) and #1708 (open) both touch `_run_test_cases`. #1708 renames `GalaxyEngine._run_test_cases` to `_collect_test_results` and keeps Galaxy alive through report generation, but only with `--serve`. The default path still tears Galaxy down before `test()` builds results, so this PR is still needed after #1708. Expect textual conflicts only. #1728 is merged and is a prerequisite: the fixture comes from it.
- **Environment quirk, not caused by the PR.** Running `pytest tests/test_engines.py` on its own fails to collect with a circular import (`planemo.runnable` and `planemo.galaxy.config`). This happens on `b1ac9ac5` too. It collects fine when another test module is imported first, as in the full suite.

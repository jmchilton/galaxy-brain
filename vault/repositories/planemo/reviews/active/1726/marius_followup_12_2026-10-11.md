# Review of Marius's fork PR #12 for upstream #1726

Reviewed 2026-10-11. Fork PR: https://github.com/jmchilton/planemo/pull/12. Upstream PR: https://github.com/galaxyproject/planemo/pull/1726.

Reviewed head: `cb04c65b86dd5df7a1ba2630035d8a1cf8d0c4cb`; target branch/head: `skip-tests-when-external-services-down` / `ba91257527413d829d0f97b0b20ff899358284d0`.

## Recommendation

Merge the complete fork PR into John's upstream PR branch. No correctness blockers found. The three removed decorators restore offline coverage without changing assertions. The local availability wrapper preserves Galaxy's decorator behavior and adds a shared per-URL cache. The raw GitHub guard probes exactly the resource fetched by `test_ok_http`.

## Evidence

- `planemo/workflow_lint.py::_lint_tool_ids` skips tool steps without `tool_shed_repository` before making requests. The corresponding regression test should execute even with the Tool Shed unavailable.
- `_lint_tool_versions` compares strings. Its two command-level tests do also run `_lint_tool_ids`, but `find_repos_from_tool_id` catches Tool Shed errors and converts them to lint output. Neither test asserts the command's overall success or Tool Shed output, so its version assertions survive Tool Shed unavailability.
- Compared the replacement `skip_if_site_down` with the installed Galaxy utility implementation (galaxy-util 26.0.1): identical lazy execution, `functools.wraps`, `SkipTest` and forwarding behavior, with `_is_site_up` cached by URL. No collection-time network request was introduced.
- A separate mock check verified that repeated available and unavailable calls generate only two probes for two URLs, available tests execute and return their values, unavailable tests raise `SkipTest`, and wrapped function names are preserved.
- No test assertions were removed or weakened. No source changes, merge or push performed in this review checkout.

## Validation

Environment: Python 3.12.12, installed galaxy-util 26.0.1; source imports forced to the PR checkout with `PYTHONPATH=$PWD`.

Command: `/Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest tests/test_cmd_workflow_lint.py tests/test_lint.py -k 'tool_id or tool_version or ok_http' -q -rs`.

- Online (network-enabled execution): **8 passed, 27 deselected** in 6.79 seconds. This confirms compatibility with John's currently installed 26.0.1 utility, in addition to Marius's reported 26.1.1 run.
- Simulated offline (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` set to `http://127.0.0.1:9`, `NO_PROXY` empty): **3 passed, 5 skipped, 27 deselected** in 1.06 seconds. The three offline-capable tests remain active; four Tool Shed-dependent tests and the raw GitHub test skip with the expected resource URLs.
- Existing dependency deprecation warnings only.

## Follow-ups for John's ledger

1. **Quay probe still does not reproduce the motivating API failure.** Upstream #1726 arose from a quay.io container-resolution API read timeout; `skip_if_quay_down` checks the homepage. A working homepage can coexist with an unavailable API, so this remains a CI reliability follow-up rather than a claim that the original flake is resolved. Decide whether to use a representative registry API probe or handle/retry the actual container-resolution failure; no change is required to merge #12.
2. **Consolidate the temporary local utility after a Galaxy dependency update.** John's installed galaxy-util 26.0.1 lacks the newer service helpers / `unavailable_pattern` discussed in Marius's review. When the dependency moves, compare their behavior before replacing these local definitions, and retain equivalent per-URL caching and the exact raw GitHub resource guard. Blindly replacing the wrapper with an uncached helper would reintroduce repeated 10-second probes.
3. **Optional test isolation:** the two version tests pass offline, but still attempt the unrelated Tool Shed lint stage. If offline runs later become slow due to hanging Tool Shed requests, skip/mock the `tool_ids` stage specifically in those tests while preserving their version assertions. The current immediate proxy-failure run establishes correctness, not an upper bound for a genuinely hanging Tool Shed request.

The availability cache lives for the Python process (separate pytest workers have separate caches); it does not continuously monitor a service or prevent a later outage after a successful probe. This is a reasonable tradeoff for these availability guards.

## Coordinator outcome

Companion #12 merged into skip-tests-when-external-services-down as 8b63b8cc8c087fe580fa7d49eea3a999ec305b8d. Online focused suite: 8 passed; offline: 3 passed, 5 expected skips.

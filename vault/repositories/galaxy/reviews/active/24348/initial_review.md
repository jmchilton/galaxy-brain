Profile: default
Model: gpt-6.1-sol
Effort: medium
Reviewed commit: ebd02a8b4b47b2ec4d9ec406c5afb65ed81f5c2d
Base: release_26.0 (merge base c35e2f3e58a; reviewed using origin/release_26.0)

## Findings

### P2 1 — Do not expose an unfinished lazy parse as completed

Location: `lib/galaxy/tools/__init__.py:1578` and `1608–1612`.

`parse_tests()` sets `__tests_parsed` before rebuilding and parsing the source. A second request for the same tool during that work skips parsing and receives `None`, even though the tool has tests. The `/api/tools/{id}/test_data` endpoint iterates `tool.tests` without a None guard (`lib/galaxy/webapps/galaxy/api/tools.py:658`), so concurrent first requests produce HTTP 500; `tests_summary` can temporarily omit the tool instead. This matters particularly for the tools motivating this PR, whose test parsing takes seconds. The eager implementation completed this work before serving requests.

Reproduced with the PR's actual `UsesTools` fixture and profile 24.2: pause the first thread inside `parse_tool_test_descriptions`, then read `tool.tests` from another thread. The second read returns `None`, and the endpoint's list comprehension raises `TypeError: 'NoneType' object is not iterable`; after releasing the parser, the first read returns one test.

Serialize initialization with a per-tool lock and publish the completed flag after the cached result is ready, or use another lazy cache implementation that makes concurrent callers wait for the first result. Add a concurrent first-access regression test. Simply moving the flag to the end avoids the empty result but permits duplicate expensive initialization.

## Validation and scope

- Reviewed all three changed files, the XML source memory optimization/serialization path, tool-source factories, and the consumers of `Tool.tests`.
- Read the PR description and current discussion. The body reports local full-toolset container startup measurements and successful test-data endpoint checks; these were not independently repeated.
- Ran `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=lib /Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest -p no:cacheprovider test/unit/app/tools/test_tool_tests_parsing.py -q`: **2 passed** on Python 3.13.12. Existing dependency deprecation warnings and a sandbox-restricted process-enumeration exception in an atexit cleanup callback appeared; pytest exited successfully.
- Ran the deterministic two-thread first-access reproduction described above against the reviewed code.
- No source-code edits. No applicable worktree AGENTS.md was present.

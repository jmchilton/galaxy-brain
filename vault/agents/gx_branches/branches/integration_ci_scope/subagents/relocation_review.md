# Relocation revision review

Acted on the review's test-coverage recommendation: added a real-Git CLI regression using isolated Python with site packages disabled. The review required no production correction; the selection policy remains byte-identical. All 52 focused tests pass and full/selective integration collections exactly match the earlier test IDs. No correctness or clarity suggestions were declined.

## Suggestions not adopted

No suggestions were declined. Application/browser tests do not exercise this infrastructure boundary more effectively; the real CLI and subprocess pytest tests cover it without application startup.

<details>
<summary>Full normal subagent review</summary>

Normal review: no blocking findings or production corrections needed.

The relocation keeps the policy byte-identical. `test/integration/__init__.py` introduces no dependency imports; the CLI explicitly adds the repository's `test/` directory and imports the standard-library policy without loading conftest. Package-relative imports in the integration conftest and pytest hook are consistent. The hook still deselects before cost-based sharding and fixture/class startup.

The revised synthetic suite imports the actual relocated hook. Combined unit and real integration collection also succeeds, checking both import contexts together. The relocated guide correctly references the policy's new location. No stale production references were found.

The fresh test challenge added one justified regression: a real Azure plugin diff runs the CLI with Python `-I -S` from a temporary repository. This proves selection works without installed packages, inherited `PYTHONPATH`, or reliance on the caller's directory. Only the test helper and this new test changed; no tests were removed or weakened.

Validation:

- 52 focused tests passed: 44 selector cases and 8 existing shard tests.
- Combined collection retained all 44 unmarked unit cases and deselected 10 real redirect tests.
- Focused mypy, Black, isort, Ruff, actionlint and diff checks passed.
- Full/empty-family real collection checks exactly match previous node sets; previous shard-union evidence remains applicable.

No suggestions were declined. Application or browser tests would not improve coverage of this infrastructure change.

The fresh test challenge debrief is written. No further edits planned.

</details>

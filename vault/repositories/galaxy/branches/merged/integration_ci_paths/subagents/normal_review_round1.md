# Normal review, round 1 (allowlist version, `c3a25e9f6be`)

Verdict: correct and ready; no blocker, no security concerns. Superseded by John's request to replace the allowlist with a refactor, which addresses findings 1, 4 and 5 by construction.

Acted on:
- Comment wording (finding 3) — now "Test suites and test-only libraries used by other workflows", plus a pointer that shared code belongs in `lib/galaxy_test/base`.
- Debrief error (finding 1) — the push trigger shares the exclusions, so a stale allowlist would only be caught by the weekly cron or a later unrelated PR. Moot after the refactor removed the allowlist.

Not acted on:
- Keep push symmetric with pull_request (finding 2) — agreed with reviewer; kept.
- `api/__init__.py` not re-included (finding 4) — moot; nothing integration imports lives in `galaxy_test.api` anymore.
- Sibling workflows (`api.yaml`, `unit.yaml`, `framework_*.yaml`) could exclude `test/integration/**` / `test/unit/**` (finding 6) — out of scope; follow-up.

<details><summary>Full review</summary>

- Dependency claim confirmed by independent AST walk over 916 files from `test/integration/**`, root `conftest.py`, `lib/galaxy_test/conftest.py`: only the 6 re-included modules plus empty `api/__init__.py` reached. `lib/galaxy/selenium` has no runtime importers. No data-file reads from excluded dirs.
- Glob semantics correct: ordered, last match wins; `**` crosses `/`.
- Findings: (1) low — debrief wrongly claimed post-merge push catches stale allowlist; (2) low — push symmetry reasonable, ~170 runner-hours/month cost to not share; (3) nit — comment label; (4) nit — `api/__init__.py`; (5) allowlist maintainable, guard would be overkill; (6) sibling workflows out of scope.
</details>

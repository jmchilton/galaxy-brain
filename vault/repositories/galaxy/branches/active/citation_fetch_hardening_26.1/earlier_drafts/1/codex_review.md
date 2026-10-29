Run via gpt-6-sol at medium effort.

# citation_fetch_hardening_26.1 — Codex review

Reviewed tip `618e17bb669` against `origin/release_26.1`. Nothing was changed. Of four findings:
- one is an existing gap outside this branch's scope
- one is a documented limit that needs John's decision
- one is a trade-off already accepted
- one was withheld

Not acted on:
- **YAML and user-defined tool citations are discarded.** True on release_26.1: `YamlToolSource` inherits the empty `ToolSource.parse_citations`. Loading them is `yaml_tool_model_validation_26.1`'s change, which parents on this branch. The cap applies to them once they load.
- **A slowly sent response can run past the fetch timeout.** Confirmed for the header phase; body reads check the deadline per socket read. The test challenges found the same thing, and the `bounded_get` docstring now states what's bounded. A wall-clock bound needs a watchdog that closes the socket. That's a decision for John, and probably a follow-up.
- **Concurrent misses on one DOI both fetch.** This trade-off is accepted in normal review 2 and the performance challenge. The per-request budget and deadline bound it, and the old beaker `ext:database` lock serialized every DOI fetch.
- Possible security issue, details withheld.

<details>
<summary>Findings (verbatim titles)</summary>

1. P1 correctness, `lib/galaxy/tools/__init__.py:1926`: YAML and user-defined tool citations are still discarded.
2. P1, `lib/galaxy/util/requests.py:104`: details withheld.
3. P1 correctness, `lib/galaxy/util/requests.py:104`: a trickling response can exceed the configured fetch timeout.
4. P2 reuse, `lib/galaxy/managers/citations.py:157`: manual cache misses duplicate concurrent DOI fetches.

Coverage note from Codex: it reviewed the full diff plus `files/uris.py`, the parsers, `model_factory.py` and the linters. It didn't run tests.

</details>

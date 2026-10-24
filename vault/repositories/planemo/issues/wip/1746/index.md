# planemo#1746 — Fail tool tests that print secrets

[Issue](https://github.com/galaxyproject/planemo/issues/1746)

Follow-up to galaxyproject/galaxy#23878 (closed: dev meeting chose no core masking; catch leaks in planemo).

Addressed by branch [`fail-tests-leaking-secrets`](../../../branches/active/fail-tests-leaking-secrets/index.md).

## Where it lives

Planemo, not `galaxy.tool_util.verify`:

- Planemo's `register_job_data` callback (`planemo/engine/galaxy.py`) gets job stdio and status; test defs from `get_tool_tests` carry the `<credentials>` secret values; the API key is `config.user_api_key`; outputs are fetchable via the interactor before the test history is deleted.
- A default-on check in core verify would fail Galaxy's own `test/functional/tools/environment_variables_inject.xml`, which writes the injected API key to an output on purpose.
- Ships without waiting on a `galaxy-tool-util` release.

## Choices on the issue's open questions

- Fail the test (not warn).
- Match exact, base64 and URL-encoded copies.

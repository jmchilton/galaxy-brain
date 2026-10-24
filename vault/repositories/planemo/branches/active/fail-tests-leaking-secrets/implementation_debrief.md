# Implementation debrief

Branch `fail-tests-leaking-secrets` (base `origin/master` `969e5cee`) for [planemo#1746](https://github.com/galaxyproject/planemo/issues/1746).

## What it does

`planemo test` now fails a tool test when one of its `<credentials>` `<secret>` values, or the test user's API key, appears in the job's stdout, stderr or job messages, in an output's info, or in an output's content. Plain, base64-encoded (any alignment, wrapped, URL-safe) and URL-encoded copies all count. The failure message names the secret and where it was found, never the value.

- `planemo/galaxy/test/secrets.py`: collects the secrets and scans the job and its outputs.
- `planemo/engine/galaxy.py`: calls the scan from the `register_job_data` callback passed to `verify_tool`. That covers the local, docker and external Galaxy engines.

## Why planemo, not `galaxy.tool_util.verify`

- The callback already has the job stdio and the status. The test dict carries the secret values, and outputs can still be fetched before the test history is deleted.
- A check that's on by default in core verify would fail Galaxy's own `environment_variables_inject.xml` test tool, which writes the API key to an output on purpose.
- It ships without waiting for a `galaxy-tool-util` release.

## Decisions on the issue's open questions

- It fails the test rather than warning. A scan error (an API failure) also fails the test, with status `error`.
- Exact, base64 and URL-encoded copies all match.
- The API key is checked for every tool, not only tools with `inject="api_key"`.
- Secrets shorter than 8 characters are skipped with a warning.

## Testing

- Red to green: the integration test `tests/test_cmd_test.py::CmdTestTestCase::test_fails_tests_that_leak_secrets` passed all three fixture tools on base. With the change, it fails the two leaky ones (`tests/data/tools/secret_leak_tools/`), one leaking a credential secret to stderr and one leaking the base64'd API key to an output, and passes the one that doesn't leak.
- Unit tests in `tests/test_galaxy_test_secrets.py` cover the encoding matching, short-secret skipping and failing closed.
- Local gate: flake8, black, isort, ruff and the docstring lint are clean on the changed files. Mypy shows no errors in them; its errors elsewhere are pre-existing and environment-specific.

## Failures outside the branch

- `tests/test_cmd_test.py` toil tests (`test_output_checks_toil`, `test_toil_tool_test`) fail on base too, exit 127 (local environment).
- `tests/test_engines.py` hits a circular import on base when collected on its own.

## Known gaps (best effort)

These aren't scanned:

- composite and extra files
- discovered collection elements (unverified)
- stdio past Galaxy's truncation point
- otherwise transformed values

Output datasets are downloaded a second time, in full.

Review: [normal review debrief](subagents/normal_review.md).

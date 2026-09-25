# Description

Several unrelated Planemo PRs recently failed together when the Zenodo records API returned transient HTTP 504 responses. The affected training tests intentionally exercise the live Zenodo service, so an upstream outage currently appears as a Planemo regression and can also leave filesystem state that causes later tests to fail.

This change follows the convention used by Galaxy's external-service tests:

- define a shared `skip_if_zenodo_down` decorator using Galaxy's existing `skip_if_site_down` helper;
- probe the exact Zenodo record API endpoint used by the test fixtures, rather than only checking the Zenodo homepage; and
- decorate only the eight tests that actually dereference Zenodo records, leaving unrelated training tests active.

When Zenodo is available, these remain live integration tests and retain their existing assertions. When the API is unavailable or returns a non-200 response, pytest reports the affected tests as skipped instead of failing unrelated pull requests.

This is a test-only change and does not alter Planemo's production handling of Zenodo requests.

# Validation

- `tox -e py313-lint`
- Six focused Zenodo-dependent tests pass against the live, healthy API.
- All eight decorated paths skip cleanly when the API cannot be reached.

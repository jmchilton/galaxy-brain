Port of #25112 (`harden_url_abstractions_25.1`) to `release_26.1`. The code has diverged enough that the 25.1 branch doesn't merge forward cleanly.

`validate_non_local` now reads URL schemes and hosts the way `requests` and `urllib` do. Server-side fetches also check every redirect hop with it, not only the first URL. This covers the http file source (http(s) and ftp), TRS servers built from user-supplied URLs, the remote ZIP file source and DRS lookups.

- Shared plumbing: `ValidatingSession` / `ValidatingRedirectHandler` check each hop against `fetch_url_allowlist`. `TrsServer` takes a session factory, and the remote ZIP source uses one session with socket timeouts.
- DRS: object and access lookups go through a validating session, which is closed after use. A verification failure on an access URL is now reported as such, instead of as an unimplemented access type. `fetch_url_allowlist` is also forwarded to ftp access methods when there is no user context.
- The branch opens with baseline tests that pin current behaviour, then each change adds its red-to-green tests.

## Differences from the 25.1 PR

- The upstream DRS access loop here also has `except Exception: continue`, which swallowed private-address refusals as well as verification errors. The `s3://` path keeps its own fallback. Other access methods are skipped only when no file source handles the URL. Galaxy errors (`MessageException`) from the download are re-raised, and other download errors still fall through to the next access method.
- Existing tests that hit unresolvable or local hosts now use a `fake_public_dns` fixture or an allowlist. These are `test_drs_compact_identifiers.py`, the DRS tests in `test_data_fetch.py`, the package-tests http fixtures and the MCP TRS import test (which now patches the session).

## Admin-visible change

DRS servers and ftp URLs on non-public addresses now need a `fetch_url_allowlist` entry. The option's documentation now says it covers every server-side URL fetch, and the config sample and docs are regenerated. This should go in the release notes.

## Reviews

Review fixes from mvdbeek's review are included, and his commits keep his authorship. Rejecting private ftp URLs at API time, rather than in the job, is left for `dev`.

## How to test the changes?
- [x] I've included appropriate automated tests.

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the MIT license.

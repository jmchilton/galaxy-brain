# Response to mvdbeek review 1

Review branch: `mvdbeek/galaxy` `jmchilton-harden_url_abstractions_25.1-review-1`, on `c7579bb67cb`. Applied 2026-11-09 as six commits on top of the branch, with mvdbeek as author and subjects reworded to the imperative. New head `35b29a37c80`.

- **P2-1** (DRS verification failures reported as unimplemented access type): applied. The file source is resolved inside the `try`, and the download happens outside it. Red-to-green: `test_drs_unverifiable_access_url_keeps_verification_error` failed before the fix.
- **P2-2** (ftp DRS access methods don't get `fetch_url_allowlist` when there is no user context): applied. Red-to-green: `test_drs_ftp_access_method_honours_allowlist_without_user_context`.
- **P3-1** (no test for a remote ZIP redirect to an allowlisted address): test added. It passes without code changes, so it only adds coverage.
- **P3-2** (DRS `ValidatingSession` never closed): applied as a `with` block.
- **P3-3** (private ftp URLs pass the API checks and fail only in the job): deferred to `dev` by John. Not applied.
- **P3-4** (misleading comments): applied in `uris.py` and `test_uris.py`.
- **P3-5** (`fetch_url_allowlist` docs): applied. `make config-rebuild` reproduces the sample and RST changes. The rebuild also produced unrelated drift (quickjs wording), which was left out.

## Tests

- `test/unit/files`: 172 passed, 16 skipped at every new commit.
- `test/unit/files`, `test_data_fetch.py` and `test/unit/workflows/test_trs_proxy.py` together: 213 passed, 17 skipped.
- mypy on the touched files: clean.
- API `lib/galaxy_test/api/test_drs.py`: 5 passed.

## CI

Fork CI on `c7579bb67cb` was all green, and the reds seen on 26.x don't apply here:
- `test_drs_compact_identifiers.py` doesn't exist on 25.1.
- 25.1's `test_data_fetch.py` has no DRS tests.
- The packages job passed with the `httpserver` tests.

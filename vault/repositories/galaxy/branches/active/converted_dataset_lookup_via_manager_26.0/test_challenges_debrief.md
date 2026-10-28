Run via Claude Opus 5.5 at low effort.

# Test challenges (round 2, post-re-scope)

No test changes. Branch has no unit, Vitest or E2E tests; two API tests in `lib/galaxy_test/api/test_datasets.py`.

- `test_converted_ext_returns_existing_conversion` (Baseline commit `097f287d76d`, first): kept; pins reuse of an existing conversion, passes on base.
- `test_converted_ext_checks_conversion_access`: kept. Re-ran red fresh: with `services/datasets.py` at `origin/release_26.0`, fails at its own assertion (`200` vs `403` on `converted/tabular`). Green on branch head (`321d01ad0a1`).
- Helpers: `_get_converted` covers the repeated `converted/{ext}` GET; `_fasta_with_tabular_conversion` composes `dataset_populator` calls. No populator-level converted helper exists to reuse; local is fine.
- Re-scope added `registry.py` routing; still untested. Named providers (`tabix`, `interval_index`, `bigwig`, `bai`...) need converters with no test-tool fixtures; fasta->tabular via `implicit_conversion` isn't a named provider. Not worth a heavy fixture on a release branch; noted for reviewer.
- `users.py` custom-build and feature-search (`fli`) call sites: same helper, no cheap fixture. Not added.
- E2E: not warranted; no UI surface.

Run via Claude Opus 5.5 at low effort.

# Test challenges

Branch adds no unit, Vitest or E2E tests; only two API tests in `lib/galaxy_test/api/test_datasets.py`.

- `test_converted_ext_returns_existing_conversion` (Baseline commit): kept. Pins existing-conversion reuse; passes on base.
- `test_converted_ext_checks_conversion_access`: kept. Red check: with `services/datasets.py` reverted to `origin/release_26.0`, fails at its own assertion (`200` vs expected `403` on `converted/tabular`). Green with branch.
- Helpers: `GET datasets/{id}/converted/{ext}` used twice -> added `_get_converted` (new commit `559503cd03c`, after the impl commit since the second use lands there; Baseline commit stays first and untouched). `_fasta_with_tabular_conversion` already reuses `dataset_populator` (`run_tool`, `wait_for_job`, `get_job_details`); no populator helper for converted lookups exists elsewhere, so kept local to the test class.
- No coverage for `users.py` custom-build and feature-search call sites; same manager method, API-level test would need fasta/fli conversion setup. Not added; noted for reviewer.
- E2E: not warranted; change is API lookup behavior with no UI surface.

Both tests pass individually; pushed to `jmchilton`.

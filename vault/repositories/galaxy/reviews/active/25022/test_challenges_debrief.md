# Test challenges debrief — galaxy#25022 round 0

Reviewed commit: 5a5b2cc11c097d8dd18ef9b186bb20ec3e7dc356 (static review; no tests run at low effort).

## Inventory
- `test/integration/test_pulsar_embedded_persistence.py`: 3 integration tests (default per-server dir, `{server_name}` placeholder, migration function). No unit tests, no Vitest, no E2E.

## Challenges
- Unit tests: none added; integration layer is the right one (real embedded Pulsar app, real job DB rows). Nothing to drop.
- Red/green: `test_default_persistence_directory_is_per_server` and `test_server_name_placeholder_in_persistence_directory` would fail on base (entry never appears under `<server_name>`; placeholder dir would be literal `{server_name}`), though via `wait_on` timeout rather than an assertion. Acceptable.
- `assert active_job_index_entries(shared_directory) == []` in the default test is near-vacuous after the wait already proved the per-server location; harmless.
- Migration test exercises `migrate_embedded_pulsar_persistence` directly with real jobs (running, ok, unknown id, non-numeric id), dry-run and real. Good. Missing case: job with no handler (`"job has no handler"` branch) — cheap to add by nulling a handler? Probably not worth forcing; optional.
- Script `scripts/migrate_embedded_pulsar_persistence.py` `main()` (defaults for `--source`/`--target`, `--target` validation, output, "left in place" hint) has no coverage. Calling `main([...])` with `-c` pointing at the test config is awkward in integration; recommend at least asserting `--target` without placeholder errors, or accept as untested script glue.
- Startup warning when legacy entries sit directly in `<data_dir>/pulsar_persisted_data` is untested. Could be covered by pre-seeding a legacy entry in `handle_galaxy_config_kwds` and asserting via `caplog`-equivalent; low value vs cost.
- Core bug (two handlers recovering each other's jobs) is not tested with multiple handlers; tests prove only path separation for one server. Multi-handler integration setups are expensive; path-separation test is a reasonable proxy.
- Helpers: `_wait_for_active_job_entry`, `_run_sleep_job` fine. `"_default_-active-jobs"` and `"pulsar_persisted_data"` literals repeated; could import `EMBEDDED_PULSAR_PERSISTENCE_DIRECTORY` from the runner. Nit.
- E2E: not applicable (backend job-runner config).

## Test plan recommendations
1. (Optional) Use `EMBEDDED_PULSAR_PERSISTENCE_DIRECTORY` constant in tests instead of literal.
2. (Optional) Add a `--target` validation check / smoke test for the script's `main`.

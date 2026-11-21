# Test challenges review — galaxy#25022 round 0

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, effort low
- Reviewed commit: 5a5b2cc11c097d8dd18ef9b186bb20ec3e7dc356

Verdict: test coverage is appropriate — three integration tests against a real embedded Pulsar app, no unit-test cruft, no E2E needed. Only minor gaps. Detail in [test_challenges_debrief.md](test_challenges_debrief.md).

## P3 1 — Migration script `main()` untested
`scripts/migrate_embedded_pulsar_persistence.py` default resolution of `--source`/`--target` and the `--target` placeholder check are not exercised; only the library function is. Optional: a small smoke test calling `main()` (or factoring default resolution into a tested helper). Untested script glue may be acceptable.

## P3 2 — `"job has no handler"` branch and startup legacy-entry warning untested
The migration test covers unknown/non-numeric/terminal/running but not a handler-less job; the `log.warning` for entries left directly in the shared dir is untested. Optional; low value relative to cost.

## P3 3 — Reuse runner constant in tests
Tests hard-code `"pulsar_persisted_data"` three times; import `EMBEDDED_PULSAR_PERSISTENCE_DIRECTORY` from `galaxy.jobs.runners.pulsar` (already importing from that module). Nit.

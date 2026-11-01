# Filtered findings — #24598 round 0

- `Action.remove_from_object_store` logs and swallows per-object delete errors, so partial object-store failures still exit 0 (default, out of scope): pre-existing continue-on-error behavior the PR doesn't touch.
- Existing `test/integration/test_scripts_pgcleanup.py` tests use `check_output` and now fail on run-sequence errors that used to exit 0 (default, test_challenger, risks notes): positive side effect, not actionable; watch the Postgres integration CI job.
- Admin-facing behavior change (cron/systemd now see exit 1) may merit a release note (risks): not actionable in code; release notes come from PR labels/title.

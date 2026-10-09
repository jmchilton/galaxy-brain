# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- [#23326](https://github.com/galaxyproject/galaxy/pull/23326) — branch `htcondor_pulsar` — Description: Shares HTCondor mechanics with Pulsar and bounds held-job handling; blockers: rebased onto dev 2026-10-08 evening at `b1ecbbf875d` (no conflicts; PR CI on `b4092f59ec3` also had packages social-auth and a Selenium red, both unrelated); CI at `bb87879c07a` had relevant reds — mypy in `jobs/runners/util/condor/htcondor.py` and `htcondor_helper.py` (missing annotations, `Returning Any`) in `Python linting`/`Test Galaxy packages`; Integration red is Rucio infra; Pulsar #486 hold/retry-policy thread.

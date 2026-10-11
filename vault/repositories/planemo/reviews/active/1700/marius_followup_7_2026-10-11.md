# Review: jmchilton/planemo #7 / upstream #1700

Reviewed fork PR https://github.com/jmchilton/planemo/pull/7 at `cf47dcae97bc3b691551fbdf5a951e01bb662a4d` against `b8144e30f5fa1bac08f2a1e718c1a4c4ddf5ed4b` on `anonymous-external-galaxy-api` (upstream https://github.com/galaxyproject/planemo/pull/1700).

Recommendation: merge #7 into John's branch. No blocking findings in its change. The warning uses the existing stderr warning helper, contains no credentials, and leaves credential validation and profile serialization unchanged. Missing or empty credentials select the anonymous warning; either supplied user or admin key suppresses it. Anonymous profile creation remains intentional and succeeds if the existing server credential probe succeeds. Existing admin-over-user precedence remains unchanged.

Validation: run from `/tmp/planemo-marius-oct11/pr-7` with `PYTHONPATH=$PWD /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -q tests/test_galaxy_profiles.py tests/test_galaxy_api.py tests/test_galaxy_config.py::test_external_galaxy_config_defaults_to_anonymous_access tests/test_galaxy_config.py::test_external_galaxy_config_preserves_explicit_keys tests/test_galaxy_config.py::test_managed_galaxy_config_retains_default_admin_key tests/test_profile_commands.py::ProfileCommandsTestCase::test_profile_commands_sqlite`: **9 passed**. Covers anonymous and both credential profile paths, explicit external admin/user clients, retained managed-Galaxy default key, and SQLite CLI profile creation/list/delete. `git diff --check BASE HEAD` passed. No original code changes or weakened tests.

Initial broad run of profiles/API/config/profile commands: 53 passed, 2 skipped, 10 failed. Failures were unrelated integration environment dependencies: Galaxy git clone cannot resolve github.com in the sandbox; Docker socket access denied; config version discovery attempts unavailable writes to ~/.planemo. Focused validation above omits those unavailable managed-Galaxy/Docker tests. No live external Galaxy request was made during this review.

Follow-ups for John's ledger (informational from Marius's #1700 review, not blockers to #7):

- External execution with only `galaxy_user_key`: `external_galaxy_config` correctly retains that user key and leaves `master_api_key=None`; admin client calls consequently use anonymous requests. `planemo/galaxy/activity.py:311` (`admin_gi.jobs.show_job`) and `planemo/engine/galaxy.py:118` (interactor master API key) remain permission-sensitive. These operations failed with a fabricated key before #1700 and can still fail with a less clear auth/permission message. Consider a separate improvement giving an actionable missing-admin-credentials error only at operations that genuinely require it; preserve supported anonymous public-resource access. Decision needed only if prioritizing this diagnostics work, no reason to block the warning fix.
- `planemo/engine/galaxy.py:239` (`tools/{id}/test_data`) may now work anonymously instead of failing with the fabricated test key. This aligns with #1700's public-resource goal. Preserve this behavior; optional future coverage should exercise anonymous retrieval of public embedded test data without enabling authenticated execution accidentally.

## Coordinator outcome

Companion #7 merged into anonymous-external-galaxy-api as b6f5af76209b428877e0d784f0014948c6e055ad. Nine focused tests passed.

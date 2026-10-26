No correctness changes are recommended for the implemented fixes. The review found one small documentation omission to address alongside the existing help-text correction.

- Recommended: add `GALAXY_TEST_SKIP_IF_REQUIRES_CELERY` to the runtime skip-variable list in `run_tests.sh` help. The runner now exports it, and the source research note explicitly identified its absence from that list.
- No implementation change requested for history cleanup, API timeout scaling, browser-backend migration, or Selenium registration guards in this review; these remain distinct scope choices rather than regressions introduced here.

<details>
<summary>Review details</summary>

Reviewed the baseline commit and working changes against `origin/release_26.2`, with the shared review focus and the source Deployment Tests note. The missing return now follows the sibling decorators, preserving a callable and both static and runtime requirement handling. Re-raising from the base history context manager prevents assertions and skips being suppressed while retaining the existing cleanup-on-error behavior. Both new admin guards run before any server access, and the `_setup_user` guard covers named `_different_user()` uses without changing anonymous switching.

The runner uses a supported bootstrap flag that installs development dependencies on release branches. Runtime skips match its static restrictions, with publishing excluded in both layers. The quoted optional debug variable no longer causes a shell diagnostic when unset. The corrected `local_galaxy_url` mapping matches `_load_config_file()`.

Validation performed independently:

- `PYTHONPATH=lib .venv/bin/python -m pytest test/unit/test_base -q`: 24 passed.
- `PYTHONPATH=lib .venv/bin/python /tmp/check_deployment_fixes.py`: assertion/skip propagation, pre-request admin guards, and all nine target/type runner combinations passed using local stubs.
- `git diff --check`: passed.

The one-off runner checks verify argument and environment construction, not dependency installation or execution against a deployed Galaxy. No live production requests were made.

</details>

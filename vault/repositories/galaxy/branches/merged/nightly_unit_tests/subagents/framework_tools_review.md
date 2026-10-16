# Normal review — tool framework split and performance removal (`ff639dd464b`, `e0573f6bf2a`)

No blockers. Acted on in `694f69c4eab`:
- **#1, local default.** Local runs default to the legacy API (`DEFAULT_USE_LEGACY_API = "always"`), the half PRs no longer run. The docs now say to set `GALAXY_TEST_USE_LEGACY_TOOL_API=never` to match PR CI.
- **#2, wording.** "Tool request API only" became "pull requests to `dev` test through the tool request API". Release PRs run both halves, and credentialed tests use legacy anyway.
- **#3, repeated cron string.** The Tuesday cron string appears 3 times; a comment on the cron line now points at the other matches.

Not acted on:
- **#4, Codecov.** The `framework` flag now gets legacy coverage only from nightly runs. Small; the Tuesday run already did the same.
- **Unused local-only flags.** `run_tests.sh --ci_test_metrics` and `--structured_data_html`, and `lib/galaxy_test/performance`, are no longer run by CI. Kept; they're not clearly dead.
- **Flipping `DEFAULT_USE_LEGACY_API` to `never`.** Out of scope.

## Details

Verified unchanged or correct:
- The Tuesday run still runs both halves with extended metadata and no report. A push to `dev` can no longer cancel it.
- Concurrency groups keep PR cancel behaviour, and push, both schedules and dispatch each get their own group.
- The report `if:` folds correctly inside one `${{ }}`.
- Matrix precedence is right.
- Path filters match the sibling workflows.
- Failure artifact names are now unique per half.
- No references to `performance.yaml` remain; the `area/performance` release label is unrelated.

Out-of-scope candidates for the same split:
- `db_indexes` (5 Postgres versions; the strongest candidate).
- The `cwl_conformance` marker axis.
- 3.10 + 3.14 pairs in `first_startup`, `osx_startup` (macOS runners), `lint` and `test_galaxy_packages`.
- `toolshed` `test-install-client` (galaxy_api/standalone).
- Weekly extended-metadata runs without a report job: api, integration, framework_workflows, playwright, integration_selenium, converter_tests, tool_form_harness.

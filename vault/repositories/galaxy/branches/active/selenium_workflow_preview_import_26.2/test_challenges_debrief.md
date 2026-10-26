Added the standard browser-test wrapper to four new TRS run-form cases; the already-working `trs_version_id` compatibility case now lives in the first baseline commit.

The primary agent is running browser validation, so this review did not start competing browser processes. The changed file passes pinned `isort`, `black`, and `git diff --check`; the four decorated cases need the primary's rerun.

Changes applied directly:

- Import `selenium_test` from the integration framework and decorate the four new run-form tests. Remote availability checks remain outside the wrapper, preserving service-down skips while enabling normal debug dumps, accessibility checks, and retry handling.
- No unit tests were added or retained. The source parser/component unit cases duplicate the browser-visible behavior now covered at the integration layer; the inline alias mapping avoids a wrapper created solely for unit testing.

Baseline and regression reasoning:

- The public-workflow preview → Run → Import case is baseline coverage: the behavior works on the release branch. It was originally committed first in `db1a2cc10fa` with existing selectors, before extracting the helper, and passed under both backends. The history-only baseline correction preserves that coverage in `8512991d4d35`. The fixture correction makes the whole file work together, not merely the new method in isolation.
- The new TRS URL run-form cases fail without the URL import-on-load fix because the browser remains in the import wizard; the legacy `trs_version` run-form case similarly fails without the query alias fix. They use existing UI/API fixtures, so their failure concerns the missing import/redirect behavior rather than a missing test helper.
- `test_auto_import_by_trs_version_id_run_form` covers behavior already supported on the base branch. The baseline-refactor step moved it into `8512991d4d35` with a standalone body and refactored it onto the shared helper in the implementation commit. Primary established one pass in 11.39 seconds with both Vue fixes reversed; the final tracked tree remained unchanged by the history correction.
- The four existing URL import tests are strengthened to wait for auto-import without clicking Import. They now detect the regressions that their former manual click concealed.
- The shared helper checks the imported workflow's actual `source_metadata.trs_version_id` and, for run forms, matches the run URL's ID to that imported workflow. Matching only the workflow title would miss a silently selected newest version.

The tests use shared navigation targets and WorkflowPopulator methods for index/download assertions; no repeated raw HTTP calls, mocks, artificial layout, or fixed sleeps were introduced. Existing manual URL/ID import tests should also run during final validation. Live Dockstore/WorkflowHub access is intentional for these registry-integration cases and retains the established service-down skip policy.

Reviewed `doc/source/dev/writing_tests.md`, including suite selection, API/populator reuse, browser decorators, shared-state tests, integration setup, and remote-service availability handling. No other test change was warranted.

Final follow-up: corrected only the helper's expected-version extraction for the existing Dockstore URL fixtures. The outer query parser decodes `%23` into `#`, so parsing the embedded URL again misclassifies its workflow/version suffix as a fragment. Taking the fixed fixture's last slash-delimited segment preserves the exact provenance assertion instead of weakening it. A virtualenv stdlib repro verifies both registries with/without run-form mode; the two affected browser cases are being rerun by the primary. No tests were added or removed, and no new broad challenge pass is required for this isolated expectation correction.

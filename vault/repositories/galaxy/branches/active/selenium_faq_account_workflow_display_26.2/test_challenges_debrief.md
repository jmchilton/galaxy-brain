Fresh expanded-scope test challenge completed. Corrected the existing component test's dataset fixture and rebuilt the unpushed history so all four tests of existing release behavior are baseline tests before helper extraction. Retained every assertion and all requested browser coverage. No remaining test-challenge blocker.

Not changed:

- No new unit-test layer or synthetic DOM/layout tests were added. The only existing unit-test change supplies the dataset identity now required by the successful-load boundary.
- No API/integration tests were added: the behavior under test is browser interaction; existing populators already provide fixture setup and expectations.
- The original-scope alt branch remains at `3855a1843def697ff0330e4860f37ba6e75e6b4e`; its historical commits and reports remain intact.
- No competing browser runs or server restarts were performed. The coordinator owns the remaining cross-backend validation and handoff.

<details>
<summary>Full test challenge and evidence</summary>

## Guidance reviewed

Read `GX_PROCESS_CHALLENGE_TESTS.md`, `doc/source/dev/writing_tests.md` (including browser test placement, API setup, Smart Components and Playwright sections), `client/README.md#client-side-unit-testing`, and the vault's E2E Writing and E2E Smart Components notes. This evaluation inspected the expanded branch afresh rather than relying on reports in `earlier_drafts/1`.

## Changes made

1. **Preserved the existing component test after strengthening readiness.** The normal review correction requires `dataset.id === props.datasetId`. The existing `DisplayApplications.test.js` provider fixture had no ID, causing its first label assertion to fail because the component no longer rendered the catalog. Reproduced the failure, then added `id: "dataset-id"` to the existing fixture. Kept all modern/legacy label, text and link-destination assertions unchanged. This is fixture realism, not weakened behavior or a new tiny infrastructure test.
2. **Made empty-catalog coverage a real baseline.** The added empty-case test describes existing release UI behavior. Keeping it in the expansion commit would make it fail on the release base for a missing new helper rather than at its assertion. Rebuilt the unpushed history with an inline fourth baseline test: create a txt dataset through the populator, open Visualize through the existing helper, wait for the successfully loaded dataset marker, and assert the original baseline XPath catalog items are an empty list. The successful-ID wrapper and navigation marker are test instrumentation in the first baseline commit. Ran this test successfully before applying helper extraction. The third commit then migrates the already-existing test to `dataset_display_applications()` when that helper gains empty-catalog support.

The new history is:

| Commit | Purpose |
| --- | --- |
| `1046d1b61d2` | `Baseline tests for FAQ storage refresh, workflow tags and display catalogs` — four inline baseline tests, readiness instrumentation, and realistic existing component fixture. |
| `915fc25af54` | `Extract FAQ account, workflow and display navigation helpers` — existing populated-catalog extraction and account/workflow helper migrations; the empty baseline remains inline. |
| `531119341eb` | `Handle loaded empty display application catalogs in browser helper` — wait for a valid loaded catalog rather than an item, and migrate the existing empty baseline to the helper. |

Saved original final files and binary patches under `/private/tmp/gx-faq-history-1sdevn8d` before history operations. All nine final changed files are byte-identical to that saved reviewed tree. The rewritten branch is clean. The original-scope alt still names the original extraction commit and was not modified.

## Coverage challenge

- **Storage Refresh:** A real UI action must expose recalculation feedback. A browser test is necessary to connect the masthead usage meter, dashboard Refresh control and rendered feedback. It waits on the existing feedback state rather than a sleep. It intentionally checks acceptance/feedback, not eventual task completion, which is not part of this helper's contract.
- **Workflow tags:** Adds a tag through the Attributes panel, leaves the editor and verifies persisted tags in the workflow list. This would catch a purely local editor update that never persisted. The workflow name is unique and the final list assertion retries through transitions.
- **Populated display catalog:** API setup creates a real BED dataset; an explicit UCSC/main assertion pins a required meaningful application, while the full API-derived expectation handles optional local applications. The browser equality verifies the rendered catalog rather than just restating API data. Modern and legacy entries share the same extraction path. The existing component test also retains destination assertions, which the catalog text map does not cover.
- **Empty display catalog:** A real txt dataset exercises the ordinary no-applications case. The marker now requires the requested dataset identity, so neither initial loading, a provider error object, nor a stale dataset can be treated as loaded empty data. The baseline proves empty release UI behavior; the final migration exercises the reusable helper's empty result.
- **Reset request:** The migrated existing test still checks the returned request result, allowing either successful mail submission or the known unconfigured-mail response. Actual emailed reset/session behavior stays on the separate release_25.1 branch.
- **Profile:** Existing email and public-name assertions remain. Observable return to Preferences replaces sleeps, then re-entry verifies persisted username. Randomized public names prevent server-wide unique-name collisions across reruns.
- **Best Practices:** Existing browser consumers retain their warning/detail assertions, with a direct result-map assertion for input metadata. This exercises the extracted return contract without adding narrow helper unit tests.

All four new browser methods now originate in the first baseline commit and can run without later helper definitions. Later commits only migrate those methods or existing tests; there is no later new test that fails merely because a new fixture or helper does not exist. Baseline methods use existing release operations and navigation instrumentation. No tests were dropped, no assertions weakened, and no unnecessary fake layout/mocking tests introduced.

## Verification

- Pinned-node component command: `npm_config_use_node_version=22.20.0 pnpm exec vitest run src/components/Visualizations/DisplayApplications.test.js` from `client/`.
- Before fixture correction: **1 failed**, `/private/tmp/gx-faq-display-vitest.log`.
- After fixture correction: **1 passed**, `/private/tmp/gx-faq-display-vitest-fixed.log`.
- Fourth inline baseline before helper extraction: **1 passed**, `/private/tmp/gx-faq-fourth-baseline-playwright.log` (23.25 seconds). Reused this worktree's existing Galaxy/Vite servers after the coordinator's run finished.
- Coordinator's reviewed expanded populated/empty catalog run: **2 passed**, `/private/tmp/gx-faq-rescope-reviewed.log`. The final tree remains byte-identical to that tested implementation, with the component fixture correction also retained.
- Targeted Prettier check for the changed Vue component, existing component test and navigation YAML: **passed**.
- All applicable precommit checks passed for each rewritten commit: Black, Ruff, Flake8, Prettier, whitespace/conflict/symlink checks, and client ESLint where applicable.
- The other three original inline baseline tests were previously run successfully by the coordinator; their behavior was retained. No claim is made here of a fresh full Selenium or full Playwright suite run.

</details>

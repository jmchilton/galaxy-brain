# Polish debrief — 2026-10-25

Head `540a46e8c79` on `release_26.2` `849c2573cb0`. Polished again after the requested admin-login cleanup; ready for John's final review. One strengthening round. No PR opened or GitHub comments posted.

## Changes

- Both admin upload classes omit `ensure_registered` and log in once in `setup_with_driver()`. The checklist review caught that login in the test body would run after `@managed_history`; moving it into setup preserves authenticated history creation without registering a regular user or logging out.
- Rebased cleanly onto the latest actual base, `release_26.2`. Old head `cca66ef7a78`; the setup commit became `309d44c5e5d`.
- Fixed the branch-related client CI error: import ordering for `GAlert` in `FilesDialog.vue`. Discarded unrelated event-name autofixes.
- Added annotations to the new helpers/tests during static cleanup. Final lint/type commit `540a46e8c79`.
- Corrected the PR pitch: history helpers provide separate baseline coverage, and `FtpUploadHelp.vue` is a new shared component containing existing notice text. Recorded admin authentication before managed history creation.

## Reviews

The [checklist and strengthening record](subagents/polish_review_2026_10_25.md) covers every GENERAL item and the single strengthening round. All agent-answerable items pass; human-read remains unchecked. Workflow checklist not applicable. No scope expansion or outstanding development task.

## Verification

- Production client build passed under pinned Node 22.20.0. Rebuilding was necessary after rebase: the old bundle rendered `.g-collapse-open` while the current history selector expected `.g-collapse-shown`.
- Fresh Selenium run: **5 passed** across `TestUploadActivityDataLibrary` (2) and `TestUploadActivityRemoteFiles` (3), with framework-managed servers, local chromedriver, headed Chrome, timeout multiplier 2 and involucro auto-install disabled. This verifies login before `@managed_history`, ordinary library/remote uploads, subfolder contents, and both long-name checks.
- Focused Vitest: **19 passed** in `FilesDialog.test.ts`; **1 passed** in `FtpUploadHelp.test.ts`. Initial combined run had a worker-start timeout for FilesDialog; a single-process retry passed.
- `make format` scoped to the branch's eight Python files passed unchanged. The full-tree scan made slow progress and was interrupted; the scoped run avoids dependency directories. Its temporary `.isorted` file was removed.
- Changed-file mypy: **no issues in 8 source files**, using `MYPYPATH=lib:test` and `--follow-imports=silent`. This applies repository package-specific exemptions and excludes imported baseline diagnostics. Early root invocations used incorrect module roots and therefore missed exemptions; their raw error counts are not a regression measure.
- All commit hooks passed, including client ESLint. `git diff --check` passed; Galaxy worktree clean after push.
- Vault `make validate`: 126 files, **0 errors**, 15 advisory warnings.

The initial Playwright run used the stale built client and finished with 2 passes, 2 failures and 1 setup timeout. Its history-detail selector mismatch and upload/navigation timeouts are retained as failed diagnostic evidence, not counted as passing verification. The fresh built-client Selenium run above supplies the current setup coverage. Earlier both-backend baseline/regression evidence remains in the existing hardening debriefs.

## CI

Old head `cca66ef7a78`: Playwright, Integration Selenium, client unit tests and Python lint passed. Client lint failed on the import-order error fixed here. General Integration's sole failure was `TestDataManagerPulsar::test_populate`, whose job stayed `running` instead of reaching `ok`; this branch changes no Pulsar/data-manager code and the failure is unrelated.

Pushed `540a46e8c79` to the `jmchilton` fork with `--force-with-lease` after the clean rebase. Fresh CI queued; CI need not settle for final human review. Titles retain the `[26.2]` prefix; recommended labels remain one `kind/bug` and the central upload, UI and Selenium areas.

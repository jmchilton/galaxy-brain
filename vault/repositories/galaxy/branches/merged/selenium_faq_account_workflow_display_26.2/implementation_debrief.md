# FAQ test/helper implementation handoff

STATUS: READY — implemented, re-scoped, freshly hardened and pushed; awaiting CI and human review.

Branch: `jmchilton/selenium_faq_account_workflow_display_26.2`, head `fbb015b3916`. Base: `release_26.2` at `849c2573cb0`, per `vault/projects/playwright/UPSTREAM_TESTS.md`.

Two review branches were appropriate: this branch carries current-release QA coverage and abstractions, while the user-facing password-reset fix and its emailed/expired-password regressions target the older supported `release_25.1` in `issue_24457_password_reset_25.1`. The standing driver, gxui verbs and GTN findings were not changed by this extraction.

The first commit (`1046d1b61d2`) pins four existing behaviors with passing inline browser tests: Storage Dashboard Refresh, persisted editor tags, configured dataset display links, and a valid empty display catalog. The next (`85060de5c87`) extracts reusable reset-request, Manage Information, Refresh, editor tags/Best Practices and display-catalog helpers, migrates existing consumers, replaces touched profile sleeps with completion waits, reuses the existing Visualize navigation target and adds stable screenshot sites. The final commit (`fbb015b3916`) makes display inspection return `{}` after a successful empty result and migrates the empty baseline case to that helper.

The original-scope alternate remains pushed at `selenium_faq_account_workflow_display_26.2_alt_original_scope` (`3855a1843de`). Fresh normal review fixed the provider-failure/stale-result readiness ambiguity; the marker requires the requested dataset identity. The existing component fixture now supplies its real id. A repeat-run public-name collision was removed by using unique fixture names. See `implementation_rescope_debrief.md` for the first scope recommendation, baseline-history correction and second evaluation's keep-as-implemented decision.

Validation:

- Final head: **10 Selenium cases passed** (326.96s) and **10 headless Playwright cases passed** (123.80s), with original timeout defaults and no source changes during final verification.
- All seven screenshots were individually inspected; see `screenshot_debrief.md`. Initial Playwright setup page-load timeouts under host pressure were isolated before any branch operation; after warmup/Selenium, a fresh default headless run passed all ten. No permanent timeout, cache or build workaround was introduced.
- Existing DisplayApplications Vitest case passed under pinned Node 22.20.0 after its fixture correction; no assertions weakened. Configured commit hooks passed.
- Required final `make format`: 2,779 files unchanged. Matching-entry mypy diagnostics are byte-identical to baseline: 23 pre-existing errors in 12 imported files, none introduced.
- Fresh normal review, test challenge, E2E polish, strict quality review, baseline refactor and second scope evaluation completed with no outstanding findings. First-pass reports are preserved together under `earlier_drafts/1/`.
- Code worktree is clean and fully pushed. Client lint CI passed; remaining fork CI workflows are queued/running, so handoff is under `branches_implemented_needs_ci`. No upstream PR was opened by the implementation workflow.
- Final vault validation passes (126 files, zero errors; 15 unrelated advisory warnings). The earlier runtime-placeholder error is no longer present in the shared vault; this implementation did not edit that file.

The Refresh test intentionally exercises the standard non-Celery test configuration's recalculation acknowledgement, matching local/default CI setup. Populated display links are checked against the configured API catalog while independently requiring UCSC/main, so both minimal CI and fuller local IGV/IGB configurations are supported.

Forward merges should retain the 26.2 reset-request helper's dedicated-reset-page behavior when reconciling the separate 25.1 inline reset helper. The owning Playwright session retains standing-driver commits until upstream reconciliation.

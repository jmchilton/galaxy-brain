# issue_15515_related_filter_copied_items

Status: `ready`. Base: `dev`.

Makes the related filter work on imported and copied history items (#15515).

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

Previous approved SHA (superseded by conflicted rebase): `96218cbe647` (John, 2026-10-06 at `c44206d0535`; carried across a clean rebase onto dev 2026-10-09). Chosen title: **Make the related filter work on imported and copied history items**.

Recorded CI conditions and description instructions are in the tracking history; [shared CI context](../../queue_context.md) applies.

## TICK — 2026-10-11

Previous approved SHA `96218cbe6470d4f4a399e6ec243c08c3540ee9fe` has green API CI and Playwright, including `test_history_related_filter_copied_history PASSED`. Remaining red integration jobs concern container downloads/startup, not job connections; index, integration-Selenium and harness jobs failed Docker pulls, and fork release-script fails its old master version. The opening rebase onto dev `c8708636c2f29a233dcce4b9c1fa75f2c5aea24f` conflicted in `get_related_hids`: an upstream type assertion in the old loop overlaps the branch’s replacement method. Retained the approved replacement; the assertion’s old loop is removed. All other four patches replay identically, and changed Python files parse. New full SHA `1c9c02451093a2fa0ac1e4ae0f323c6f928aa3c8` was force-pushed with an exact lease. **Approval no longer applies because the rebase had a conflict.** Returned to final review; no PR opened. Fresh CI is pending; no new browser run claimed.

Post-rebase local API validation: `pytest lib/galaxy_test/api/test_history_contents.py -k index_filter_by_related -v --tb=short` (backend skill defaults, existing Python 3.13 virtualenv) passed **5/5** in 62.54 seconds, including all four copied-history regressions and the original-history control. This does not restore approval after the conflicted rebase. Worktree is clean.

## PR opened — 2026-10-13

John explicitly requested a non-draft PR, renewing approval for `1c9c02451093a2fa0ac1e4ae0f323c6f928aa3c8`. Its CI had 50 successes, two skipped, and three unrelated failures: both package jobs could not import `build_client_manager` from published `pulsar.client` ([run](https://github.com/jmchilton/galaxy/actions/runs/38168074106)); generated-config setup hit wheels.galaxyproject.org HTTP 503 fetching edam-ontology ([run](https://github.com/jmchilton/galaxy/actions/runs/38168074103)). Neither exercises the changed related-filter code.

Clean pre-PR rebase onto dev `63192fd64e4`: all five patches identical per range-diff. Approval carries to `43b0f3e2c44435952625c0710d4ad5e2e498e92f`; pushed only to jmchilton with an explicit lease. Opened [#24106](https://github.com/galaxyproject/galaxy/pull/24106) **out of draft**, with the chosen title and `pr_description.md` verbatim. Verified non-draft and mergeable, new upstream CI queued/in progress. No known author-side work at opening.

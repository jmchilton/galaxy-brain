# issue_15515_related_filter_copied_items

Status: `draft_ready` — draft PR review and metadata performance fixes pushed; fresh human read and new-head CI pending. Base: `dev`.

Makes the related filter work on imported and copied history items (#15515).

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md) · [Marius review follow-ups](review_followups_2026-10-14.md) · [Performance follow-up](performance_followups_2026-10-14.md)

Previous approved SHA (superseded by conflicted rebase): `96218cbe647` (John, 2026-10-06 at `c44206d0535`; carried across a clean rebase onto dev 2026-10-09). Chosen title: **Make the related filter work on imported and copied history items**.

Recorded CI conditions and description instructions are in the tracking history; [shared CI context](../../queue_context.md) applies.

## TICK — 2026-10-11

Previous approved SHA `96218cbe6470d4f4a399e6ec243c08c3540ee9fe` has green API CI and Playwright, including `test_history_related_filter_copied_history PASSED`. Remaining red integration jobs concern container downloads/startup, not job connections; index, integration-Selenium and harness jobs failed Docker pulls, and fork release-script fails its old master version. The opening rebase onto dev `c8708636c2f29a233dcce4b9c1fa75f2c5aea24f` conflicted in `get_related_hids`: an upstream type assertion in the old loop overlaps the branch’s replacement method. Retained the approved replacement; the assertion’s old loop is removed. All other four patches replay identically, and changed Python files parse. New full SHA `1c9c02451093a2fa0ac1e4ae0f323c6f928aa3c8` was force-pushed with an exact lease. **Approval no longer applies because the rebase had a conflict.** Returned to final review; no PR opened. Fresh CI is pending; no new browser run claimed.

Post-rebase local API validation: `pytest lib/galaxy_test/api/test_history_contents.py -k index_filter_by_related -v --tb=short` (backend skill defaults, existing Python 3.13 virtualenv) passed **5/5** in 62.54 seconds, including all four copied-history regressions and the original-history control. This does not restore approval after the conflicted rebase. Worktree is clean.

## PR opened — 2026-10-13

John explicitly requested a non-draft PR, renewing approval for `1c9c02451093a2fa0ac1e4ae0f323c6f928aa3c8`. Its CI had 50 successes, two skipped, and three unrelated failures: both package jobs could not import `build_client_manager` from published `pulsar.client` ([run](https://github.com/jmchilton/galaxy/actions/runs/38168074106)); generated-config setup hit wheels.galaxyproject.org HTTP 503 fetching edam-ontology ([run](https://github.com/jmchilton/galaxy/actions/runs/38168074103)). Neither exercises the changed related-filter code.

Clean pre-PR rebase onto dev `63192fd64e4`: all five patches identical per range-diff. Approval carries to `43b0f3e2c44435952625c0710d4ad5e2e498e92f`; pushed only to jmchilton with an explicit lease. Opened [#24106](https://github.com/galaxyproject/galaxy/pull/24106) **out of draft**, with the chosen title and `pr_description.md` verbatim. Verified non-draft and mergeable, new upstream CI queued/in progress. No known author-side work at opening.


## Review follow-ups — 2026-10-14

John requested Marius' review fixes with thorough polish and an explanation of any copy-boundary clash. Prior head `43b0f3e2c44435952625c0710d4ad5e2e498e92f` had 54 successful checks and two skipped. Clean polish rebase onto actual upstream dev `8ef56943b78`; no conflicts. New implementation changes supersede the old approved SHA and require a fresh human read. No GitHub comments or description edits are authorized by the polish workflow; revised description is local.

Relationship lookup now uses two fixed SQL queries: a metadata fast path and one guarded relationship query. Association ancestry replaces shared `dataset_id` mapping. The current-item creating-job boundary preserves intermediate copy consumers. Batched collection membership detects hidden outputs without individual job associations, with exact-input reuse exceptions. **23 manager tests, 8 SQLite API tests, 8 PostgreSQL 18 API tests, and 17 standalone PostgreSQL boundary cases pass**. All Galaxy pre-commit hooks pass. Mypy has seven pre-existing annotation errors versus nine on the base. See the [debrief](review_followups_2026-10-14.md) for the detailed boundary explanation, final analyzed query timings, and remaining limits.

Final SHA: `f9b57ed5793cd3e3b929bfcb37daef9e2b880bcb`. Pushed only to the jmchilton fork with an exact lease on the previous approved head. GitHub confirms the new SHA, mergeability, and **draft** state, with CI queued/in progress. This session did not alter draft state. No new-head browser pass is claimed. The description was updated locally; no review replies or live description edit were posted. Fresh human-read approval remains unchecked.

## Performance pass and description publication — 2026-10-14

John requested the extra metadata performance pass and had explicitly requested live description publication. Consolidated metadata into one scan per association type, added four aggregate edge-case instances, and fixed six related CI type errors. Cleanly rebased onto `6801a80e2ad`, committed `4d82165af62e9faad48326137b5bcf4df1ead0a0`, and pushed only to jmchilton with an exact lease. **27 manager tests and eight API tests on each SQLite and PostgreSQL 18 pass**, as do applicable pre-commit hooks. Ordinary late-click performance improves; residual overhead and copied-history scaling remain documented. Copied benchmarks and real nonempty `History.copy()` probe pass. The independent reviewer found no remaining correctness or performance blocker. See the [performance follow-up](performance_followups_2026-10-14.md) for comparisons and corrected CI-equivalent type evidence. The PR description is published and synchronized; prior local-only statements above describe the earlier handoff. Fresh human-read approval and new-head upstream CI remain pending; PR stays draft.

## TICK — 2026-10-14

Current head 4d82165af62e is mergeable, with relevant API/browser checks passing. Only two package jobs fail mypy at unchanged galaxy/security/ssh_util.py:18 (untyped publickey call), unrelated to relationship lookup. Failed jobs rerun. Moved to draft_ready; fresh human-read approval remains pending, so no undraft.

## TICK reruns — 2026-10-15

Requested failed-job reruns for recorded unrelated failures: [run 38578066014](https://github.com/galaxyproject/galaxy/actions/runs/38578066014). Requests accepted; reruns are pending evidence, not green results. Existing classification and review holds remain.

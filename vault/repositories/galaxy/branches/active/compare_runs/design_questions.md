# Design questions for John

## Where things stand (final, 18:30)

- **READY** at `jmchilton/compare_runs` `be7415d94dd` (74 commits: 8 baseline, 10 base-level refactors/fixes, feature, E2E last), ~11.8k non-generated lines. No PR, no CI yet. See [implementation_debrief.md](implementation_debrief.md).
- Hardened three times: 1 → [re-scope](implementation_rescope_debrief.md) (original as `compare_runs_alt_original_scope`); 2 (small expansion taken in place, see [earlier_drafts/2](earlier_drafts/2/implementation_debrief.md)); 3 recommended **no scope change**.
- **Biggest decision: how to split into PRs** — options in [scope_evaluation.md](scope_evaluation.md) (iteration 3: prep PRs P1–P6, then server / client / polish). P1 (job `tool_version` response fix) is a released bug fix that could target a release branch (Q20).
- Coordination: #24288 moves `get_count` (one-line import fix for whichever lands second); #24307 touches the same `Analysis.vue`/`router.js`/`navigation.yml` lines.
- Other important questions: 1 (mode 3 row unit), 4 (comment on #10039?), 10 (`inaccessible` cells), 14 (invocations-page breadcrumbs), 19 (output links never highlighted), 23 (merged "failed" filter).
- Fork CI on `be7415d94dd` queued at handoff (earlier heads: no failures, 10 jobs green on `3cd60c9cb57`).

## Questions

Running list, added to throughout the overnight run. Each is "chose X, confirm?".

1. **Mode 3 row unit** — chose one row per Job, or per ImplicitCollectionJobs when mapped over (not per ToolRequest). Brain research: since PR 21842 every UI submission gets an indexed `tool_request_id`; only legacy `/api/tools` and workflow jobs lack one. Job/ICJ still covers workflow jobs uniformly. Confirm?
2. **Mode 3 includes workflow jobs** — chose `include_workflow_jobs=True` by default. Confirm?
3. **Mode 3 entry point** — *Resolved in part:* job page and DatasetDetails now link to "Other runs of this tool". Open: tool-form "previous runs" panel — still deferred; want it?
4. **Issue reporting** — the branch now implements the workflow-editor entry point #10039 asks for. Post a `GX_PROCESS_RECORD_IMPLEMENTATION` comment on #10039? (yes/no — not posted; galaxyproject/galaxy isn't greenlisted.)
5. **Overlap with open #24288** (jobs panel, not ours) — it changes `JobManager.index_query` to return `(rows, total)`. Mode 3 avoids depending on that signature; whichever merges second rebases.
6. **Implementation-plan decisions D1–D15** — 11 more questions at the end of [implementation_plan.md](implementation_plan.md#design-questions-for-john); all taken at their recommended defaults (StoredWorkflow id + `instance`, sort by id, `role:name` column keys, own mode 3 query, limit ≤200, etc.).
7. **Multi-dataset inputs** — a `multiple="true"` data param cell shows only its first dataset (job records `f1, f11, f12…`, folded to `f1`). Show all N (list cell) instead? *Resolved:* now a `dataset_list` cell (first name + "+N more" popover), access-checked per item.
8. **`metadata_keys`** — lists every non-file element the datatype declares (lists capped at 50), not only scalars seen on the page. OK?
9. **Labelled steps without a job** (inputs, pauses, subworkflows) — All runs works but shows no input columns. Fine, or 400? *Resolved:* input steps show their own value/dataset as `input:<label>`; the tab still isn't offered on input-step cards (outside the card's tab group).
10. **Items the caller can't access** — cells for inputs from other users' histories the caller can no longer read render as `Missing(reason="inaccessible")` (new reason; no name/metadata/value). Confirm the reason name and that hiding entirely is right.
11. **`normalise_io_name` → `normalize_io_name`** — renamed to match Galaxy's `-ize` convention (plan used `-ise`). *Resolved.*
12. **Phase 2 questions** — six more at the end of [subagents/phase_2_implementation.md](subagents/phase_2_implementation.md): admins see foreign items in cells (matches HDA/history managers); HDCA access uses the HDCA-show history rule; unset optional params are `Value(null)`; no `(user_id, tool_id)` index for mode 3; `tool_versions_available` ignores `history_id`/`include_workflow_jobs`; check mode 1 `states` filter on production-size data. All left at the implementer's choice.
13. **Phase 3 (client) questions** — eight at the end of [subagents/phase_3_implementation.md](subagents/phase_3_implementation.md). Notable: labelled *input* steps get no All runs tab (card has no GTabs there); disabled tab text is the full sentence "Label this step to compare its runs" (disabled tabs can't show tooltips); collection cells link to their history (no HDCA page); display prefs in per-user local storage. Steps-without-job detail and `data-pk` selectors handled in phase 4; parameter diff/highlight in phase 5. *Disabled-tab wording superseded by Q24.*
14. **`/comparisons` page + entry points** — the stored-workflow invocations page heading became breadcrumbs with a "Compare outputs" button (as `HistoryInvocations` does); OK given #24174 also touches invocation lists? "Other runs of this tool" shows only on the full job page (gated with its header), not on step-card jobs or the admin job list; want a DatasetDetails entry point too? *Resolved:* DatasetDetails link added (hidden for `__…__` internal tools); workflow editor NodeInspector link added too. Breadcrumb change still open.
15. **State filter vocabulary** — curated lists (job: new/queued/running/ok/error/paused/skipped/deleted; invocation: new/ready/scheduled/completed/failed/cancelled), labelled "successful"/"failed" as elsewhere. Richer list wanted?
16. **`client/src/utils/navigation/schema.ts`** — stale on dev (full regen = ~900 unrelated lines); only the `comparisons` interface hand-added. A dev-wide regen PR would fix it.
17. **Selenium backend not run locally** (no chromedriver) — E2E verified under Playwright only; CI runs both.
18. **Unknown `/comparisons` URL keys** are rejected with an error (typo-safe) rather than silently dropped. OK?
19. **Phase 5 (diff/export/highlight)** — seven at the end of [subagents/phase_5_implementation.md](subagents/phase_5_implementation.md). Notable: output *links* are never highlighted/diffed (each run makes new HDAs — compare by name/hid instead?); a third tick drops the first selected row; mode 1 `versions` is 0-based and repeat-only. Taken in the fix pass: diff follows visible columns, batch pager uses the known `job_count`, mockup's parameter highlight vs the ★ run built on `JobParametersDiff`.
20. **Job page "Tool Version" never renders on released Galaxy** (field stripped from job responses). The branch's job-fields commits fix it; [scope_evaluation.md](scope_evaluation.md) (iteration 3) suggests splitting that piece out as a release-branch fix (P1). Conflicts textually with #24288. Split it?
21. **`GET /api/jobs?tool_version=`** has no consumer on the branch beyond tests — keep it in the job-fields prep PR, or drop?
22. **Subworkflow invocation pages** — All runs there would resolve to the subworkflow build's hidden StoredWorkflow; iteration 3 disables/labels the tab there rather than inventing an identity rule.
23. **State chooser** — job `error` and `failed` merged into one "failed" option (writes both to the URL, matches the State column); options in a compact "State: …" dropdown. `error` alone is no longer filterable. OK?
24. **Disabled All runs tab** — now reads "All runs" with the explanation in a tooltip (supersedes the full-sentence label noted in Q13).

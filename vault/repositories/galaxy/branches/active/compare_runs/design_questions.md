# Design questions for John

## Where things stand (11:45)

- All of plan.md plus Phase 5 polish (two-row diff, filters, CSV export, highlights, batch pager) is implemented and pushed: `jmchilton/compare_runs` (`b527b296a74`), ~10.7k non-generated lines. Backups: `compare_runs_pre_harden`, `compare_runs_pre_fold2`. See [initial_implementation_debrief.md](initial_implementation_debrief.md).
- Hardening 1 (stopped at scope, per process): test challenges, [Codex](earlier_drafts/1/codex_review.md), [scope](earlier_drafts/1/scope_evaluation.md) → [re-scope](implementation_rescope_debrief.md) (original kept as `compare_runs_alt_original_scope`).
- Hardening 2 in progress: [test challenges](earlier_drafts/2/test_challenges_debrief.md), [Codex](earlier_drafts/2/codex_review.md) (2 fixed, 1 decision), [scope](earlier_drafts/2/scope_evaluation.md) → small expansion taken in place rather than parking (route meta renamed `reuseOnQueryChange` to match #24307, skipped outputs in all modes, **workflow editor "Compare runs of this step" link for #10039**, reused badge in batch pager). Now: E2E polish → thermo-nuclear → baseline refactor → checks → screenshots; then hardening 3.
- **Biggest decision: how to split ~10.7k lines into PRs** — options in [scope_evaluation.md](earlier_drafts/2/scope_evaluation.md) (iteration 2) and [iteration 1](earlier_drafts/1/scope_evaluation.md#possible-decompositions). Note #24288 moves `get_count` → CI break for whichever lands second.
- Other important questions: 1 (mode 3 row unit), 10 (`inaccessible` cells), 14 (entry points), 19 (output links never highlighted).

## Questions

Running list, added to throughout the overnight run. Each is "chose X, confirm?".

1. **Mode 3 row unit** — chose one row per Job, or per ImplicitCollectionJobs when mapped over (not per ToolRequest). Brain research: since PR 21842 every UI submission gets an indexed `tool_request_id`; only legacy `/api/tools` and workflow jobs lack one. Job/ICJ still covers workflow jobs uniformly. Confirm?
2. **Mode 3 includes workflow jobs** — chose `include_workflow_jobs=True` by default. Confirm?
3. **Mode 3 entry point** — chose job page only ("Other runs of this tool"); no tool-form "previous runs" panel yet. Confirm?
4. **Issue reporting** — work comes from a project plan, not an issue; nothing posted. #10039 is the closest issue if you want a comment there.
5. **Overlap with open #24288** (jobs panel, not ours) — it changes `JobManager.index_query` to return `(rows, total)`. Mode 3 avoids depending on that signature; whichever merges second rebases.
6. **Implementation-plan decisions D1–D15** — 11 more questions at the end of [implementation_plan.md](implementation_plan.md#design-questions-for-john); all taken at their recommended defaults (StoredWorkflow id + `instance`, sort by id, `role:name` column keys, own mode 3 query, limit ≤200, etc.).
7. **Multi-dataset inputs** — a `multiple="true"` data param cell shows only its first dataset (job records `f1, f11, f12…`, folded to `f1`). Show all N (list cell) instead?
8. **`metadata_keys`** — lists every non-file element the datatype declares (lists capped at 50), not only scalars seen on the page. OK?
9. **Labelled steps without a job** (inputs, pauses, subworkflows) — All runs works but shows no input columns. Fine, or 400?
10. **Items the caller can't access** — cells for inputs from other users' histories the caller can no longer read render as `Missing(reason="inaccessible")` (new reason; no name/metadata/value). Confirm the reason name and that hiding entirely is right.
11. **`normalise_io_name` → `normalize_io_name`** — renamed to match Galaxy's `-ize` convention (plan used `-ise`).
12. **Phase 2 questions** — six more at the end of [subagents/phase_2_implementation.md](subagents/phase_2_implementation.md): admins see foreign items in cells (matches HDA/history managers); HDCA access uses the HDCA-show history rule; unset optional params are `Value(null)`; no `(user_id, tool_id)` index for mode 3; `tool_versions_available` ignores `history_id`/`include_workflow_jobs`; check mode 1 `states` filter on production-size data. All left at the implementer's choice.
13. **Phase 3 (client) questions** — eight at the end of [subagents/phase_3_implementation.md](subagents/phase_3_implementation.md). Notable: labelled *input* steps get no All runs tab (card has no GTabs there); disabled tab text is the full sentence "Label this step to compare its runs" (disabled tabs can't show tooltips); collection cells link to their history (no HDCA page); display prefs in per-user local storage. Steps-without-job detail and `data-pk` selectors handled in phase 4; parameter diff/highlight in phase 5.
14. **`/comparisons` page + entry points** — the stored-workflow invocations page heading became breadcrumbs with a "Compare outputs" button (as `HistoryInvocations` does); OK given #24174 also touches invocation lists? "Other runs of this tool" shows only on the full job page (gated with its header), not on step-card jobs or the admin job list; want a DatasetDetails entry point too?
15. **State filter vocabulary** — curated lists (job: new/queued/running/ok/error/paused/skipped/deleted; invocation: new/ready/scheduled/completed/failed/cancelled), labelled "successful"/"failed" as elsewhere. Richer list wanted?
16. **`client/src/utils/navigation/schema.ts`** — stale on dev (full regen = ~900 unrelated lines); only the `comparisons` interface hand-added. A dev-wide regen PR would fix it.
17. **Selenium backend not run locally** (no chromedriver) — E2E verified under Playwright only; CI runs both.
18. **Unknown `/comparisons` URL keys** are rejected with an error (typo-safe) rather than silently dropped. OK?
19. **Phase 5 (diff/export/highlight)** — seven at the end of [subagents/phase_5_implementation.md](subagents/phase_5_implementation.md). Notable: output *links* are never highlighted/diffed (each run makes new HDAs — compare by name/hid instead?); a third tick drops the first selected row; mode 1 `versions` is 0-based and repeat-only. Taken in the fix pass: diff follows visible columns, batch pager uses the known `job_count`, mockup's parameter highlight vs the ★ run built on `JobParametersDiff`.

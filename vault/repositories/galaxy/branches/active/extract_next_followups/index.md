# extract_next_followups

- [#24225](https://github.com/galaxyproject/galaxy/pull/24225)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/extract_next_followups)

Fixes notebook-to-workflow extraction, report references and editor behavior after #22860. Base: `release_26.2` (retargeted from `dev` 2026-10-17; #22860 first ships in 26.2).

## Status

`attention`: opened as draft [WIP] 2026-10-17 at head `891572be9e0` at John's request, to get it up quickly while he reviews it in detail.

Draft PR [#24225](https://github.com/galaxyproject/galaxy/pull/24225); screenshots hosted on `pr-assets-extract_next_followups`. E5 renames a 26.2 API route, so this must merge before 26.2.0.

Rebased 2026-10-28 onto `release_26.2` `0902830bfa6` (#24368 merged); head `9936a675512`. One `navigation.yml` conflict (kept upstream tooltip selectors + `shown_tooltip`); unit tests 120 passed. PR CI re-running.

## Decisions and references

- Baseline prefix (first 8 commits) cut as [`extract_next_followups_baseline`](../../merged/extract_next_followups_baseline/index.md); merged as [#24368](https://github.com/galaxyproject/galaxy/pull/24368) 2026-10-28. Pre-rebase head kept locally as `backup/extract_next_followups_pre_rebase_20261028`.
- Original scope kept as `extract_next_followups_alt_original_scope` ([alt](alts/original_scope.md)).
- John: H3 accept quotes, M7 lock star (C+B), plain-history copies collapse server-side, `rebase -i` approved for this branch's history rewrites; 2026-10-17: retarget to `release_26.2`, E5 rename/drop `report_title`, do E6+E7, drop `test_extract_button_visible_in_notebook_editor`, E8 explain only, then do E8 (local copy in synthesized boundary rows).
- PR: [description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)
- 2026-10-28: the route rename `c076821e882` was split out as [`pages_extraction_summary_rename_26.2`](../pages_extraction_summary_rename_26.2/index.md). The fixes that also apply to 26.1 (E6, E7, names-parallel 400, user-tool summary) were ported to [`extraction_hid_copies_pdf_sections_26.1`](../extraction_hid_copies_pdf_sections_26.1/index.md). They stay on this branch until those merge, and merge-forward should drop or reconcile them.
- [Plan](plan.md) · [Tracking history](tracking_history.md) · [Scope evaluation](scope_evaluation.md) · [Re-scope debrief](implementation_rescope_debrief.md) · [Screenshots](screenshot_debrief.md) · earlier debriefs in `earlier_drafts/`.

- [#24525](https://github.com/galaxyproject/galaxy/pull/24525) (guerler, sharing page → pages API) is independent: different `router.js` hunk, no shared files.

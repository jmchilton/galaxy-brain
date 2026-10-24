# extract_next_followups

- [#24225](https://github.com/galaxyproject/galaxy/pull/24225)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/extract_next_followups)

Fixes notebook-to-workflow extraction, report references and editor behavior after #22860. Base: `release_26.2` (retargeted from `dev` 2026-10-17; #22860 first ships in 26.2).

## Status

`attention`: opened as draft [WIP] 2026-10-17 at head `891572be9e0` at John's request, to get it up quickly while he reviews it in detail.

Draft PR [#24225](https://github.com/galaxyproject/galaxy/pull/24225); screenshots hosted on `pr-assets-extract_next_followups`. E5 renames a 26.2 API route, so this must merge before 26.2.0.

Rebased 2026-10-24 onto baseline review-nit commit `e1f860da171`, plus tip commit `3f7a2994b97` moving later tests to `Cat1Run`; head `3f7a2994b97`. Test-only conflicts resolved; extraction report + converted-input API tests 21 passed. PR CI re-running.

## Decisions and references

- Baseline prefix (first 8 commits) cut as [`extract_next_followups_baseline`](../extract_next_followups_baseline/index.md) 2026-10-22; draft [#24368](https://github.com/galaxyproject/galaxy/pull/24368) lands first.
- Original scope kept as `extract_next_followups_alt_original_scope` ([alt](alts/original_scope.md)).
- John: H3 accept quotes, M7 lock star (C+B), plain-history copies collapse server-side, `rebase -i` approved for this branch's history rewrites; 2026-10-17: retarget to `release_26.2`, E5 rename/drop `report_title`, do E6+E7, drop `test_extract_button_visible_in_notebook_editor`, E8 explain only, then do E8 (local copy in synthesized boundary rows).
- PR: [description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)
- Open question: keep E6/E7 (also on 26.1) in the 26.2 PR or split to `dev`.
- [Plan](plan.md) · [Tracking history](tracking_history.md) · [Scope evaluation](scope_evaluation.md) · [Re-scope debrief](implementation_rescope_debrief.md) · [Screenshots](screenshot_debrief.md) · earlier debriefs in `earlier_drafts/`.

## TICK — 2026-10-20

PR CI on `d918bcf0552`: Test Galaxy packages (3.10, 3.14) fail mypy at `tool_shed/webapp/fast_app.py:179` (`Unexpected keyword argument "tags"`). The PR diff touches no `tool_shed/` file, so unrelated. Draft [WIP] by John's request; stays `attention`.

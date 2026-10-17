# extract_next_followups

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:extract_next_followups?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/extract_next_followups)

Fixes notebook-to-workflow extraction, report references and editor behavior after #22860. Base: `release_26.2` (retargeted from `dev` 2026-10-17; #22860 first ships in 26.2).

## Status

`branches_ready_for_final_review`: polished 2026-10-17 at head `891572be9e0`, no branch changes; waits for John's read-through. See [polish debrief](polish_debrief.md).

No PR open. E5 renames a 26.2 API route, so this must merge before 26.2.0.

Fork CI on `891572be9e0` still queued at polish time; local API, unit and Playwright E2E suites pass.

## Decisions and references

- Original scope kept as `extract_next_followups_alt_original_scope` ([alt](alts/original_scope.md)).
- John: H3 accept quotes, M7 lock star (C+B), plain-history copies collapse server-side, `rebase -i` approved for this branch's history rewrites; 2026-10-17: retarget to `release_26.2`, E5 rename/drop `report_title`, do E6+E7, drop `test_extract_button_visible_in_notebook_editor`, E8 explain only, then do E8 (local copy in synthesized boundary rows).
- PR: [description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)
- Open question: keep E6/E7 (also on 26.1) in the 26.2 PR or split to `dev`.
- [Plan](plan.md) · [Tracking history](tracking_history.md) · [Scope evaluation](scope_evaluation.md) · [Re-scope debrief](implementation_rescope_debrief.md) · [Screenshots](screenshot_debrief.md) · earlier debriefs in `earlier_drafts/`.

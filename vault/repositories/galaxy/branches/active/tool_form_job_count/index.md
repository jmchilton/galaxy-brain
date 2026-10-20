# tool_form_job_count

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_form_job_count?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_form_job_count)

Previews tool job counts before Run, with expansion and mismatch warnings; Run disabled on mismatch / multi-job remap. Base: `dev`.

## Status

`branches_ready_for_final_review`: polished 2026-10-17 and rebased with the baseline 2026-10-20 onto dev `93b3c85e532` at `b2815e3d8d6`; waiting on John's read-through. Open question: the form submits through async tool requests by default, so the preview's counts need to match that path too ([baseline review response](../tool_form_job_count_baseline/pr_review_response.md)).

No PR yet. The baseline commits are split out as [`tool_form_job_count_baseline`](../tool_form_job_count_baseline/index.md), meant to land first.

Fork CI is pending on `b2815e3d8d6`.

## Polish

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish debrief](polish_debrief.md)

## Notes

[Implementation](implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Baseline refactor](baseline_refactor.md) · [Alt: original scope](alts/original_scope.md) · [Tracking history](tracking_history.md)

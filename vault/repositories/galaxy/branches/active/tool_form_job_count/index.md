# tool_form_job_count

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_form_job_count?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_form_job_count)

Previews tool job counts before Run, with expansion and mismatch warnings; Run disabled on mismatch / multi-job remap. Base: `dev`.

## Status

`branches_ready_for_final_review`: polished 2026-10-17 and rebased with the baseline 2026-10-20 onto dev `93b3c85e532`, then got async parity tests at `fff553be2d4`; restacked 2026-10-23 on the baseline mypy fix at `0ceeea6f13e` (only diff: `bool(...)` in `meta.py` `_is_async_batch`); waiting on John's read-through. Preview counts match the async tool request path. Remaining items: reword the "/api/tools would reject" claim, and check empty batches on async ([async parity](async_parity.md)).

No PR yet. The baseline commits are split out as [`tool_form_job_count_baseline`](../../merged/tool_form_job_count_baseline/index.md), meant to land first.

Fork CI is pending on `0ceeea6f13e`.

## Polish

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish debrief](polish_debrief.md)

## Notes

[Async parity](async_parity.md) · [Implementation](implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Baseline refactor](baseline_refactor.md) · [Alt: original scope](alts/original_scope.md) · [Tracking history](tracking_history.md)

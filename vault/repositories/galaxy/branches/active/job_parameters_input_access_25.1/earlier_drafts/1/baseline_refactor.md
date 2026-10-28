No refactoring of the base branch was performed.

Diff is small (nested helpers in `summarize_job_parameters`, `_data_input_text` in markdown_util, one optional schema field, regenerated client schema, tests). The helpers only exist for the contract tightening, so no behavior-preserving piece exists on the base that would clarify the fix commit.

Considered: sharing the DCE access rule with `DatasetCollectionsService.dce_content` (thermo_nuclear_review.md). Rejected for the stable release: it edits unrelated existing code and widens the backport; left as a dev follow-up.

History unchanged: `2ba71466913` (Baseline tests) then `fba59af067f`.

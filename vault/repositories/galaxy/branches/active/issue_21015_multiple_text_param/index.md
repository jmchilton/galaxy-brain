# issue_21015_multiple_text_param

Status: `ci_wait`; **READY** for human review. Base: `dev`. [PR #23992](https://github.com/galaxyproject/galaxy/pull/23992) (open), pushed head `299a59367472389cd2aa8eda1b69c2f8b5b4b543`.

Supports multiple text workflow parameters end to end (#21015), including Marius's text-default and validation review fixes.

[Implementation](implementation_debrief.md) · [Split implementation](initial_implementation_debrief.md) · [Normal review](subagents/split_normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Code quality](thermo_nuclear_review.md) · [Scope](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [PR description](pr_description.md) · [Tracking history](tracking_history.md)

## Approved split — 2026-10-12

John approved moving the text fixes into this PR and keeping float capability on [the stacked follow-up](../workflow_multiple_parameter_review_followups/index.md). The PR description was updated as explicitly requested and verified after publication. Local checks pass; previously green61 checks belonged to old head `c8f9c40bae0d98c02fd2056dd5abeafab7dd9b15` and do not attest this new head. Empty-valued connected options and shared default/subworkflow normalization remain documented/deferred.

GitHub after the split confirms the new head is `MERGEABLE`, remains a regular PR, and has42 queued,1 running,3 skipped checks at the handoff snapshot; no completed failures.

---
upstream_base_branch: release_26.2
---

# FAQ coverage for accounts, workflow editing and dataset display links

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_faq_account_workflow_display_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_faq_account_workflow_display_26.2)

## Status

Approved by launch; PR opened as draft (`ci_wait`), rebased onto `release_26.2` (`62dcd7b0a7a`) and pushed at `9c088e58794`.

[PR #24482](https://github.com/galaxyproject/galaxy/pull/24482) draft against `release_26.2`; screenshots hosted on fork branch `pr-assets-selenium_faq_account_workflow_display_26.2`.

CI not yet run on `9c088e58794` (rebased 2026-10-29, mergeable); pre-rebase head `64b7f1ef204` passed all 23 workflows that ran. Rebase conflict in `navigates_galaxy.py` kept upstream's `request_password_reset` plus the prefilled-email assertion, and reused `navigate_to_storage_dashboard` for `storage_dashboard_recalculate_disk_usage`.

## Handoff

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Checklist review](polish_checklist.md) · [Strengthening round](polish_strengthening.md).

The human-read checklist item remains unchecked. Five component cases and commit hooks pass; mypy matches the current base's 23 existing imported-code errors.

[Implementation debrief](implementation_debrief.md) records ten passing tests on each browser backend, verified screenshots and the retained final scope; [scope correction](implementation_rescope_debrief.md) explains the empty-catalog expansion and preserved original alternate.

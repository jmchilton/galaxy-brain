---
upstream_base_branch: release_26.2
---

# FAQ coverage for accounts, workflow editing and dataset display links

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_faq_account_workflow_display_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_faq_account_workflow_display_26.2)

## Status

Rebased onto `release_26.2` (`a0e37600cf6`) 2026-11-02 with davelopez review fixes, pushed at `c9cfd049e14`; 12 touched E2E tests pass locally.

[PR #24482](https://github.com/galaxyproject/galaxy/pull/24482) open against `release_26.2`; reply to davelopez review drafted in [review_response_davelopez_1.md](review_response_davelopez_1.md), not yet posted; one open question in [pushback](review_pushback_davelopez_1.md).

CI re-running on `c9cfd049e14`; screenshots hosted on fork branch `pr-assets-selenium_faq_account_workflow_display_26.2`.

## Handoff

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Checklist review](polish_checklist.md) · [Strengthening round](polish_strengthening.md).

The human-read checklist item remains unchecked. Five component cases and commit hooks pass; mypy matches the current base's 23 existing imported-code errors.

[Implementation debrief](implementation_debrief.md) records ten passing tests on each browser backend, verified screenshots and the retained final scope; [scope correction](implementation_rescope_debrief.md) explains the empty-catalog expansion and preserved original alternate.

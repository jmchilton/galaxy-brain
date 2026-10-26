---
upstream_base_branch: release_26.2
---

# FAQ coverage for accounts, workflow editing and dataset display links

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_faq_account_workflow_display_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_faq_account_workflow_display_26.2)

## Status

Polished and awaiting John's final review (`branches_ready_for_final_review`), pushed at `64b7f1ef204` against `release_26.2` (`cce99870510`).

PR not opened.

CI checked 2026-10-26: fresh head queued; pre-rebase head passed all 23 workflows that ran, and local post-rebase browser verification was blocked during setup.

## Handoff

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Checklist review](polish_checklist.md) · [Strengthening round](polish_strengthening.md).

The human-read checklist item remains unchecked. Five component cases and commit hooks pass; mypy matches the current base's 23 existing imported-code errors.

[Implementation debrief](implementation_debrief.md) records ten passing tests on each browser backend, verified screenshots and the retained final scope; [scope correction](implementation_rescope_debrief.md) explains the empty-catalog expansion and preserved original alternate.

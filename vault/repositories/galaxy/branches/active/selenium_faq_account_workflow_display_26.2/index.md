---
upstream_base_branch: release_26.2
---

# FAQ coverage for accounts, workflow editing and dataset display links

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_faq_account_workflow_display_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_faq_account_workflow_display_26.2)

## Status

Polishing in progress (`branches_need_polish`); cleanly rebased to `release_26.2` (`cce99870510`), head `a7934d518fc`.

PR not opened.

CI checked 2026-10-26: all 23 workflows that ran on pre-rebase head `fbb015b3916` passed; CWL conformance and Pulsar package tests skipped.

## Handoff

[Implementation debrief](implementation_debrief.md) records ten passing tests on each browser backend, verified screenshots and the retained final scope; [scope correction](implementation_rescope_debrief.md) explains the empty-catalog expansion and preserved original alternate.

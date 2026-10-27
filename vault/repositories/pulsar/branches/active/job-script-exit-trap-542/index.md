---
upstream_base_branch: release_0.15
---

# Keep job-script EXIT handlers when the command sets its own trap

- [PR #555](https://github.com/galaxyproject/pulsar/pull/555)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/job-script-exit-trap-542)

## Status

Polished at `6b2606d`; fixes [#542](https://github.com/galaxyproject/pulsar/issues/542) ([issue notes](../../../issues/wip/542/index.md)).

[#555](https://github.com/galaxyproject/pulsar/pull/555) opened 2026-10-27 at John's request (title option 1, label `confirmed bug`).

Fork CI runs were still queued on GitHub at 2026-10-27 04:40Z; local tests for the touched files are green; expect pre-existing ruff ICN001 lint reds on `release_0.15` (fixed by #546 on `master` only).

## Docs

- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md)
- [Implementation debrief](implementation_debrief.md) · [normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [polish debrief](polish_debrief.md)

## Base

Branched from `origin/release_0.15` at `402a8f8` (the bug shipped in 0.15.16 and 0.16.0; `release_0.15` merges forward into `master`).

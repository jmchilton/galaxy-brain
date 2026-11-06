---
upstream_base_branch: main
pr: 752
---
# Pin IWC review prompts to the accepted upstream commit

- [Open PR](https://github.com/galaxyproject/foundry/pull/752)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-535-accept-iwc-policy-pin)

## Status

Merged at head `b4369502`; worktree removed. Refs [#535](../../../issues/wip/535/index.md), items 1, 2 and 5 only.

[#752](https://github.com/galaxyproject/foundry/pull/752) merged 2026-11-06 as `7453431d`.

CI green on `b4369502`, including `test`, which settles the local load timeouts.

## Decisions

Semver and unlabelled-output differences are recorded, not raised upstream, pending John's answer. The PR left #535 open. `pr_tags.md` labels were not applied.

## Records

[Implementation debrief](implementation_debrief.md), [normal review](subagents/normal_review.md), [Codex review](codex_review.md), [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md). Thermo-nuclear review skipped: no implementation or test code, no plumbing.

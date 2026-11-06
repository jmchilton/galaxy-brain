---
upstream_base_branch: main
---
# Pin IWC review prompts to the accepted upstream commit

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-535-accept-iwc-policy-pin)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-535-accept-iwc-policy-pin)

## Status

Ready for final review at `b4369502`, branched from `origin/main` at `618853f0`; worktree `~/projects/worktrees/foundry/branch/issue-535-accept-iwc-policy-pin`. Refs [#535](../../../issues/wip/535/index.md), items 1, 2 and 5 only.

No PR yet: agreed with John to check before opening.

No CI until a PR opens; locally `make test` is unconfirmed at `b4369502` (load timeouts only, 496 of 496 at `a449e174`), and `check-vendored` shows the base's 8 drifts.

## Decisions

Semver and unlabelled-output differences are recorded, not raised upstream, pending John's answer. The PR must not close #535.

## Records

[Implementation debrief](implementation_debrief.md), [normal review](subagents/normal_review.md), [Codex review](codex_review.md), [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md). Thermo-nuclear review skipped: no implementation or test code, no plumbing.

---
upstream_base_branch: master
---
# Preserve falsy workflow test outputs

- [PR #1761](https://github.com/galaxyproject/planemo/pull/1761)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/preserve-falsy-test-outputs)

## Status

Implemented, reviewed, hardened and polished at `0a9f91cce4b60ad83c79eb2a0840feedde21fb15`.

PR #1761 is open as explicitly requested by John on 2026-10-26.

Local lint and all 29 related tests pass; [fork Python CI](https://github.com/jmchilton/planemo/actions/runs/40386371885) is queued.

## Scope and base

The test report builder treats valid falsy values as missing. This is a separate Planemo bug from #1759/#1760; no upstream Galaxy changes are needed. Found in https://github.com/galaxyproject/foundry/pull/713.

Searched open issues, PRs and local matching branches; no existing fix found. No separate numbered issue was supplied. Base: freshly fetched origin/master at 5ff07fa8165769f55746dd9281de6d352487aba6.

## Supporting documents

- [Implementation debrief](implementation_debrief.md)
- [Normal review](subagents/normal_review.md)
- [Hardening debrief](hardening_debrief.md)
- [Polish debrief](polish_debrief.md)
- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Suggested labels](pr_tags.md)

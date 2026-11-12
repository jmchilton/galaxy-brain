---
upstream_base_branch: main
blockers: gxformat2/branches/ci_restrict_pytest_testpaths
related_records: galaxy-tool-util-ts/branches/frame_index_range
pr: 298
---

# Range-check frame contains_steps/contains_comments indices

- [PR #298](https://github.com/galaxyproject/gxformat2/pull/298)
- [View on GitHub](https://github.com/jmchilton/gxformat2/tree/frame_index_range)

## Status

Polished at `3530ea0`, ready for final review; follows up merged #293 ([record](../../merged/issue_292_frame_labels/index.md)).

Draft PR [#298](https://github.com/galaxyproject/gxformat2/pull/298), opened 2026-11-12 at John's request; draft until John's read-through. Paired TS PR [#237](https://github.com/jmchilton/galaxy-tool-util-ts/pull/237).

PR CI on `3530ea0`: only Python CI 3.13 red (3.10/3.14/3.15 canceled by fail-fast) — unrelated: IWC #1541's `iwc/scripts/tests` collected (no planemo) + missing `schema_rules.yml`; same on `main`, fixed by `ci_restrict_pytest_testpaths` ([#299](https://github.com/galaxyproject/gxformat2/pull/299)); rerun after it merges.

## Files

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md)
- [Implementation debrief](implementation_debrief.md), [polish debrief](polish_debrief.md)
- [Codex review](codex_review.md), [thermo review](thermo_nuclear_review.md)

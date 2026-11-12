---
upstream_base_branch: main
related_records: gxformat2/branches/frame_index_range
pr: 237
---
# Range-check frame contains_steps/contains_comments indices

- [PR #237](https://github.com/jmchilton/galaxy-tool-util-ts/pull/237)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/frame_index_range)

## Status

Polished at `5cf1f5d6`; ready for final review.

Draft PR [#237](https://github.com/jmchilton/galaxy-tool-util-ts/pull/237), opened 2026-11-12 at John's request; draft until John's read-through. Paired gxformat2 PR [#298](https://github.com/galaxyproject/gxformat2/pull/298).

PR CI on `5cf1f5d6` green except `changeset-check` (no changeset); added `.changeset/frame-index-range.md` in `67a88fce`, CI rerunning.

## Links

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md)
- Debriefs: [implementation](implementation_debrief.md), [polish](polish_debrief.md)
- Reviews: [thermo nuclear](thermo_nuclear_review.md), [codex](codex_review.md), [normal](subagents/normal_review.md)

## Notes

- Follows up merged #227 (`issue_225_frame_labels`).
- Fixtures/expectations come from the gxformat2 `frame_index_range` branch (synced at `baaac08`); re-sync if it moves.

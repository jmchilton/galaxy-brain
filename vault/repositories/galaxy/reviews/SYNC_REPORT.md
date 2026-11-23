# Galaxy review-state sync

Sync date: 2026-11-22. Agent directory: `vault/agents/gx_reviews`.

## Archived (merged)

#25028, #25005, #25022, #24800, #24867, #24857, #24846, #24861, #24835, #24826, #24817, #24798, #24770, #24700, #24772, #24685, #24708, #24673, #24647, #24635, #24415, #24101, #23869 moved to `archived/`; queue entries removed. Links in `gx_research/todo/*` and `branches/active/reference_data_followups/brain_research.md` repointed.

## Re-review needed (new head)

- #24804: `eaa6202814b` -> `0329efc961e`
- #24818: `efa3e7bbdaf` -> `d3adaeb1fc7`
- #24738: `c55d04482f9` -> `dcd8410b095`
- #24687: `82550bcf062` -> `bedf1d6cbcb`
- #24696: `b26614f7c11` -> `5729db00bfc`
- #24290: `b8eb7166` -> `fe484b35016`

## Status changes

Status lines above updated with new heads. Other open PRs unchanged vs recorded heads.

## Mismatches

- #23676: active record with no `MY_REVIEWS.md` entry (open, draft). Not added.

## Worktrees

Removed (clean, HEAD on a pushed remote branch): 25028, 25005, 25022, 24867, 24857, 24846, 24861, 24835, 24817, 24798, 24770, 24700, 24685, 24708, 24673, 24635, 24415.

Kept:
- 24101: clean, HEAD `5a5cc5bda5b` is an earlier (force-pushed-over) author head, not an ancestor of the merged head nor on any local remote ref. Exists on GitHub; looks safe to remove after John confirms.
- 23869: same situation, HEAD `a3b2e328f0c`.

No worktree: 24800, 24826, 24772, 24647.

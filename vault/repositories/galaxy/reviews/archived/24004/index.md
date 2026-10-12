# galaxy #24004 — [26.1] Resolve implicitly converted inputs in the YAML tool runtime

[PR #24004](https://github.com/galaxyproject/galaxy/pull/24004) · Status: archived; merged 2026-10-12T14:14:31Z. Tracking ended after merge.

[Review and risk assessment](review-2026-10-11.md) · [Original review draft](draft-review.md) · [Validation evidence](validation-evidence.txt)

[Python 3.8 alias probe](python38-probe.py) · [Real-model runtime probes](runtime-probe.py) · [Fixture-only strict-test remedy](renamed-fixture-probe.py)

Reviewed HEAD: `6ea906adf6b4bc3863d1765ba0e3b58fbb2a8f82` (base `release_26.1`). Author: davelopez. Live HEAD was unchanged at final check.

John requested this review on 2026-10-11. Delivery: John [commented on both the Python 3.8 and fixture-name failures](https://github.com/galaxyproject/galaxy/pull/24004#issuecomment-6110647512) on 2026-10-11 at 15:33:59 UTC. No formal review; ball with author.

## Current findings

- P1: evaluated `list[str]` callback aliases break supported Python 3.8 imports; actual Pulsar CI reports 130 collection errors, and exact-alias execution reproduces independently.
- P2: the new fixture reuses input names for outputs, so existing history-addition logic leaves them historyless; strict local run reproduces CI, and output-key renaming alone passes.

## Validation

31 focused unit tests passed; four real-model runtime probes passed. New framework fixture passes without strict history checks. With CI's strict flag, it fails while three XML conversion siblings pass. Renaming only fixture output keys in memory yields a strict end-to-end pass. No Galaxy source was changed.

CI: 53 successful, 2 failed, 2 cancelled, 1 skipped. Current failures align with both findings. Marius's earlier shared-input feedback is incorporated on this head; John subsequently posted both blockers; no later author reply at the delivery check.

## Resources

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24004/` (clean after review).

CI cache: `/Users/jxc755/projects/ci-artifacts/galaxy/pr/24004/`; actual artifact HTML was inspected because the generated summary did not unwrap nested JSON. Worktree and cache retained while the PR is open.

## Morning check — 2026-10-12

Open, ready; live HEAD `c9c7e803e0eebdc47e0feeb9edfe155c97867ffd`. CI snapshot: 2 failure, 1 skipped, 56 success. New head `c9c7e803e0ee`; author says type fixes and release CI fixes should resolve the previous failures. Verification pending. Two checks still fail; this refresh does not establish whether either older finding remains on the current code.


## Archived — 2026-10-12

GitHub reports MERGED at 2026-10-12T14:14:31Z; merge commit `fe18fd8b8b9b916b0ece2e6bbb761097e53302e9`. Removed from the review queue. Clean worktree retained: no upstream is configured and its older review HEAD diverges from the merged PR head (5 commits on the old side). Per WORKTREES.md, removal requires John’s confirmation. This is a cleanup hold, not an outstanding code review.

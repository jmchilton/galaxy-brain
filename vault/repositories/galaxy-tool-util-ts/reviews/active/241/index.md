# galaxy-tool-util-ts#241 — Reject a Format2 source that names no step, such as a labelled step by its id

- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/pull/241) · [initial_review.md](initial_review.md) · [test_challenges_review.md](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks.md](risks.md) · [review_0_findings.yml](review_0_findings.yml) · [comment note](johns_review_0_comment_note.md) · [PR note](johns_review_0_pr_note.md) · [cross_repo_impact.md](cross_repo_impact.md) · review branch [`pr_241_round_0_rev_0`](https://github.com/jmchilton/galaxy-tool-util-ts/compare/28e93b564fc6...pr_241_round_0_rev_0)

## Status

Round 0 reviewed `28e93b56`. 3 P2s and 8 P3s; 6 fixed on `pr_241_round_0_rev_0` (`db8154a4`, pushed to origin). Not delivered.

PR open, not draft (arash77, `fix-229-label-shadows-id`). No CI checks reported yet; the fork PR's workflows are probably awaiting approval.

## Dependencies

The gxformat2 counterpart has no issue yet. It needs a descriptive `step_id` error instead of the bare `int()` failure, step `in:` source lint, and shared fixture expectations. P2 2 and P3 3 depend on it. Galaxy `wf_tool_state` needs only a gxformat2 floor bump; see [cross_repo_impact.md](cross_repo_impact.md).

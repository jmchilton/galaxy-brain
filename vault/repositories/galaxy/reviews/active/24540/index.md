# galaxy#24540 — Show collections with all elements purged as purged

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24540) · [default](initial_review.md) · [tests](test_challenges_review.md) · [perf](perf_review.md) · [risks](risks.md) · [learning](learning_galaxy.md) · [verified review](verified_review.md) · [review branch `pr_24540_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24540_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [action](initial_response_action.md)

## Status

Delivered: approved with response; fixes PR https://github.com/davelopez/galaxy/pull/12 opened (awaiting author/merge). Reviewed at `613265a0d2f`: two P2 test gaps + four P3s, all fixed on `pr_24540_review_0` (pushed to fork); perf analysis (requested by John) found impact negligible — one added SELECT column, no new query/join.

PR open, not draft, against `dev`; author davelopez; fixes #24293.

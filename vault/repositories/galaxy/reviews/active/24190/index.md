# PR #24190 — Nest collection list:paired fix

- PR: https://github.com/galaxyproject/galaxy/pull/24190
- Latest review: [Initial review](review.md)
- Evidence: [Reproduction script](reproduce.py), [output](reproduction-output.txt)
- Status: Author OK'd pushes; fixes on `pr_24190_review_0` ([jmchilton fork](https://github.com/jmchilton/galaxy/tree/pr_24190_review_0), head `6f36ac97004`, [details](review_0_branch_details.md)); not yet pushed into PR
- Delivery: [posted as comment](https://github.com/galaxyproject/galaxy/pull/24190#issuecomment-6219357991) by John, 2026-10-16T15:56:22Z, on reviewed head `a6d7e445d63`
- Reviewed commit: `a6d7e445d63003258183c3eae36bdb5430dc8d97`
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24190`
- Reviewed: 2026-10-16

The intended extra nesting predates this PR: base help/tests already preserve each pair inside a singleton list. The fix removes unintended implicit mapping that splits pair members, while changing the actual behavior of existing mapped workflows. See the semantic comparison in the review.

Three P2 findings: runtime/declaration output type mismatch, removal of bare paired input, and loss of paired suffix on empty lists. Collection matching suite: 16 passed. Focused production-code reproductions confirm the behaviors; full server/browser workflow execution was not run locally.

Review delivered as John's comment with the three P2s; no author commits since. Worktree retained while PR is open.

2026-10-16T16:05:28Z: author replied "Feel free to push" (maintainer edits on); reconfirmed in a meeting 2026-10-20. Fixes on `pr_24190_review_0` (2026-10-20): P2 2 and P2 3 fixed; P2 1 fixed for mapped execution (plus a pre-existing mapped-slice parent-collection bug), workflow-editor advertised type not fixed (needs new tool-spec attribute). Author's matching unit test rewritten since bare `paired` makes `list:paired` mappable. Pushing into the PR branch awaits John's go-ahead.

2026-10-20: **Superseded on 26.2** by branch [`issue_24303_collection_type_prefix_26.2`](../../../branches/active/issue_24303_collection_type_prefix_26.2/index.md) (John): `type_prefix` + Nest 1.1.0, bernt-matthias's commit cherry-picked. Do not push `pr_24190_review_0` into the PR without a new decision. What to do with #24190 itself is John's call.

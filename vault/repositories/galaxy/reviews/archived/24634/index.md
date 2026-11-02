# #24634 — [26.2] Contain MetadataTempFile paths to the job metadata directory

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24634) · [initial_review.md](initial_review.md) · [test_challenges_review.md](test_challenges_review.md) · [risks.md](risks.md) · [verified_review.md](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24634_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24634_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [actions](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)
- Related: [#24561](../24561/index.md) (job dir no longer mounted into tool containers; this PR is the Galaxy-side backstop).

## Status

Round 0 review on `c9ad46bdcc5` posted 2026-11-01 as approval (body = response). P2 1 + three P3s, all fixed on `pr_24634_review_0` (`3cefdbb928c`, fork only). Default reviewer's Celery P2 and risks' symlink concern disproved (filtered). A private security note exists for John (location given in session, not recorded here).

PR open, out of draft (mvdbeek), base `release_26.2`. Worktree: `~/projects/worktrees/galaxy/pr/24634`.

## Archived

Merged on GitHub 2026-11-02T11:11:27Z; tracking ended (PR merged). Archived 2026-11-02.

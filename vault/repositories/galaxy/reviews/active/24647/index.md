# #24647 — [26.2] Restrict a job's extended metadata import to the job's own outputs

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24647) · [default](initial_review.md) · [test challenges](test_challenges_review.md) · [performance](performance_challenges_review.md) · [risks](risks.md) · [learning](learning_galaxy.md) · [verified review](verified_review.md) · [checklist](verified_findings_checklist.md) · [filtered](filtered_findings.md) · [review branch](review_0_branch_details.md) ([`pr_24647_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24647_review_0)) · [response](initial_review_response.md) · [action](initial_response_action.md) · [galaxy-brain issue](learning_galaxy_followup_issue.md)

## Status

Initial review round 0 on `7247fea9983` ready, unposted: one P2 + three P3s; P2 (requested integration test, 4 cases) and two P3s fixed on `pr_24647_review_0` (pushed to fork, not PR); rollback P3 left unfixed.

PR open against `release_26.2` (author mvdbeek).

## Standing instructions

John (2026-11-02): looks really nice at first look; as part of verification, implement an actual integration test that tries to edit an unowned object through the extended metadata import and verifies it is rejected.

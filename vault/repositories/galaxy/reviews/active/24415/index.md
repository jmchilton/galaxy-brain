# #24415 — [26.1] Report the JavaScript error when a tool expression fails while building a job

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24415) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [verified review](verified_review.md) · [review branch `pr_24415_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24415_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)

## Status

Initial review of `84910093a8c` complete 2026-10-23; delivered 2026-10-26 as approval + review PR https://github.com/richard-burhans/galaxy/pull/6 (base `fix-udt-expression-error-message`): one P2 (worker/infrastructure failures reported as the tool author's expression error; red-to-green) + five P3s, all fixed on `pr_24415_review_0` (`dfe496c3489`, pushed to fork); new/edited unit tests + API test pass.

Open, ready for review, against `release_26.1`. Author richard-burhans. 5 files, +54/-1. Worktree `~/projects/worktrees/galaxy/pr/24415`.

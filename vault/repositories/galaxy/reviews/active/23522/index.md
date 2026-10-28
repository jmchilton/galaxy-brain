# #23522 — [26.2] Resolve the job handler on the instance that received the tool request

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/23522) · [default review](initial_review.md) · [risks](risks.md) · [verified review](verified_review.md) · [review branch `pr_23522_review_0`](https://github.com/jmchilton/galaxy/tree/pr_23522_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md) · [repro](repro/forwarded_handler_repro.py) · [VGP deployment research](vgp_deployment_research.md)

## Status

Initial review of `c66b78b6ddd` complete 2026-10-27, posted as [comment](https://github.com/galaxyproject/galaxy/pull/23522#issuecomment-6477448259) 2026-10-28 (review branch not pushed to PR): three P2s + one P3, all implementation verified. P2 1 (explicit `job_handler` threading) and P2 2 (enqueue precedence tests, red-to-green) fixed on `pr_23522_review_0` (`147d0c9a4ff`, `5771fe951aa`; pushed to fork). P2 3 (unknown forwarded handler fails job under db-preassign/db-self) and P3 1 (`default_handler_id` forwarding changes assignment) left as findings.

Open, ready for review, against `release_26.2`. Author guerler. 6 files, +12/-6. Worktree `~/projects/worktrees/galaxy/pr/23522`.

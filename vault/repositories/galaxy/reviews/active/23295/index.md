# #23295 — Generalize runner-level default_<param> seeding of destination params

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/23295) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_23295_review_0`](https://github.com/jmchilton/galaxy/tree/pr_23295_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Follow-up review of `73695fa00a6` complete 2026-10-21, not delivered: three P2s + three P3s; four fixes on fork branch `pr_23295_review_0`. Awaiting John's pick in [response action](initial_response_action.md).

Open, ready for review, against `dev`. Author @ksuderman. Follow-up to #23068. Worktree `~/projects/worktrees/galaxy/pr/23295` (detached at PR head).

Coordinator corrected three false claims in `risks.md` (Pulsar double-seeding, persistence, native gcp_batch key "unreleased") per verification.

## History

- 2026-08-18: John reviewed (no vault record) and opened suggestion PR [ksuderman/galaxy#10](https://github.com/ksuderman/galaxy/pull/10) (self-enforcing seam via `prepare_job`, resolve through spec default, three-tier resolution); commented on #23295.
- 2026-10-14: Keith merged ksuderman/galaxy#10; PR rebased 2026-10-18. Head now Keith's `18a64ceca88` + John's `73695fa00a6`.
- 2026-10-21: follow-up review of `73695fa00a6` (this record).

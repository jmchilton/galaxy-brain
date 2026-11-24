# Galaxy #25002 — Rename workflow outputs from connected step inputs with $(inputs.name)

[PR #25002](https://github.com/galaxyproject/galaxy/pull/25002) · author mvdbeek · base `dev` · worktree `~/projects/worktrees/galaxy/pr/25002`

Rename-dataset PJA can use `$(inputs.name)` for a step input connected to a parameter (not necessarily a tool param); scheduler waits on it, editor auto-adds the step input. Second commit adds Playwright video recording to the Selenium framework.

**Latest status — 2026-11-24:** round 0 review on `8dd9549cab94b9b3568b098fcc02255faecfcead` ready, unposted (three P2s + five P3s; seven fixed on `pr_25002_round_0_rev_0` @ `296e2764b8c`, pushed to fork only).

- Findings: [review_0_findings.yml](review_0_findings.yml)
- Notes: [comment](johns_review_0_comment_note.md) · [review-branch PR](johns_review_0_pr_note.md)
- Reports: [default](initial_review.md) · [thermo](thermo_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [learning_galaxy](learning_galaxy.md) ([follow-up](learning_galaxy_followup_issue.md))

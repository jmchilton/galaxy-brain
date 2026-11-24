# Galaxy #25081 — Upgrade social-auth-core to 6.2.0

[PR #25081](https://github.com/galaxyproject/galaxy/pull/25081) · author nsoranzo · base `dev` · worktree `~/projects/worktrees/galaxy/pr/25081`

Fixes GHSA-h2r5-x5m7-3935 (OIDC nonce not bound to browser session) via social-auth-core 6 upgrade; adds `id_key` column migration to `oidc_user_authnz_tokens`. Fixes #23941, supersedes #24981.

**Latest status — 2026-11-24:** round 0 review on `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5` ready, unposted (four P2s + eight P3s; ten fixed on `pr_25081_round_0_rev_0` @ `549e8a0d16b`, pushed to fork only, not into PR). psa_nonce growth (P2 1) posted openly per John: new in social-auth-core 6.

Round 0: [findings](review_0_findings.yml) · [comment note](johns_review_0_comment_note.md) · [PR note](johns_review_0_pr_note.md) · [default](initial_review.md) · [thermo](thermo_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [performance](performance_challenges_review.md) ([debrief](performance_challenges_debrief.md)) · [risks](risks.md) · [learning galaxy](learning_galaxy.md) ([doc follow-up](learning_galaxy_followup_issue.md))

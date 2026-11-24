# Galaxy #25002 — Rename workflow outputs from connected step inputs with $(inputs.name)

[PR #25002](https://github.com/galaxyproject/galaxy/pull/25002) · author mvdbeek · base `dev` · worktree `~/projects/worktrees/galaxy/pr/25002`

Rename-dataset PJA can use `$(inputs.name)` for a step input connected to a parameter (not necessarily a tool param); scheduler waits on it, editor auto-adds the step input. Second commit adds Playwright video recording to the Selenium framework.

**Latest status — 2026-11-24:** round 0 review on `8dd9549cab94b9b3568b098fcc02255faecfcead` in progress.

---
upstream_base_branch: main
---
# Remove terminal session support (tmux, zellij, wezterm, ghostty)

- [Open PR](https://github.com/jmchilton/ghwt/compare/main...remove_terminal_sessions)
- [View on GitHub](https://github.com/jmchilton/ghwt/tree/remove_terminal_sessions)

## Status

Implemented at `12e9cd5` and pushed; worktree `~/projects/worktrees/ghwt/branch/remove_terminal_sessions`.

No PR yet; description drafted in [pr_description.md](pr_description.md).

Lint and full test suite (123) pass locally; CI runs only once a PR opens.

## Decisions

- Remove zellij along with tmux/wezterm/ghostty; no herdr replacement.
- No major bump: `feat:` subject, no `BREAKING CHANGE` footer.
- Drop Obsidian "Open Terminal" quick action; delete `AGENT_INTEGRATION_PLAN.md` and `WORKTREE_STRUCTURE_PLAN.md`.
- Superseded `cmux_integration` (PR #8, cmux + herdr backends): closed 2026-10-29, branch and worktree deleted.

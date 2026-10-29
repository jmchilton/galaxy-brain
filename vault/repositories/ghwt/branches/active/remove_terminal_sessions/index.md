---
upstream_base_branch: main
pr: 11
---
# Remove terminal session support (tmux, zellij, wezterm, ghostty)

- [PR #11](https://github.com/jmchilton/ghwt/pull/11)
- [View on GitHub](https://github.com/jmchilton/ghwt/tree/remove_terminal_sessions)

## Status

Implemented at `12e9cd5` and pushed; worktree `~/projects/worktrees/ghwt/branch/remove_terminal_sessions`.

PR [#11](https://github.com/jmchilton/ghwt/pull/11) open (ready for review), body from [pr_description.md](pr_description.md).

Lint and full test suite (123) pass locally; PR CI pending.

## Decisions

- Remove zellij along with tmux/wezterm/ghostty; no herdr replacement.
- No major bump: `feat:` subject, no `BREAKING CHANGE` footer.
- Drop Obsidian "Open Terminal" quick action; delete `AGENT_INTEGRATION_PLAN.md` and `WORKTREE_STRUCTURE_PLAN.md`.
- Superseded `cmux_integration` (PR #8, cmux + herdr backends): closed 2026-10-29, branch and worktree deleted.

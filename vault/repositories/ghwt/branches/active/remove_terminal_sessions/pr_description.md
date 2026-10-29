Remove ghwt's terminal-session feature entirely: tmux, zellij, wezterm and ghostty.

`ghwt create` printed "Terminal session launched" whenever the launcher didn't throw, so on headless Linux with wezterm configured it claimed success with no session. Nobody uses the feature, so this deletes it rather than adding a warning.

- Deletes the session managers and the `attach`, `clean-session`, `clean-session-all` and `clean-sessions` commands.
- `create`, `rm`, `sync` and `init` no longer launch, kill, recreate or detect sessions, and `init` no longer creates `terminal-session-config/`.
- `terminalMultiplexer` and `terminalUI` leave the config schema; the strict schema now rejects them.
- `lint` drops its session and zellij checks and `--session-only`. `--config-only` now skips the workspace checks as documented, and the global config check honors `GHWT_CONFIG`.
- Worktree notes lose the "Open Terminal" quick action.
- Test teardown no longer sets `GHWT_CONFIG` to the string `"undefined"`, which had written a stray `undefined` file committed at the repo root. That file, a committed `.zellij/layout.kdl` and two stale plan docs are removed.

Tests: new checks that the schema rejects the removed keys and that `lint --config-only` passes without a workspace (both fail on `main`). `npm run lint` and `npm run test:coverage` pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

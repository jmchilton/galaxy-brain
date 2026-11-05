# Herdr TUI context

The original herdr ([herdrdev/herdr](https://github.com/herdrdev/herdr), local clone `~/projects/repositories/herdr`): one `herdr` binary, a terminal multiplexer with a background server. Used when `DISPATCH_CONFIG.yml` says `herdr: tui`.

- Model: workspaces > panes; agents are panes with a detected kind and state. Driven through `herdr workspace|pane|agent ...` over the server socket. `herdr --skill` prints the agent guide. Never run bare `herdr`; it opens the TUI.
- Config: `~/.config/herdr/config.toml` (skill `herdr-config`). Claude/Codex state comes from herdr's integration hooks (`herdr integration status`). John's shells source `../skills/config/herdr-codex.zsh`, which adds `--no-daemon` to `codex` inside herdr so its hooks see the pane.
- Remote: each host runs its own herdr server; `herdr machine add <host>` shows its agents locally.
- galaxy-brain uses it in `launch_agent.sh` (tui branch), `herdr-plugin/` (fzf picker, ctrl-click link handler, Chrome native host), the suggested-prompts ✖ button (`herdr pane close`), and `PROCESS_SETUP_MACHINE.md`.

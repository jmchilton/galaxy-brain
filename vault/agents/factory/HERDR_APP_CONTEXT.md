# Herdr app context

The newer split: herdr-core `hc` ([herdrdev/herdr-core](https://github.com/herdrdev/herdr-core)) runs terminals and keeps them alive; the desktop app `herdr-app` ([herdrdev/herdr-app](https://github.com/herdrdev/herdr-app)) only draws them. Used when `DISPATCH_CONFIG.yml` says `herdr: app`.

- Guides: `hc --skill`, `herdr-app --skill`, and `~/.config/herdr-app/AGENTS.md` for layouts, keys and mods (JavaScript in `~/.config/herdr-app/mods/`). Never run bare `hc` or `herdr-app`.
- Model: spaces > tabs > panes, each pane a core terminal (`t7`, `<machine>/t7`). Status comes only from programs reporting it (OSC 7501); Claude does, Codex is unverified.
- A terminal joins the window through labels `herdr.space=<id>` and `herdr.tab=<id>`; ids the app doesn't know become a new space and tab. So `hc run --label ...` creates visible agents with no window or `herdr-app` needed, on any `hc machine`. `herdr-app do space.rename|tab.rename` names them; renaming an unknown id fails.
- Remote: `hc machine add <host>`; the local core lists that machine's terminals and the window shows its spaces.
- Mods: esbuild ESM bundles with `gpui-kit`, `gpui-base`, `herdr` external load fine. `panes()` gives each pane's live folder (the foreground program's) and `<machine>/`-prefixed ids for remote panes. Mods can't be clicked from a script; test UI by hand.
- galaxy-brain uses it in `launch_agent.sh` (app branch) and `herdr-app-mod/` (the `gb-pane` header and `gb-agents` sidebar). The Herdr plugin and machine setup still speak only TUI.

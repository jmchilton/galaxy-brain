# Herdr Support: Claude vs Codex (This Machine)

## Codex glyph regression (2026-10-05)

With herdr 0.8.2 and codex-cli 0.160.0, newer Codex panes displayed literal
`codex` instead of `⬢`. The shared Codex app-server daemon retained the Herdr
environment of its originating pane, `w12:p1`. Other CLI processes had their
own correct pane IDs (`w2D:p1`, `w1Z:p1`, `w2H:p1`, `w2W:p1`), but hooks and
agent shell commands inherited the daemon's `HERDR_PANE_ID=w12:p1`.

Evidence: live `herdr api snapshot` showed the glyph and a Codex session ref
only on `w12:p1`; the other four Codex panes had neither. A read-only
`hooks/list` request to the installed Codex runtime confirmed both Herdr
SessionStart hooks were enabled and trusted, with no configuration errors.
Comparing only `HERDR_*` variables on the CLI processes and daemon confirmed
the pane mismatch. This is a shared-daemon environment problem, rather than
a glyph/font or hook-trust problem. Claude's separate processes remain correct.

Restored `⬢` on the four affected live panes with:

```sh
herdr pane report-metadata <pane-id> --source user:codex-glyph \
  --agent codex --display-agent '⬢'
```

For future Herdr launches, use `codex --no-daemon` (or
`codex --no-daemon resume <session-id>`). Installed CLI help describes this
option as running without the shared background server even when it is already
running. This gives each session a process that inherits its own pane context.
The workaround has not yet been checked in a newly launched interactive session.
Existing daemon-backed sessions keep their inherited context until relaunched;
restoring their glyph metadata only repairs the current sidebar display.
No startup configuration was changed, and no running sessions were restarted.

The snapshot below describes the earlier integration setup.

Snapshot 2026-09-25. herdr 0.8.2 at `~/.local/bin/herdr`, config `~/.config/herdr/config.toml`. Local source clone `~/projects/repositories/herdr` is stale (v0.6.1, May 2026) — pull before source-diving.

## TL;DR

The gap was real and had one root cause: **herdr's official agent integration was installed for Codex (v8) but not for Claude.** Fixed 2026-09-25: `herdr integration install claude` run; both now current (v8).

What v8 integrations actually do (verified by reading both installed hooks): they report `pane.report_agent_session` (native session id) on `SessionStart` — **session-resume refs only**. Semantic state (`working`/`blocked`/…) in herdr 0.8.2 comes from core detection/heuristics for all agents; the old v3-era `pane.report_agent` state hooks are gone. So the practical Claude/Codex delta was native session resume, not state fidelity.

## How herdr sees an agent (three signal layers)

| Signal | Claude | Codex |
|---|---|---|
| Process detection + screen heuristics (automatic; drives `agent_status`) | yes | yes |
| Official integration (session refs over socket API, v8) | yes — installed 2026-09-25 | yes |

## Codex side (the good state)

- **Official integration**: `~/.codex/herdr-agent-state.sh` (herdr-managed, `HERDR_INTEGRATION_VERSION=8`), wired via `~/.codex/hooks.json` `SessionStart`. Reports `pane.report_agent_session` with `agent_session_id` + transcript path → herdr knows which native Codex thread owns the pane. This is what `[session] resume_agents_on_restore` (default true) needs to resume panes into their native conversations after a herdr server restart.
- **Hand-rolled glyph hook** in `hooks.json`: reports `--display-agent '⬢'` (source `user:codex-glyph`) so the sidebar shows a one-column mark.
- **Sidebar row** (`config.toml` `[ui.sidebar.agents.rows_by_agent]`): `codex = [["state_icon", "agent", "terminal_title_stripped"]]` — leans on Codex's terminal-title updates for live status text.

## Claude side

- **Official integration installed 2026-09-25** (v8): `~/.claude/hooks/herdr-agent-state.sh`, wired on `SessionStart` in `settings.json`. Reports the Claude session id → native resume ref, same as Codex. Takes effect per-session at start, so sessions running at install time never report a ref until restarted.
- **Hand-rolled hook**: `~/.claude/hooks/herdr-session-name.sh`, wired in `~/.claude/settings.json` on `SessionStart`/`SessionEnd`/`UserPromptSubmit`/`Stop`. Rewritten 2026-09-25 (old version at `.pre-cwd.bak`); it now:
  - publishes the session **cwd basename as the workspace label** (herdr's own derivation is repo-first with no config policy — upstream `derive_label_from_cwd`; no existing issue/PR/Idea asks for a dirname preference, checked 2026-09-25 on `herdrdev/herdr`, the canonical repo — `ogulcancelik/herdr` redirects). Last Claude session to fire wins in shared workspaces; `workspace rename` has no `--clear` so labels never fall back to derived.
  - sets display glyph `✳` via `pane report-metadata` (source `user:claude-session-name`)
  - no longer mirrors `/rename` session names — the agent row gets those from `terminal_title_stripped`
  - still does **not** touch semantic agent state or session-restore refs (that's `herdr-agent-state.sh`'s job)
- **Sidebar row**: since 2026-09-25 `claude = [["state_icon", "agent", "terminal_title_stripped"]]`, same approach as codex — Claude Code sets the terminal title to the session name, and the token is per-pane, so multi-pane workspaces show the right name. Previously `[["state_icon", "agent", "workspace", "tab"]]`, which depended on the hook's workspace-rename and its single-pane guard; the hook's rename half was then repurposed to publish the cwd basename as the workspace label (see above).

### What Claude lost vs Codex pre-install (now closed)

**Native session resume** — after a herdr server restart, Codex panes could resume their native threads (`[session] resume_agents_on_restore`, default true); Claude panes restarted cold because no session ref was ever reported. Fixed by the integration install.

State (blocked/working/done, toasts, sounds, `agent_panel_sort = "priority"`) was never integration-fed in 0.8.2 — both agents get it from core detection, and a live check showed `agent_status: "working"` on a Claude pane pre-install.

## Shared skill surface (parity here is fine)

- `claude-jmchilton-plugins` v1.2.1 ships `herdr-config` and `herdr-open-worktree` under shared `plugins/jmchilton/skills/` — cached in both `~/.claude/plugins/` and `~/.codex/plugins/`, so both hosts get them.
- herdr ships its own orchestration skill (`herdr --skill`, offered when `HERDR_ENV=1`); provider-neutral.
- Note: `herdr-config` SKILL.md was written against ~v0.5.x; installed binary is 0.8.2. Its own guardrail (`herdr --default-config` wins) covers this, but the bundled `config-reference.md` is aging.

## Gap closure log (2026-09-25)

1. ✅ `herdr integration install claude` — wrote `~/.claude/hooks/herdr-agent-state.sh` (v8), added `SessionStart` entry to `settings.json`. `herdr integration status` now shows both `claude` and `codex` current (v8). `herdr integration uninstall claude` reverses cleanly.
2. ✅ **Coexistence verified**: agent-state hook only sends `pane.report_agent_session`; it never touches labels/titles/`display_agent`, so `herdr-session-name.sh` (source `user:claude-session-name`) is unaffected — ✳ glyph confirmed intact on a live pane post-install.
3. ✅ **Resume parity**: claude v8 asset is byte-for-byte the same shape as codex v8 (`pane.report_agent_session` with session id + transcript path). Sessions already running at install time report nothing — restart Claude sessions to get resume refs.

## Remaining follow-ups

- `git -C ~/projects/repositories/herdr pull` to un-stale the source clone (v0.6.1 vs 0.8.2).
- Optionally refresh `herdr-config`'s bundled `config-reference.md` against 0.8.2 `--default-config`.
- After next herdr server restart, spot-check a resumed Claude pane actually lands in `claude --resume` of the right session.

## File map

| Path | Role |
|---|---|
| `~/.config/herdr/config.toml` | herdr config; `rows_by_agent` claude/codex rows, `agent_panel_sort`, `[session]` resume |
| `~/.codex/herdr-agent-state.sh` | official Codex integration (v8, herdr-managed) |
| `~/.codex/hooks.json` | wires integration + ⬢ glyph hook |
| `~/.claude/hooks/herdr-session-name.sh` | hand-rolled name/glyph mirror (cosmetic only) |
| `~/.claude/settings.json` | wires herdr-session-name.sh on 4 events |
| `~/.claude/hooks/herdr-agent-state.sh` | official Claude integration (v8, herdr-managed; installed 2026-09-25) |
| `claude-jmchilton-plugins:plugins/jmchilton/skills/herdr-{config,open-worktree}` | shared skills, both hosts |
| `~/projects/repositories/herdr` | source clone, stale at v0.6.1 |

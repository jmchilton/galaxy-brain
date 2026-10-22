Launch a new Herdr workspace running Claude or Codex in an agent directory and hand it an initial prompt. Callers supply:

- `AGENT_DIR` - directory under `vault/agents/` to start in, e.g. `gx_branches`.
- `PROMPT` - the initial prompt.
- `NAME` - agent name hint, e.g. `po-<branch>`. The script sanitizes it to Herdr's `[a-z][a-z0-9_-]{0,31}` and de-duplicates it against live agents.

Use whatever agent you are unless the user requests the other.

## Launch

```sh
/Users/jxc755/projects/repositories/galaxy-brain/vault/agents/_shared/scripts/launch_agent.sh \
  <AGENT_DIR> <claude-or-codex> <NAME> "<PROMPT>"
```

It creates a background workspace, starts the agent, sends the prompt, waits until the agent is working, and prints the kind, name and pane ID. It talks to the Herdr server's socket, so it works outside Herdr too - the same script backs the launch buttons in Obsidian ([`LAUNCHERS.md`](LAUNCHERS.md)).

If it fails because the server isn't reachable, say so and stop. If the agent didn't become ready (e.g. a trust/startup dialog), inspect with `herdr agent read <pane-id>` and ask the user before answering it. Never run bare `herdr` - it opens the TUI.

## Report

Tell the user the kind, name, pane ID, and the prompt sent. Mention they can jump to it with `herdr agent focus <pane-id>` or check progress with `herdr agent read <pane-id> --source recent`. Target the pane ID, not the name - the Claude `herdr-session-name.sh` hook clears agent names on every prompt.

## Boundaries

- Don't reuse or take over an existing workspace or pane - always create a new one.
- Don't create worktrees or branches - the launched agent does that.
- Don't close workspaces or stop agents.

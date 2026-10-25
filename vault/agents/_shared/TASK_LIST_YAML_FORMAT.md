# Task List YAML Format

A task list is a ```` ```gb-tasks ```` fenced block inside a Markdown note, holding a YAML list of tasks; each task launches one agent. A note may hold several blocks.

````markdown
```gb-tasks
- prompt: "Review PR #1733 per PROCESS_INITIAL_REVIEW.md."
  agent_dir: planemo
  profile: Opus (high)
  description: Planemo PR from the weekly sweep; touches lint output.
  status: recommended
- prompt: |
    Pick up the next ready branch in MY_BRANCHES.md.
  agent_dir: wf_foundry
```
````

| Field       | Required | Value                                                                 |
|-------------|----------|-----------------------------------------------------------------------|
| `prompt`    | yes      | Prompt text sent to the agent.                                        |
| `agent_dir` | yes      | Directory under `vault/agents/` the agent runs in (e.g. `pulsar`).    |
| `profile`   | no       | A `name` from [AGENT_PROFILES.yml](AGENT_PROFILES.yml); default is its first profile. |
| `description` | no     | Context for John shown on the task card (why, where it came from); not sent to the agent. |
| `status`    | no       | `recommended` (the suggesting agent thinks it should run) or `idea` (worth considering). Shown as a badge; omit on hand-written tasks. |

Unknown fields are errors.

- Quote a one-line prompt containing ` #` or starting with a YAML special character; unquoted, ` #` starts a comment and truncates it. `|` blocks need no quoting.
- No YAML comments in the block: the Obsidian plugin rewrites the block when an entry is removed, dropping them.

The galaxy-brain Obsidian plugin renders each block as task cards: 🚀 opens the launch dialog (prompt and profile editable) and removes the task once the launch succeeds; ✖ removes it. Its Agents view gathers the blocks in each agent dir's `TASKS.md`, per agent or merged.

Agent launch buttons for repository records, shown by the galaxy-brain Obsidian plugin (record note's ⋯ menu, right-click menu, and command palette). Each runs [`scripts/launch_agent.sh`](scripts/launch_agent.sh) after a confirm dialog that picks Claude or Codex.

One `## Label` per launcher. Leading `key: value` lines configure it; the rest is the prompt.

- `records:` `<repo>/<kind>` records it applies to, e.g. `galaxy/branches`. Comma-separate several.
- `status:` optional comma list of record statuses (the `<status>` directory) to show it on.
- `agent_dir:` directory under `vault/agents/` to start in.
- `name:` Herdr agent name; sanitized and de-duplicated by the script.
- `agent:` default for the dialog, `claude` (default) or `codex`.

Placeholders: `{repo}`, `{kind}`, `{status}`, `{name}` (branch name, PR or issue number), `{record}` (absolute record directory).

## 🐴 Implement
records: galaxy/issues
status: queued, wip, needs_decision, blocked
agent_dir: gx_workhorse
name: wh-{name}

Implement galaxyproject/galaxy#{name}. The issue record is {record}.

## 🛡️ Harden
records: galaxy/branches
status: active
agent_dir: gx_workhorse
name: hd-{name}

Re-harden branch {name}. BRANCH_DIRECTORY is {record}.

## ✨ Polish
records: galaxy/branches
status: active
agent_dir: gx_branches
name: po-{name}

Run ./POLISH_BRANCH.md {name}

## 💬 Respond to review
records: galaxy/reviews
status: active
agent_dir: gx_reviews
name: rr-{name}

Respond to galaxyproject/galaxy#{name}.

## ✂️ Trim findings
records: galaxy/reviews
status: active
agent_dir: gx_reviews
name: tf-{name}

Trim the findings for galaxyproject/galaxy#{name} following ../_shared/PROCESS_TRIM_FINDINGS.md. The review record is {record}.

## 💭 New session
records: galaxy/issues
agent_dir: gx_issues
name: is-{name}

Let's talk about galaxyproject/galaxy#{name}. The issue record is {record}.

## 💭 New session
records: galaxy/branches
agent_dir: gx_branches
name: br-{name}

Let's talk about branch {name}. The branch record is {record}.

## 💭 New session
records: galaxy/reviews
agent_dir: gx_reviews
name: rv-{name}

Let's talk about galaxyproject/galaxy#{name}. The review record is {record}.

Launchers for claude-jmchilton-plugins issues records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 💭 New session
agent_dir: skills
name: is-{name}

Let's talk about jmchilton/claude-jmchilton-plugins#{name}. The issue record is {record}.

## 🐴 Work on issue
status: untracked, queued, wip, needs_decision, blocked
agent_dir: skills
name: wh-{name}

Run ./WORK_HORSE.md on jmchilton/claude-jmchilton-plugins#{name}

## ✅ Close issue
status: needs_decision, queued, wip, blocked, delegated
agent_dir: skills
name: cl-{name}
profile: Sonnet (medium)

Close issue jmchilton/claude-jmchilton-plugins#{name} according to the processes described in AGENTS.md.

## 🗄️ Shelve
status: needs_decision, queued, wip, blocked
agent_dir: skills
name: sh-{name}
profile: Sonnet (medium)

Shelve the issue {name} per ../_shared/PROCESS_SHELVE.md. The record is {record}. Blocked on: <user_input_here>

Launchers for ghwt issues records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 💭 New session
agent_dir: dev_tooling
name: is-{name}

Let's talk about jmchilton/ghwt#{name}. The issue record is {record}.

## 🐴 Work on issue
status: untracked, queued, wip, needs_decision, blocked
agent_dir: dev_tooling
name: wh-{name}

Run ./WORK_HORSE.md on jmchilton/ghwt#{name}

## ✅ Close issue
status: needs_decision, queued, wip, blocked, delegated
agent_dir: dev_tooling
name: cl-{name}
profile: Sonnet (medium)

Close issue jmchilton/ghwt#{name} according to the processes described in AGENTS.md.

## 🗄️ Shelve
status: needs_decision, queued, wip, blocked
agent_dir: dev_tooling
name: sh-{name}
profile: Sonnet (medium)

Shelve the issue {name} per ../_shared/PROCESS_SHELVE.md. The record is {record}. Blocked on: <user_input_here>

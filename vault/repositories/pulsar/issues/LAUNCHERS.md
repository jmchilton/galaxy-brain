Launchers for pulsar issues records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 🐴 Work on issue
status: untracked, queued, wip, needs_decision
agent_dir: pulsar
name: wh-{name}

Run ./WORK_HORSE.md on galaxyproject/pulsar#{name}

## ✅ Close issue
status: needs_decision, queued, wip, delegated
agent_dir: pulsar
name: cl-{name}
profile: Sonnet (medium)

Close issue galaxyproject/pulsar#{name} according to the processes described in AGENTS.md.

## 🗄️ Shelve
status: needs_decision, queued, wip
agent_dir: pulsar
name: sh-{name}
profile: Sonnet (medium)

Shelve the issue {name} per ../_shared/PROCESS_SHELVE.md. The record is {record}. Blocked on: <user_input_here>

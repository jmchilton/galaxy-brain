Launchers for foundry branches records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 🚀 Open pull request
status: active
agent_dir: wf_foundry
name: pr-{name}
profile: Sonnet (medium)

Open a pull request for branch {name} according to the processes described in AGENTS.md.

## 🟣 Merge branch
status: active
agent_dir: wf_foundry
name: mb-{name}
profile: Sonnet (medium)

Merge the pull request associated with branch {name} according to the processes described in AGENTS.md. Clean up relevant worktrees.

## 🗄️ Shelve
status: active
agent_dir: wf_foundry
name: sh-{name}
profile: Sonnet (medium)

Shelve the branch {name} per ../_shared/PROCESS_SHELVE.md. The record is {record}. Blocked on: <user_input_here>

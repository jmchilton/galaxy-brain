Launchers for gh-ci-artifacts branches records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 💭 New session
agent_dir: dev_tooling
name: br-{name}

Let's talk about jmchilton/gh-ci-artifacts branch {name}. The branch record is {record}.

## 🚀 Open pull request
status: active
agent_dir: dev_tooling
name: pr-{name}
profile: Sonnet (medium)

Open a pull request for branch {name} according to the processes described in AGENTS.md.

## 🟣 Merge branch
status: active
agent_dir: dev_tooling
name: mb-{name}
profile: Sonnet (medium)

Merge the pull request associated with branch {name} according to the processes described in AGENTS.md. Clean up relevant worktrees.

## 🗄️ Shelve
status: active
agent_dir: dev_tooling
name: sh-{name}
profile: Sonnet (medium)

Shelve the branch {name} per ../_shared/PROCESS_SHELVE.md. The record is {record}. Blocked on: <user_input_here>

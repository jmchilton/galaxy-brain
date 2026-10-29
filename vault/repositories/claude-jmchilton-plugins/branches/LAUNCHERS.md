Launchers for claude-jmchilton-plugins branches records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 💭 New session
agent_dir: skills
name: br-{name}

Let's talk about jmchilton/claude-jmchilton-plugins branch {name}. The branch record is {record}.

## 🚀 Open pull request
status: active
agent_dir: skills
name: pr-{name}
profile: Sonnet (medium)

Open a pull request for branch {name} according to the processes described in AGENTS.md.

## 🟣 Merge branch
status: active
agent_dir: skills
name: mb-{name}
profile: Sonnet (medium)

Merge the pull request associated with branch {name} according to the processes described in AGENTS.md. Clean up relevant worktrees.

## 🗄️ Shelve
status: active
agent_dir: skills
name: sh-{name}
profile: Sonnet (medium)

Shelve the branch {name} per ../_shared/PROCESS_SHELVE.md. The record is {record}. Blocked on: <user_input_here>

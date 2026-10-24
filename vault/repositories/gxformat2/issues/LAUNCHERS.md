Launchers for gxformat2 issues records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 💭 New session
agent_dir: workflow_libs
name: is-{name}

Let's talk about galaxyproject/gxformat2#{name}. The issue record is {record}.

## 🐴 Work on issue
status: untracked, queued, wip, needs_decision, blocked
agent_dir: workflow_libs
name: wh-{name}

Run ./WORK_HORSE.md on galaxyproject/gxformat2#{name}

## ✅ Close issue
status: needs_decision, queued, wip, blocked, delegated
agent_dir: workflow_libs
name: cl-{name}
profile: Sonnet (medium)

Close issue galaxyproject/gxformat2#{name} according to the processes described in AGENTS.md.

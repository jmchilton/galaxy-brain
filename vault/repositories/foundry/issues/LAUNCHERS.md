Launchers for Foundry issues records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 🏷️ Triage issue
status: untracked, needs_decision
agent_dir: wf_foundry
name: tr-{name}

Run ./TRIAGE_ISSUE.md on galaxyproject/foundry#{name}

## 🐴 Work on issue
status: untracked, queued, wip
agent_dir: wf_foundry
name: wh-{name}

Run ./WORK_HORSE.md on galaxyproject/foundry#{name}

## ✅ Close issue
status: needs_decision, queued, wip, blocked, delegated
agent_dir: wf_foundry
name: cl-{name}
profile: Sonnet (medium)

Close issue galaxyproject/foundry#{name} according to the processes described in AGENTS.md.

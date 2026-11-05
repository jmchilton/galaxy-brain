Launchers for Foundry issues records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 🏷️ Triage issue
status: untracked, needs_decision
agent_dir: wf_foundry
name: tr-{name}

Run ./TRIAGE_ISSUE.md on galaxyproject/foundry#{name}

## 👀 Diff staged labels
status: needs_decision, queued, wip
command: agents/_shared/scripts/apply_issue_tags.py {record} --dry-run

## 🔖 Apply staged labels
status: needs_decision, queued, wip
command: agents/_shared/scripts/apply_issue_tags.py {record}

## 🔬 Research issue
status: untracked, queued_research, label:work/ready-research, wip
agent_dir: wf_foundry
name: rs-{name}

Run ./RESEARCH_ISSUE.md on galaxyproject/foundry#{name}

## 🐴 Work on issue
status: untracked, queued_implement, queued_research, queued, label:work/ready-implement, wip
agent_dir: wf_foundry
name: wh-{name}

Run ./WORK_HORSE.md on galaxyproject/foundry#{name}

## ✅ Close issue
status: needs_decision, queued, wip, delegated
agent_dir: wf_foundry
name: cl-{name}
profile: Sonnet (medium)

Close issue galaxyproject/foundry#{name} according to the processes described in AGENTS.md.

## 🗄️ Shelve
status: needs_decision, queued, wip
agent_dir: wf_foundry
name: sh-{name}
profile: Sonnet (medium)

Shelve the issue {name} per ../_shared/PROCESS_SHELVE.md. The record is {record}. Blocked on: <user_input_here>

## 💭 New session
agent_dir: wf_foundry
name: hs-{name}

Let's talk about branch {name}. The issue record is {record}.


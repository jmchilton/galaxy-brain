Launchers for Galaxy issue incubator records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## ❯ Prepare to file
status: incubating
agent_dir: gx_issues
name: ptf-{name}
profile: Opus (low)

Prepare to file issue at {record} with ./PREPARE_TO_FILE.md

## 📤 File issue
status: incubating, internal
command: agents/_shared/scripts/file_incubator_issue.py {record}

## 📤 File issue and assign me
status: incubating, internal
command: agents/_shared/scripts/file_incubator_issue.py {record} --assign

## 🐴 File issue and implement
status: incubating, internal
agent_dir: gx_workhorse
name: wh-{name}

John launched this to file and implement the incubator record {record}. File it with `../_shared/scripts/file_incubator_issue.py {record} --status wip --assign`; stop and report if it fails. Then implement the new galaxyproject/galaxy issue; its issue record is the directory the script prints.

## 💭 New session
agent_dir: gx_issues
name: inc-{name}

Let's talk about the issue draft {name}. The incubator record is {record}.

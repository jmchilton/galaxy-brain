## Process Issues

when: whenever
what: review records in `vault/repositories/galaxy/issues_incubator/incubating/` without a debrief and recommendation, for each of those recommend a task for the format

Prepare `path` (the record directory), `short_name` (its last path segment) and `description` a one paragraph summary of the issue. Skip records that already have an open task with this `record`.

Suggest:

```
prompt: Prepare to file issue at {path} with ./PREPARE_TO_FILE.md
agent_dir: gx_issues
profile: Opus (low)
record: galaxy/issues_incubator/{short_name}
description: ❯ {description}
status: recommended
```

## File Issues

when: daily
what: review records in `vault/repositories/galaxy/issues_incubator/incubating/` whose recommendation is to post them, for each of those recommend a task of

Prepare `path` (the record directory), `short_name` (its last path segment) and `description` a one paragraph summary of the issue. Skip records that already have an open task with this `record`.

Suggest:

```
prompt: File a Galaxy issue {path} with ../_shared/scripts/file_incubator_issue.py, then triage it per ../_shared/MY_ISSUES_INDEX.md
agent_dir: gx_issues
profile: Sonnet (medium)
record: galaxy/issues_incubator/{short_name}
description: 📤 {description}
status: recommended
```

## Find Issues

when: whenever
what: Check the newly opened issues on galaxyproject/galaxy (since your last check this session, or the last 24 hours) and if any are open and not assigned to someone else - walk through them.

For each issue number `n`, prepare an at-most one paragraph summary from issue text (don't look at Galaxy, source code, etc..) called `description`. `status` is `recommended` when it fits the preferences in ./AGENTS.md, otherwise `idea`.

Suggest:

```
prompt: Run ./ROOT_CAUSE.md on galaxyproject/galaxy#{n}.
agent_dir: gx_workhorse
link: https://github.com/galaxyproject/galaxy/issues/{n}
profile: Opus (low)
description: 🐴 {description}
status: {status}
```

@../_shared/BLOCKER_SUGGESTED_TASKS.md

## Process Issues

when: whenever
what: review ./to_file/ for issues without debrief and recommendation, for each of those recommend a task for the format

Prepare `path` (the path to the issue) and `description` a one paragraph summary of the issue.

Suggest:

```
prompt: Prepare to file issue at {path} with ./PREPARE_TO_FILE.md
agent_dir: gx_issues
profile: Opus (low)
description: ❯ {description}
status: recommended
```

## File Issues

when: daily
what: review ./to_file/ for issues that have a suggestion of filing them, for each of those recommend a task of

Prepare `path` (the path to the issue) and `description` a one paragraph summary of the issue.

Suggest:

```
prompt: File a Galaxy issue {path} according to ./AGENTS.md
agent_dir: gx_issues
profile: Sonnet (medium)
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
profile: Opus (low)
description: 🐴 {description}
status: {status}
```

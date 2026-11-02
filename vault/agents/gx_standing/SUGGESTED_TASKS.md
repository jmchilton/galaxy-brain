## Advance Standing Branch

when: daily
what: each record under `standing_branches/`.

`description` is the record's `# title` plus its children's statuses.

Suggest:

```
prompt: Run ./PROCESS_ADVANCE_STANDING_BRANCH.md for {name}.
agent_dir: gx_standing
record: galaxy/branches/{name}
profile: Opus (medium)
description: 🪜 {description}
status: recommended
```

@../_shared/BLOCKER_SUGGESTED_TASKS.md

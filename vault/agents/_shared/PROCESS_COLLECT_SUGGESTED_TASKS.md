The caller gives WHEN, the `when:` values to collect: `whenever` from `TICK.md`, `daily` from `GOOD_MORNING.md` (plus `whenever` where there's no `TICK.md`). AGENT_DIRECTORY is the directory you're running in; PROJECT comes from its `AGENTS.md`.

Assemble a task list in the format described by [TASK_LIST_YAML_FORMAT.md](TASK_LIST_YAML_FORMAT.md):

1. Walk each section of `AGENT_DIRECTORY/SUGGESTED_TASKS.md` whose `when:` is in WHEN, following its instructions.
2. Fill its `Suggest` template once per match. Write `description` as a `|` block and keep every field the template sets, including `status`. Where a section says how to pick `status`, follow it.
3. Append the tasks to the `gb-tasks` block in `AGENT_DIRECTORY/TASKS.md` (create the file with a single block if missing). Skip a task whose prompt is already in the block. Don't edit or remove existing tasks; John launches or removes them.
4. Report what you added, one line per task, or that nothing was added.

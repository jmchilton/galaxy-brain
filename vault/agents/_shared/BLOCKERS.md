# Blockers

A branch, issue or review record names what blocks it in its `index.md` frontmatter as `blockers:`, one reference or a list. A reference takes one of two forms:

- `<agent_dir>/<short_name>`: shelved work in that agent dir's `blockers/` (below), for anything else, such as an untracked upstream PR, an environment or a decision.
- `<repo>/<kind>/<name>`: another record (branch, issue, incubator issue or review), such as `galaxy/branches/parent_fix` or `galaxy/issues/24551`. It blocks until it is finished: the branch merges, the issue closes, the review is archived.

A record named as a blocker lists what it blocks as `blocking:`, using the same `<repo>/<kind>/<name>` form. Add and drop the two together. `make validate` checks both against `meta_record_schema.yml`, checks that references exist and pair up, and warns when a record blocker reaches a terminal status. Filing an incubator issue rewrites `<repo>/issues_incubator/<name>` references to `<repo>/issues/<number>`.

The Obsidian repository view shows a 🔒 for each blocker, which opens an agent blocker's condition and follow-up, or the blocking record. It shows a 🚫 for each record listed in `blocking:`.

## Agent blockers

An agent dir may keep shelved work in `blockers/`, one directory per blocker, named with a short snake_case name: `AGENT_DIRECTORY/blockers/<short_name>/`. [PROCESS_SHELVE.md](PROCESS_SHELVE.md) creates them.

- `index.md`: a `# <title>` heading and a few lines on what is shelved, with links to its record, PR or issue.
- `condition.md`: what it is blocked on, ideally one sentence an agent can check against GitHub or the vault (e.g. "galaxyproject/galaxy#24501 is merged").
- `follow_up.md`: the prompt to run, in this agent dir, once unblocked. It starts by reading `blockers/<short_name>/previous_session.md` and ends by deleting `blockers/<short_name>/` and the record's `blockers:` entry for it.
- `agent_profile.md` (optional): a profile `name` from [AGENT_PROFILES.yml](AGENT_PROFILES.yml) to run the follow-up with.
- `previous_session.md`: where the work stood when shelved.

The agent dir's `SUGGESTED_TASKS.md` includes [BLOCKER_SUGGESTED_TASKS.md](BLOCKER_SUGGESTED_TASKS.md), which turns met conditions into tasks. To drop a blocker, delete its directory and the record's `blockers:` entry for it.

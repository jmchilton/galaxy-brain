# Blockers

An agent dir may keep shelved work in `blockers/`, one directory per blocker, named with a short snake_case name: `AGENT_DIRECTORY/blockers/<short_name>/`. [PROCESS_SHELVE.md](PROCESS_SHELVE.md) creates them.

- `index.md`: a `# <title>` heading and a few lines on what is shelved, with links to its record, PR or issue.
- `condition.md`: what it is blocked on, ideally one sentence an agent can check against GitHub or the vault (e.g. "galaxyproject/galaxy#24501 is merged").
- `follow_up.md`: the prompt to run, in this agent dir, once unblocked. It starts by reading `blockers/<short_name>/previous_session.md` and ends by deleting `blockers/<short_name>/` and the record's `blocker:` line.
- `agent_profile.md` (optional): a profile `name` from [AGENT_PROFILES.yml](AGENT_PROFILES.yml) to run the follow-up with.
- `previous_session.md`: where the work stood when shelved.

A branch, issue or review record that is blocked names its blocker in its `index.md` frontmatter as `blocker: <agent_dir>/<short_name>`; the Obsidian repository view shows it as a 🔒 that opens the condition and follow-up.

The agent dir's `SUGGESTED_TASKS.md` includes [BLOCKER_SUGGESTED_TASKS.md](BLOCKER_SUGGESTED_TASKS.md), which turns met conditions into tasks. To drop a blocker, delete its directory and the record's `blocker:` line.

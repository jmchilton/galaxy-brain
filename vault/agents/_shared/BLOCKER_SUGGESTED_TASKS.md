## Unblocked

when: whenever
what: blockers under `AGENT_DIRECTORY/blockers/` (per [BLOCKERS.md](BLOCKERS.md)) whose `condition.md` now holds; check it against live GitHub state, language package index, or the vault, and skip it when unsure.

`agent_dir` is AGENT_DIRECTORY; `follow_up` is the text of `follow_up.md`; `name` is the blocker's directory name; `profile` comes from `agent_profile.md` (omit the line without one); `description` is `condition.md`. Add `record:` or `link:` when `index.md` names a record or a GitHub PR or issue.

Suggest:

```
prompt: |
  {follow_up}
agent_dir: {agent_dir}
profile: {profile}
description: 🔓 {name}: {description}
status: recommended
```

## Blocking record finished

when: whenever
what: records this agent dir owns (per [RECORD_AGENTS.yml](RECORD_AGENTS.yml)) whose `blockers:` names a record now in a terminal status (`make validate` warns about these).

`record` is the blocked record's `<repo>/<kind>/<name>`; `blocker` is the finished record's; `status` is its status directory.

Suggest:

```
prompt: |
  {blocker} is {status}, unblocking {record}. Drop {blocker} from {record}'s `blockers:` and {record} from {blocker}'s `blocking:`, then pick up {record}'s next step.
agent_dir: {agent_dir}
description: 🔓 {record}: {blocker} is {status}
record: {record}
status: recommended
```

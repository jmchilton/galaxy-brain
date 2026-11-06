Agent launch buttons for repository records, shown by the galaxy-brain Obsidian plugin (record note's ⋯ menu, right-click menu, and command palette). Each runs [`scripts/launch_agent.sh`](scripts/launch_agent.sh) after a confirm dialog that picks an agent profile from [`AGENT_PROFILES.yml`](AGENT_PROFILES.yml) (agent, model, effort) and, when there is more than one, an environment from [`ENVIRONMENTS.yml`](ENVIRONMENTS.yml) (this machine or an ssh host with its own vault clone).

Launchers live next to the records they apply to, in `vault/repositories/<repo>/<kind>/LAUNCHERS.md` (e.g. [galaxy branches](../../repositories/galaxy/branches/LAUNCHERS.md), [foundry issues](../../repositories/foundry/issues/LAUNCHERS.md)). Launchers in `vault/repositories/_defaults/<kind>/LAUNCHERS.md` apply to every repository's records of that kind and list after the repository's own.

One `## Label` per launcher. Leading `key: value` lines configure it; the rest is the prompt.

- `status:` optional comma list of record statuses (the `<status>` directory) to show it on. An entry may instead name a section key of the kind's queue file (e.g. `queued_research` in `MY_ISSUES.md`), matching only records listed in that section. A `label:<name>` entry (e.g. `label:work/ready-implement`) matches the item's live GitHub label where the repository view's GitHub tabs have fetched them; there, live labels replace queue sections. `untracked` targets GitHub PRs (in `reviews/LAUNCHERS.md`) and issues (in `issues/LAUNCHERS.md`) in the repository view's GitHub tabs that have no record yet; only launchers listing it show there.
- `agent_dir:` directory under `vault/agents/` to start in.
- `name:` Herdr agent name; sanitized and de-duplicated by the script.
- `profile:` profile preselected in the dialog, by name; the first profile when unset.
- `command:` run a vault-relative executable instead of an agent, e.g. `agents/_shared/scripts/file_incubator_issue.py {record}`. Args split on whitespace before placeholders fill; no prompt, `agent_dir`, `name` or `profile`. Obsidian asks for confirmation, then shows the output; herdr, the Chrome extension and the 🚀 menu skip these.

Placeholders: `{repo}`, `{kind}`, `{status}`, `{name}` (branch name, PR or issue number), `{record}` (absolute record directory; empty for untracked items).

In a Herdr app pane in an `agent_dir`, the header's 🚀 menu offers that dir's launchers to run in the same session; the agent fills the record placeholders from the record under discussion (`herdr-plugin` CLI `actions <agent_dir>`; rebuild with `make herdr-plugin-build`).

## Agent launchers

`vault/agents/<agent>/LAUNCHERS.md` holds launchers for notes in that agent dir; the plugin shows a 🤖 launch button and an "Agents: routines and tasks" button (opens that agent's view) in the header of any note under `agents/<agent>/`. Same format, but `agent_dir:` defaults to `<agent>`, `status:` is ignored, and `command:` launchers are dropped. Placeholders: `{agent}`, `{file}` (absolute path of the open note).

`routine: true` also offers a launcher wherever that agent can be started: the Agents view in Obsidian, and the agent board, New agent popup and sidebar group headers in the Herdr app. Its button is the label's leading emoji, or in Obsidian the Lucide icon named by `icon:`. A routine can't use `{file}`.

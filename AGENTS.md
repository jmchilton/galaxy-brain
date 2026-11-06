# Galaxy Brain - Agent Instructions

Galaxy Brain is an Obsidian vault of Galaxy development notes, repository records, and agent workflows, with validation tooling, an Astro site, and launcher plugins. Open `vault/` as the Obsidian vault. Tooling and metadata live at the repository root.

Every agent under `vault/agents/` loads this file, so keep it to what all of them need.

- Writing or updating vault notes: follow `vault/agents/_shared/VAULT_NOTES.md`. The `gx_research` agent owns this.
- Developing galaxy-brain's tooling (validator, generators, site, plugins, launchers): follow `vault/agents/factory/TOOLING.md`. The `factory` agent owns this.

When you create or claim a record, or point John at one to look at or act on, run `hc label "$HC_TERMINAL_ID" "gb.record.<repo>/<kind>/<id>=$(date +%s)"` so it shows in their 📎 menu. Leave out the status directory.

## Answer from the vault

Start with `vault/Index.md` for topic routing, then read full notes and their `related_notes` / `parent_plan` links as needed. For repository work and agent workflows, inspect `vault/repositories/` and `vault/agents/` directly because the catalog excludes them. Skip `vault/log.md` unless the question concerns vault history.

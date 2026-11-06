# Plugin features

What each surface reads and shows, at a glance. Paths are relative to the galaxy-brain repo root; vault paths drop the `vault/` prefix.

Legend: ✅ yes · ◐ partial (see note) · — no

## Surfaces

| Surface | Code | Entry points | Reads vault via |
|---|---|---|---|
| **Obsidian** | `obsidian-plugin/src/` | ribbon (library, layers, bot), command palette, note header icons, file ⋯/right-click menu, fenced blocks, 3 custom views | Obsidian vault API |
| **Herdr** | `herdr-plugin/src/cli.ts` | `herdr-plugin.toml`: `launch` action, `picker` popup pane, GitHub PR/issue link handler (ctrl-click), selected text → filter | `herdr-plugin/src/vault.ts` (fs) |
| **Chrome** | `chrome-extension/src/popup.ts` | toolbar popup on a GitHub PR, issue, tree/commits/compare page | native host `herdr-plugin/src/native-host.ts` (`lookup`, `launch`, `newAgent`, `open`) |
| **Claude 🚀** | `claude-jmchilton-plugins/plugins/suggested-prompts/` | ➕ / 🚀 / ✖ on the hint line in a Claude session started in an agent dir | `herdr-plugin` CLI `actions <agent_dir>` |
| **Herdr app** | `herdr-app-mod/src/main.ts` (`gb-pane`), `agents.ts` (`gb-agents`), `board.ts` (`gb-board`), `record.ts` (`gb-record`), `review.ts` (`gb-review`) | pane header on every pane: 📋 Send/Draft, emoji quick sends, 🚀 record actions in agent dirs; sends with `hc send`, any agent. Sidebar: terminals grouped by agent dir, harness + machine icons, name · title, status; + new blank agent (dir, machine, ⚡ / ⚙️ profile); routines beside + and in its popup; 🧠 opens the agent board: tiles, tasks, blockers, missed PRs | `readTextFile` (`SUGGESTED_PROMPTS.md`, here or the pane's machine; `ENVIRONMENTS.yml`), `herdr-plugin` CLI `actions <agent_dir>`, `host` (native host `lookup`, `newAgent`, `agents`), `writeTextFile` (`TASKS.md`, `the_cracks/`) |
| **Site** | `site/src/pages/` | static pages, read only | Astro content collections |

Pure logic shared by all of them lives in `obsidian-plugin/src/*.ts` (non-view modules) and `site/src/lib/records.ts`, `repository-tabs.ts`. No Node or Obsidian imports there.

## Extension points (files a new tool can add or read)

| Extension point                                                                                            | Obsidian      | Herdr        | Chrome      | Claude 🚀 | Site     |
| ---------------------------------------------------------------------------------------------------------- | ------------- | ------------ | ----------- | --------- | -------- |
| Record launchers `repositories/{<repo>,_defaults}/<kind>/LAUNCHERS.md` ([format](../_shared/LAUNCHERS.md)) | ✅             | ✅            | ✅           | ◐ ¹       | —        |
| ↳ `status:` queue-section keys (`MY_*.md` sections)                                                        | ✅             | ✅            | ✅           | —         | —        |
| ↳ `status: untracked` (PR/issue with no record)                                                            | ✅ GitHub tabs | ✅ link click | ✅           | —         | —        |
| ↳ `command:` launchers                                                                                     | ✅             | —            | —           | —         | —        |
| Agent launchers `agents/<agent>/LAUNCHERS.md` (`{agent}`, `{file}`)                                        | ✅             | —            | —           | —         | —        |
| Profiles `agents/_shared/AGENT_PROFILES.yml`                                                               | ✅             | ✅            | ✅           | ✅ ➕⚙️     | —        |
| Environments `agents/_shared/ENVIRONMENTS.yml`                                                             | ✅             | ✅            | ✅           | —         | —        |
| Agent dirs (has `CLAUDE.md`, not `_`-prefixed)                                                             | ✅ Agents view | —            | ✅ New agent | ✅ ➕       | —        |
| Queue files `repositories/<repo>/<kind>/MY_*.md` (grouping + embed)                                        | ✅             | ◐ ²          | ◐ ²         | —         | ✅        |
| Sync: `agents/_shared/RECORD_AGENTS.yml` + `<kind>/SYNC_REPORT.md`                                         | ✅             | —            | —           | —         | —        |
| Search tabs `SEARCH_TABS` in `site/src/lib/repository-tabs.ts`                                             | ✅ fetched     | —            | —           | —         | ✅ link ↗ |
| Record frontmatter `blockers` / `blocking` / `related_records` / `parent_branch` / `child_branches`        | ✅ icons       | —            | —           | —         | —        |
| Record `index.md` body: GitHub URL                                                                         | ✅             | ✅            | ✅           | —         | —        |
| ↳ worktree, `upstream_base_branch`, CI sources                                                             | ✅             | —            | —           | —         | —        |
| `repositories/{_defaults,<repo>}/<kind>/FILE_DOCS.md`                                                      | ✅ `index.md` strip| ✅ `gb-record`| —           | —         | ✅        |
| Differential review snapshots + `review-state.json`                                                        | ✅             | ✅ `gb-review`| —           | —         | —        |
| `agents/<agent>/TASKS.md` (`gb-tasks`)                                                                     | ✅             | —            | —           | —         | —        |
| Routines: `routine: true` in `agents/<agent>/LAUNCHERS.md`                                                 | ✅             | —            | —           | —         | —        |
| `agents/<agent>/blockers/` ([format](../_shared/BLOCKERS.md))                                              | ✅             | —            | —           | —         | —        |
| `agents/<agent>/the_cracks/YYYY-MM-DD.md` (`gb-missed-prs`)                                                | ✅             | —            | —           | —         | —        |
| `agents/<agent>/SUGGESTED_PROMPTS.md`                                                                      | —             | —            | —           | ✅         | —        |

¹ Only launchers whose `agent_dir` is the session's dir; Claude fills the record placeholders from the conversation.
² Used only to match section-keyed launchers, not shown.

## Views and actions

### Record-level

| Feature | Obsidian | Herdr | Chrome | Site |
|---|---|---|---|---|
| Find record by GitHub PR / issue URL | — | ✅ | ✅ | — |
| Find record by GitHub branch page, or PR's fork head branch | — | — | ✅ | — |
| Fuzzy-pick any record | — | ✅ fzf | — | — |
| Launch agent: pick launcher → profile → env → edit prompt | ✅ modal | ✅ fzf + `$EDITOR` | ✅ popup | — |
| Open on GitHub | ✅ | ✅ | ✅ | — |
| Open in Obsidian | — | ✅ | ✅ | — |
| Open worktree in VS Code | ✅ | — | — | — |
| Compare to upstream base (branches) | ✅ | — | — | — |
| CI status modal + "fix CI" launcher (branches, reviews) | ✅ | — | — | — |
| Differential review view (branches, reviews) | ✅ | — | — | — |
| Blocker / related / parent-child icons | ✅ | — | — | — |
| Per-file help (`FILE_DOCS.md`) | — | — | — | ✅ |
| Copy note contents | ✅ | — | — | — |

### Repository-level

| Feature | Obsidian (`repository-view.ts`) | Site (`repositories/[repo]/`) |
|---|---|---|
| Record tabs (My branches / issues / incubator / reviews) grouped by queue section, then status | ✅ live | ✅ static |
| Queue file embedded under groups | ✅ | link only |
| 🔄 Sync button + `SYNC_REPORT.md` | ✅ | — |
| Recent tab (created / updated, kind filter, all repos) | ✅ | — |
| GitHub tabs (My drafts, Conflicting, New PRs, Out of draft, New issues, search tabs) | ✅ fetched via `gh`, rows matched to records | ✅ link ↗ to GitHub |

### Agent-level

| Feature | Obsidian | Chrome | Claude 🚀 |
|---|---|---|---|
| New blank agent per agent dir (⚡ default / ⚙️ pick profile) | — | ✅ | ✅ ➕ |
| Agent launchers 🤖 in header of notes under `agents/<agent>/` | ✅ | — | — |
| Agents view: 🌅 / ⏱️ routine buttons, Tasks, Blockers, Fell Through the Cracks tabs | ✅ | — | — |
| `gb-tasks` cards: launch, refine (factory agent), snooze, remove | ✅ | — | — |
| `gb-missed-prs` / `gb-missed-prs-feed` cards: ✔ / ↺ reviewed | ✅ | — | — |
| Record launchers re-run in the current session | — | — | ✅ 🚀 |
| Close session pane | — | — | ✅ ✖ |

## Platform limits

- Obsidian mobile: views, cards, `gb-*` blocks render; launch, sync, GitHub tabs, worktree are desktop only.
- Herdr: needs `make herdr-plugin-build`, `node`, `fzf`. `GB_DRY_RUN=1` prints launches.
- Chrome: needs `make chrome-native-install`; the host re-resolves records, launchers, profiles and environments, so only the prompt is free text.

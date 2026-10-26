# Galaxy Brain - Agent Instructions

Galaxy Brain is an Obsidian vault of Galaxy development notes, repository records, and agent workflows, with validation tooling, an Astro site, and launcher plugins. Open `vault/` as the Obsidian vault. Tooling and metadata live at the repository root.

This root `AGENTS.md` is the shared repository instruction source. Keep repository-wide guidance here.

## Repository map

- `meta_tags.yml` is the tag registry. Every tag on a validated note must appear here.
- `meta_schema.yml` defines the frontmatter contract in JSON Schema Draft 07, written as YAML.
- `validate_frontmatter.py` validates notes. It declares PEP 723 dependencies for `uv`.
- `test_validate_frontmatter.py` and `test_check_references.py` contain the root Python tests.
- `dashboard_sections.json` drives `generate_dashboard.py` and `site/src/pages/index.astro`.
- `generate_index.py` generates `vault/Index.md`, a catalog of validated note types and their summaries. It excludes agent workflows, repository records, and workspace sub-files.
- `vault/log.md` is the append-only operations journal, written by the ingest workflow. It is excluded from validation and content collections, but published at `/log/`.
- `tasks_sync.yml` configures `.claude/commands/sync-tasks.md`, which maintains `vault/JOHNS_TASKS.md`.
- `.claude/commands/` contains repository slash-command workflows, including ingestion, project creation, and task/review sync.
- `skill/` contains the `galaxy-brain` lookup and `galaxy-weekly-pr-review` skills.
- `LIBRARY_*.md` are research/planning documents about this library, not vault notes. They need no frontmatter.
- `site/` contains the Astro static site.
- `obsidian-plugin/`, `herdr-plugin/`, and `chrome-extension/` provide repository views and agent launchers.
- `differential-review/` is the differential review library: a pure core (`src/core/`, no Node imports) shared by the plugins, and the snapshot CLI agents run after each phase (`src/cli/`). See `LIBRARY_DIFFERENTIAL_REVIEW.md`. Its Obsidian view is `obsidian-plugin/src/diff-review-*.ts`, the only writer of `review-state.json`; plugin builds also need `npm install` in `differential-review/`.
- `galaxy-architecture/` is a Git submodule. `generate_architecture_views.py` renders its topics into `vault/projects/architecture/topics/`.
- `check_references.py` checks paper manuscript citations against each paper's `references.yml`.

## Commands

Run commands from the repository root. Python commands require `uv`. Run `npm install` in each relevant JavaScript package before building or testing it. Herdr's picker also requires Node and `fzf`.

```sh
make test                           # root Python tests, not the JS suites
make test ARGS="-k pattern"         # select Python tests
make validate                       # validate vault/ frontmatter
make validate ARGS="vault/research/" # validate a directory
make dashboard                      # generate vault/Dashboard.md
make check-dashboard                # fail on dashboard drift
make index                          # generate vault/Index.md
make check-index                    # fail on catalog drift
make references                     # report paper citation coverage/errors
make check-references               # fail on paper citation errors
make architecture-views             # regenerate architecture topic views
make check-architecture-views       # fail on architecture view drift
make site-dev                       # Astro dev server
make site-build                     # build into site/dist/
make site-preview                   # preview the production build
make site-test                      # site Vitest suite
make plugin-build                   # typecheck/build Obsidian plugin into vault
make plugin-dev                     # watch/rebuild Obsidian plugin
make plugin-test                    # Obsidian plugin Vitest suite
make herdr-plugin-build             # typecheck/bundle terminal and native host code
make herdr-plugin-test              # Herdr plugin Vitest suite
make chrome-ext-build               # build Herdr host and Chrome popup
make chrome-native-install          # register native messaging host for macOS Chrome
make diff-review-build              # typecheck/bundle differential-review CLI
make diff-review-test               # differential-review Vitest suite
```

`make install` links the lookup skill into `~/.claude/skills/` and this repository to `~/.galaxy-brain`. `make architecture-update` runs `scripts/sync_architecture.py`, which updates the submodule pin, regenerates views, and stages the changes for review. Read the script before using that maintenance workflow.

## Vault contracts

### Validated notes and plain documents

- Notes require `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`, and `summary`. Summaries must contain 20–160 characters. Type-specific requirements live in `meta_schema.yml` under `allOf/if/then`.
- Supported types are `research`, `plan`, `plan-section`, `concept`, `moc`, `project`, and `paper`. Research notes also require a registered `subtype`.
- `vault/projects/<name>/` and `vault/papers/<name>/` are workspaces. Only their `index.md` files are validated notes. Sibling Markdown files are plain documents and render through separate site collections.
- `vault/agents/**` and `vault/repositories/**`, including their `index.md` files, are plain documents excluded from frontmatter validation. Do not add note frontmatter to them. See `vault/agents/_shared/NOT_VAULT_NOTES.md`.
- `find_md_files()` in `validate_frontmatter.py` skips hidden paths, `templates/`, `agents/`, `repositories/`, `Dashboard.md`, `Index.md`, `log.md`, and non-index Markdown files under `projects/` and `papers/` when traversing the vault root.
- Tags are hierarchical, such as `research/component`. Tag coherence accepts a registered subtag of the expected type tag.
- `parent_plan`, `related_issues`, `related_notes`, and `related_projects` use `[[Target Name]]` links. `related_prs` accepts wiki links or integer PR numbers.

### Validation behavior

- The validator injects `meta_tags.yml` keys into the schema's initially empty tag enum.
- `additionalProperties: false` rejects unknown frontmatter fields.
- Validation checks schema, dates, wiki-link content, and tag coherence. PyYAML date values are converted to ISO strings by `preprocess_frontmatter()` before schema validation.
- Unknown tags and invalid fields are errors. Missing expected type tags and asymmetric `related_notes` backlinks are advisory warnings.
- Cross-file backlink checks run across successfully validated notes in the selected directory.

### Add or update a note

- Start from `.claude/commands/ingest.md` for URLs/local files, or a matching Obsidian Templater template in `vault/templates/`. When slash commands are unavailable, read and follow the workflow file directly. Do not invent frontmatter from scratch.
- Templater templates cover each current type/subtype and are excluded from validation and site collections. Obsidian users need the Templater community plugin, with `templates/` as its template folder.
- On updates to validated notes, increment `revision`, set `revised` to today's date, and preserve `created`.
- Regenerate `make index` after adding/removing notes or changing their frontmatter. Regenerate `make dashboard` after changing `dashboard_sections.json`.
- Append ingest operations to `vault/log.md`. Keep earlier entries intact.
- Before committing, run `make validate`. Errors block completion. Run `make check-index` and `make check-dashboard` after frontmatter/config changes, and the tests relevant to the change.
- Do not edit `vault/Dashboard.md` or `vault/Index.md` by hand. Change their sources and regenerate. Regenerate architecture topic views with `make architecture-views`.

### Answer from the vault

Start with `vault/Index.md` for topic routing, then read full notes and their `related_notes` / `parent_plan` links as needed. For repository work and agent workflows, inspect `vault/repositories/` and `vault/agents/` directly because the catalog excludes them. Skip `vault/log.md` unless the question concerns vault history.

### Extend the schema

When adding a note type or research subtype:

1. Register its tag in `meta_tags.yml`.
2. Add a type to `type.enum`, or a research subtype to the research conditional's `subtype.enum`, in `meta_schema.yml`.
3. Declare any new properties at the schema's top level and add conditional requirements under `allOf`.
4. Update `TYPE_TAG_MAP` in `validate_frontmatter.py` and add tests in `test_validate_frontmatter.py`.
5. Update the site's schema in `site/src/content.config.ts`, templates, catalog grouping in `generate_index.py`, and dashboard sections as applicable.

When adding a frontmatter field, declare it in top-level `properties` and add it to the relevant conditional `required` list when needed. For wiki-link fields, add the schema pattern `"^\\[\\[.+\\]\\]$"` and an entry in `WIKI_LINK_FIELDS` for custom content checks. Keep the site's schema in sync and add test coverage.

Do not weaken the schema to fit a non-conforming note. Reshape the note or deliberately extend the contract with tests.

## Static site

- Astro publishes to GitHub Pages under `/galaxy-brain/`. `.github/workflows/deploy.yml` deploys on pushes to `main`.
- `site/src/content.config.ts` loads `../vault/`. Collection patterns live in `site/src/lib/collection-patterns.ts`.
- Collections are `vault` for typed notes and `projectFiles`, `paperFiles`, `repositoryFiles`, and `factoryFiles` for plain Markdown documents.
- `site/src/pages/index.astro` imports the shared dashboard sections. `generate_dashboard.py` produces the matching Obsidian Dataview queries.
- Routes cover note details (`[...slug].astro`), project sub-files (`projects/[project]/[...path].astro`), paper workspaces, repository records, tags, raw Markdown, the catalog, and the log. `/catalog/` renders `vault/Index.md` and `/log/` renders `vault/log.md` directly outside the content collections.
- `site/src/lib/vault-urls.ts` maps vault paths to URLs. Repository record URLs omit the status directory so they survive status moves. See `LIBRARY_REPOSITORY_RECORDS.md`.
- Repository pages display per-file help from `vault/repositories/{_defaults,<repo>}/<kind>/FILE_DOCS.md` through `site/src/lib/file-docs.ts`. See `LIBRARY_RECORD_FILE_DOCS.md`.
- Factory pages publish `vault/agents/factory/FACTORY.md` and `*_FACTORY.md`, the only published slice of `agents/`. `/factory/` is the hub. The child-page map lives in `site/src/lib/factory-pages.ts`. Links to unpublished agent documents use absolute GitHub URLs.
- Wiki-link rendering lives in `site/src/lib/remark-wiki-links.ts` and `site/src/lib/wiki-links.ts`. Note detail pages include a frontmatter backlinks panel.
- GitHub alert blockquotes render as `.callout` asides through `site/src/lib/remark-github-alerts.ts`.
- Tailwind CSS v4 uses `@tailwindcss/vite` and `@tailwindcss/typography`. Theme tokens live in `site/src/styles/global.css`. Dark mode uses a class toggle and detects OS preference.

## Repository views and launchers

### Shared records and configuration

- Records live at `vault/repositories/<repo>/<kind>/<status>/<id>/`, where kind is `branches`, `issues`, or `reviews`. Their `index.md` files need no frontmatter.
- `site/src/lib/records.ts` supplies record paths, status helpers, and queue grouping shared by the site and Obsidian plugin. Keep it dependency-free and free of Node imports because the plugin also loads on mobile.
- Branch records group by sections in `vault/repositories/<repo>/branches/MY_BRANCHES.md` when present. Unlisted records fall back to status groups. The branches tab also embeds the queue file.
- Launchers come from `vault/repositories/<repo>/<kind>/LAUNCHERS.md` and `_defaults/<kind>/LAUNCHERS.md`. The format is documented in `vault/agents/_shared/LAUNCHERS.md` and parsed by `obsidian-plugin/src/launchers.ts`.
- Launch profiles (agent, model, effort, args) come from `vault/agents/_shared/AGENT_PROFILES.yml`, parsed by `obsidian-plugin/src/profiles.ts`.
- `vault/agents/_shared/scripts/launch_agent.sh` starts agents. Agent directories hold their own `AGENTS.md` instructions, with `CLAUDE.md` symlinks for Claude discovery.
- Agent directories' `SUGGESTED_PROMPTS.md` files feed the separate `suggested-prompts` hooks plugin in `~/projects/repositories/claude-jmchilton-plugins/plugins/suggested-prompts/`.

### Obsidian plugin

- TypeScript + esbuild builds into `vault/.obsidian/plugins/galaxy-brain/`. Pure logic lives in plain modules with Vitest tests.
- The repository view provides launch buttons and an upstream activity feed fetched with `gh api graphql` (`github-feed.ts`). Tab definitions and GitHub list URLs are shared with the site through `site/src/lib/repository-tabs.ts`. The site links to GitHub lists, while the plugin fetches them.
- `gb-tasks` fenced blocks render as task cards with launch-and-remove and remove buttons; `kind: human` cards get only ✔ (remove). See `vault/agents/_shared/TASK_LIST_YAML_FORMAT.md` and `obsidian-plugin/src/task-list.ts`.
- The Agents view (`agents-view.ts`) has an agent-dir dropdown. Each agent page shows 🌅 Good morning / ⏱️ Tick buttons (`Run ./GOOD_MORNING.md` / `./TICK.md`, `Sonnet (medium)`, for the files present) and its `TASKS.md` task cards; the landing page lists every agent's buttons and merges all `TASKS.md` cards, by priority then recommended first. See `agent-routines.ts`.
- My issues / My reviews tabs show `SYNC_REPORT.md` and a sync button. `vault/agents/_shared/RECORD_AGENTS.yml` maps each repo/kind to an agent. `obsidian-plugin/src/record-agents.ts` selects `PROCESS_SYNC_ISSUE_STATE.md` or `PROCESS_SYNC_REVIEW_STATE.md` and the `Sonnet (medium)` profile.
- The plugin's Recent tab lists up to 25 records by creation time or `index.md` modification time, with kind and repository filters, including all repositories. See `recentRecords()` in `obsidian-plugin/src/repository.ts`.

### Herdr plugin

- `herdr-plugin/herdr-plugin.toml` defines an fzf popup for choosing a record, launcher, and profile, then confirming/editing the launch. Ctrl-clicking a GitHub PR/issue URL opens the picker for that record or an untracked stand-in.
- It reuses the Obsidian plugin's pure modules. Filesystem reads live in `herdr-plugin/src/vault.ts`.
- `make herdr-plugin-build` bundles into gitignored `dist/`. Run it after cloning/pulling, then `herdr plugin link herdr-plugin` to register. Linking does not build the plugin.
- `GB_DRY_RUN=1` prints launches instead of running them.

### Chrome extension

- The MV3 popup offers launchers for the current GitHub PR, issue, or branch. Tree/commits/compare pages match branch records by name; a PR from the fork also gets its branch record (head branch via `gh pr view`). It also offers new blank agents for each agent directory.
- Requests use Chrome native messaging through `herdr-plugin/src/native.ts`, with handlers in `native-host.ts`. Launchers, records, and profiles are resolved again on the host.
- After installing dependencies in both `herdr-plugin/` and `chrome-extension/`, run `make chrome-ext-build`, load `chrome-extension/` unpacked, and run `make chrome-native-install` once to register the macOS Chrome host.
- The manifest key pins extension ID `mkckliibikdomehoflcgoefdhlolgdah`. The installer allows that extension origin. Build output in `dist/` is gitignored.

## Verification and working rules

- Root Python tests load the real schema and tag registry. Unit tests call `validate_data()` with dictionaries. File-level tests use `validate_file()` and `tmp_path`.
- Prefer red-to-green for behavior changes. Never remove tests or weaken assertions to make them pass. Fix the implementation.
- `make test` covers the two root Python suites. Site, Obsidian, and Herdr tests are separate targets. Chrome's build includes a TypeScript check.
- Before reporting GitHub authentication as blocked, try a harmless API read such as `gh repo view --json nameWithOwner,defaultBranchRef`. `gh auth status` alone can report a stale stored token even when repository reads authenticate through another path. Distinguish authentication failures from sandbox and transient network failures.

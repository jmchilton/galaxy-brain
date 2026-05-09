# Component: galaxy-brain (architectural reference)

A mineable architectural reference for designers of the Galaxy Workflow Foundry. Source repo lives at `/Users/jxc755/projects/repositories/galaxy-brain/`. All file paths below are absolute paths in that repo.

## 1. Concepts and vocabulary

galaxy-brain is an Obsidian vault (`vault/`) of Markdown notes whose every authored file carries a YAML frontmatter contract, plus a small Python toolchain at the repo root that validates and projects that content into generated artifacts and a static site. Vocabulary:

- **Note** — a single `.md` file with frontmatter under `vault/`. Identity = filename stem (used as the wiki-link target).
- **Type** — top-level kind of note (`type:` in frontmatter): `research | plan | plan-section | concept | moc | project`.
- **Subtype** — second-level discriminator, only meaningful for `type: research` (e.g. `subtype: issue`). Drives conditional required fields.
- **Tag** — controlled hierarchical label (e.g. `research/component`, `galaxy/tools/yaml`); every tag must be declared in `meta_tags.yml`. Two roles: classify the note's kind (note-type tags) and classify the subject area (`galaxy/*` area tags).
- **Project** — a *directory-based* note: `vault/projects/<slug>/index.md` is the canonical, frontmatter-bearing landing page; its sibling `.md` files are unstructured "project files" (no frontmatter, validator skips them, site renders them as raw children).
- **Dashboard** — generated `vault/Dashboard.md` (Obsidian) + Astro `index.astro` landing page; both driven by `dashboard_sections.json`. Tabular by tag.
- **Index** — generated `vault/Index.md`: a flat prose catalog of every note grouped by `type`/`subtype`, each line `- [[slug]] — summary`.
- **Raw** — verbatim Markdown endpoint served by the Astro site at `/raw/<id>.md` so AI agents (and humans) can grab the unrendered source.
- **Template** — Obsidian Templater file in `vault/templates/`, one per type/subtype, which prompts for required fields and stamps frontmatter.
- **Wiki link** — Obsidian-flavored `[[Target Name]]` reference. First-class in both frontmatter (typed fields like `parent_plan`, `related_notes`) and body prose (resolved by a custom remark plugin).
- **MOC** (Map of Content) — navigation hub note; pure links, no original research.
- **Log** — `vault/log.md`, append-only journal of vault operations (currently `ingest`; planned `query`, `lint`, `manual`). Excluded from validator and site.
- **Skill / slash command** — repo-checked-in `/ingest`, `/create-project`, `/ingest-gx-pr` under `.claude/commands/` that codify authoring workflows.

## 2. Note types and subtypes

Source of truth: `meta_schema.yml` `type.enum` and the `allOf/if/then` block; `meta_tags.yml` for the matching tag; `vault/templates/` for templates.

| `type` | `subtype` | Required-extra | Tag(s) | Template | Directory |
|---|---|---|---|---|---|
| `research` | `component` | (none beyond base + `subtype`) | `research/component` | `research-component.md` | `vault/research/` |
| `research` | `issue` | `github_issue`, `github_repo` | `research/issue` | `research-issue.md` | `vault/research/` |
| `research` | `pr` | `github_pr`, `github_repo` | `research/pr` | `research-pr.md` | `vault/research/` |
| `research` | `issue-roundup` | (none) | `research/issue-roundup` | `research-issue-roundup.md` | `vault/research/` |
| `research` | `design-problem` | (none) | `research/design-problem` | `research-design-problem.md` | `vault/research/` |
| `research` | `design-spec` | (none) | `research/design-spec` | `research-design-spec.md` | `vault/research/` |
| `research` | `dependency` | (none) | `research/dependency` | `research-dependency.md` | `vault/research/` |
| `plan` | — | `title` | `plan` (or `plan/followup`) | `plan.md` | `vault/plans/` |
| `plan-section` | — | `parent_plan`, `section` | `plan/section` | `plan-section.md` | `vault/plans/` |
| `concept` | — | (none) | `concept` | `concept.md` | (free) |
| `moc` | — | (none) | `moc` | `moc.md` | (free) |
| `project` | — | `title` | `project` | `project.md` | `vault/projects/<slug>/index.md` only |

The `research` `if/then` enforces `subtype` is required AND constrains its enum to seven values. `project` is the only type with a directory-placement contract enforced by the validator's `find_md_files` (`projects/<x>/` non-`index.md` are skipped).

## 3. Tag system

`meta_tags.yml` is a flat YAML dict whose **keys** are the entire allowed tag vocabulary; each value is `{ description: "..." }`. Hierarchy is purely textual (slash-delimited):

```yaml
research:
  description: "Parent tag for all research notes"
research/component:
  description: "Deep dive into a Galaxy codebase area..."
galaxy/tools/yaml:
  description: "YAML tool definitions..."
```

Validation (`validate_frontmatter.py:load_tags` / `load_schema`) **injects the keys at runtime** into the schema's `properties.tags.items.enum`, so the schema YAML on disk has `enum: []` — the file declares structure, the registry declares vocabulary. This separation is load-bearing: vocabulary changes touch one file; the schema stays static.

Two tag families coexist by convention:
- **Note-type tags** (`research/*`, `plan`, `plan/section`, `plan/followup`, `concept`, `moc`, `project`) — every note carries exactly one.
- **Galaxy area tags** (`galaxy/*`) — zero or more, classify subject domain.

Coherence check (`TYPE_TAG_MAP` + `validate_tag_coherence`) emits a *warning* (not error) when a note's `(type, subtype)` doesn't have its expected note-type tag among `tags`. `_tag_matches` is hierarchy-aware: `plan/followup` satisfies an expected `plan`. The site (`site/src/pages/tags/index.astro`) groups tags into "Note Type Tags", "Galaxy Area Tags", "Other" by string-prefix sniffing.

## 4. Frontmatter schema

`meta_schema.yml` is JSON Schema Draft 07 written in YAML.

**Base required (everywhere)**: `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`, `summary`.

- `status` enum: `draft | reviewed | revised | stale | archived`.
- `summary`: `string`, `minLength: 20`, `maxLength: 160` — forced compression, drives the Index and dashboard tooltips.
- `revision`: `integer >= 1`; bumped by hand on every edit.
- `created` / `revised`: ISO date strings (advisory `format: date`; real validation in `validate_dates`).
- `tags`: array, `minItems: 1`, items enum injected at runtime.
- `ai_generated`: boolean, declared on every note.

**Conditional fields** declared at top level (must be, because of `additionalProperties: false`) and gated by `allOf/if/then`:

```yaml
- if: { properties: { type: { const: research } }, required: [type] }
  then:
    required: [subtype]
    properties: { subtype: { enum: [component, issue, pr, issue-roundup, design-problem, design-spec, dependency] } }
- if: { properties: { type: { const: research }, subtype: { const: issue } }, required: [type, subtype] }
  then: { required: [github_issue, github_repo] }
- if: { properties: { type: { const: research }, subtype: { const: pr } }, required: [type, subtype] }
  then: { required: [github_pr, github_repo] }
- if: { properties: { type: { const: plan } }, required: [type] }
  then: { required: [title] }
- if: { properties: { type: { const: plan-section } }, required: [type] }
  then: { required: [parent_plan, section] }
- if: { properties: { type: { const: project } }, required: [type] }
  then: { required: [title] }
```

**Special field types**:
- `github_issue`: `oneOf: [integer, array<integer>]` — a tasteful single-or-many.
- Wiki-link fields enforce a regex `pattern: "^\\[\\[.+\\]\\]$"`: `parent_plan` (single), `related_issues` (array), `related_notes` (array). `related_prs` accepts either wiki-link strings or raw integers.
- `sources`: array of non-empty strings, `minItems: 1` — used by `/ingest` for dedup and for the site's "Sources" panel.
- `aliases`, `branch`, `component`, `galaxy_areas`, `parent_feature`, `unresolved_questions`, `resolves_question` — narrow optional fields, all top-level-declared.

**Strict mode**: `additionalProperties: false`. Typos like `relataed_notes` fail loudly. The cost is that *every* conditional field must be declared at top level (you can't "bring in" a property only inside a `then` — you have to enumerate it globally and then `required` it conditionally).

## 5. Validation pipeline

`validate_frontmatter.py` is a uv-runnable single file with PEP 723 inline deps (`python-frontmatter`, `jsonschema`, `pyyaml`).

Layered validation (`validate_data` orchestrates):
1. **`preprocess_frontmatter`** — coerce `datetime.date`/`datetime` to ISO strings (PyYAML auto-parses bare dates).
2. **`validate_schema`** — `jsonschema.Draft7Validator` against the schema with tag enum injected.
3. **`validate_dates`** — second pass on `created`/`revised` via `datetime.date.fromisoformat`.
4. **`validate_wiki_links`** — regex-checks the inner text of `[[...]]` for whitespace-only payloads (the schema's `pattern` only checks brackets exist).
5. **`validate_tag_coherence`** — *warning* when `(type, subtype)` doesn't carry its expected tag.
6. **`validate_bidirectional_related_notes`** (cross-file, run by `validate_directory`) — builds slug→file map, resolves every `related_notes` link via `_resolve_wiki_link` (exact-then-prefix slug match, with project `index.md` keyed by parent dir name), warns when A→B exists without B→A.

`validate_file` reads, runs `frontmatter.checks` for the `---` fence, then `frontmatter.loads`, then `validate_data`. `find_md_files` enforces the skip rules:

```python
SKIP_DIRS = {".obsidian", "templates"}
SKIP_FILES = {"Dashboard.md", "Index.md", "log.md"}
# also: "projects" in parts and path.name != "index.md"
```

Hidden directories (any `.*`) are skipped via `p.startswith(".")`. CLI flags: `--schema`, `--tags`, positional `directory` (default `vault/`). Exits 1 on any error; warnings never block.

`test_validate_frontmatter.py` (52 tests; ~28KB) loads the *real* `meta_schema.yml` and `meta_tags.yml` and exercises `validate_data` (unit) and `validate_file` (integration with `tmp_path`). `Makefile` runs uv with the inline deps explicitly: `DEPS = --with python-frontmatter --with jsonschema --with pyyaml`.

## 6. Wiki links

**Frontmatter wiki-link fields** (exhaustive, from schema and `WIKI_LINK_FIELDS`):

- `parent_plan` — single, regex `^\[\[.+\]\]$`.
- `related_issues` — array of regex-matching strings.
- `related_notes` — array of regex-matching strings.
- `related_prs` — array `oneOf: [pattern-string, integer]`.

**Format**: `[[Target Name]]`. Pipe-aliasing supported in body (`[[Target|display]]`) by the remark plugin but not by frontmatter (frontmatter regex is `.+`, parser would accept it, but no display rendering).

**Resolution algorithm** (matches across three sites: Python validator `_slugify`+`_resolve_wiki_link`, TS `site/src/lib/wiki-links.ts`, and `site/src/lib/remark-wiki-links.ts`):

```
slug = lower(name) → "  -  " → "-" → spaces → "-" → strip [^a-z0-9-] → collapse dashes
```

Lookup is **exact match on a basename-keyed map first, then prefix-match fallback**. The map is built by slugifying each note's *basename* (filename stem), with project `index.md` files keyed by their *parent directory name* instead of "index". This is what lets `[[workflow_state]]` resolve to `vault/projects/workflow_state/index.md` and lets `[[Issue 17506]]` prefix-match a longer file like `Issue 17506 - Workflow Extraction Vue.md`.

**Body wiki links** rendered by `site/src/lib/remark-wiki-links.ts` — a remark transformer that walks `text` nodes (skipping inside existing `link`/`linkReference`), rewrites `[[...]]` to mdast `link` nodes (with `title = summary`) when resolvable, and falls back to a `strong` node for danglers. It builds its own slug-map by walking `vault/` directly (not via Astro collections) so it parses frontmatter independently with `js-yaml`.

**Backlinks** (`buildBacklinkMap` in `wiki-links.ts`): only the three frontmatter fields above are inverted into backlinks; body wiki links don't backlink (a deliberate scope cut). Each note page renders an "Incoming References" section with the field that produced the link (`parent plan` / `related note` / `related issue`).

**Bidirectional warning**: validator emits `related_notes: missing backlink to [[X]]` when A→B isn't reciprocated in B's `related_notes`. Asymmetric and informational only.

## 7. Generated artifacts (Dashboard, Index)

Both files in `vault/` are generated and skipped by the validator (`SKIP_FILES`). They are committed; CI gates check drift.

**`dashboard_sections.json`** — one source of truth for both surfaces:

```json
[
  { "label": "Component Research", "tag": "research/component" },
  { "label": "Merged Pull Request Research", "tag": "research/pr" },
  { "label": "Dependency Research", "tag": "research/dependency" },
  { "label": "Issues", "tag": "research/issue" },
  { "label": "Plans", "tag": "plan" },
  { "label": "Projects", "tag": "project" }
]
```

`generate_dashboard.py` emits a markdown file with a Dataview block per section (Obsidian renders these live):

````
## {label}
```dataview
TABLE status, revised, revision
FROM #{tag}
WHERE status != "archived"
SORT revised DESC
```
````

`site/src/pages/index.astro` imports the same JSON and builds an HTML table per section, filtering `status !== 'archived'` and sorting by `revised DESC` — semantically identical to Dataview.

`generate_index.py` walks `find_md_files` (reusing the validator's skip logic), groups by `type`/`subtype`, sorts alphabetically, and emits `vault/Index.md`:

```
- [[slug]] — {summary} *(stale)*
```

Slug is the filename stem, except project `index.md` becomes the parent directory name. Stale/archived statuses get an italic suffix. The "Plans" section folds in `plan-section` after pure plans.

**Drift detection**: `--check` flag on both generators reads the file and string-compares with re-generation; exit 1 on mismatch. Wired into `make check-dashboard` and `make check-index`. Designed to be CI gates (no GH Action currently runs them — that's an obvious gap to mine).

## 8. Templates and authoring flow

`vault/templates/` holds 12 Obsidian Templater files (one per type / research subtype). Each template:
1. Prompts for required fields via `tp.system.prompt`.
2. Calls `tp.file.move(`/research/Issue ${num} - ${title}`)` to put the new note in the right directory.
3. Stamps `created`/`revised` with `tp.date.now("YYYY-MM-DD")`, `revision: 1`, `status: draft`.
4. Hardcodes the correct note-type tag and leaves `# TODO: add galaxy/* tags`.
5. Provides H1 and section scaffold (`## Summary`, `## Analysis`, `## Related`, etc.).

Three authoring entry points:
- **Templater** in Obsidian (interactive, human-driven).
- **`/ingest`** slash command (`.claude/commands/ingest.md`) — the agent flow.
- **Hand-written** + `make validate`.

**`/ingest`** is the keystone agent workflow. It accepts a GitHub issue/PR URL, arbitrary URL, or local file. Steps: classify → fetch (`gh issue view`, `gh pr view`, WebFetch, or Read) → **dedup** (grep for `github_issue`/`github_pr` and normalized URLs in `sources:`) → classify type/subtype → draft using the matching template as *structural reference* (read, don't execute) → cross-ref pass (read `Index.md`, identify up to 15 overlapping notes, propose batched diffs, bump `revised`+`revision`) → write → `make validate` → append to `vault/log.md` → `make index`.

**`/create-project`** scaffolds `vault/projects/<slug>/index.md` from a description or seed file.

**`/ingest-gx-pr`** is a Galaxy-specific deep-research wrapper that hands off to `/ingest`.

## 9. Project-type notes (directory-based)

Layout:

```
vault/projects/<slug>/
  index.md           ← only file with frontmatter, validated
  CURRENT_STATE.md   ← raw project file, no frontmatter
  PLANS.md           ← raw project file
  old/               ← arbitrary nesting allowed
```

Validator distinction (`find_md_files`):
```python
if "projects" in parts and path.name != "index.md":
    continue
```

Astro distinction — two collections in `site/src/content.config.ts`:
- `vault` collection: `'**/*.md'` minus skip patterns minus `'!projects/**/!(index).md'` — only the `index.md` is loaded with typed schema.
- `projectFiles` collection: `'projects/**/!(index).md'` — schema is `z.object({}).passthrough()`, no validation.

Routes:
- `[...slug].astro` renders the project's `index.md` and, if `data.type === 'project'`, queries `projectFiles` whose id starts with `entry.id + '/'` and renders a `FileTree` component.
- `pages/projects/[project]/[...path].astro` renders both **folders** (auto-derived directory prefixes) and **files** under a project — full breadcrumb navigation through arbitrary nesting.
- `pages/raw/projects/[project]/[...file].md.ts` exposes raw text for project sub-files; `pages/raw/[...slug].md.ts` does the same for vault notes (`Content-Type: text/plain`).

Why the exception exists: many existing project artifacts (plans, prompts, scratch docs) co-evolve in a directory and don't merit per-file frontmatter. Forcing frontmatter on every file would either bloat the schema or fight the natural "scratch dir" workflow. The `index.md` carries the structured metadata; siblings ride along verbatim.

## 10. Site / Astro layer

Stack: Astro static + Tailwind CSS v4 (`@tailwindcss/vite`) + `@tailwindcss/typography` + `@fontsource/atkinson-hyperlegible` (dyslexia-friendly default body font). One layout (`site/src/layouts/Base.astro`), three components (`Header`, `Footer`, `FileTree`).

**Content collections** (`site/src/content.config.ts`):
- `vault` — typed `z.object` mirroring `meta_schema.yml`, dates coerced via `z.coerce.date()`. Glob excludes Dashboard/Index/log/`templates/**`/`.obsidian/**`/`projects/**/!(index).md`. `generateId` slugifies the path and strips trailing `/index`.
- `projectFiles` — `passthrough()` schema (no validation), only loads project sub-files.

**Routes** (`site/src/pages/`):
- `index.astro` — dashboard (driven by `dashboard_sections.json`).
- `[...slug].astro` — note detail with metadata `<dl>`, GitHub auto-links, wiki-link panels, body via `<Content />` (rendered through remarkWikiLinks), Project Files tree if `type=project`, "Incoming References" backlinks panel, Pagefind search annotations (`data-pagefind-body`, `data-pagefind-meta`, `data-pagefind-weight`).
- `catalog.astro` — full catalog page.
- `log.astro` — renders `vault/log.md` (despite log.md being skipped from collection — separate render path via `site/src/lib/render-vault-doc.ts`).
- `tags/index.astro` — three-bucket tag browser (note-type / galaxy area / other).
- `tags/[...tag].astro` — per-tag filter.
- `projects/[project]/[...path].astro` — project file/folder browser with breadcrumbs.
- `raw/[...slug].md.ts` — raw text endpoint for vault notes.
- `raw/projects/[project]/[...file].md.ts` — raw text for project sub-files.

**Theme** (`site/src/styles/global.css`): all colors are CSS custom properties under `@theme { ... }` (Tailwind v4 native). Dark mode: `@custom-variant dark (&:where(.dark, .dark *))` plus a `.dark { ... }` block overriding the same tokens. Status badges (`.badge-draft`, `.badge-reviewed`, `.badge-revised`, `.badge-stale`, `.badge-archived`) and `.tag` chips have first-class component classes. `.dangling` styles unresolved wiki links muted+italic. Skip-link for a11y. Prose overrides recolor headings and code blocks per Galaxy palette without losing typography defaults.

**Deployment** (`.github/workflows/deploy.yml`): minimal, two-job — `withastro/action@v3` builds at `path: site`, `actions/deploy-pages@v4` publishes. Triggered on push to `main`. Site URL is `/galaxy-brain/` (BASE_URL handled via `import.meta.env.BASE_URL.replace(/\/$/, '')` everywhere). No CI gate currently runs `make validate` or `make check-index` — a hole worth filling.

## 11. Ingestion and maintenance

`/ingest` is the spine of the workflow. It writes (a) the new note, (b) updates to up-to-15 cross-referenced notes (with `revised`/`revision` bumps), (c) an entry to `vault/log.md`, then runs `make validate` and `make index`.

`vault/log.md` is **append-only**, **excluded from validator and Astro collections**, and Obsidian-visible. Entry format:

```markdown
## 2026-04-28 ingest — PR 21828 - YAML Tool Hardening and Tool State
- **source**: https://github.com/galaxyproject/galaxy/pull/21828
- **created**: [[PR 21828 - YAML Tool Hardening and Tool State]]
- **updated**:
  - [[Component - YAML Tool Runtime]] — added cross-ref; PR lands runtimeify path
  ...
```

Reserved entry types: `ingest`, `query` (future `/ask`), `lint` (future `/lint-vault`), `manual`. Only `ingest` is implemented today.

**`Makefile` targets** (the maintenance loop):
- `make validate` / `make validate ARGS="vault/research/"` — schema + cross-file checks.
- `make test` — pytest suite (52 tests).
- `make dashboard` / `make check-dashboard` — generate / drift-check `Dashboard.md`.
- `make index` / `make check-index` — generate / drift-check `Index.md`.
- `make site-dev` / `make site-build` / `make site-preview` — Astro lifecycle.
- `make install` — symlinks `skill/galaxy-brain` into `~/.claude/skills/` and the repo into `~/.galaxy-brain` (legacy skill loader).

All Python tools use **uv with inline PEP 723 deps** — no `requirements.txt`, no virtualenv to maintain.

## 12. Conventions worth borrowing wholesale

Patterns that map directly to any structured KB project:

1. **Tag registry as a separate file with empty enum in schema, injected at runtime.** Letting vocabulary churn without touching the schema is huge; `additionalProperties: false` plus this injection gives strict-but-evolvable.
2. **Note-type tag mirrors `(type, subtype)` and is checked for coherence as a *warning*.** Belt-and-suspenders without blocking authors mid-write.
3. **`summary` 20–160 chars, required everywhere.** Powers Index, dashboard tooltips, link previews. Short forced compression beats long optional descriptions.
4. **Two parallel slug-map resolvers (Python + TS) with identical algorithm.** Validator and renderer agree on what "[[X]]" means. Keep both small enough to mirror.
5. **Exact-then-prefix slug match on basenames.** Lets `[[Issue 17506]]` resolve to a longer file without forcing canonical names.
6. **Generated dashboards/indexes with `--check` drift detection, committed to git.** Means the static site (and Obsidian) always have a current TOC; CI can refuse stale PRs.
7. **One JSON config drives Obsidian Dataview *and* the static-site landing page.** Two renderers, one source. Avoids dashboard divergence.
8. **`additionalProperties: false` + `allOf/if/then` for conditional requireds.** All conditional fields declared top-level; the "if-then" wires them to `(type, subtype)`.
9. **Frontmatter wiki-link fields with `[[...]]` regex pattern + a separate semantic check for whitespace-only inner text.** Two layers: schema-level format, code-level meaningfulness.
10. **Backlinks computed only from typed frontmatter fields, not body prose.** Bounded, fast, and authors control the contract.
11. **Bidirectional `related_notes` warning, not error.** Surfaces asymmetry without blocking valid one-way references.
12. **Append-only operations log (`log.md`) excluded from validation and rendering.** Cheap auditability of agent actions; no schema overhead.
13. **PEP 723 inline-deps single-file Python tools + `uv run`.** Zero-install reproducibility.
14. **Slash commands (`.claude/commands/*.md`) checked into the repo.** Authoring workflow is versioned with the data.
15. **Directory-as-note (`projects/<slug>/index.md`) escape hatch for unstructured co-located docs.** Two-collection split in Astro keeps the typed core clean without losing the scratch material.
16. **Raw markdown endpoints + clipboard copy on every page.** Trivially makes the vault AI-agent-consumable from the published site.
17. **CSS custom-property theme tokens with a `.dark { ... }` override block.** No `dark:` prefix sprawl; semantic surface/text/badge tokens.
18. **Status enum on every note, with rendered badges and `archived` filtering everywhere.** Lifecycle is first-class, not a tag convention.

## 13. What's load-bearing vs. what's local

**General (lift wholesale):**
- Frontmatter schema layered on JSON Schema Draft 07, written in YAML.
- `additionalProperties: false` + runtime tag injection.
- `summary` length contract.
- Wiki-link slug algorithm + exact/prefix resolver in both Python and TypeScript.
- Backlink derivation from typed frontmatter fields only.
- Generated `Dashboard.md` + `Index.md` with `--check` drift gates.
- One-config-drives-two-renderers (Dataview + Astro).
- `find_md_files` skip-list pattern (skip generated, skip templates, special-case directory notes).
- Append-only log file, excluded from validation/rendering.
- Two-collection Astro split for "typed cores" vs "raw co-located docs".
- Templater-style templates that prompt for required fields and stamp dates/revision.
- Slash commands codifying the ingest/cross-ref/log/regenerate cycle.
- `uv` + PEP 723 single-file scripts.
- CSS custom properties for theming + class-based dark mode.
- Status badges and archived filtering throughout.
- Pagefind annotations on note pages.

**Local to galaxy-brain (do NOT blindly copy):**
- The seven `research` subtypes and their semantics (`component`, `issue`, `pr`, `issue-roundup`, `design-problem`, `design-spec`, `dependency`) are tuned to Galaxy development workflows.
- `github_issue`/`github_pr`/`github_repo` fields and the `gh` CLI integration in `/ingest` assume a single-or-near-single GitHub-centric source ecosystem.
- The `galaxy/*` area-tag taxonomy is entirely Galaxy-specific.
- The `galaxy-primary`/`galaxy-gold` palette and the explicit Galaxy brand colors in `global.css`.
- `/ingest-gx-pr` and the `~/.galaxy-brain` symlink in `make install`.
- Naming conventions like `Component - <Name>.md`, `Issue <N> - <Title>.md`, `PR <N> - <Title>.md` (the *pattern* of "type-prefixed-filename" is general; the prefixes are not).
- Dashboard sections (`research/component`, `research/pr`, `research/dependency`, `research/issue`, `plan`, `project`) — the *structure* of a config-driven dashboard is general; the chosen sections are workflow-specific.
- The dyslexia-driven Atkinson Hyperlegible font choice is a personal accessibility default (worth keeping if same author; otherwise reconsider).

## What to borrow for the Foundry

In priority order:

1. **The frontmatter contract pattern**: JSON Schema Draft 07 in YAML + runtime tag-enum injection + `additionalProperties: false` + `allOf/if/then` for conditional requireds. Replace the `type`/`subtype` enums with Foundry-specific values; keep the structure verbatim.
2. **The two-renderer wiki-link resolver** (Python validator + TypeScript site) with identical exact-then-prefix slug semantics. This is the glue that makes `[[X]]` work uniformly.
3. **`Index.md` + `Dashboard.md` generation with `--check` drift gates** committed to git, plus a single JSON config driving both Obsidian and the static site dashboard.
4. **Two-collection Astro split** (`vault` typed + `projectFiles` passthrough) plus the `[...slug]`/`projects/[project]/[...path]` route pair. Lifts the directory-note pattern cleanly.
5. **`/ingest` slash command shape** — classify → dedup → draft via template → cross-ref → write → validate → log → regenerate. The dedup-and-cross-ref steps are what differentiate a journal from a knowledge base.
6. **`vault/log.md` append-only operations journal** excluded from validation and rendering. Near-zero cost, real auditability.
7. **PEP 723 + uv single-file Python tools** with a thin `Makefile` — no virtualenv ceremony, fully reproducible.
8. **Status lifecycle as first-class enum** with badge rendering and global `archived` filtering everywhere a list appears.
9. **Raw markdown endpoints + clipboard copy** on every note for trivial AI-agent consumption.
10. **CSS custom-property theme tokens + class-based `.dark` override**, with semantic surface/text/badge/tag tokens (rename palette; keep structure).

Gaps the Foundry should address that galaxy-brain hasn't:
- No CI gate runs `make validate`, `make check-index`, or `make check-dashboard` on push — only the Astro deploy. Easy fix.
- Body-prose wiki links don't contribute backlinks. If body links should backlink, extend `buildBacklinkMap` or pre-walk the rendered tree.
- The validator's `_resolve_wiki_link` prefix match is non-deterministic on dictionary iteration order — fine in practice but worth tightening (longest-prefix or alphabetic-first) before scaling.

# Galaxy Brain - Claude Code Instructions

## Project Overview

Obsidian vault + validation tooling for AI-generated Galaxy development notes. Notes live in `vault/`, tooling at repo root.

## Key Files

- `meta_tags.yml` - tag registry; every vault tag must appear here
- `meta_schema.yml` - JSON Schema Draft 07 (YAML syntax) defining the frontmatter contract
- `validate_frontmatter.py` - validation CLI (PEP 723 inline deps for uv)
- `test_validate_frontmatter.py` - pytest suite (52 tests)
- `Makefile` - `make validate`, `make test`, `make site-dev`, `make site-build`
- `LIBRARY_*.md` - research/planning docs about the library itself (not vault notes)
- `site/` - Astro static site rendering vault notes for GitHub Pages

## Commands

```sh
make test                          # run all tests
make test ARGS="-k pattern"        # run specific tests
make validate                      # validate vault/ frontmatter
make validate ARGS="vault/research/" # validate subdirectory
make site-dev                      # start Astro dev server
make site-build                    # build static site to site/dist/
make site-preview                  # preview production build
```

## Architecture

### Validation
- Schema in `meta_schema.yml` uses `allOf/if/then` for conditional field requirements (e.g. `type: research` + `subtype: issue` requires `github_issue`)
- Tag enum in schema is empty in the file; `validate_frontmatter.py` injects `meta_tags.yml` keys at runtime
- `additionalProperties: false` - unknown frontmatter fields are rejected
- Validation layers: JSON Schema -> date format -> wiki link format -> tag coherence (warnings)
- PyYAML parses YAML dates as `datetime.date`; `preprocess_frontmatter()` converts to ISO strings before schema validation

### Static Site (`site/`)
- Astro static site deployed to GitHub Pages at `/galaxy-brain/`
- Two Astro content collections: `vault` (typed frontmatter), `projectFiles` (no frontmatter, raw sub-files)
- Content loaded from `../vault/` via Astro content collections (`site/src/content.config.ts`)
- Tailwind CSS v4 via `@tailwindcss/vite` plugin; theme tokens in `site/src/styles/global.css`
- Dark mode: class-based toggle, auto-detects OS preference
- `@tailwindcss/typography` for markdown prose rendering
- Pages: dashboard (`index.astro`), note detail (`[...slug].astro`), project sub-file detail (`projects/[project]/[...file].astro`), tag index + tag detail (`tags/`), raw markdown endpoints (`raw/`)
- Wiki links (`[[...]]`) resolved to site URLs via `site/src/lib/wiki-links.ts`
- GitHub Actions deploys on push to `main` (`.github/workflows/deploy.yml`)

### Project Type
- Directory-based note type: `vault/projects/<name>/` with `index.md` (frontmatter) + raw sub-files (no frontmatter)
- Validator only validates `index.md`; non-index files in `projects/` are skipped by `find_md_files()`
- Project indexes render at `/projects/<name>/` with a "Project Files" listing
- Sub-files render at `/projects/<name>/<file>/` with breadcrumb navigation

## Conventions

- Notes in `vault/` must have YAML frontmatter with all base fields: `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`
- Tags are hierarchical (`research/component`); searching `research` matches subtags in Obsidian
- Wiki link fields (`parent_plan`, `related_issues`, `related_notes`) must use `[[...]]` format
- `LIBRARY_*.md` files are project meta-docs, not vault notes - they don't need frontmatter
- Validator skips `.obsidian/`, `templates/`, and non-index files in `projects/` directories

## Adding a New Note Type

1. Add type tag to `meta_tags.yml`
2. If new `type` value: add to `type.enum` in `meta_schema.yml`
3. If new `subtype`: add to `subtype.enum` in the research `allOf/if/then` block
4. If conditional fields needed: add `if/then` block to `allOf` in schema; declare properties at top level
5. Add entry to `TYPE_TAG_MAP` in `validate_frontmatter.py` for tag coherence
6. Add test cases in `test_validate_frontmatter.py`

## Adding a New Frontmatter Field

1. Add property definition to `properties` in `meta_schema.yml` (must be top-level due to `additionalProperties: false`)
2. If conditionally required: add to relevant `then.required` in `allOf`
3. If wiki link field: add `pattern: "^\\[\\[.+\\]\\]$"` in schema and entry in `WIKI_LINK_FIELDS` dict in validator
4. Add test coverage

## Tests

- Tests use real `meta_schema.yml` and `meta_tags.yml` from repo root
- Unit tests call `validate_data()` directly with dicts
- Integration tests use `validate_file()` with temp markdown files via `tmp_path`
- Prefer red-to-green: write failing test first, then fix
- Never remove tests or weaken assertions to make them pass; fix the implementation

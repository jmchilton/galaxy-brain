# Vault notes

Paths are relative to the galaxy-brain repository root; run `make` commands from there.

## Validated notes and plain documents

- Notes require `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`, and `summary`. Summaries must contain 20–160 characters. Type-specific requirements live in `meta_schema.yml` under `allOf/if/then`.
- Supported types are `research`, `plan`, `plan-section`, `concept`, `moc`, `project`, and `paper`. Research notes also require a registered `subtype`.
- `vault/projects/<name>/` and `vault/papers/<name>/` are workspaces. Only their `index.md` files are validated notes. Sibling Markdown files are plain documents and render through separate site collections.
- `vault/agents/**` and `vault/repositories/**`, including their `index.md` files, are plain documents excluded from frontmatter validation. Do not add note frontmatter to them. See `vault/agents/_shared/NOT_VAULT_NOTES.md`.
- `find_md_files()` in `validate_frontmatter.py` skips hidden paths, `templates/`, `agents/`, `repositories/`, `Dashboard.md`, `Index.md`, `log.md`, and non-index Markdown files under `projects/` and `papers/` when traversing the vault root.
- Tags are hierarchical, such as `research/component`. Tag coherence accepts a registered subtag of the expected type tag.
- `parent_plan`, `related_issues`, `related_notes`, and `related_projects` use `[[Target Name]]` links. `related_prs` accepts wiki links or integer PR numbers.

## Validation behavior

- The validator injects `meta_tags.yml` keys into the schema's initially empty tag enum.
- `additionalProperties: false` rejects unknown frontmatter fields.
- Validation checks schema, dates, wiki-link content, and tag coherence. PyYAML date values are converted to ISO strings by `preprocess_frontmatter()` before schema validation.
- Unknown tags and invalid fields are errors. Missing expected type tags and asymmetric `related_notes` backlinks are advisory warnings.
- Cross-file backlink checks run across successfully validated notes in the selected directory.

## Add or update a note

- Start from `vault/agents/gx_research/INGEST.md` for URLs/local files, or a matching Obsidian Templater template in `vault/templates/`. Do not invent frontmatter from scratch.
- Templater templates cover each current type/subtype and are excluded from validation and site collections. Obsidian users need the Templater community plugin, with `templates/` as its template folder.
- On updates to validated notes, increment `revision`, set `revised` to today's date, and preserve `created`.
- Regenerate `make index` after adding/removing notes or changing their frontmatter. Regenerate `make dashboard` after changing `dashboard_sections.json`.
- Append ingest operations to `vault/log.md`. Keep earlier entries intact.
- Before committing, run `make validate`. Errors block completion. Run `make check-index` and `make check-dashboard` after frontmatter/config changes, and the tests relevant to the change.
- Do not edit `vault/Dashboard.md` or `vault/Index.md` by hand. Change their sources and regenerate. Regenerate architecture topic views with `make architecture-views`.

## Extend the schema

When adding a note type or research subtype:

1. Register its tag in `meta_tags.yml`.
2. Add a type to `type.enum`, or a research subtype to the research conditional's `subtype.enum`, in `meta_schema.yml`.
3. Declare any new properties at the schema's top level and add conditional requirements under `allOf`.
4. Update `TYPE_TAG_MAP` in `validate_frontmatter.py` and add tests in `test_validate_frontmatter.py`.
5. Update the site's schema in `site/src/content.config.ts`, templates, catalog grouping in `generate_index.py`, and dashboard sections as applicable.

When adding a frontmatter field, declare it in top-level `properties` and add it to the relevant conditional `required` list when needed. For wiki-link fields, add the schema pattern `"^\\[\\[.+\\]\\]$"` and an entry in `WIKI_LINK_FIELDS` for custom content checks. Keep the site's schema in sync and add test coverage.

Do not weaken the schema to fit a non-conforming note. Reshape the note or deliberately extend the contract with tests.

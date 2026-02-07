# Galaxy Notes - Claude Code Instructions

## Project Overview

Obsidian vault + validation tooling for AI-generated Galaxy development notes. Notes live in `vault/`, tooling at repo root.

## Key Files

- `meta_tags.yml` - tag registry; every vault tag must appear here
- `meta_schema.yml` - JSON Schema Draft 07 (YAML syntax) defining the frontmatter contract
- `validate_frontmatter.py` - validation CLI (PEP 723 inline deps for uv)
- `test_validate_frontmatter.py` - pytest suite (52 tests)
- `Makefile` - `make validate`, `make test`
- `LIBRARY_*.md` - research/planning docs about the library itself (not vault notes)

## Commands

```sh
make test                          # run all tests
make test ARGS="-k pattern"        # run specific tests
make validate                      # validate vault/ frontmatter
make validate ARGS="vault/research/" # validate subdirectory
```

## Architecture

- Schema in `meta_schema.yml` uses `allOf/if/then` for conditional field requirements (e.g. `type: research` + `subtype: issue` requires `github_issue`)
- Tag enum in schema is empty in the file; `validate_frontmatter.py` injects `meta_tags.yml` keys at runtime
- `additionalProperties: false` - unknown frontmatter fields are rejected
- Validation layers: JSON Schema -> date format -> wiki link format -> tag coherence (warnings)
- PyYAML parses YAML dates as `datetime.date`; `preprocess_frontmatter()` converts to ISO strings before schema validation

## Conventions

- Notes in `vault/` must have YAML frontmatter with all base fields: `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`
- Tags are hierarchical (`research/component`); searching `research` matches subtags in Obsidian
- Wiki link fields (`parent_plan`, `related_issues`, `related_notes`) must use `[[...]]` format
- `LIBRARY_*.md` files are project meta-docs, not vault notes - they don't need frontmatter
- Validator skips `.obsidian/` and `templates/` directories

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

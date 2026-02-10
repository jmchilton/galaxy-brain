# Galaxy Brain

Obsidian vault of AI-generated research notes, implementation plans, and development artifacts for [Galaxy](https://github.com/galaxyproject/galaxy).

## Structure

```
galaxy-brain/
  meta_tags.yml                # allowed tag registry
  meta_schema.yml              # frontmatter JSON Schema (Draft 07, YAML syntax)
  validate_frontmatter.py      # frontmatter validation CLI
  test_validate_frontmatter.py # tests
  Makefile                     # uv-based task runner
  LIBRARY_*.md                 # research/planning docs about the library itself
  vault/                       # <- Obsidian vault root
    research/                  # research notes (components, issues, PRs)
    plans/                     # implementation plans and plan sections
    concepts/                  # reusable Galaxy concept notes
    mocs/                      # Maps of Content
    templates/                 # Templater templates (skipped by validator)
    bases/                     # Obsidian Bases views
    .obsidian/                 # Obsidian config
```

Meta files live at the repo root, outside `vault/`. Open `vault/` as the Obsidian vault root so Obsidian never indexes tooling files.

## Note Types

| `type` | `subtype` | Tag | Use when | Extra required fields |
|--------|-----------|-----|----------|-----------------------|
| `research` | `component` | `research/component` | Deep dive into a codebase area, feature, or subsystem | — |
| `research` | `issue` | `research/issue` | Analysis of a specific GitHub issue | `github_issue`, `github_repo` |
| `research` | `pr` | `research/pr` | Analysis of a specific pull request | `github_pr`, `github_repo` |
| `research` | `issue-roundup` | `research/issue-roundup` | Summary spanning multiple related issues | — |
| `research` | `design-problem` | `research/design-problem` | Cross-cutting bug or design problem spanning issues/components | — |
| `research` | `design-spec` | `research/design-spec` | Design specification or RFC-style proposal | — |
| `research` | `dependency` | `research/dependency` | Research into a project dependency (version migration, API, best practices) | — |
| `plan` | — | `plan` | Implementation plan with steps and testing strategy | `title` |
| `plan-section` | — | `plan/section` | Focused research for a specific part of a parent plan | `parent_plan` (wiki link), `section` |
| `plan` | — | `plan/followup` | Post-implementation status tracker, deviations, remaining work | `title` |
| `concept` | — | `concept` | Reusable Galaxy concept referenced by many notes | — |
| `moc` | — | `moc` | Navigation hub that organizes links, no research itself | — |

All research subtypes also require `subtype` in frontmatter. **Base fields** (required on all notes): `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`.

## Validation

Requires [uv](https://docs.astral.sh/uv/).

```sh
# validate all notes in vault/
make validate

# validate a specific directory
make validate ARGS="vault/research/"

# run tests
make test

# run specific test
make test ARGS="-k test_wiki_link"
```

The validator checks:
- **JSON Schema**: field types, enums, required fields, conditional requirements
- **Date format**: ISO 8601 (YYYY-MM-DD)
- **Wiki links**: `[[...]]` format, non-empty inner text
- **Tag coherence**: warns if tags don't include expected type tag
- **Strict mode**: unknown frontmatter fields are rejected (`additionalProperties: false`)

Tags are validated against `meta_tags.yml`. The schema is in `meta_schema.yml`.

## Library Research Docs

- `LIBRARY_OBSIDIAN_RESEARCH.md` - Obsidian best practices, folder structure, plugins, templates
- `LIBRARY_OBSIDIAN_EVAL_USE_CASE_TOOL_STATE.md` - evaluation of the plan against real notes
- `LIBRARY_FRONTMATTER_VALIDATION_RESEARCH.md` - validation tool research, schema design, implementation plan

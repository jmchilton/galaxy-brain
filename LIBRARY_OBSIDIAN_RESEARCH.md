# Obsidian Research: Galaxy Development Notes Library

Research on Obsidian best practices (2025) for building a linked knowledge base of AI-generated research notes, plans, and development artifacts for Galaxy.

## Note Type Taxonomy

For a Galaxy development library, these note types make sense:

| Type | Tag | Purpose |
|------|-----|---------|
| Research - Feature/Bug/Component | `#research/component` | Deep dives into Galaxy codebase areas |
| Research - Issue | `#research/issue` | Analysis of specific GitHub issues |
| Research - Pull Request | `#research/pr` | Analysis of specific PRs |
| Plan | `#plan` | Implementation plans |
| Plan Section | `#plan/section` | Focused research for a specific part of a plan |
| Map of Content (MOC) | `#moc` | Index/hub notes linking related notes |
| Concept | `#concept` | Reusable Galaxy concepts (e.g. "tool shed", "dataset collections") |

Each type gets its own Templater template with standardized frontmatter.

## Frontmatter / Properties

Obsidian Properties (YAML frontmatter) are the foundation for queryable metadata. Since Obsidian 1.9, properties are first-class with typed fields and a visual editor.

### Key rules
- Property names must have one type across the entire vault
- Use plural forms: `tags` not `tag`, `aliases` not `alias` (singular deprecated in 1.9+)
- Nested YAML not supported in visual editor (works in source mode only)
- Properties power search, Dataview, and the new Bases plugin

### Recommended frontmatter by note type

**Research - Component:**
```yaml
---
type: research
subtype: component
tags:
  - research/component
component: "workflow invocations"
galaxy_areas:
  - api
  - client
status: draft
created: 2025-01-15
revised: 2025-01-20
revision: 2
ai_generated: true
aliases:
  - workflow invocations research
---
```

**Research - Issue:**
```yaml
---
type: research
subtype: issue
tags:
  - research/issue
github_issue: 12345
github_repo: galaxyproject/galaxy
status: draft
created: 2025-01-15
revised: 2025-01-15
revision: 1
ai_generated: true
---
```

**Research - PR:**
```yaml
---
type: research
subtype: pr
tags:
  - research/pr
github_pr: 6789
github_repo: galaxyproject/galaxy
status: draft
created: 2025-01-15
revised: 2025-01-15
revision: 1
ai_generated: true
---
```

**Plan:**
```yaml
---
type: plan
tags:
  - plan
title: "Implement dataset collection mapping"
status: draft
created: 2025-01-15
revised: 2025-01-15
revision: 1
ai_generated: true
related_issues:
  - "[[Issue 12345]]"
unresolved_questions: 3
---
```

**Plan Section:**
```yaml
---
type: plan-section
tags:
  - plan/section
parent_plan: "[[Plan - Dataset Collection Mapping]]"
section: "API endpoint design"
status: draft
created: 2025-01-15
revised: 2025-01-15
revision: 1
ai_generated: true
---
```

### Status field values
- `draft` - initial AI generation, not yet reviewed
- `reviewed` - human has read and validated
- `revised` - human has edited/corrected
- `stale` - needs re-research (codebase changed)
- `archived` - no longer relevant

### Revision tracking
- `revision` field: integer counter, bump on each meaningful edit
- `revised` field: date of last revision
- `ai_generated`: boolean, true if initially AI-generated
- Obsidian has built-in version history (1 year) for file-level diffs

## Tags Strategy

### Hierarchical tags (recommended)
Obsidian supports nested tags. Searching `#research` matches all subtags (`#research/component`, `#research/issue`, etc.). Tags display as collapsible trees in the Tags view.

```
#research
  #research/component
  #research/issue
  #research/pr
#plan
  #plan/section
#concept
#moc
```

### Galaxy-specific content tags
```
#galaxy/api
#galaxy/client
#galaxy/lib
#galaxy/tools
#galaxy/workflows
#galaxy/datasets
#galaxy/admin
#galaxy/testing
```

### Status tags (alternative to frontmatter status)
Some prefer inline status tags over frontmatter. Both work with Dataview. Frontmatter is cleaner for structured queries; inline tags are more visible when reading.

### Best practice
- Keep tag vocabulary small and consistent
- Tags are case-insensitive for search but display first-used casing
- Prefer frontmatter `tags` property over inline `#tag` for note-type classification
- Use inline tags sparingly for content-specific markers within note body

## Links Strategy

### Maximal linking
Link aggressively between notes. For every Galaxy component, issue, PR, or concept mentioned, wrap it in `[[brackets]]` even if the note doesn't exist yet. Obsidian creates the link anyway, and the graph view shows unresolved links as opportunities.

### Link patterns for this library
- `[[Component - Workflow Invocations]]` - component research
- `[[Issue 12345]]` or `[[Issue 12345 - Short Description]]` - issue research
- `[[PR 6789]]` or `[[PR 6789 - Short Description]]` - PR research
- `[[Plan - Feature Name]]` - plans
- `[[Concept - Dataset Collections]]` - reusable concepts

### Maps of Content (MOCs)
MOCs are structural notes that serve as navigation hubs. They don't contain research themselves - they organize and contextualize links. Example MOCs:
- `MOC - Galaxy API` - links to all API-related research
- `MOC - Active Plans` - links to in-progress plans
- `MOC - Workflow System` - links to all workflow-related notes

MOCs scale better than folders for cross-cutting concerns (a note about workflow API touches both "workflows" and "API").

## Folder Structure

The repo separates the Obsidian vault from tooling/meta content. Open `vault/` as the Obsidian vault root - meta files stay out of Obsidian's index.

```
galaxy-notes/                  # git repo root
  meta_tags.yml                # tag registry (validation)
  meta_schema.yml              # frontmatter JSON Schema (validation)
  validate_frontmatter.py      # validation CLI
  LIBRARY_*.md                 # research/planning docs about the library itself
  vault/                       # <- Obsidian vault root
    .obsidian/                 # Obsidian config, plugins, themes
    templates/                 # Templater templates
    research/                  # All research notes (components, issues, PRs)
    plans/                     # Implementation plans and plan sections
    concepts/                  # Reusable Galaxy concept notes
    mocs/                      # Maps of Content
    bases/                     # .base files for Bases views
```

Keep the vault structure minimal. Over-reliance on folders creates rigid hierarchies. Tags + links + MOCs handle organization better. The note type (`type` frontmatter field) maps to the folder: `research` -> `research/`, `plan`/`plan-section` -> `plans/`, etc.

## Plugins

### Essential

**Dataview** - Treat vault as queryable database. Example queries:

```dataview
TABLE status, revised, revision
FROM #research/component
WHERE status != "archived"
SORT revised DESC
```

```dataview
LIST
FROM #plan
WHERE status = "draft"
SORT created DESC
```

```dataview
TABLE github_issue, status, revised
FROM #research/issue
WHERE contains(galaxy_areas, "api")
```

**Templater** - Dynamic templates for consistent note creation. Define templates per note type with auto-populated dates, prompted fields, etc. Can auto-insert frontmatter and scaffold note structure.

**Bases** (core plugin, new in 2025) - Native database views built into Obsidian. Creates table/card views from note properties. Faster than Dataview for simple views. Supports filters, formulas, and inline property editing. Use for dashboards like "All draft research notes" or "Plans by status."

### Recommended

**Obsidian Git** - Version control for the vault. Auto-commit, push, pull. Enables collaboration and full history beyond Obsidian's built-in 1-year version history.

**QuickAdd** - Fast note creation with macros. Set up commands like "New Issue Research" that prompts for issue number and creates note from template.

**Auto Note Mover** - Automatically file notes into correct folders based on tags/frontmatter.

**Kanban** - Visual board view for tracking plan/research status.

### GitHub Integration Options

**GitHub Tracker Plugin** - Syncs GitHub issues and PRs into vault as markdown notes with metadata. Auto-syncs on startup. Filters by assignee/reviewer.

**GitHub Tasks Plugin** - Imports issues/PRs as tasks in Dataview or Tasks format. Labels become tags.

However: for AI-generated research notes about issues/PRs, you likely want more control over content than these sync plugins provide. Better approach: use `gh` CLI or API to pull metadata, then generate rich research notes via AI separately.

### AI-Related

**Smart Connections** - Semantic search across vault. Find related notes you didn't explicitly link. Free, works offline.

**Obsidian CoPilot** - AI-assisted editing, vault-wide Q&A. Premium.

## Dataview vs. Bases

| | Dataview | Bases |
|---|---------|-------|
| Query language | DQL (SQL-like) + DataviewJS | Visual filter builder |
| Output | Tables, lists, tasks, calendars | Tables, cards |
| Inline editing | No | Yes |
| Performance | Good (can slow on huge vaults) | Instant (native) |
| Flexibility | Very high (JS escape hatch) | Growing, currently simpler |
| Maturity | Battle-tested, huge community | New (2025), evolving fast |

**Recommendation:** Use Bases for simple dashboard views (status boards, note listings). Use Dataview for complex queries (cross-referencing, computed fields, conditional logic).

## Workflow: AI-Generated Note Lifecycle

1. **Generate** - AI creates note from template with frontmatter (`status: draft`, `revision: 1`, `ai_generated: true`)
2. **Review** - Human reads, validates accuracy. Update `status: reviewed`
3. **Revise** - Human edits, corrects, adds links. Bump `revision`, update `revised` date, set `status: revised`
4. **Link** - Add to relevant MOCs, create links to related notes
5. **Maintain** - Periodically revisit. Mark `status: stale` when codebase changes invalidate content. Re-generate or manually update.

## Templater Template Examples

### Research - Component Template
```markdown
---
type: research
subtype: component
tags:
  - research/component
component: "<% tp.system.prompt("Component name?") %>"
galaxy_areas: []
status: draft
created: <% tp.date.now("YYYY-MM-DD") %>
revised: <% tp.date.now("YYYY-MM-DD") %>
revision: 1
ai_generated: true
---

# <% tp.system.prompt("Component name?") %>

## Summary

## Key Files

## Architecture

## Related
-

## Open Questions
-
```

### Research - Issue Template
```markdown
---
type: research
subtype: issue
tags:
  - research/issue
github_issue: <% tp.system.prompt("Issue number?") %>
github_repo: galaxyproject/galaxy
status: draft
created: <% tp.date.now("YYYY-MM-DD") %>
revised: <% tp.date.now("YYYY-MM-DD") %>
revision: 1
ai_generated: true
---

# Issue <% tp.system.prompt("Issue number?") %>

## Summary

## Context

## Analysis

## Related
-

## Open Questions
-
```

### Plan Template
```markdown
---
type: plan
tags:
  - plan
title: "<% tp.system.prompt("Plan title?") %>"
status: draft
created: <% tp.date.now("YYYY-MM-DD") %>
revised: <% tp.date.now("YYYY-MM-DD") %>
revision: 1
ai_generated: true
related_issues: []
unresolved_questions: 0
---

# Plan: <% tp.system.prompt("Plan title?") %>

## Goal

## Steps

## Testing Strategy

## Unresolved Questions
-

## Related
-
```

## Unresolved Questions

- Store vault in the galaxy-notes repo itself or separate? (Git-backed vault = version control + collaboration, but binary files from Obsidian config add noise)
- Use GitHub Tracker plugin for auto-syncing issue/PR metadata, or keep it manual/AI-driven for richer content?
- Single vault for all Galaxy work, or separate vaults per major area? (Single vault recommended unless performance degrades - cross-linking is the main value)
- Naming convention: `Issue 12345 - Description` vs `research/issue-12345` vs something else?
- How to handle note staleness detection systematically? (Dataview query on `revised` date? Hook into Galaxy release cycle?)

## Sources

- [Obsidian Help - Properties](https://help.obsidian.md/properties)
- [How to Structure Notes - Obsidian Forum](https://forum.obsidian.md/t/how-to-structure-notes-categories-tags-and-folders/103125)
- [Knowledge Management Best Practices 2025 - Obsibrain](https://blog.obsibrain.com/other-articles/knowledge-management-best-practices)
- [Obsidian for Personal Knowledge Management - Glukhov](https://www.glukhov.org/post/2025/07/obsidian-for-personal-knowledge-management/)
- [How to Use Tags in Obsidian](https://desktopcommander.app/blog/2026/01/29/how-to-use-tags-in-obsidian-markdown/)
- [Obsidian for Academic Work - van Krieken](https://www.emilevankrieken.com/blog/2025/academic-obsidian/)
- [PARA + Zettelkasten Template - Obsidian Forum](https://forum.obsidian.md/t/para-zettelkasten-vault-template-powerful-organization-task-tracking-and-focus-tools-all-in-one/91380)
- [Using Obsidian for Software Development Notes - Liebl](https://www.hannaliebl.com/blog/using-obsidian-for-software-development-notes/)
- [Must-Have Obsidian Plugins - Dubois](https://www.dsebastien.net/2022-10-19-the-must-have-obsidian-plugins/)
- [Dataview Documentation](https://blacksmithgu.github.io/obsidian-dataview/)
- [Dataview Beginner's Guide - Obsidian Rocks](https://obsidian.rocks/dataview-in-obsidian-a-beginners-guide/)
- [Bases Plugin Overview - Practical PKM](https://practicalpkm.com/bases-plugin-overview/)
- [Obsidian Bases Introduction - Wanderloots](https://wanderloots.com/obsidian-bases-introduction/)
- [Introduction to Bases - Obsidian Help](https://help.obsidian.md/bases)
- [GitHub Tracker Plugin](https://github.com/schaier-io/obsidian-github-tracker-plugin)
- [GitHub Tasks Plugin](https://www.obsidianstats.com/plugins/github-tasks)
- [Obsidian Git Plugin](https://github.com/Vinzent03/obsidian-git)
- [AI Notes Processing - Duggal](https://medium.com/@geetduggal/a-no-code-ish-approach-for-using-obsidian-ai-to-process-your-notes-the-way-you-want-50714ceaf9c3)
- [Organize Research Notes - Obsibrain](https://blog.obsibrain.com/other-articles/how-to-organize-research-notes)
- [Project Management in Obsidian - Obsidian Rocks](https://obsidian.rocks/how-to-manage-projects-in-obsidian/)

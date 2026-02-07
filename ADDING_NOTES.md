# Adding Notes to the Vault

How to integrate a markdown note into `vault/` with correct frontmatter, tags, and placement.

## Determine Note Type

Read the note content and pick the best match from the [Note Types table in README.md](README.md#note-types). That table shows the `type`/`subtype` frontmatter values, which tag to use, and any extra required fields beyond the base set.

Notes that don't clearly fit one type: pick the closest match. A note about a PR that's mostly component research should be `research/component` with the PR linked in `related_prs`.

## Base Fields

Every note requires:

```yaml
type: <from Note Types table>
tags: [<at least one from meta_tags.yml>]
status: draft          # draft | reviewed | revised | stale | archived
created: YYYY-MM-DD
revised: YYYY-MM-DD    # same as created for new notes
revision: 1
ai_generated: true     # false if human-written
```

## Conditional Fields

See the "Extra required fields" column in the [Note Types table](README.md#note-types). Additional details:

- `github_issue` — integer, or list of integers for multi-issue notes
- `github_repo` — e.g. `galaxyproject/galaxy`
- `github_pr` — integer
- `title` — human-readable plan name
- `parent_plan` — wiki link to parent plan: `"[[Plan - Feature Name]]"`
- `section` — what this section covers: `"API endpoint design"`

## Optional Fields

Include when relevant:

- `component` — Galaxy component name (research notes)
- `galaxy_areas` — list: `[api, client, workflows]`
- `aliases` — alternative names for Obsidian search
- `related_issues` — wiki links: `["[[Issue 12345]]"]`
- `related_prs` — wiki links or integers: `["[[PR 6789]]", 123]`
- `related_notes` — wiki links: `["[[Component - Workflows]]"]`
- `parent_feature` — parent feature area
- `unresolved_questions` — count of open questions (plans)
- `resolves_question` — which parent plan question this answers (plan-sections)
- `branch` — git branch the note was generated from

## Tags

Every tag must exist in [`meta_tags.yml`](meta_tags.yml). Notes need at minimum:

1. **One type tag** matching `type`/`subtype` (e.g. `research/component`, `plan/section`)
2. **One or more galaxy area tags** when applicable (e.g. `galaxy/workflows`, `galaxy/tools/yaml`)

Tags are hierarchical — `galaxy/tools` is the parent of `galaxy/tools/runtime`. Use the most specific tag that applies.

## Wiki Link Format

Fields that hold Obsidian links (`parent_plan`, `related_issues`, `related_notes`) must use wiki link syntax:

```yaml
parent_plan: "[[Plan - Feature Name]]"
related_issues:
  - "[[Issue 12345 - Short Description]]"
```

The `[[` and `]]` are required. Inner text must be non-empty.

## Folder Placement

| `type` | Destination |
|--------|-------------|
| `research` (any subtype) | `vault/research/` |
| `plan` | `vault/plans/` |
| `plan-section` | `vault/plans/` |
| `concept` | `vault/concepts/` |
| `moc` | `vault/mocs/` |

## File Naming

- **Research/component**: `Component - <Name>.md`
- **Research/issue**: `Issue <number> - <Short Description>.md`
- **Research/pr**: `PR <number> - <Short Description>.md`
- **Research/issue-roundup**: `<Topic> Issues.md`
- **Research/design-problem**: `<Problem Name>.md`
- **Research/design-spec**: `<Spec Name>.md`
- **Plan**: `Plan - <Title>.md`
- **Plan section**: `Plan - <Parent Title> - <Section>.md`
- **Concept**: `Concept - <Name>.md`
- **MOC**: `MOC - <Topic>.md`

## Linking

Link aggressively. Wrap every Galaxy component, issue, PR, or concept mentioned in `[[brackets]]` even if the target note doesn't exist yet.

## Validation

After adding a note, run `make validate`. See [`meta_schema.yml`](meta_schema.yml) for the full JSON Schema definition.

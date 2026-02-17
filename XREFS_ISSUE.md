# xrefs Field Design — Obsidian Compatibility Issue

## Goal

Replace `related_notes` (wiki-link-only array) with `xrefs` — a flexible cross-reference field supporting wiki links (`[[...]]`), external URLs, and optional relationship descriptions.

## What stays unchanged

- `related_issues` — array of wiki links (convenient `[[Issue 12345]]` shorthand)
- `related_prs` — array of wiki links or bare PR integers
- `parent_plan` — single wiki link

## The problem

The original design used mixed-type array items:

```yaml
xrefs:
  - "[[Component - Collection Models]]"           # bare string
  - ref: "[[Collection API]]"                      # object with...
    description: "shared data model"               # ...description
```

**Obsidian's Properties panel cannot display nested YAML objects.** This is a [long-standing feature request](https://forum.obsidian.md/t/properties-bases-support-multi-level-yaml-mapping-of-mappings-nested-attributes/63826) — Properties only supports flat types (text, number, checkbox, date, list-of-text, list-of-links).

- String-only arrays render fine in Properties
- Object items silently break the Properties display
- Mixed arrays (strings + objects) are worst case
- YAML is always preserved in source view; Dataview can query any structure

## Options

### Option A: Inline description with separator

```yaml
xrefs:
  - "[[Component - Collection Models]]"
  - "[[Collection API]] | shared data model"
  - "https://docs.galaxyproject.org/ | official docs"
```

- Stays a flat string array — Properties panel works
- Parse `|` separator in validator and site renderer
- Wiki link pattern needs updating: `^(\[\[.+\]\]|https?://.+)(\s*\|\s*.+)?$`
- Description is everything after first ` | `
- Downside: slightly unusual convention, `|` has meaning in YAML (block scalar indicator) so must always be quoted

### Option B: Keep object form, accept Properties limitation

```yaml
xrefs:
  - "[[Component - Collection Models]]"
  - ref: "[[Collection API]]"
    description: "shared data model"
```

- Cleanest YAML semantics
- Properties panel won't display object items (shows blank or garbled)
- Source view still works, Dataview still works, our validator/site still works
- Description usage is rare — most xrefs would be bare strings that display fine
- Notes with only string xrefs still render in Properties

### Option C: Drop descriptions entirely

```yaml
xrefs:
  - "[[Component - Collection Models]]"
  - "https://docs.galaxyproject.org/"
```

- Simplest — flat string array, no parsing needed
- Properties panel works perfectly
- Loses the relationship context feature entirely
- Could always add descriptions later via Option A or B

### Option D: Parallel arrays

```yaml
xrefs:
  - "[[Component - Collection Models]]"
  - "https://docs.galaxyproject.org/"
xref_descriptions:
  - ""
  - "official docs"
```

- Properties-compatible (two flat arrays)
- Fragile — arrays must stay in sync
- Ugly and error-prone
- Not recommended

## Recommendation

**Option A (inline separator)** balances Obsidian compatibility with description support. The `|` convention is easy to explain and implement. Most xrefs won't have descriptions so they're just plain strings.

If descriptions aren't important enough to justify the complexity, **Option C** is the cleanest path.

## Current vault usage

5 notes use `related_notes` today — all are simple wiki link arrays with no descriptions:

| File | Current `related_notes` |
|------|------------------------|
| `Component - Collection API.md` | `[[Component - Collection Models]]` |
| `Component - Workflow Editor Terminal Tests.md` | `[[Component - Workflow Editor Terminals]]` |
| `PR 19377 - Collection Types and Wizard UI.md` | `[[Component - Dataset Collections]]` |
| `Component - Collections - Sample Sheets Backend.md` | 3 wiki links |
| `Component - Collections - Paired or Unpaired.md` | 3 wiki links |

All would migrate unchanged since they have no descriptions.

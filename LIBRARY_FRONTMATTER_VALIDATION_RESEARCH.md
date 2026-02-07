# YAML Frontmatter Validation: Research & Plan

Research on tools and approaches for validating YAML frontmatter in markdown notes (2025), with a concrete plan for the Galaxy notes library.

---

## Tool Landscape

### Schema Languages

| Approach | Schema format | Conditional logic | Ecosystem | Maturity |
|---|---|---|---|---|
| **JSON Schema** (Draft 07+) | JSON/YAML | `if/then/else`, `allOf`, `oneOf` | Massive - editors, CI, every language | Gold standard |
| **Yamale** | YAML with validator functions | Limited - no conditionals | Python only | Stable, ~750 stars |
| **pykwalify** | YAML (custom dialect) | Basic `sequence`/`mapping` rules | Python only | Mature but slow development |
| **StrictYAML** | Python code | Full Python expressiveness | Python only | Opinionated, safe |

**JSON Schema wins** for our use case: we need conditional validation (e.g. `type: research` + `subtype: issue` requires `github_issue`), the schema is portable across tools, and editor support is free.

### Validation Runtimes (Python)

| Library | Role | Notes |
|---|---|---|
| **python-frontmatter** | Parse `.md` -> extract YAML dict + content | De facto standard. `pip install python-frontmatter` |
| **jsonschema** | Validate dict against JSON Schema | Reference implementation. `pip install jsonschema` |
| **PyYAML** / **ruamel.yaml** | Low-level YAML parsing | Already deps of python-frontmatter |

### Validation Runtimes (Other)

| Tool | Language | Notes |
|---|---|---|
| **pajv** (Polyglottal JSON Schema Validator) | Node CLI | `pajv validate -s schema.json -d data.yaml` |
| **ndumas/frontmatter-validator** | Go | Proof-of-concept, parses md + validates YAML against JSON Schema |
| **giantswarm/frontmatter-validator** | Go | Hugo-specific, configurable per-directory rules |
| **GrantBirki/json-yaml-validate** | GitHub Action | CI-native, supports JSON Schema for YAML files |
| **yaml-language-server** | LSP (any editor) | JSON Schema association via `$schema` or config. VS Code + Zed support. |

### Editor Integration

- **VS Code**: RedHat YAML extension applies JSON Schema to `.yaml` files. Frontmatter-in-`.md` not yet supported (open issue).
- **JetBrains**: Native YAML schema validation in 2025.x IDEs. Same limitation for embedded frontmatter.
- **yaml-language-server**: LSP-based, works in any LSP-capable editor. Doesn't handle frontmatter extraction natively.

**Bottom line**: Editor-based validation works for standalone `.yaml` schema files but none natively validate frontmatter embedded in `.md`. A CLI validator is needed.

---

## Recommended Approach: Python + JSON Schema

### Why

1. **JSON Schema** is the only schema language expressive enough for our conditional field requirements
2. **python-frontmatter** cleanly extracts YAML from markdown
3. **jsonschema** is the reference Python implementation, well-maintained
4. Our `meta_tags.yml` is already YAML - easy to load and inject as enum values
5. Python is natural for Galaxy ecosystem
6. Script can run as CLI, pre-commit hook, or CI check
7. JSON Schema file doubles as documentation of the frontmatter contract

### Architecture

```
galaxy-notes/                  # git repo root
  meta_tags.yml                # tag registry (validation)
  meta_schema.yml              # frontmatter JSON Schema (validation)
  validate_frontmatter.py      # validation CLI
  LIBRARY_*.md                 # research/planning docs about the library itself
  vault/                       # <- Obsidian vault root
    .obsidian/                 # Obsidian config
    templates/                 # Templater templates
    research/                  # research notes
    plans/                     # plans + plan sections
    concepts/                  # concept notes
    mocs/                      # Maps of Content
    bases/                     # .base files
```

Meta files (`meta_tags.yml`, `meta_schema.yml`, `validate_frontmatter.py`, `LIBRARY_*.md`) live at the repo root, outside the vault. Obsidian opens `vault/` as its root so it never indexes tooling files. The validator targets `vault/` by default.

The schema file uses YAML syntax (valid JSON Schema, just written in YAML for readability - common practice). The validator loads `meta_tags.yml` to dynamically build the `enum` array for tags validation, then merges it into the schema before validating each note.

---

## Plan

### Step 1: Write `meta_schema.yml` (JSON Schema in YAML)

Define the frontmatter schema with:

**Base fields (all notes):**
- `type` - required, enum: `[research, plan, plan-section, concept, moc]`
- `tags` - required, array of strings, each item enum from `meta_tags.yml` keys
- `status` - required, enum: `[draft, reviewed, revised, stale, archived]`
- `created` - required, date string
- `revised` - required, date string
- `revision` - required, integer >= 1
- `ai_generated` - required, boolean

**Conditional fields (via `if/then`):**
- If `type: research`:
  - `subtype` required, enum: `[component, issue, pr, issue-roundup, design-problem, design-spec]`
  - `component` optional string
  - `galaxy_areas` optional array of strings
- If `type: research` + `subtype: issue`:
  - `github_issue` required (integer or list of integers)
  - `github_repo` required string
- If `type: research` + `subtype: pr`:
  - `github_pr` required integer
  - `github_repo` required string
- If `type: plan`:
  - `title` required string
  - `related_issues` optional array
  - `unresolved_questions` optional integer
  - `parent_feature` optional string
- If `type: plan-section`:
  - `parent_plan` required string (wiki link)
  - `section` required string
  - `resolves_question` optional integer

**Strict mode**: `additionalProperties: false` - unknown fields are rejected. All known optional fields must be declared in the schema even if not required. This catches typos and drift early. (Can be relaxed to `true` later if needed.)

**Known optional fields** (declared in schema, never required):
- `aliases` - array of strings
- `related_prs` - array of strings/integers
- `related_notes` - array of wiki link strings
- `branch` - string
- `parent_feature` - string

**Wiki link fields**: Fields that hold Obsidian wiki links (`parent_plan`, `related_issues`, `related_notes`) are validated with JSON Schema `pattern: "^\\[\\[.+\\]\\]$"` for basic format. Custom Python validation adds richer checks (link target naming conventions, non-empty inner text).

### Step 2: Write `validate_frontmatter.py`

Script flow:
1. Load `meta_tags.yml`, extract keys as allowed tag list
2. Load `meta_schema.yml`, inject tag enum into the `tags.items.enum` path
3. Walk directory for `*.md` files
4. For each file:
   a. Extract frontmatter via `python-frontmatter` - **error if no frontmatter found**
   b. Validate against JSON Schema (field types, enums, required fields, conditionals)
   c. Run custom validators: wiki link format checks on `parent_plan`, `related_issues`, `related_notes` (verify `[[...]]` pattern, non-empty inner text, naming convention hints)
5. Report errors with filename + specific violation
6. Exit non-zero if any failures

Custom validators (beyond JSON Schema):
- **Wiki link format**: verify strings match `[[Inner Text]]`, inner text is non-empty, warn if link target doesn't follow naming conventions (`Plan - ...`, `Issue ...`, etc.)
- **Tag coherence**: warn if `tags` doesn't include at least one type tag matching `type`/`subtype` (e.g. a `type: research, subtype: issue` note should have `research/issue` in tags)

CLI interface:
```
python validate_frontmatter.py [directory=vault/] [--schema meta_schema.yml] [--tags meta_tags.yml]
```

### Step 3: Test red-to-green

Write test cases before implementation:
- Valid note of each type (research/component, research/issue, plan, plan-section, concept, moc)
- `github_issue` as single int -> valid
- `github_issue` as list of ints -> valid
- Missing required field -> error
- Invalid tag not in meta_tags.yml -> error
- Invalid status value -> error
- Missing conditional field (research/issue without github_issue) -> error
- Unknown field not in schema -> error (additionalProperties: false)
- File with no frontmatter -> error
- Wiki link field with valid `[[...]]` -> valid
- Wiki link field with bare string (no brackets) -> error
- Wiki link field with empty inner text `[[]]` -> error
- Tags missing type tag matching type/subtype -> warning

Use pytest with parametrize for the matrix.

### Step 4: Integrate with workflow

Options (not mutually exclusive):
- **CLI**: `python validate_frontmatter.py vault/` for ad-hoc checks
- **Pre-commit hook**: validate changed `.md` files on commit
- **CI**: GitHub Action on push to validate all notes
- **AI generation**: validator runs after AI generates a note, before writing to disk

---

## Schema Sketch

```yaml
# meta_schema.yml (JSON Schema Draft 07 in YAML syntax)
$schema: "http://json-schema.org/draft-07/schema#"
title: "Galaxy Notes Frontmatter"
type: object
required: [type, tags, status, created, revised, revision, ai_generated]

properties:
  type:
    type: string
    enum: [research, plan, plan-section, concept, moc]
  tags:
    type: array
    items:
      type: string
      enum: []  # injected at runtime from meta_tags.yml
    minItems: 1
  status:
    type: string
    enum: [draft, reviewed, revised, stale, archived]
  created:
    type: string
    format: date
  revised:
    type: string
    format: date
  revision:
    type: integer
    minimum: 1
  ai_generated:
    type: boolean
  subtype:
    type: string
  component:
    type: string
  galaxy_areas:
    type: array
    items:
      type: string
  github_issue:
    oneOf:
      - type: integer
      - type: array
        items:
          type: integer
  github_pr:
    type: integer
  github_repo:
    type: string
  title:
    type: string
  parent_plan:
    type: string
    pattern: "^\\[\\[.+\\]\\]$"  # wiki link format
  section:
    type: string
  parent_feature:
    type: string
  related_issues:
    type: array
    items:
      type: string
      pattern: "^\\[\\[.+\\]\\]$"  # wiki link format
  related_prs:
    type: array
    items:
      oneOf:
        - type: string
          pattern: "^\\[\\[.+\\]\\]$"
        - type: integer
  related_notes:
    type: array
    items:
      type: string
      pattern: "^\\[\\[.+\\]\\]$"  # wiki link format
  unresolved_questions:
    type: integer
  resolves_question:
    type: integer
  aliases:
    type: array
    items:
      type: string
  branch:
    type: string

allOf:
  # research notes require subtype
  - if:
      properties:
        type: { const: research }
      required: [type]
    then:
      required: [subtype]
      properties:
        subtype:
          enum: [component, issue, pr, issue-roundup, design-problem, design-spec]

  # research/issue requires github_issue + github_repo
  - if:
      properties:
        type: { const: research }
        subtype: { const: issue }
      required: [type, subtype]
    then:
      required: [github_issue, github_repo]

  # research/pr requires github_pr + github_repo
  - if:
      properties:
        type: { const: research }
        subtype: { const: pr }
      required: [type, subtype]
    then:
      required: [github_pr, github_repo]

  # plan requires title
  - if:
      properties:
        type: { const: plan }
      required: [type]
    then:
      required: [title]

  # plan-section requires parent_plan + section
  - if:
      properties:
        type: { const: plan-section }
      required: [type]
    then:
      required: [parent_plan, section]

  # NOTE: Set to true to allow unknown fields for forward-compatibility.
  # Strict mode (false) is preferred to catch typos and schema drift early.
additionalProperties: false
```

---

## Resolved Questions

- **`github_issue` int vs list**: Allow both via `oneOf` in schema. Single int for single-issue notes, list of ints for multi-issue notes.
- **Wiki link validation**: Two layers. JSON Schema `pattern: "^\\[\\[.+\\]\\]$"` catches bare strings missing brackets. Custom Python validator adds richer checks (empty inner text, naming convention warnings).
- **Type tag coherence**: Custom validator warns (not errors) if `tags` doesn't include a type tag matching `type`/`subtype`. E.g. `type: research, subtype: issue` should have `research/issue` in tags.
- **Missing frontmatter**: Error. Every `.md` file in the vault must have frontmatter.
- **Additional properties**: `false` (strict). Unknown fields are rejected to catch typos and drift. Code comment documents how to relax to `true`.

## Sources

- [Validating YAML Frontmatter with JSONSchema - ndumas](https://ndumas.com/2023/06/validating-yaml-frontmatter-with-jsonschema/)
- [Schema Validation for YAML - JSON Schema Everywhere](https://json-schema-everywhere.github.io/yaml)
- [python-frontmatter - PyPI](https://pypi.org/project/python-frontmatter/)
- [python-frontmatter - GitHub](https://github.com/eyeseast/python-frontmatter)
- [jsonschema - PyPI](https://pypi.org/project/jsonschema/)
- [Yamale - GitHub](https://github.com/23andMe/Yamale)
- [pykwalify - GitHub](https://github.com/Grokzen/pykwalify)
- [JSON Schema - Enumerated Values](https://json-schema.org/understanding-json-schema/reference/enum)
- [JSON Schema - Conditional Subschemas](https://json-schema.org/understanding-json-schema/reference/conditionals)
- [GrantBirki/json-yaml-validate - GitHub Action](https://github.com/GrantBirki/json-yaml-validate)
- [Validate YAML in Python with Schema - Villazon](https://www.andrewvillazon.com/validate-yaml-python-schema/)
- [giantswarm/frontmatter-validator - GitHub](https://github.com/giantswarm/frontmatter-validator)

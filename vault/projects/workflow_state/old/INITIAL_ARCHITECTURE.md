# Initial Architecture

Initial sketch of the Galaxy Workflow Foundry's architecture, anchored on the **physical file layout** of the foundry repo and on the structural conventions borrowed from galaxy-brain (see `COMPONENT_GALAXY_BRAIN.md`). Working premise: organize the data well — typed frontmatter, registered tags, wiki-linked references, generated indexes — and the skills, validation, and rendering fall out naturally.

These are sketches, not specs. Layouts and component edges will move as we walk concrete Molds end-to-end and as ingestion/casting tooling lands. Where galaxy-brain has a battle-tested pattern that maps cleanly, the Foundry adopts it verbatim; where the Foundry's purpose differs (it's more targeted, action-oriented, and grounded in the IWC corpus), the pattern is reshaped or replaced.

The Foundry has **no runtime or content dependency on galaxy-brain**. Galaxy-brain is design influence, not an upstream.

## 1. Component map

External:
- **IWC corpus** — the canonical Galaxy workflow corpus at `https://github.com/galaxyproject/iwc`. Pattern pages cite IWC workflows by URL (optionally pinned to commit SHA per citation). Not mirrored into the Foundry; not a build-time dependency. `workflow-fixtures/` is an authoring aid in the user's lap, not a Foundry input. See `INITIAL_CORPUS_INGESTION.md`.
- **gxwf** — design-time CLI; called by Molds (and by validation tooling) for schema validation, tool search/discovery, conversion. TS and Python implementations with a shared interface. Lives in its own repo(s).
- **Planemo** — runtime CLI; executes Galaxy and CWL workflows. Used by `run-workflow-test` and `debug-*-workflow-output` Molds at cast skill runtime, not by the Foundry directly.

Foundry-internal (in the `foundry/` repo):
- **Pattern pages** — Foundry reference content (collection manipulation, tabular, conditional, custom-tool authoring, …). Hand-authored. Wiki-linked from Molds. **IWC is referenced by URL in pattern bodies**, not mirrored — see `INITIAL_CORPUS_INGESTION.md` for the deconstruction.
- **CLI manual pages** — per-command/subcommand reference content for the CLIs Molds wrap (`gxwf`, `planemo`, …). Hand-authored or seeded from `--help` then humanized. Wiki-linked from per-action Molds (e.g., `validate-with-gxwf` → `cli/gxwf/validate`) and aggregated by whole-CLI Molds (`gxwf-cli`, `planemo-cli`). Cast to JSON sidecars, not inlined as prose.
- **Research / reference notes** — background syntheses (e.g., Nextflow testing, CWL conformance) that aren't actions and aren't Galaxy patterns. Use galaxy-brain's `research/component` type, carried forward.
- **Molds** — directory-per-Mold (`molds/<name>/`), with `index.md` source artifact, `eval.md` evaluation plan, optional companions. Authored as **typed reference manifests** (frontmatter declares typed references to patterns, manpages, schemas, prompts, examples) with a procedural body skeleton.
- **Schemas (Mold IO)** — JSON Schema Draft 07 files declaring Mold input/output shapes. Lives in `schemas/` as a non-content artifact tree (not vault notes). Per-source summary schemas are one family inside it; over time, every Mold that has structured IO will contribute schemas here.
- **Frontmatter schema** — `meta_schema.yml`, JSON Schema Draft 07 in YAML, contract for content notes. Distinct from `schemas/` (Mold IO).
- **Tag registry** — `meta_tags.yml`, controlled vocabulary injected into the schema at validate time.
- **Cast skills** — produced by casting from Molds. Per-target output layout under `casts/<target>/<name>/`.
- **Tooling** — TypeScript scripts run via `tsx` (or compiled): validation, ingestion, casting, generators. One `package.json`; no Python in the toolchain.
- **Slash commands** — `.claude/commands/*.md`, checked into the repo, codify the agent workflows.
- **Static site** — Astro renderer over the foundry's content collections, deployed to GitHub Pages.

Consumers (external):
- **Harnesses** — hand-authored orchestration that consumes cast skills. Live in their own repos. The Foundry produces the cast skills they load.
- **Web applications** — consume `web`-target casts.

## 2. Concepts and vocabulary

Cribs galaxy-brain's vocabulary where it carries (Note, Type, Subtype, Tag, Wiki link, Log, Slash command), and adds Foundry-specific terms. Authoritative term definitions live in `GLOSSARY.md`; this section is the architectural picture.

- **Note** — a single `.md` file with frontmatter under the foundry's content root. Identity = filename stem, used as the wiki-link target.
- **Type** — top-level kind of note (`type:` in frontmatter): `mold | pattern | cli-command | pipeline | research`.
- **Subtype** — second-level discriminator. Used for `research` (carries forward from galaxy-brain: `component | design-problem | design-spec`) and potentially for `mold` (e.g., source-summarization vs. tool work — open question).
- **Tag** — controlled hierarchical label declared in `meta_tags.yml`. Two roles: classify the note's kind (note-type tags like `mold`, `pattern`, `research/component`) and classify subject area (e.g., `iwc/<category>` for IWC domain coverage; further subject-area families bloom as content lands — see §4).
- **Mold** — `content/molds/<slug>/index.md`. Directory-based note (per galaxy-brain's `project` pattern): `index.md` is the only frontmatter-bearing file; siblings (`eval.md`, `examples/`, possibly `casting-hints.md`) ride along verbatim. Content shape: typed reference manifest in frontmatter + procedural body skeleton.
- **Pattern** — single `.md` under `content/patterns/`. Reference content. IWC citations live in the body as URLs; see `INITIAL_CORPUS_INGESTION.md`. Wiki-linked from Molds.
- **CLI command** — single `.md` under `content/cli/<tool>/<cmd>.md` (e.g., `content/cli/gxwf/tool-search.md`, `content/cli/planemo/test.md`). Reference content describing one CLI command/subcommand: synopsis, args, flags, examples, exit codes, output shape, error patterns, gotchas. Wiki-linked from Molds. Cast to a JSON sidecar (not inlined as prose) by casting's `cli-command`-kind dispatch.
- **Pipeline** — single `.md` under `content/pipelines/`. Ordered sequence of phases that compose into a harness journey (e.g., `nextflow-to-galaxy.md`, `paper-to-galaxy.md`). **Dual purpose**: (a) build artifact — names the Molds a harness will orchestrate; (b) navigation primitive — renders as a "subway map" / journey index over the KB. Each phase is a `mold` reference, a `[loop]`-flagged Mold, or a `[branch]`-flagged routing step (not a Mold; harness-level orchestration — binary branches with fallthrough, or N-step fallback chains). Other inline harness annotations (e.g., `[gate]` for an approval / scope-confirmation checkpoint) will be coined when they first surface as inline phases; the set is open and not pre-enumerated. Pipelines are *not* cast; they are referenced content. The Mold inventory invariant — "Molds = union of pipeline phases" — is machine-checked: every phase resolves to a Mold (or is explicitly a non-Mold annotation like `[branch]`), and Molds with no pipeline membership stand out.
- **Cast** / **Casting** / **Cast skill** / **Cast target** — per `GLOSSARY.md`. The cast directory tree (`casts/<target>/<name>/`) is generated from Molds, committed to the repo, and skipped by the validator.
- **Wiki link** — Obsidian-flavored `[[Target]]`. First-class in both frontmatter (typed fields like `parent_pattern`, `related_patterns`, `related_notes`) and body prose (resolved by a remark plugin in the site).
- **Log** — `content/log.md`, append-only journal of foundry operations (`ingest`, `cast`, planned `lint`, `query`). Excluded from validator and site collection.

Note: galaxy-brain's `concept` and `moc` types are not carried over. The Foundry's content types already aggregate references — Molds aggregate patterns/CLI/schemas/examples, Pipelines aggregate Molds in order, Patterns aggregate IWC URLs and link out to companion Molds. Each is a focused MOC. A separate "navigation hub note" type would be a fourth aggregation surface without any content the others can't already host.
- **Slash command** — repo-checked-in agent workflow under `.claude/commands/` (e.g., `/draft-mold`, `/draft-pattern`, `/cast`).

Note: the content root is `content/` (not galaxy-brain's `vault/`). The Foundry isn't an Obsidian vault by intent — `content/` is the Astro idiom and reads accurately to a new contributor.

## 3. Note types and subtypes

Source of truth: `meta_schema.yml` `type.enum` and the `allOf/if/then` block; `meta_tags.yml` for the matching tag.

| `type` | `subtype` | Required-extra | Tag(s) | Directory |
|---|---|---|---|---|
| `mold` | — | `name`, `axis` | `mold` | `content/molds/<slug>/index.md` only |
| `pattern` | — | `title` | `pattern` (+ optional `iwc/*`) | `content/patterns/` |
| `cli-command` | — | `tool`, `command` | `cli-reference` (+ `cli/<tool>`) | `content/cli/<tool>/` |
| `pipeline` | — | `title`, `phases` | `pipeline` (+ optional `source/*`, `target/*`) | `content/pipelines/` |
| `research` | `component` | (base + `subtype`) | `research/component` | `content/research/` |
| `research` | `design-problem` | (base + `subtype`) | `research/design-problem` | `content/research/` |
| `research` | `design-spec` | (base + `subtype`) | `research/design-spec` | `content/research/` |

`mold` has a **directory-placement contract** enforced by the validator's `findMdFiles` (sibling `.md` files in `content/molds/<slug>/` are skipped). The pattern is lifted from galaxy-brain's `project` rule but the Foundry doesn't carry forward `project` itself — `docs/` holds long-form design docs and Mold is the only directory-note type.

`cli-command` notes are *not* directory-based — each command is a flat single file. The two-level `content/cli/<tool>/<cmd>.md` directory structure is for organization, not directory-note semantics. Slug for wiki-link resolution: `<tool>-<cmd>` or namespaced as `cli/<tool>/<cmd>` — TBD when the resolver shared module is updated; see §7.

The `research` subtype list is intentionally narrower than galaxy-brain's seven. The Foundry expects most "issue/PR research" to live in galaxy-brain or upstream; the Foundry keeps `component`, `design-problem`, `design-spec` for self-design notes plus background syntheses (e.g., the existing `COMPONENT_NEXTFLOW_WORKFLOW_TESTING.md` lands as a `research/component` note).

## 4. Tag system

`meta_tags.yml` is a flat YAML dict whose **keys** are the entire allowed tag vocabulary; each value is `{ description: "..." }`. Hierarchy is purely textual (slash-delimited). Examples:

```yaml
mold:
  description: "Mold note (source artifact for casting)"
pattern:
  description: "Pattern reference page (Galaxy workflow construction patterns)"
iwc/variant-calling:
  description: "Variant-calling workflows (DNA-seq, somatic, germline)"
iwc/rna-seq:
  description: "RNA-seq quantification, splicing, differential expression"
```

Validation injects the registry keys into the schema at runtime (`scripts/lib/schema.ts:loadTags` / `loadSchema`), so `meta_schema.yml`'s tag enum stays empty on disk. Vocabulary changes touch one file; the schema stays static. Pattern lifted from galaxy-brain — the separation is load-bearing.

Tag families:
- **Note-type tags** (`mold`, `pattern`, `cli-reference`, `pipeline`, `research/*`) — every note carries exactly one. Coherence-checked.
- **`iwc/*` (IWC domain coverage)** — zero or more on patterns and Molds; the one subject-area family committed for v1. Hand-maintained vocabulary; seeded once from current IWC categories. Drives the `iwc-overview.md` aggregation page (§8) and `tags/iwc/<category>` browse pages. See `INITIAL_CORPUS_INGESTION.md`.
- **`cli/*` (CLI affiliation)** — every `cli-command` note carries `cli/<tool>` (e.g., `cli/gxwf`, `cli/planemo`). Drives per-tool browse pages and the rollup queries the whole-CLI Molds use to enumerate their references.
- **Source/target/tool axis tags** (`source/paper`, `source/nextflow`, `source/cwl`, `target/galaxy`, `target/cwl`, `tool/gxwf`, `tool/planemo`) — for Molds. Whether these graduate into typed frontmatter fields or stay as tags is an open question; tags are cheap to start with.

**Subject-area tags beyond `iwc/*` are deferred.** Galaxy-brain's `galaxy/*` family (Galaxy code/feature areas — collections, tools, conditionals) is *not* committed to up front. The kinds of knowledge the Foundry will hold (background research like `COMPONENT_NEXTFLOW_WORKFLOW_TESTING`, gxformat2 syntax notes, custom-tool-authoring detail, etc.) haven't been catalogued yet; locking in a subject-area taxonomy before content lands is premature. Tag families bloom as patterns surface real cross-cutting needs.

Coherence check (`TYPE_TAG_MAP` + `validate_tag_coherence`) emits a *warning* (not error) when a note's `(type, subtype)` doesn't carry its expected note-type tag. Hierarchy-aware: `plan/section` satisfies `plan`.

## 5. Frontmatter schema

`meta_schema.yml` is JSON Schema Draft 07 written in YAML. Adopted wholesale from galaxy-brain.

**Base required (everywhere)**: `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`, `summary`.

- `status` enum: `draft | reviewed | revised | stale | archived`. Drives badge rendering and `archived` filtering throughout the site.
- `summary`: `string`, `minLength: 20`, `maxLength: 160` — forced compression. Powers `Index.md`, dashboard tooltips, and link previews.
- `revision`: `integer >= 1`; bumped by hand on every edit.
- `created` / `revised`: ISO date strings (advisory `format: date`; real validation in a separate date pass).
- `tags`: array, `minItems: 1`, items enum injected at runtime.
- `ai_generated`: boolean.

**Conditional fields** declared at top level (must be, due to `additionalProperties: false`) and gated by `allOf/if/then`. Foundry-specific blocks beyond the galaxy-brain set:

```yaml
- if: { properties: { type: { const: mold } }, required: [type] }
  then: { required: [name, axis] }
- if: { properties: { type: { const: pattern } }, required: [type] }
  then: { required: [title] }
- if: { properties: { type: { const: cli-command } }, required: [type] }
  then: { required: [tool, command] }
- if: { properties: { type: { const: pipeline } }, required: [type] }
  then: { required: [title, phases] }
```

**Foundry-specific field types**:
- `axis`: enum `[source-specific, target-specific, tool-specific, generic]` (Mold).
- `source`: enum `[paper, nextflow, cwl]` (Mold, when `axis` includes source-specific).
- `target`: enum `[galaxy, cwl, web, generic]` (Mold or cast-related; when applicable).
- `tool`: enum `[gxwf, planemo, ...]` (Mold when tool-specific; required on `cli-command`).
- `command`: string (required on `cli-command`; may be dotted for subcommands, e.g., `tool-search` or `workflow.test`).
- `phases`: array (required on `pipeline`). Each item is one phase. Sketch shape (lock in after first 2-3 pipelines lift from `INITIAL_HARNESS_PIPELINES.md`):

  ```yaml
  phases:
    - mold: "[[summarize-nextflow]]"          # Mold-shaped phase
    - mold: "[[implement-galaxy-tool-step]]"
      loop: true                              # [loop] — runs per workflow step
    - branch: discover-or-author              # [branch] — routing, not a Mold
      branches:
        - "[[discover-shed-tool]]"
        - fallthrough: "[[author-galaxy-tool-wrapper]]"
    - branch: test-data-resolution
      chain:
        - "[[paper-to-test-data]]"
        - "[[find-test-data]]"
        - user-supplied                       # terminal fallback
  ```

  Each phase is exactly one of: a `mold` Mold-reference (optionally `loop: true`), or a `branch` orchestration step with a named pattern (`discover-or-author`, `test-data-resolution`, …) and its own shape. Wiki links inside `branch` blocks are resolved by the same validator pass as Mold-shaped phases.

  Other inline phase kinds — e.g., `gate` for an approval / scope-confirmation checkpoint — are coined when they first appear inline. The phase-kind set is **open**; we don't pre-enumerate. `branch` and `gate` are unrelated behaviors and don't share an umbrella.

**Mold = typed reference manifest.** Beyond the wiki-link fields below, a Mold's frontmatter declares typed references *by reference kind* (sketch — exact field shape pending MOLD_SPEC after a couple of walked Molds):

- `patterns` — wiki links into `content/patterns/`. Cast: LLM-condensed.
- `cli_commands` — wiki links into `content/cli/<tool>/`. Cast: cast to JSON sidecar by per-action Molds; or rolled up wholesale by whole-CLI Molds (`gxwf-cli`).
- `input_schemas` / `output_schemas` — typed *path* arrays (not wiki links) into `schemas/*.schema.json`. Cast: copied verbatim into the cast bundle's `references/schemas/`.
- `prompts` — wiki links into `content/prompts/` (new; deferred until first Mold needs it). Cast: inlined verbatim, no LLM rewrite.
- `examples` — typed path arrays into `content/molds/<slug>/examples/` or shared `content/examples/`. Cast: copied verbatim.

The validator resolves each kind with its own check (slug-resolves for wiki-link kinds; file-exists + JSON-Schema-parseable for `input_schemas` / `output_schemas`; etc.). The casting tool dispatches per kind — see `INITIAL_COMPILATION_PIPELINE.md`.

**Wiki-link frontmatter fields** (regex `^\[\[.+\]\]$`):
- `parent_pattern` (single, optional).
- `related_notes` (array).
- `related_patterns` (array).
- `related_molds` (array; flagged as smell on Molds — see Open questions).

No exemplar-related fields. IWC workflows are referenced by URL in pattern bodies, not as typed frontmatter (see `INITIAL_CORPUS_INGESTION.md`).

**Strict mode**: `additionalProperties: false`. Every conditional field declared at top level. Carried from galaxy-brain.

## 6. Validation pipeline

`scripts/validate.ts` is the validator entry point, runnable via `tsx scripts/validate.ts` (or compiled). Dependencies: **Ajv** (JSON Schema Draft 07), **gray-matter** (frontmatter parse), **js-yaml** (load schema + tag registry). Same shape as galaxy-brain's `validate_frontmatter.py`, ported to TS.

Layered validation (`validateData` orchestrates):
1. **`preprocessFrontmatter`** — normalize parsed dates (gray-matter / js-yaml may produce `Date` objects) to ISO strings before schema check.
2. **`validateSchema`** — Ajv compiled against the schema with tag enum injected at load time.
3. **`validateDates`** — second pass on `created` / `revised` via strict ISO parse.
4. **`validateWikiLinks`** — regex-checks the inner text of `[[...]]` for whitespace-only payloads.
5. **`validateTagCoherence`** — *warning* when `(type, subtype)` doesn't carry its expected tag.
6. **`validateBidirectionalRelatedNotes`** (cross-file) — builds slug→file map; warns on asymmetric `related_notes` links.
7. **`validateIwcTags`** (Foundry-specific) — every `iwc/<category>` tag used in a note is declared in `meta_tags.yml`. Same enforcement as the existing tag pipeline; no separate mechanism.
8. **`validateMoldRefs`** (Foundry-specific) — every Mold's typed references resolve, per kind:
   - `patterns`, `cli_commands`, `prompts` — slug resolves to a content note of the expected type.
   - `input_schemas` / `output_schemas` — file exists in `schemas/`, parses as JSON Schema Draft 07.
   - `examples` — path exists.
   Failures error. The per-kind dispatch here is the static-validation analog of casting's per-kind dispatch.
9. **`validatePipelinePhases`** (Foundry-specific) — every `pipeline` note's `phases` items resolve:
   - `mold`-shaped phases — wiki link resolves to a `type: mold` note.
   - `branch`-shaped phases — `branch` value is a known routing pattern; embedded wiki links (in `branches`, `chain`, etc.) resolve to `type: mold` notes.
   - Other phase kinds (e.g., `gate`) — validated per the kind's own shape when introduced.
   Failures error. **Inventory coverage warning** — emits *warning* listing Molds that have zero pipeline membership across all `pipeline` notes (candidate dead Molds, or pipeline gaps).

`findMdFiles` skip rules:

```ts
const SKIP_DIRS = new Set([".obsidian", "casts"]);
const SKIP_FILES = new Set(["Dashboard.md", "Index.md", "iwc-overview.md", "log.md"]);
// directory-note rule, generalized:
const DIR_NOTE_TYPES = new Set(["projects", "molds"]);
```

Hidden directories skipped. Casts directory (`casts/`) is **always skipped** — it's generated content, validated by casting tooling separately.

**One slug-resolver, not two.** Because everything is TS, the wiki-link slug + resolver lives in **one shared module** (`scripts/lib/wiki-links.ts`) imported by both the validator and the Astro site (`site/src/lib/wiki-links.ts` re-exports from it, or the site imports directly via path alias). Galaxy-brain had to maintain two parallel implementations (Python + TS) and risk drift; the Foundry collapses that to one. This is the most concrete win from going TS-only.

`tests/validate.test.ts` (Vitest) loads the *real* `meta_schema.yml` and `meta_tags.yml` and exercises `validateData` (unit) and `validateFile` (integration with `tmp` directories). Mirrors galaxy-brain's test layout.

## 7. Wiki links

**Frontmatter wiki-link fields**: `parent_pattern`, `related_notes`, `related_patterns`, `related_molds`. All regex `^\[\[.+\]\]$`.

**Format**: `[[Target Name]]`. Pipe-aliasing supported in body (`[[Target|display]]`) by the remark plugin; not in frontmatter.

**Resolution algorithm** — adopted verbatim from galaxy-brain. Single shared module (`scripts/lib/wiki-links.ts`); validator, site page renderer, and the remark transformer all import the same `slugify` and `resolveWikiLink`.

```
slug = lower(name) → "  -  " → "-" → spaces → "-" → strip [^a-z0-9-] → collapse dashes
```

Lookup: **exact match on a basename-keyed map first, then prefix-match fallback**. Directory-based notes (`projects/<slug>/index.md`, `molds/<slug>/index.md`) are keyed by their parent directory name. Lets `[[implement-galaxy-tool-step]]` resolve to `content/molds/implement-galaxy-tool-step/index.md`.

Tighten galaxy-brain's prefix-match non-determinism (dict iteration order) by sorting candidates **shortest-first, then alphabetically** — `[[foo-b]]` resolves to `foo-bar` rather than `foo-bar-baz`, which is what an author typing a partial stub almost always means. Cheap to do in the shared module; eliminates a class of cross-version flake.

**Backlinks** computed only from typed frontmatter fields (bounded, fast, author-controlled). Each note page renders an "Incoming References" section grouped by field. Body wiki links don't backlink — same scope cut as galaxy-brain (revisit if Mold pages need full backlink graphs).

**Bidirectional warning**: validator emits `related_notes: missing backlink to [[X]]`. Asymmetric and informational only.

## 8. Generated artifacts

All generated files live under `content/` and are committed to git; CI runs `--check` drift gates before deploy.

**`Dashboard.md`** — Obsidian Dataview tables, one per section. **`site/src/pages/index.astro`** — same sections rendered as HTML tables.

`dashboard_sections.json` is the single source of truth:

```json
[
  { "label": "Pipelines", "tag": "pipeline" },
  { "label": "Molds", "tag": "mold" },
  { "label": "Patterns", "tag": "pattern" },
  { "label": "Plans", "tag": "plan" },
  { "label": "Component Research", "tag": "research/component" },
  { "label": "Design Problems", "tag": "research/design-problem" },
  { "label": "Projects", "tag": "project" }
]
```

Pipelines lead the dashboard because they are the **primary task surface** of the Foundry: a contributor or agent landing cold should first see the journeys ("convert a Nextflow workflow to Galaxy"), then drill into Molds / Patterns / CLI as the reference layer beneath. Type-based sections are preserved as the reference surface; pipelines are the journey surface. See §11 for how this propagates to the Astro routes.

`scripts/generate-dashboard.ts` emits Dataview blocks; the Astro page imports the same JSON. Both filter `status !== 'archived'`, sort `revised DESC`. Pattern lifted from galaxy-brain.

**`Index.md`** — flat prose catalog grouped by `type`/`subtype`, alphabetized within each group:

```
- [[slug]] — {summary} *(stale)*
```

`scripts/generate-index.ts` walks `findMdFiles` (reusing the validator's skip logic), groups by type, emits the file. Directory-note slugs use the parent directory name.

**`content/iwc-overview.md`** — Foundry-specific. Auto-generated grouping of every `iwc/<category>` tag into a single dashboard, with counts and per-category lists of patterns + Molds. Single landing page for "what does the Foundry have for variant-calling, RNA-seq, …". Detail in `INITIAL_CORPUS_INGESTION.md`.

**Drift detection**: `--check` flag on every generator reads the file and string-compares with re-generation; exit 1 on mismatch. Wired into `npm run check:dashboard`, `check:index`, `check:iwc-overview`. Designed as CI gates — galaxy-brain had this pattern but no CI to run it; the Foundry wires it from day one.

## 9. Authoring flow

Two authoring entry points:
- **Slash commands** (the agent flow) — primary.
- **Hand-written** + `npm run validate` — for small edits.

Galaxy-brain's third entry point (Obsidian Templater files under `content/templates/`) is **not carried over**. The Foundry isn't an Obsidian vault by intent; agent-driven authoring through slash commands handles scaffold-prompt-stamp-validate without an interactive plugin in the loop.

Foundry slash commands (sketch — see open questions):
- **`/draft-mold`** — scaffold a new Mold (`molds/<slug>/index.md` + `eval.md`) from a name and axis; cross-ref pass against existing patterns.
- **`/draft-pattern`** — scaffold a pattern page; convention (not enforced) that the page cite at least one IWC workflow URL in `## Exemplars` (corpus-first principle).
- **`/cast`** — wraps `scripts/cast-mold.ts`; classify Mold → resolve refs → call casting LLM → write `casts/<target>/<name>/` → record `_provenance.json` → append to `log.md`.
- **`/ingest`** — *not* carried over. Galaxy-brain's `/ingest` is GitHub-issue/PR-centric; the Foundry doesn't have a generic URL ingestion flow. Background research (e.g., the existing Nextflow-testing synthesis) lands as a hand-authored `research/component` note.

There is no IWC ingestion command. IWC is referenced by URL in pattern bodies (see `INITIAL_CORPUS_INGESTION.md`); no ingest-iwc script exists.

The keystone agent shape from galaxy-brain — *classify → fetch → dedup → draft → cross-ref → write → validate → log → regenerate* — is preserved in `/cast`.

## 10. Directory-based note types

One type uses the directory-note pattern: **Mold**.

**Mold** (`content/molds/<slug>/`):
```
content/molds/implement-galaxy-tool-step/
  index.md           ← only file with frontmatter (the "mold.md" of casting)
  eval.md            ← evaluation plan; never packaged into the cast
  examples/          ← optional walk-throughs
  casting-hints.md   ← optional per-target overrides (deferred until walk-throughs surface need)
```

`eval.md` co-locates evaluation with the Mold (improves discoverability and ownership) without bleeding it into the cast skill. Casting reads `index.md` and refs; never reads `eval.md`.

Galaxy-brain's `project` type is *not* carried forward — `docs/` holds long-form Foundry-meta design narrative; the validator's directory-note rule is reused for Mold but not generalized to a second type.

Validator distinction:
```ts
const DIR_NOTE_TYPES = new Set(["molds"]);
if (parts.some(p => DIR_NOTE_TYPES.has(p)) && path.basename !== "index.md") continue;
```

Two Astro content collections:
- `content` — typed, glob `'**/*.md'` minus skips minus `'!molds/**/!(index).md'`. Only `index.md` is loaded with the typed schema.
- `directoryNoteFiles` — `passthrough()` schema, loads sibling files from Mold directories. Powers the file-tree component on Mold pages.

Routes:
- `[...slug].astro` renders the directory-note's `index.md`. If `data.type === 'mold'`, additionally renders a sibling-files panel; `eval.md` is rendered behind a tab or excluded — open question.
- `pages/molds/[mold]/[...path].astro` for Mold sub-files.
- `pages/raw/molds/[mold]/[...file].md.ts` for raw Mold sub-file endpoints.

Casts directory (`casts/<target>/<name>/`) is **not** a content collection — it's generated, language-target-shaped, and rendered via a dedicated route family (`pages/casts/[target]/[mold]/[...path].astro`) that treats the cast as a standalone artifact, not a foundry note. Open question: whether casts render on the public site at all, or only as a downloadable archive.

## 11. Site / Astro layer

Stack: Astro static + Tailwind CSS v4 (`@tailwindcss/vite`) + `@tailwindcss/typography`. Lifted from galaxy-brain. Font choice (Atkinson Hyperlegible was a galaxy-brain personal accessibility default) is reconsidered for the Foundry — open question.

Routes (departures from galaxy-brain noted):
- `index.astro` — dashboard driven by `dashboard_sections.json`. Pipeline section leads (journey surface); type sections follow (reference surface).
- `[...slug].astro` — note detail with metadata `<dl>`, wiki-link panels, body via `<Content />` (rendered through `remarkWikiLinks`), backlink panel, Pagefind annotations. For `type: mold` notes, an "Appears in pipelines" panel rolls up every `pipeline` note that references this Mold in its `phases` (computed from `validatePipelinePhases` reverse index).
- `pipelines/[slug].astro` — pipeline detail rendered as a vertical subway-map: Mold-shaped stops (linked stations), `[loop]` annotations (decorated stations), `[branch]` stops (decision diamonds with their inner branches/chains expanded). Future `[gate]` stops would render as checkpoint markers. Off-ramp panel per stop lists the patterns / CLI manpages / schemas the Mold references — the "stop's onward branches."
- `catalog.astro` — full catalog page (mirrors `Index.md`).
- `tags/index.astro` — bucketed tag browser (note-type / `iwc/*` / other). New subject-area buckets get added as tag families bloom.
- `tags/[...tag].astro` — per-tag filter.
- `molds/[mold]/[...path].astro`, `projects/[project]/[...path].astro` — directory-note browsers.
- `casts/[target]/[mold]/[...path].astro` — cast artifact browser (Foundry-specific; deferred for v1).
- `raw/[...slug].md.ts`, `raw/molds/[mold]/[...file].md.ts`, `raw/projects/[project]/[...file].md.ts` — raw text endpoints (`Content-Type: text/plain`). Trivially makes the foundry agent-consumable.

Theme: CSS custom properties under `@theme { ... }` with `@custom-variant dark` and a `.dark { ... }` override block. Galaxy palette renamed for Foundry brand; structure preserved. Status badges (`.badge-draft`, …) and `.tag` chips first-class. `.dangling` styles unresolved wiki links muted+italic.

Deployment: minimal two-job GitHub Actions on push to `main` (`withastro/action@v3` + `actions/deploy-pages@v4`). **Unlike galaxy-brain, CI runs `npm run validate`, `check:index`, `check:dashboard`, `check:categories`, and `test` *before* the deploy** — galaxy-brain has these gates as Makefile targets but doesn't run them in CI. Closing that hole is part of v1.

## 12. Ingestion and maintenance

One ingestion spine — Mold casting. There is no IWC ingestion (see `INITIAL_CORPUS_INGESTION.md` for the deconstruction).

**Mold casting** (`scripts/cast-mold.ts`, driven by `/cast`). Covered in `INITIAL_COMPILATION_PIPELINE.md`. Reads from `molds/`, `patterns/`, `schemas/`; writes only to `casts/<target>/<name>/`.

**`content/log.md`** — append-only, excluded from validator and Astro collections, Obsidian-visible. Reserved entry types: `cast`, planned `lint` and `query`. Format follows galaxy-brain:

```markdown
## 2026-04-29 cast — implement-galaxy-tool-step (claude)
- **mold**: [[implement-galaxy-tool-step]]
- **target**: claude
- **model**: claude-opus-4-7
- **prompt-version**: v3
- **resolved-refs**: 4 patterns
```

**`package.json` scripts** (replacing galaxy-brain's `Makefile`):
- `validate` — schema + cross-file checks (errors block; warnings advisory).
- `test` — Vitest suite.
- `dashboard` / `check:dashboard` — Obsidian dashboard.
- `index` / `check:index` — flat catalog.
- `iwc-overview` / `check:iwc-overview` — IWC category aggregation.
- `cast -- --mold=<slug> --target=<target>` — one-shot cast.
- `site:dev` / `site:build` / `site:preview` — Astro lifecycle.

Stack:
- **`tsx`** to run TS scripts directly (no compile step in dev); `tsc --noEmit` for typecheck in CI.
- **Ajv** for schema validation, **gray-matter** for frontmatter parse, **js-yaml** for YAML loads.
- **Vitest** for tests.
- **One `package.json`**, one `tsconfig.json` at repo root; the Astro site (`site/`) inherits via project references or path aliases. Astro and tooling share a single dependency tree.

## 13. Cross-cutting concerns

**Validation.** Two layers, per galaxy-brain:
- *Static* — `validate.ts` checks frontmatter against schema, wiki link integrity, tag coherence, bidirectional `related_notes`, plus Foundry-specific `iwc/*` tag declaration and Mold ref checks.
- *Casting-time* — `cast-mold.ts` refuses to cast a Mold that fails static validation, and validates resolved refs conform to their schemas.

**Versioning.** No semver on Molds, no semver on casts. Identity = name + content hash. Re-casting is the migration path. Carried directly from `INITIAL_COMPILATION_PIPELINE.md`.

**Provenance.** Every derived artifact records what produced it:
- Cast skills: `_provenance.json` per cast (Mold hash, model, prompt version, resolved-ref hashes, timestamp). Detail in `INITIAL_COMPILATION_PIPELINE.md`.
- Generated indexes: rebuilt from current content state; drift detected by `--check`.

IWC-cited URLs in pattern bodies are *not* tracked as provenance — they are author-controlled citations. Pinning to a commit SHA is at the author's discretion per citation.

**Status lifecycle.** Status enum (`draft | reviewed | revised | stale | archived`) on every note. Archived notes filtered everywhere a list appears. First-class, not a tag convention. Lifted from galaxy-brain.

## 14. Physical file layout

Directory tree. Names provisional; the **shape** is the proposal.

```
foundry/
├── README.md
├── GLOSSARY.md
├── KNOWLEDGE_BASE.md
├── meta_schema.yml                       # JSON Schema Draft 07 in YAML
├── meta_tags.yml                         # tag registry (incl. iwc/*)
├── dashboard_sections.json               # single source for Obsidian + Astro dashboards
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MOLD_SPEC.md
│   ├── HARNESS_PIPELINES.md
│   ├── MOLD_INVENTORY.md
│   ├── CORPUS_INGESTION.md
│   ├── COMPILATION_PIPELINE.md
│   ├── PROBLEM_AND_GOAL.md
│   └── SCOPE_V1.md
├── schemas/                              # Mold IO schemas (the schema library)
│   ├── summary-paper.schema.json         # per-source summary outputs
│   ├── summary-nextflow.schema.json
│   ├── summary-cwl.schema.json
│   ├── galaxy-tool-summary.schema.json   # output of summarize-galaxy-tool
│   └── …                                 # one or more per Mold with structured IO
├── content/
│   ├── Dashboard.md                      # generated; --check
│   ├── Index.md                          # generated; --check
│   ├── iwc-overview.md                   # generated; --check
│   ├── log.md                            # append-only operations journal
│   ├── molds/
│   │   ├── implement-galaxy-tool-step/
│   │   │   ├── index.md                  # frontmatter + body (the "mold.md")
│   │   │   ├── eval.md                   # not packaged into cast
│   │   │   └── examples/
│   │   ├── summarize-paper/
│   │   ├── discover-shed-tool/
│   │   ├── gxwf-cli/                     # whole-CLI Mold
│   │   ├── planemo-cli/                  # whole-CLI Mold
│   │   └── …
│   ├── patterns/
│   │   ├── galaxy-collection-manipulation.md   # body cites IWC URLs
│   │   ├── galaxy-tabular-manipulation.md
│   │   ├── galaxy-conditional-handling.md
│   │   ├── galaxy-custom-tool-authoring.md
│   │   └── …
│   ├── cli/
│   │   ├── gxwf/
│   │   │   ├── tool-search.md            # one file per command/subcommand
│   │   │   ├── tool-versions.md
│   │   │   ├── tool-revisions.md
│   │   │   ├── validate.md
│   │   │   ├── lint.md
│   │   │   ├── convert.md
│   │   │   └── …
│   │   └── planemo/
│   │       ├── test.md
│   │       ├── run.md
│   │       └── …
│   ├── pipelines/
│   │   ├── paper-to-galaxy.md
│   │   ├── nextflow-to-galaxy.md
│   │   ├── cwl-to-galaxy.md
│   │   ├── paper-to-cwl.md
│   │   └── nextflow-to-cwl.md
│   └── research/
│       └── component-nextflow-workflow-testing.md  # background syntheses
├── casts/                                # generated; committed; skipped by validator
│   ├── claude/
│   │   ├── _target.yml                   # prompt template, model, output schema
│   │   ├── implement-galaxy-tool-step/
│   │   │   ├── SKILL.md
│   │   │   ├── references/
│   │   │   └── _provenance.json
│   │   └── …
│   ├── web/
│   └── generic/
├── scripts/
│   ├── validate.ts
│   ├── generate-dashboard.ts
│   ├── generate-index.ts
│   ├── generate-iwc-overview.ts
│   ├── seed-iwc-tags.ts                  # one-time, then archived
│   ├── cast-mold.ts
│   ├── status.ts                         # cast drift detection
│   └── lib/
│       ├── schema.ts                     # load + tag-enum injection
│       ├── frontmatter.ts                # gray-matter wrapper + date normalization
│       ├── wiki-links.ts                 # slug + resolver (shared with site)
│       └── walk.ts                       # findMdFiles + skip rules
├── tests/
│   └── validate.test.ts                  # Vitest
├── site/                                 # Astro renderer
│   ├── src/
│   │   ├── content.config.ts             # content + directoryNoteFiles collections
│   │   ├── lib/
│   │   │   └── remark-wiki-links.ts      # imports scripts/lib/wiki-links.ts
│   │   ├── pages/
│   │   ├── components/
│   │   └── styles/global.css
│   └── astro.config.mjs
├── .claude/
│   └── commands/
│       ├── draft-mold.md
│       ├── draft-pattern.md
│       └── cast.md
├── .github/workflows/
│   ├── ci.yml                            # validate + check:* + test + tsc --noEmit
│   └── deploy.yml                        # Astro → GitHub Pages
├── package.json                          # one dep tree for tooling + site
├── tsconfig.json                         # path alias for scripts/lib/* shared with site
└── vitest.config.ts
```

Key decisions reflected in the layout:
- **`content/` content root** — Astro idiom. Reads accurately to a new contributor; the Foundry isn't an Obsidian vault by intent.
- **`content/molds/<slug>/index.md` as directory note** — generalizes galaxy-brain's project rule to a second type. Validator already knew how to handle directory notes; one rule covers both.
- **`schemas/` separate from `meta_schema.yml`** — `meta_schema.yml` is the frontmatter contract for content notes; `schemas/` is the **Mold IO schema library** (per-source summary outputs *and* every other structured input/output a Mold declares). Different audiences, different lifecycle. Schemas under `schemas/` are referenced by Molds via typed-path frontmatter fields and copied verbatim into cast bundles.
- **`content/cli/<tool>/<cmd>.md` flat per tool** — CLI manual pages are organized two-deep for browsing, but each command is a single flat file; not directory-note semantics.
- **`casts/` outside `content/`** — casts are not foundry notes. They have their own provenance shape and target-specific layouts; collapsing them into `content/` would muddy the validator and the site.
- **`docs/` for Foundry-meta** — long-form design docs (architecture, MOLD_SPEC) live here, not as content notes. Galaxy-brain's `LIBRARY_*.md` analog.
- **No `content/exemplars/` directory** — IWC is referenced by URL in pattern bodies, not mirrored. See `INITIAL_CORPUS_INGESTION.md`.
- **No top-level `harnesses/`** — harnesses are downstream consumers, in their own repos. `content/pipelines/` is the Foundry's representation of the journey shape; harnesses (in their own repos) are the executable orchestration that consumes a pipeline + the cast Molds.
- **`content/pipelines/` as primary IA** — pipelines are the journey surface (subway maps over the KB) and the source of truth for "what Molds compose into a buildable harness." Mold inventory invariant ("Molds = union of pipeline phases") is machine-checked in `validatePipelinePhases`.
- **Single `package.json`, single `tsconfig.json`** — tooling and site share a dep tree. The wiki-link module under `scripts/lib/` is imported by both sides via path alias.

## 15. What's adopted from galaxy-brain (and what's reshaped)

Direct lifts (in priority order, per `COMPONENT_GALAXY_BRAIN.md` §"What to borrow"):

1. **Frontmatter contract pattern.** JSON Schema Draft 07 in YAML + runtime tag-enum injection + `additionalProperties: false` + `allOf/if/then` for conditional requireds. Replaced enums with Foundry types; structure verbatim.
2. **Wiki-link resolver — collapsed to one shared TS module.** Galaxy-brain maintained parallel Python + TS implementations and risked drift; the Foundry's TS-only stack lets validator, site renderer, and remark transformer all import the same `slugify` and `resolveWikiLink`. Generalized basename keying handles `projects/<slug>/index.md` and `molds/<slug>/index.md`. Prefix-match is sorted longest-first (galaxy-brain's dict-order non-determinism eliminated).
3. **Generated `Index.md` + `Dashboard.md` with `--check` drift gates**, plus `dashboard_sections.json` driving both Obsidian Dataview and the Astro landing page.
4. **Two-collection Astro split** (typed `content` + passthrough sibling files). Generalized to cover both Project and Mold directory notes.
5. **Slash-command authoring shape** — *classify → fetch → dedup → draft → cross-ref → write → validate → log → regenerate*. Realized as `/cast` and the `/draft-*` commands; galaxy-brain's URL/issue-centric `/ingest` is not carried over.
6. **`content/log.md`** append-only operations journal, excluded from validator and Astro collections.
7. **Single-file scripts pattern.** Galaxy-brain used PEP 723 + uv; the Foundry uses `tsx` + a single `package.json`. Same goal — zero virtualenv ceremony, scripts live next to the data.
8. **Status lifecycle** as first-class enum with badge rendering and global `archived` filtering.
9. **Raw markdown endpoints** + clipboard copy on every page.
10. **CSS custom-property theme tokens + class-based `.dark` override**, with semantic surface/text/badge/tag tokens.
11. **`additionalProperties: false` + bidirectional `related_notes` warning**.
12. **Tag registry as separate file with empty enum in schema, injected at runtime.**

Reshaped or replaced:

- **Note types.** Mold, Pattern, CLI command, and Pipeline are Foundry-original; Research is narrowed (only `component`, `design-problem`, `design-spec`) and absorbs background syntheses (e.g., `COMPONENT_NEXTFLOW_WORKFLOW_TESTING.md`). **Plan, Project, Concept, and MOC are not carried forward** — `docs/` holds long-form design narrative, and Molds/Pipelines/Patterns are themselves focused MOCs that aggregate references to other content kinds. **No `exemplar` type** — IWC is cited by URL, not mirrored.
- **Mold = typed reference manifest.** The Mold note's frontmatter declares typed references *by reference kind* (patterns, cli_commands, input_schemas, output_schemas, prompts, examples), not just an undifferentiated wiki-link list. Each kind has its own validator check and its own casting transformation (see `INITIAL_COMPILATION_PIPELINE.md`). This is the structural shift that motivates the CLI content layer and the `schemas/` library.
- **Directory-note rule.** Reused from galaxy-brain's `project` rule, but applied to Mold instead. One predicate, one type — galaxy-brain's `project` itself is dropped.
- **Tag families.** Note-type tags are reshaped per Foundry types (now including `cli-reference`); `iwc/*` is the one subject-area family committed for v1 (drives the IWC overview page); `cli/*` covers CLI affiliation; `source/*`/`target/*`/`tool/*` axis tags are considered for Molds. **`galaxy/*` deferred** — Foundry hasn't catalogued the kinds of knowledge it'll capture, so locking a subject taxonomy is premature; tag families bloom as content lands.
- **Generated artifacts.** Index + Dashboard carry over verbatim; Foundry replaces galaxy-brain's `_categories.md`-style exemplar index with `iwc-overview.md` (tag-driven, not corpus-mirror-driven).
- **Ingestion.** Galaxy-brain's URL/issue/PR-centric `/ingest` does not carry over. Foundry has **no IWC ingestion either** — `workflow-fixtures` is not a runtime dependency; pattern authors cite IWC by URL. See `INITIAL_CORPUS_INGESTION.md`.
- **CI gates.** Galaxy-brain has the `--check` Makefile targets but no CI enforcement. Foundry wires them from day one.
- **Casts directory.** No analog in galaxy-brain (which doesn't generate compiled artifacts). Casts are generated, committed, validated by casting tooling, and rendered (or not — open) through their own routes.

Explicitly **not** carried over from galaxy-brain:

- `github_issue` / `github_pr` / `github_repo` fields and `gh` CLI integration. The Foundry doesn't ingest from GitHub.
- The seven `research` subtypes — Foundry uses three.
- `/ingest-gx-pr`. Galaxy-specific deep-research wrapper, lives in galaxy-brain.
- The dyslexia-driven Atkinson Hyperlegible default font — reconsidered (open question).
- `~/.galaxy-brain` symlink in install.
- **Obsidian Templater files** under `content/templates/`. Slash-command-driven authoring covers the same scaffolding-prompt-stamp-validate flow without an interactive plugin in the loop.
- **Plan, Project, Concept, and MOC note types.** Galaxy-brain holdovers; `docs/` holds long-form design narrative and the Foundry's content types are the things that get cast or referenced by casting. Aggregation is the Mold/Pipeline/Pattern job — each is a focused MOC.
- **Python toolchain.** Galaxy-brain's PEP 723 + uv + Makefile is replaced with `tsx` + one `package.json`. Aligns with gxwf TS bias and the casting LLM ecosystem; collapses the two-renderer wiki-link concern into one shared module.

Gaps galaxy-brain has that the Foundry closes:
- CI runs `validate` and the `check:*` targets — wired from day one.
- Body-prose wiki links don't contribute backlinks — reconsider for Mold pages (revisit during walk-throughs).
- Wiki-link prefix-match non-determinism (dict iteration order) — eliminated by sorting candidates longest-prefix-first in the shared module.
- Two parallel slug-resolver implementations — collapsed into one via TS-only stack.

## 16. Open questions

Layout:
- **Mold directory companions beyond `index.md` + `eval.md`?** `casting-hints.md`, `tests.md` (regression tests for the cast skill itself, distinct from eval), … defer until walk-throughs surface need.
- **Render casts on the public site?** Or only as downloadable archives? v1: don't render; revisit if discoverability matters.
- **`site/` urgency.** Markdown-on-GitHub is enough until contributor or page count makes browse painful. Same call as galaxy-brain.

Tag families:
- **What subject-area families bloom next?** `galaxy/*` (Galaxy code/feature areas) is deferred. As content lands (background research, gxformat2 syntax notes, custom-tool-authoring detail, etc.), real cross-cutting needs will surface. Defer the catalog until pattern emerges.
- ~~**`iwc/*` seed source of truth.**~~ Resolved: top-level directories under `<iwc-clone>/workflows/`. See `INITIAL_CORPUS_INGESTION.md` §"`iwc/*` vocabulary" for the concrete seed list.
- **Stale citation detection.** Pin-to-SHA citations in pattern bodies rot when IWC moves files. Worth a periodic `tsx scripts/check-citations.ts` HEAD-checking each cited URL? Cheap, but adds a CI dependency on network. Defer unless rot becomes visible.

Pipelines:
- **Exact `phases` shape.** Object-per-phase array (sketched above) vs body-driven (phases authored as a structured markdown list and parsed). v1 lean: frontmatter object array — machine-checkable, renders deterministically. Lock in after lifting the 5 pipelines from `INITIAL_HARNESS_PIPELINES.md` into real `content/pipelines/*.md` notes.
- **Named `branch` routing patterns.** `discover-or-author` (binary with fallthrough) and `test-data-resolution` (N-step chain) are the two surfaced so far. Enumerate as a closed set in the schema, or leave open with validator coverage of embedded wiki links only? Defer until the second pipeline lands.
- **Other inline phase kinds.** `[gate]` (approval / scope-confirmation checkpoint) is the most likely next kind, but doesn't appear inline in any current pipeline. Coin when it first surfaces; do not pre-enumerate. The phase-kind set stays open — `branch` and `gate` are unrelated behaviors and shouldn't be flattened under one umbrella.
- **Composed pipelines (`PAPER → CWL → GALAXY`).** Distinct `pipeline` notes that reference two other pipelines, or runtime compositions left to the harness? v1 lean: separate notes that compose by `phases: [{ pipeline: [[...]] }, { pipeline: [[...]] }]` if/when needed; otherwise omit. Mirrors the open question in `INITIAL_HARNESS_PIPELINES.md`.
- **Pipeline rendering urgency.** Subway-map render is the natural form, but a flat ordered list is enough until we have ≥2 cast Molds with real off-ramps (patterns, manpages). v1: flat list; upgrade visual once content density justifies it.

Schema:
- **Source/target/tool as typed fields vs tags?** `source/nextflow`, `target/galaxy`, `tool/gxwf` are clean as tags today; promoting to typed enum fields buys validation but adds schema churn. Decide once `MOLD_SPEC` is real.
- **Mold subtypes?** The `axis` field (`source-specific | target-specific | tool-specific | generic`) may want to graduate into a `subtype`, with conditional requireds (e.g., source-specific Molds require a `source` value, tool-specific Molds require a `tool`). Punt to walk-throughs.
- **`related_molds` legitimacy.** Mold-to-Mold wiki links are flagged as a smell in `INITIAL_COMPILATION_PIPELINE.md` (recursive casting depth). Keep as a warned-but-allowed field, or forbid outright? v1: allow, warn at cast time. The intended escape valve for "two Molds need shared content" is to factor that content into a pattern page, manpage, or schema — not a Mold-to-Mold link.
- **Exact shape of the typed-reference manifest.** Field names (`patterns` vs `related_patterns`, `cli_commands` vs `manpages`, `input_schemas` vs nested under a `schemas` object) are sketch-level above; lock in after walking 2-3 Molds end-to-end (suggested order in `INITIAL_MOLDS.md`).
- **CLI command slug strategy.** `cli-command` notes live two-deep (`content/cli/<tool>/<cmd>.md`). Wiki-link slug should disambiguate across tools — likely `<tool>-<cmd>` or `cli/<tool>/<cmd>` namespacing. Update the shared `wiki-links.ts` resolver when the first `cli-command` notes land.
- **Manpage authoring source.** Seed from `--help` output (deterministic but thin) or hand-author and use `--help` only for cross-checking? The eval plan for the CLI Mold should pin this.
- **One whole-CLI Mold per tool, or per-subcommand Molds?** v1: one Mold per tool (`gxwf-cli`, `planemo-cli`); per-command pages are the content layer. Revisit if planemo's surface is too big to cast as one artifact.

Tooling:
- **Cast diff hygiene.** LLM output is noisy; even unchanged Molds produce churny diffs. Output-stabilization pass (deterministic re-formatting) deferred until churn is painful.
- **Compiled scripts vs `tsx`?** `tsx` is fine in dev and CI. If startup latency on `cast` becomes a problem (model-driven loops), switch to a pre-compiled bin. Defer.
- **Atkinson Hyperlegible default font?** Galaxy-brain's accessibility default; reconsider for the Foundry brand. Cheap to keep; cheap to swap.

Process:
- **One repo or several?** Keep everything in one repo for v1. Split casting tooling or schemas into a publishable library only if they grow.
- **Mold-to-pattern coupling.** Some patterns will pair with action Molds (e.g., custom-tool-authoring pattern + `author-galaxy-tool-wrapper` Mold). Encode the pairing in frontmatter (`companion_mold: [[…]]` on patterns, `companion_pattern: [[…]]` on Molds), or leave it implicit via wiki links? v1: implicit; promote if the pairing rules need to be machine-checked.
- **`compare-against-iwc-exemplar` Mold's discovery mechanism.** Without a Foundry-hosted exemplar index, how does the cast skill find candidate exemplars to compare against at runtime? Probably via an IWC listing URL plus `gxwf` tooling. Specified in the Mold's `eval.md`, not at the architecture layer.

Resolved (moved out of this list):
- *Content root name.* `content/`.
- *TypeScript vs Python for tooling.* TypeScript only.
- *IWC corpus mirroring.* Dropped — pattern bodies cite IWC by URL; no exemplar layer; no `workflow-fixtures` runtime dep. See `INITIAL_CORPUS_INGESTION.md`.

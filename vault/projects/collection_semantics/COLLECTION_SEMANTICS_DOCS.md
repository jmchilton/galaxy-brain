# Collection Semantics Documentation System

## What Is This?

A formalized specification of Galaxy dataset collection semantics - how collections behave when mapped over tool inputs, reduced, connected in workflows, and type-checked in the workflow editor. The specification lives in a structured YAML file, gets rendered to Markdown via a Python script, and is published as part of Galaxy's Sphinx developer documentation.

This is **reference documentation for developers and AI agents**, not user-facing docs. Galaxy's design philosophy is that collections "just work" intuitively for users; this document provides the mathematical formalism behind that intuition to support implementation and testing.

## File Locations

| File | Purpose |
|------|---------|
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Source of truth - YAML spec with prose, examples, and test references |
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Generator script - parses YAML, renders Markdown with LaTeX math |
| `doc/source/dev/collection_semantics.md` | Generated output - Markdown consumed by Sphinx (do not edit directly) |

Published at: https://docs.galaxyproject.org/en/master/dev/collection_semantics.html

Included in `doc/source/dev/index.rst` under the developer documentation toctree.

## How to Build

**Generate the Markdown from YAML:**
```bash
PYTHONPATH=lib python lib/galaxy/model/dataset_collections/types/semantics.py
```

**Build the full Galaxy docs:**
```bash
make docs
```

**Fast rebuild (skips source code, changelogs, releases):**
```bash
GALAXY_DOCS_SKIP_VIEW_CODE=1 GALAXY_DOCS_SKIP_RELEASES=1 GALAXY_DOCS_SKIP_SOURCE=1 make docs
```

## YAML Structure

`collection_semantics.yml` is a list of entries. Each entry is one of two types:

### `doc` entries
Markdown prose that becomes the body text of the rendered document. These explain concepts in plain English.

```yaml
- doc: |
    ## Mapping

    If a tool consumes a simple dataset parameter and produces a simple dataset parameter,
    then any collection type may be "mapped over" the data input...
```

### `example` entries
Formalized mathematical descriptions of specific behaviors. Fields:

```yaml
- example:
    label: BASIC_MAPPING_PAIRED          # Unique identifier, also used as Sphinx cross-ref target
    assumptions:                          # Setup conditions (optional)
    - datasets: [d_f, d_r]              # Dataset variable declarations
    - tool:                              # Tool signature
        in: {i: dataset}
        out: {o: dataset}
    - collections:                       # Collection variable declarations
        C: [paired, {forward: d_f, reverse: d_r}]
    then: "tool(i=mapOver(C)) ~> ..."   # The mathematical statement (optional)
    is_valid: true                       # Whether this is a valid operation (default: true)
    tests:                               # References to actual test cases (optional)
        tool_runtime:
            api_test: "test_tool_execute.py::test_map_over_collection"  # OR
            tool: collection_paired_test                                 # framework test tool name
        workflow_editor: "accepts paired data -> data connection"       # it() clause from terminals.test.ts
```

**Key fields:**
- `label` - Required. Unique identifier. Rendered as a Sphinx cross-reference target `(LABEL)=` in the output.
- `assumptions` - Optional list. Typed declarations: `datasets`, `tool` (with `in`/`out`), `collections`, or raw string expressions.
- `then` - Optional string. The mathematical expression describing the behavior. Uses `~>` for mapping results, `->` for direct results, `==` for equivalence.
- `is_valid` - Default `true`. Set `false` for examples that document invalid/rejected connections.
- `tests` - Optional. Maps to real test cases. Two test categories supported:
  - `tool_runtime` - either `api_test` (pytest path) or `tool` (framework test tool name)
  - `workflow_editor` - string matching an `it()` clause in `terminals.test.ts`

## Document Organization

The spec covers four major topic areas, each with `doc` prose followed by `example` blocks:

### 1. Mapping
How collections are mapped over simple `dataset` inputs. Covers: basic mapping for `paired`, `paired_or_unpaired`, `list` types; nested collection mapping; multi-input tools with one mapped and one non-mapped input; linked mapping of two identically-structured collections (dot product semantics).

### 2. Reduction
How collection inputs (`data_collection` type) and `multiple="true"` data inputs consume collections directly without creating implicit collections. Covers: explicit collection inputs for various types; type strictness (`list` != `paired`); list reduction via multi-data inputs; why `paired` and `paired_or_unpaired` can't be reduced by multi-data inputs (they're tuples, not arrays).

### 3. Sub-collection Mapping
How nested collections can be partially mapped - e.g. `list:paired` mapped over a `paired` input extracts each inner pair. Covers: sub-collection extraction; `list:list` mapped over multi-data inputs (nested list reduction); invalid sub-collection reductions for paired/tuple-like inner types.

### 4. `paired_or_unpaired` Collections
The type compatibility rules for this new union-style collection type. Covers: `paired` -> `paired_or_unpaired` subtyping (valid); inverse rejection; mapping implications; `single_datasets` sub-collection mapping to treat flat lists as lists of unpaired items; nesting behavior; known limitation that subtyping only works at the deepest collection rank.

## How Rendering Works

`semantics.py` defines Pydantic models for each entry type and:

1. Loads `collection_semantics.yml` via `yaml.safe_load`
2. Validates into a `RootModel[list[DocEntry | ExampleEntry]]`
3. Groups entries as `(doc, [examples...])` pairs via `collect_docs_with_examples()`
4. For each group:
   - Writes the `doc` Markdown directly
   - If examples exist, writes Sphinx cross-ref targets `(LABEL)=`, then wraps examples in `<details><summary>Examples</summary>` collapsibles
   - Each example renders assumptions as LaTeX bullet points and the `then` expression as a display math block (`$$...$$`)
5. Writes output to `doc/source/dev/collection_semantics.md`

LaTeX rendering converts: `->` to `\rightarrow`, `~>` to `\mapsto`, braces to `\left\{`/`\right\}`, underscored type names get escaping, and common words (`list`, `forward`, `reverse`, `mapOver`) get `\text{}` wrapping.

## Test Reference System

The `tests` field on examples creates a bidirectional link between the formal spec and actual test code:

- **`tool_runtime`** tests: References to pytest API tests in `lib/galaxy_test/api/` (via `api_test` path) or Galaxy's test tool framework (via `tool` name). These validate runtime behavior.
- **`workflow_editor`** tests: References to `it()` clause descriptions in `client/src/components/Workflow/Editor/modules/terminals.test.ts`. These validate the workflow editor's connection type-checking logic.

This serves as an organized index of what's tested and what gaps remain.

## Future Directions

Areas identified for extension (roughly by priority/likelihood):

- **Review** - The document was hand written and probably contains
many typos and inaccuracies - we should review this and come up
with a plan to fix these issues.
- **Validation** - Validation of specification against the actual code - to ensure the referenced tests exist.
- **More YAML modeling** - Convert remaining free-form `then` expressions into structured, typed YAML to enable richer rendering and programmatic use
- **Graphviz diagrams** - Auto-generate collection structure diagrams from the modeled examples - read should probably enhance gx-collection-graphviz for this (research note at "/Users/jxc755/projects/repositories/galaxy-notes/vault/research/Dependency - Collection Graphviz.md")
- **Auto-generate `terminals.test.ts` cases** - Use the spec to generate workflow editor test cases instead of maintaining them manually (we have notes on the tests and implementation of these
components here "/Users/jxc755/projects/repositories/galaxy-notes/vault/research/Component - Workflow Editor Terminals.md" and 
"/Users/jxc755/projects/repositories/galaxy-notes/vault/research/Component - Workflow Editor Terminal Tests.md"
)
- **Generate API test cases** - Extend test generation to tool runtime API tests - these could be manually done or we could
develop code to dynamically generate these tests from the spec maybe.
- **`workflow_runtime` test category** - Add a third test reference type for end-to-end workflow execution tests (research note on workflow testing at "/Users/jxc755/projects/repositories/galaxy-notes/vault/research/Component - Workflow Testing.md")
- **Complete `paired_or_unpaired` subtyping** - Extend subtyping to work at any rank, not just the deepest (currently a known limitation)
- **`record` collection type coverage** - Add semantics documentation for the new `record` type
- **UI integration** - Surface collection semantics information in the Galaxy UI (e.g. tooltips explaining why a connection is valid/invalid)

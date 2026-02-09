---
type: research
subtype: dependency
tags:
  - research/dependency
  - galaxy/collections
status: draft
created: 2026-02-08
revised: 2026-02-08
revision: 1
ai_generated: true
galaxy_areas:
  - collections
---

# gx-collection-graphviz - Project Summary

## What It Does

`gx-collection-graphviz` generates Graphviz diagrams that visually depict Galaxy dataset collection structures. Collections are Galaxy's core mechanism for grouping datasets into typed, hierarchical containers (lists, pairs, nested combinations). The tool takes a JSON description of a collection's structure and renders it as a nested box diagram showing the collection hierarchy down to leaf datasets.

The project was created by John Chilton to produce example images for a GBCC (Galaxy Community Conference) talk. It lives at `https://github.com/jmchilton/gx-collection-graphviz`.

## Architecture

Three source files under `src/gxcollectiongraphviz/`:

### `inputs.py` - Data Model

Pydantic models defining the input schema:

- **`Element`**: A node in the collection tree. Fields:
  - `element_identifier` (str) - the label (e.g. "forward", "sample1")
  - `collection_type` (optional str) - if set, this element is a sub-collection (e.g. "paired", "list:paired")
  - `elements` (optional list of Element) - children. Auto-populated with `forward`/`reverse` children when `collection_type == "paired"` and no elements provided
  - `row` (optional list of str) - tabular metadata row for sample sheet collection types
- **`Collection`**: Root container. Fields:
  - `name` (str) - display label
  - `collection_type` (str) - Galaxy collection type string (e.g. "list", "list:paired", "sample_sheet:paired")
  - `elements` (list of Element) - top-level elements
  - `column_definitions` (optional list of str) - column header names for sample sheet types
  - `include_ellipse_node` (bool) - whether to append a "..." ellipsis node indicating more elements

The file also defines 7 pre-built example `Collection` instances (see Examples section below).

### `graphviz_generator.py` - Rendering Engine

Single function `generate_graphviz(collection: Collection) -> graphviz.Digraph` that recursively walks the collection tree and builds a Graphviz directed graph:

- The root collection becomes an outer `subgraph cluster` with `style=component`
- Each sub-collection element becomes a nested `subgraph cluster` with `style=rounded`
- Leaf elements (no `collection_type`) become `box3d` shaped nodes labeled "dataset"
- Elements with a `row` field get an additional `record`-shaped node showing "col1 | col2 | ... | colN"
- If `include_ellipse_node` is true, an "..." ellipsis cluster is appended
- If `column_definitions` is set, a "column definitions" label and record node are added at the bottom, with invisible edges from row nodes for layout alignment

### `gxcollectiongraphviz.py` - CLI Entry Point

Stub `main()` function registered as the `gx-collection-graphviz` console script. Currently a no-op (`pass`). The tool is only usable as a library or by running the test suite to generate example PNGs.

## Input Format

Collections are defined as JSON objects parsed via `Collection.model_validate_json()`. Example:

```json
{
    "name": "List of Pairs (list:paired)",
    "collection_type": "list:paired",
    "include_ellipse_node": true,
    "elements": [
        {
            "collection_type": "paired",
            "element_identifier": "sample1",
            "elements": [
                {"element_identifier": "forward"},
                {"element_identifier": "reverse"}
            ]
        },
        {
            "collection_type": "paired",
            "element_identifier": "sample2"
        }
    ]
}
```

Note: when `collection_type` is "paired" and `elements` is omitted, the model validator auto-creates forward/reverse children.

## Output Format

`generate_graphviz()` returns a `graphviz.Digraph` object. Callers use `.render(filename, format="png", cleanup=True)` to produce image files. The Graphviz DOT source is also accessible via `.source`. The `round-table.gv` file in the repo root is a standalone DOT file (with its rendered PDF `round-table.gv.pdf`) showing a simple two-element list collection for ChIP-seq treatments.

Supported output formats: anything Graphviz supports (PNG, PDF, SVG, etc.) via the `format` parameter to `.render()`.

## Pre-built Examples and Sample Output

7 example collections are defined in `inputs.py`, plus 2 ChIP-seq examples in `test_examples.py`. Running the tests generates 9 PNG files in `examples/`:

| File | Collection Type | Description |
|------|----------------|-------------|
| `list.png` | `list` | Flat list with sample1, sample2, and "..." ellipsis |
| `list_of_pairs.png` | `list:paired` | Each list element contains forward/reverse pair |
| `mixed_list.png` | `list:paired_or_unpaired` | Mix of unpaired (single dataset) and paired elements |
| `nested_list.png` | `list:list:paired` | Two-level nesting: outer1/outer2 each containing inner pairs |
| `flat_sample_sheet.png` | `sample_sheet` | Flat list with tabular row metadata per element + column definitions |
| `paired_sample_sheet.png` | `sample_sheet:paired` | Paired elements with row metadata + column definitions |
| `mixed_sample_sheet.png` | `sample_sheet:paired_or_unpaired` | Mixed paired/unpaired with row metadata + column definitions |
| `chipseq_treatments.png` | `list:list:paired` | Real-world: histone marks (H3K27me3, H3K4me3, CTCF) with rep1/rep2 pairs |
| `chipseq_controls.png` | `list:paired` | Real-world: ChIP-seq control samples (SRR accessions) as pairs |

## Relationship to Galaxy's collection_semantics.yml

The project does not directly reference or consume `collection_semantics.yml`. However, it visualizes the same collection type system described by that specification:

- `collection_semantics.yml` (at `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`) is a structured YAML document that formally specifies collection mapping, reduction, and sub-collection semantics with mathematical notation and links to test cases
- `collection_semantics.md` is the rendered documentation generated from that YAML
- `gx-collection-graphviz` produces the visual diagrams that illustrate these same collection structures - the kind of images useful in talks and documentation explaining how `list`, `paired`, `paired_or_unpaired`, `list:paired`, `list:list:paired`, and `sample_sheet` variants look

The collection types visualized (`list`, `paired`, `paired_or_unpaired`, `list:paired`, `list:list:paired`, `sample_sheet`, `sample_sheet:paired`, `sample_sheet:paired_or_unpaired`) directly correspond to the types whose semantics are formalized in `collection_semantics.yml`. The `sample_sheet` types are not yet covered by `collection_semantics.yml` and appear to be a newer/proposed collection type.

## Dependencies

Runtime:
- `graphviz` (Python bindings) - requires system Graphviz installation for rendering
- `pydantic` - data validation and JSON parsing

Dev:
- `pytest`, `pytest-sugar` - testing
- `ruff` - linting and formatting
- `codespell` - spell checking
- `basedpyright` - type checking
- `rich` - dev tooling output

Build: `hatchling` + `uv-dynamic-versioning` (git-tag-based versioning).

## How to Run

```bash
# Install dependencies
uv sync --all-extras --dev

# Run tests (generates example PNGs in examples/)
uv run pytest

# Or use Makefile shortcuts
make install
make test
```

There is no functional CLI yet. The `gx-collection-graphviz` console script entry point exists but its `main()` is a stub. To generate diagrams, use the library programmatically:

```python
from gxcollectiongraphviz.graphviz_generator import generate_graphviz
from gxcollectiongraphviz.inputs import Collection

c = Collection.model_validate_json('{"name": "My List", "collection_type": "list", ...}')
dot = generate_graphviz(c)
dot.render("output", format="png", cleanup=True)
```

## Current State / Completeness

**Early stage / proof of concept.** The project has 3 commits over ~2 weeks (May-June 2025), built specifically for GBCC talk imagery.

What works:
- Pydantic model for describing arbitrary-depth collection structures including sample sheets
- Recursive Graphviz rendering with nested cluster subgraphs
- 9 example outputs covering all major Galaxy collection types
- CI pipeline (GitHub Actions: lint + test on Python 3.11/3.12/3.13)
- PyPI publishing workflow (not yet published)

What's incomplete or missing:
- CLI entry point is a stub - no way to invoke from command line
- No YAML/file-based input - collections must be constructed in Python code or JSON strings
- No integration with `collection_semantics.yml` (could potentially read that file and generate diagrams from its example definitions)
- README is still the template boilerplate
- No configuration for diagram styling (colors, orientation, etc.)
- The `round-table.gv` file in the repo root appears to be a manual/scratch Graphviz file, not generated by the tool
- Minor typo in test data: `"list:paird"` in `CHIPSEQ_EXAMPLE_SIMPLIFIED_CONTROLS`

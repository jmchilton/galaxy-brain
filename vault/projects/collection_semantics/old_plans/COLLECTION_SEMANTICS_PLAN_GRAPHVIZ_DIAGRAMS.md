# Plan: Auto-Generate Graphviz Collection Structure Diagrams

## Overview

Add diagram generation to `semantics.py` that converts the YAML spec's `CollectionDefinition` declarations into Graphviz SVG diagrams using the `gx-collection-graphviz` library, embedding them inline in the Sphinx documentation.

## Current State

- **YAML spec** has ~27 examples with collection declarations like `C: [paired, {forward: d_f, reverse: d_r}]`, already parsed into `CollectionDefinition(collection_type, elements)` NamedTuples
- **`gx-collection-graphviz`** (github.com/jmchilton/gx-collection-graphviz) -- external package with `Collection`/`Element` Pydantic models and `generate_graphviz(collection) -> graphviz.Digraph`. Not on PyPI, not cloned locally, no CLI.
- **Sphinx docs** use `myst_parser` with `dollarmath`. Precedent for committed SVGs (plantuml `.plantuml.svg` files).

## Architecture: Inline in `semantics.py` (Recommended)

Add `generate_diagrams()` to `semantics.py` that converts `CollectionDefinition` -> `gx-collection-graphviz` `Collection` objects -> SVGs. Keeps `gx-collection-graphviz` as pure rendering library.

## YAML-to-Diagram Bridge

### Conversion Logic

**YAML format:**
```yaml
C: [paired, {forward: d_f, reverse: d_r}]
C: ["list:paired", {el1: {forward: d_f, reverse: d_r}}]
```

**gx-collection-graphviz format:**
```python
Collection(name="C", collection_type="list:paired", elements=[
    Element(element_identifier="el1", collection_type="paired", elements=[
        Element(element_identifier="forward"),
        Element(element_identifier="reverse"),
    ])
])
```

Key mapping:
- Elements dict: `identifier -> value`; strings = leaf datasets, dicts = sub-collections
- `collection_type` like `"list:paired"` decomposes: outer `list`, inner elements get `collection_type="paired"`
- `...` key (YAML parses as `None`) -> sets `include_ellipse_node=True`
- Recursive `_build_elements()` handles arbitrarily deep nesting

### Unique Structures (~7)

| Collection Type | Elements |
|---|---|
| `paired` | `{forward, reverse}` |
| `paired_or_unpaired` (paired) | `{forward, reverse}` |
| `paired_or_unpaired` (unpaired) | `{unpaired}` |
| `list` | `{i1, ..., in}` |
| `list:list` | `{o1: {inner}, ..., on: {inner}}` |
| `list:paired` | `{el1: {forward, reverse}}` |
| `list:paired_or_unpaired` | `{el1: {forward, reverse}}` |

## Implementation Phases

### Phase 1: Add `gx-collection-graphviz` as dev dependency
- Git dep or PyPI release. System Graphviz (`dot` binary) also required.

### Phase 2: Build conversion function
In `semantics.py`: `collection_definition_to_collection(name, coll_def) -> Collection`

### Phase 3: Generate SVG files
- `generate_diagrams()` called from `main()`
- Output to `doc/source/dev/collection_diagrams/`
- Use `format="svg"` (smaller, scales, matches plantuml precedent)

### Phase 4: Embed in generated Markdown
- Insert `![C](collection_diagrams/LABEL_C.svg)` after each collection's LaTeX declaration

### Phase 5: Deduplicate
- Hash `(collection_type, elements)` to avoid regenerating identical diagrams
- ~20+ examples reduce to ~7 unique structures

### Phase 6: Testing (Red-to-Green)

**Test file:** `test/unit/model/dataset_collections/test_semantics_diagrams.py`

1. Write conversion tests (fail) -> implement `collection_definition_to_collection()` -> pass
2. Write SVG generation test (fail) -> implement `generate_diagrams()` -> pass
3. Write markdown reference test (fail) -> modify `generate_docs()` -> pass

Key test cases: paired, nested list:paired, ellipsis, deep nesting (list:list:paired).

### Phase 7 (Future): Transform Diagrams
Parse `then` expression results to show input -> output collection side-by-side. Requires parser for `collection<list:paired, {...}>` patterns.

### Phase 8 (Future): Sphinx Extension
Custom directive for build-time generation. Lower priority since pre-generation works.

## File Changes

| File | Change |
|---|---|
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Add `generate_diagrams()`, conversion functions, SVG refs in `generate_docs()` |
| `doc/source/dev/collection_diagrams/` | New directory for generated SVGs |
| Galaxy dev dependencies | Add `gx-collection-graphviz` |
| `test/unit/model/dataset_collections/test_semantics_diagrams.py` | New test file |
| `Makefile` (optional) | Add `make collection-diagrams` target |

## Unresolved Questions

1. Pre-generate and commit SVGs, or generate at doc-build time? (Committing avoids system Graphviz dep at build)
2. Publish `gx-collection-graphviz` to PyPI first, or git dep? Could vendor ~150 lines directly.
3. Diagram per example, or per unique structure (deduplication)?
4. Should `is_valid: false` examples get diagrams? (Structure itself is valid even when operation isn't)
5. Label leaves with dataset names (d_f, d_r) or generic "dataset"?
6. SVG or PNG? (SVG recommended)

# Reuse Galaxy Tool Loading for Galaxy Tool Refactoring

Date: 2026-06-15

## Thesis

Galaxy tool refactoring projects should reuse Galaxy's existing tool-loading and macro-expansion layers wherever possible, and strengthen those abstractions upstream when codemod or lossless-editing workflows need sharper hooks.

The performance evidence from local benchmarking does not support a separate parser stack as a speed optimization. If a future implementation does produce meaningful tool-loading speedups, those improvements belong in Galaxy or `galaxy-tool-util`, where production servers load thousands of tools and the performance impact is most critical.

## Benchmark Context

Benchmarks were run locally against real macro-heavy fixtures from `richard-burhans/galaxy-tool-refactor`.

The lowest divergent raw parser layer compared was:

- Project: `galaxy_tool_source.binding.load_tool()`, which reads bytes and parses with `lxml.etree.XMLParser(recover=True, strip_cdata=False)`.
- Galaxy: `galaxy.tool_util.loader.raw_tool_xml_tree`, reexporting `galaxy.util.xml_macros.raw_xml_tree()`, which calls Galaxy `parse_xml(..., strip_whitespace=False, remove_comments=True)`.

The macro-expanded layer compared was:

- Project: `galaxy_tool_source.macros.expand_from_path()`.
- Galaxy: `galaxy.tool_util.loader.load_tool_with_refereces()`.

That macro comparison is especially important because the project delegates actual macro expansion back to Galaxy, so this layer is not an independent implementation with a distinct speed profile.

## Results

| Tool fixture | Tool size | Macro size/file | Project raw median | Galaxy raw median | Raw delta | Project macro median | Galaxy macro median | Macro delta |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `tools-iuc__samtools_consensus/tool.xml` | 30,376 B | `macros.xml`, 12,264 B | 0.1502 ms | 0.1576 ms | project 0.0074 ms faster | 1.4631 ms | 1.4379 ms | project 0.0252 ms slower |
| `tools-galaxyp__pepquery/tool.xml` | 39,697 B | `macros.xml` | 0.1934 ms | 0.2051 ms | project 0.0117 ms faster | 1.4589 ms | 1.4647 ms | project 0.0058 ms faster |
| `tools-iuc__mmseqs2-3/tool.xml` | 30,570 B | `macro.xml` | 0.1399 ms | 0.1442 ms | project 0.0043 ms faster | 1.6170 ms | 1.6327 ms | project 0.0157 ms faster |

Additional `pepquery` checks:

- Galaxy `get_tool_source()`: 1.7111 ms median.
- Project `load_tool()` plus lazy xsdata `ToolDocument.model()` binding: 3.2103 ms median.

## Interpretation

These numbers do not show a meaningful speedup from the separate raw parser abstraction. The raw parser deltas are in the range of roughly 0.004 to 0.012 ms, not 5 ms.

The macro-expanded path is effectively tied and, in one fixture, slower through the project wrapper. That is expected because the project delegates Galaxy macro expansion back to Galaxy.

The typed xsdata model path is also not free. On the measured `pepquery` fixture, project raw load plus model binding was slower than Galaxy `get_tool_source()`.

This does not prove Galaxy has the ideal API for every codemod workflow. It does show that performance is not a strong argument for bypassing Galaxy's loading abstractions.

## Why Reuse Galaxy Tool Loading

Galaxy's tool loader is the production semantics boundary. It already encodes the behavior tool authors and server operators depend on: XML parsing, macro imports, token substitution, macro expansion, profile handling, and the parser interfaces used by the rest of Galaxy.

Reusing that boundary reduces semantic drift. A refactoring tool that loads tools differently from Galaxy risks producing edits that are internally consistent but not aligned with the runtime that will execute those tools.

Reuse also benefits adjacent projects. Planemo, linting tools, language-server features, formatters, and codemods all need overlapping notions of "what is this Galaxy tool?" Strengthening the Galaxy/`galaxy-tool-util` abstraction gives the whole ecosystem one better substrate instead of several nearly parallel ones.

## Lossless Codemods Are Not a Reason to Fork Semantics

Lossless XML editing is a real requirement for codemods: comments, CDATA, attribute order, source locations, and macro-file boundaries matter.

But that requirement does not imply a separate Galaxy semantics layer. Both Galaxy and the project already use lxml; the gap is that Galaxy's raw loader defaults remove comments and do not expose the exact preservation policy this codemod layer wants.

A better direction is to add or expose a lossless raw-load mode in Galaxy/`galaxy-tool-util`, for example preserving comments and CDATA while still routing macro discovery and expansion through Galaxy's existing code. Project-specific code can then focus on edit planning, diagnostics, and formatting policy instead of maintaining parallel loading concepts.

## What Could Move Upstream

The most valuable upstream work would be small, explicit APIs rather than a large rewrite:

- A lossless raw tool XML loader that preserves comments, CDATA, and source-sensitive structure.
- Reusable macro import traversal for direct and transitive imports.
- Reusable token-definition collection across tool and macro files.
- A public helper for top-level macro expansion suitable for editor and codemod workflows.
- A stable wrapper that returns the lxml tree, macro paths, profile, and source metadata without forcing callers through a full Galaxy runtime.

With those in place, local code like `galaxy_tool_source/macros.py` could shrink to error shaping, temporary-file policy where unavoidable, and codemod-specific preservation rules.

## Recommendation

The default architecture for Galaxy tool refactoring should be: reuse Galaxy/`galaxy-tool-util` loading and macro semantics, identify any missing preservation hooks, and upstream those hooks.

If future benchmarks find real speedups, they should be proposed upstream first. Production Galaxy servers and toolbox-loading workflows are where parser performance matters most; one-off local tool development is the weaker justification for a divergent parser/model layer.


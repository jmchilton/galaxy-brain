# Outline

## One-Sentence Version

gxwf brings Galaxy's typed tool metadata into CLI, browser, and VS Code workflow authoring, catching invalid tool state and connection errors before execution.

## Reader

Bioinformatics readers who use text workflow systems and care about authoring, validation, CI, and IDE support.

## Proposed Structure

1. Problem: workflow languages validate structure, but usually not the internal parameters of each scientific tool invocation.
2. Galaxy opportunity: ToolShed exposes typed tool schemas at ecosystem scale.
3. Library and CLI: validation, conversion, schema export, tool cache, diagrams, reports.
4. Browser editor: Monaco/LSP, IndexedDB cache, diagram/report rendering.
5. VS Code extension: diagnostics, completions, hover docs, quick fixes, conversion commands.
6. Evaluation: IWC round trips, validation coverage, representative errors, latency, offline mode.
7. Agent relevance: structured feedback loop for workflow-authoring agents.

## Key Contrast

Nextflow, Snakemake, and WDL have meaningful validation. The differentiator is depth: per-tool parameter names, values, select options, conditionals, and Galaxy collection typing.

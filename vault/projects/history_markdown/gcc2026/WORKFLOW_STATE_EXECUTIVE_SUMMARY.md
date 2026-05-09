# Workflow State Validation: What We Built and What It Means

> Scope note: the abstract framed this half of the talk as "Workflow State Validation." The work has since grown into a stack — a validation library, a CLI, an in-browser editor, an IDE extension, and an agent-authoring layer on top. The talk's framing still works; what's changed is that the deliverables now compose into something larger than a single feature.

## The Problem

Every bioinformatics workflow system validates something before execution. Nextflow's nf-schema plugin validates pipeline-level parameters against JSON Schema. WDL has three independent validators (womtool, miniwdl, Sprocket) that catch type errors statically. Snakemake offers `--lint`, `--dry-run`, and JSON Schema config validation. These are real capabilities.

But all of them stop at the workflow boundary. None reach inside individual tool invocations to validate that parameter *names* exist, that *values* match the tool's constraints, that *select options* are legal, that *conditional branches* are consistent. They can't — because they lack the metadata. Tool parameters live in process scripts (Nextflow), rule blocks (Snakemake), or task command sections (WDL). The parameter contracts are implicit in code, not declared in queryable schemas.

Galaxy is different. The ToolShed serves strongly-typed, machine-readable parameter schemas for 10,000+ community-maintained bioinformatics tools — full parameter trees with types, constraints, conditional logic, valid option enumerations, and collection type requirements. That metadata existed but wasn't connected to the workflow authoring pipeline. This work connects it — and then layers an IDE, an in-browser editor, and an agent-authoring framework on top of the connection.

## What We Built

A four-tier stack, every tier driven by the same typed tool schemas:

### 1. `@galaxy-tool-util/*` — TypeScript validation library + CLI

A pnpm monorepo (12 packages, no Galaxy server required) providing schema-aware validation, conversion, linting, and tool discovery as a Node and browser library plus standalone CLI binaries.

- **Per-step validation.** Every parameter: names exist, values have correct types, select options are legal, conditional branches are consistent. No other workflow system does this.
- **Per-connection validation.** Output/input type compatibility including Galaxy's collection system (list, paired, list:paired, map-over). The `CollectionTypeDescription` library is now its own published zero-dep package, `@galaxy-tool-util/workflow-graph`, consumed by both validation and the UI's diagram renderer.
- **Format conversion with validation.** Lossless native (`.ga`) ↔ Format2 (`.gxwf.yml`) conversion, tool-aware so per-step state survives round-trips. Stale state cleaning with classification and policy controls.
- **JSON Schema export.** Per-tool, structural workflow, and Galaxy test-format schemas — usable by any language, any editor, any CI system.
- **Tool metadata cache.** Fetch and cache tool parameter schemas from ToolShed 2.0. Two backends: `FilesystemCacheStorage` (Node) and `IndexedDBCacheStorage` (browser / Web Worker). Same library runs in CLI, VS Code, and browser.
- **Tool / repo discovery.** ToolShed search, tool versions, revisions, repository search exposed as CLI subcommands and library APIs.
- **Diagram + report generation.** `gxwf mermaid`, `gxwf cytoscapejs` renderers; HTML and Markdown reports for tree commands.

CLI surface: ~26 subcommands across `gxwf`, `galaxy-tool-cache`, `galaxy-tool-proxy`, and `gxwf-web` (dev server). Strict-mode flag family (`--strict-structure`, `--strict-encoding`, `--strict-state`, `--strict`). Validated against the IWC corpus.

### 2. `gxwf-ui` — In-browser workflow editor

A Vue 3 + PrimeVue web application that embeds the Monaco editor and the galaxy-workflows-vscode language server (via `@codingame/monaco-vscode-api`), backed by IndexedDB for the tool cache. Cytoscape diagram renderer with map-over depth and reduction-edge annotations. The same validators that back the CLI run in the browser tab — no install, no Galaxy server.

A jsDelivr-hosted IIFE bundle (`gxwf-report-shell`) lets Python-side reports render the same Vue components in standalone HTML.

### 3. galaxy-workflows-vscode #85 — IDE extension

The VS Code extension that the original abstract listed as "in progress / not started" is now a single large PR (open, maintainer-endorsed) that delivers the full IDE experience for both `.gxwf.yml` and `.ga`:

- Tool-aware diagnostics inside `state:` blocks: unknown parameters → warnings, invalid values → errors with merged union messages, all pinned to precise sub-ranges.
- Parameter-aware completions for keys *and* values; descends into `section`, `repeat`, and `conditional` (adapting to the selected branch).
- Hover docs sourced from tool XML (name, type, label, help, select options).
- Quick-fix code action for legacy string-encoded `tool_state`.
- Bidirectional Format2 ↔ Native conversion as six commands (preview / sibling / in-place).
- A `Populate Tool Cache` command batch-fetches tools from ToolShed TRS; a status-bar indicator shows cache state; the extension stays usable offline.

Architecturally this is the headline: vendored schemas and TRS clients have been retired and replaced with dependencies on the published `@galaxy-tool-util/{schema,core}` packages. One library, one set of validators, three consumers (CLI, browser, IDE).

### 4. Foundry — Agent skill compiler for Galaxy workflow authoring

The Galaxy Workflow Foundry sits one layer above `galaxy-tool-util`. It decomposes "convert a paper / Nextflow / CWL pipeline into a validated Galaxy workflow" into atomic, schema-checked steps ("Molds") that compile into frozen, portable agent skill bundles. `gxwf` provides the deterministic inner-loop validation: every Mold can author-then-validate-then-fix in a tight cycle, rather than relying on prose caveats. Pipelines exist for `paper-to-galaxy`, `nextflow-to-galaxy`, `cwl-to-galaxy`. First publishable package — `@galaxy-foundry/summarize-nextflow` — statically introspects an nf-core tree and emits a JSON summary validated against a published schema, demonstrating the schema-as-contract pattern end-to-end. Status: skeleton + scaffolding; rapid progress; production use forward work.

Where Workflow State Validation makes a single Galaxy workflow file checkable, Foundry makes the *act of an agent authoring one* reproducible and reviewable.

## The Honest Competitive Picture

The bioinformatics workflow landscape has matured. Every major system offers some form of pre-execution validation. The question is what *level* of validation is possible, and what authoring surfaces sit on top.

| Capability | Galaxy (this work) | Nextflow | Snakemake | WDL |
|---|---|---|---|---|
| Pipeline/workflow-level param validation | Yes | Yes (nf-schema) | Yes (config schema) | Yes (womtool/miniwdl/sprocket) |
| Per-tool invocation param validation | **Yes — names, types, constraints, options** | No | No | No |
| Per-connection type validation | **Yes — collection semantics** | No | No | Partial (WDL types) |
| Centralized tool registry | **10,000+ tools with full param schemas** | Partial (nf-core: 1,300+ modules with I/O metadata, not param schemas) | No | Partial (Dockstore: hosts WDL files, no separate schemas) |
| Graphical workflow editor | Yes (in-app + standalone in-browser) | No (Seqera Platform has launch/monitoring GUI) | No | No |
| Human-writable text format | Yes (Format2) | Yes (DSL2) | Yes (Snakefile) | Yes |
| IDE support (completions / hover / param validation) | **Yes — tool-state-aware** (galaxy-workflows-vscode) | Community extensions | Community extensions | Yes (Sprocket LSP — workflow-level only) |
| Offline validation (no server) | Yes — Node, browser, IDE | Yes (nf-schema) | Yes (--lint, --dry-run) | Yes (womtool, miniwdl, sprocket) |

Galaxy's genuine differentiator is **depth of validation**, not existence of validation. Sprocket's LSP can tell you a `File` input is connected to a `String` output; it can't tell you that your BWA-MEM call uses an invalid scoring matrix option, because that information isn't in the WDL type system. Galaxy can — for every tool in the ToolShed, in your editor, before execution.

## Why This Matters for Agents

AI agents composing bioinformatics workflows face a feedback loop problem. Pipeline-level validation — which all systems now offer — catches configuration errors early. But agents constructing multi-step pipelines still can't know if their tool parameterization is correct until execution, which takes minutes to hours per iteration.

With per-tool validation, the agent gets structured, per-parameter error reports in milliseconds. An agent building a variant-calling pipeline validates each step as it's added — confirming parameter values are legal, connections are type-compatible, collection mapping semantics correct. Only valid workflows get submitted for execution.

Foundry takes the next step: rather than asking an agent to "write a Galaxy workflow," it gives the agent a typed, schema-checked authoring pipeline where each Mold has a specific job and `gxwf` is the gate between steps. The same infrastructure that protects humans from misspelled options protects agents from generating plausible-but-wrong workflows.

The same infrastructure makes Format2 a credible authoring surface — for humans too. An agent or human in VS Code (or in the browser via `gxwf-ui`) gets the same validation coverage as the GUI editor, with autocompletion and inline docs grounded in the real ToolShed metadata.

## What This Means for the Abstract

The abstract argues that Galaxy's reproducibility infrastructure is what's needed for agent-assisted science. This work is a concrete instance: the same typed tool metadata that powers Galaxy's GUI and execution engine now powers offline validation tools, an IDE, an in-browser editor, and an agent skill compiler.

Every workflow system can validate its own configuration language. Only Galaxy can validate the *scientific tool invocations* inside the workflow — because only Galaxy has a centralized registry with full parameter schemas. That's the difference between catching "you misspelled the output directory" and catching "you specified an invalid alignment scoring option that will silently produce wrong results."

The validation infrastructure serves three audiences simultaneously: agents get structured feedback loops, CLI users get a first-class text-based authoring format, and the community gets CI-ready linting for workflow repositories. The agent case is where the impact is most dramatic — agents can't visually inspect a workflow editor or intuit whether a parameter looks right. They need machine-readable feedback at the parameter level, and now they have it at three altitudes: per-step, per-connection, and per-pipeline (via Foundry).

## Current Status (as of talk prep)

- **Shipped:** per-step validation, per-connection validation, format conversion, round-trip validation against IWC, stale state cleaning, legacy encoding detection, ~26 CLI subcommands across `gxwf` / `galaxy-tool-cache` / `galaxy-tool-proxy` / `gxwf-web`, JSON Schema export (per-tool + structural + test-format), browser-compatible cache backend, Cytoscape + Mermaid diagram rendering, HTML/Markdown reports.
- **In active landing:** galaxy-workflows-vscode #85 (open, maintainer-endorsed, expected merge well before talk) — tool-aware diagnostics, completions, hover, bidirectional conversion in VS Code and vscode.dev.
- **In active development:** `gxwf-ui` (in-browser workflow editor with embedded LSP), Foundry pipeline Molds and casting tooling, IWC lint-on-merge CI.
- **Forward:** Foundry production pipelines, broader Mold catalog, full Format2 adoption in the IWC pipeline.

Assume all of the above is presentable at GCC2026 (six weeks out).

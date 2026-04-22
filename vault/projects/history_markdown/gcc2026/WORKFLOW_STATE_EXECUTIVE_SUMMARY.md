# Workflow State Validation: What We Built and What It Means

## The Problem

Every bioinformatics workflow system validates something before execution. Nextflow's nf-schema plugin validates pipeline-level parameters against JSON Schema. WDL has three independent validators (womtool, miniwdl, Sprocket) that catch type errors statically. Snakemake offers `--lint`, `--dry-run`, and JSON Schema config validation. These are real capabilities.

But all of them stop at the workflow boundary. None reach inside individual tool invocations to validate that parameter *names* exist, that *values* match the tool's constraints, that *select options* are legal, that *conditional branches* are consistent. They can't — because they lack the metadata. Tool parameters live in process scripts (Nextflow), rule blocks (Snakemake), or task command sections (WDL). The parameter contracts are implicit in code, not declared in queryable schemas.

Galaxy is different. The ToolShed serves strongly-typed, machine-readable parameter schemas for 10,000+ community-maintained bioinformatics tools — full parameter trees with types, constraints, conditional logic, valid option enumerations, and collection type requirements. That metadata existed but wasn't connected to the workflow authoring pipeline. This work connects it.

## What We Built

A `galaxy-tool-util` package — no Galaxy server required — providing schema-aware workflow validation, conversion, and linting as standalone CLI tools and a Python library.

**Per-step validation.** Given a workflow step and a tool definition, validate every parameter: names exist, values have correct types, select options are legal, conditional branches are consistent. This operates at a granularity no other system matches — not because competitors haven't tried, but because they lack the structured tool metadata.

**Per-connection validation.** Validate that output types are compatible with input types, including Galaxy's collection system (list, paired, list:paired, map-over semantics). The `CollectionTypeDescription` library — extracted from Galaxy's runtime into the standalone package — lets any tool reason about collection semantics offline.

**Format conversion with validation.** Losslessly convert between Galaxy's native format (.ga) and the human-writable Format2 (.gxwf.yml), using tool definitions to correctly interpret state encoding. Round-trip validation proves the conversion is non-destructive: 120/120 IWC (Intergalactic Workflow Commission) real-world workflows pass.

**Stale state cleaning.** When tools are updated, workflows accumulate stale parameters. Automated cleaning with classification and policy controls turns a manual maintenance task into a batch operation.

**JSON Schema export.** Export per-tool parameter schemas as standard JSON Schema — usable by any language, any editor, any CI system. Foundation for IDE integration and external tooling.

**Tool metadata cache.** Fetch and cache tool parameter schemas from ToolShed 2.0 — no Galaxy instance needed.

Twelve CLI tools ship today: validate, clean, roundtrip-validate, export, import, and lint — each in single-file and directory-tree variants. Validated against 120 real-world IWC workflows covering RNA-seq, ChIP-seq, variant calling, mass spectrometry, and image analysis.

## The Honest Competitive Picture

The bioinformatics workflow landscape has matured. Every major system offers some form of pre-execution validation. The question is what *level* of validation is possible.

| Capability | Galaxy (this work) | Nextflow | Snakemake | WDL |
|---|---|---|---|---|
| Pipeline/workflow-level param validation | Yes | Yes (nf-schema) | Yes (config schema) | Yes (womtool/miniwdl/sprocket) |
| Per-tool invocation param validation | **Yes — names, types, constraints, options** | No | No | No |
| Per-connection type validation | **Yes — collection semantics** | No | No | Partial (WDL types) |
| Centralized tool registry | **10,000+ tools with full param schemas** | Partial (nf-core: 1,300+ modules with I/O metadata, not param schemas) | No | Partial (Dockstore: hosts WDL files, no separate schemas) |
| Graphical workflow editor | Yes | No (Seqera Platform has launch/monitoring GUI) | No | No |
| Human-writable text format | Yes (Format2) | Yes (DSL2) | Yes (Snakefile) | Yes |
| IDE/LSP support | In progress (JSON Schema foundation) | Community extensions | Community extensions | Yes (Sprocket LSP — completions, diagnostics, hover) |
| Offline validation (no server) | Yes | Yes (nf-schema) | Yes (--lint, --dry-run) | Yes (womtool, miniwdl, sprocket) |

Galaxy's genuine differentiator is **depth of validation**, not existence of validation. Other systems validate at the workflow configuration level. Galaxy validates at the tool parameter level — every parameter name, every value, every select option, every conditional branch, every collection type connection. This is a structural consequence of having the ToolShed: a centralized, typed tool registry that competitors can't easily replicate because their ecosystems are built on code-level conventions rather than declared schemas.

It's worth noting that WDL's Sprocket project has built impressive IDE tooling (LSP with completions, diagnostics, hover, go-to-definition) — but it validates WDL *syntax and types*, not individual tool invocation parameters. The distinction matters: Sprocket can tell you that a `File` input is connected to a `String` output; it can't tell you that your BWA-MEM call uses an invalid scoring matrix option, because that information isn't in the WDL type system.

## Why This Matters for Agents

AI agents composing bioinformatics workflows face a feedback loop problem. Pipeline-level validation — which all systems now offer — catches configuration errors early. But agents constructing multi-step pipelines still can't know if their tool parameterization is correct until execution, which takes minutes to hours per iteration.

With per-tool validation, the agent gets structured, per-parameter error reports in milliseconds. An agent building a variant-calling pipeline can validate each step as it's added — confirming parameter values are legal, connections are type-compatible, and collection mapping semantics are correct. Only valid workflows get submitted for execution.

The same infrastructure makes Format2 a credible authoring surface. An agent (or a human in an IDE) composing workflows in YAML gets the same validation coverage as the GUI editor. Combined with the JSON Schema export pipeline, this opens a path to rich IDE support — auto-completion, hover documentation, and connection validation inside `state:` blocks — that no workflow editor currently offers for *tool parameter state* on any platform.

## What This Means for the Abstract

The conference abstract argues that Galaxy's reproducibility infrastructure is what's needed for agent-assisted science. This work is a concrete instance: the same typed tool metadata that powers Galaxy's GUI and execution engine now powers offline validation tools that agents use to compose correct workflows without trial-and-error execution.

The key insight for the talk: every workflow system can validate its own configuration language. Only Galaxy can validate the *scientific tool invocations* inside the workflow — because only Galaxy has a centralized registry with full parameter schemas. That's the difference between catching "you misspelled the output directory" and catching "you specified an invalid alignment scoring option that will silently produce wrong results."

The validation infrastructure serves three audiences simultaneously: agents get structured feedback loops, CLI users get a first-class text-based authoring format, and the community gets CI-ready linting for workflow repositories. But the agent case is where the impact is most dramatic — agents can't visually inspect a workflow editor or intuit whether a parameter looks right. They need machine-readable feedback at the parameter level.

## Current Status

- **Complete:** Per-step validation (native + format2 + JSON Schema backends), format conversion, round-trip validation (120/120 IWC pass), stale state cleaning, legacy encoding detection, 12 CLI tools, IWC corpus verification
- **Complete:** Per-connection validation engine, collection type reasoning
- **In progress:** VS Code extension (JSON Schema export foundation ready; tool registry service and dynamic completions not started)
- **Not started:** IWC lint-on-merge CI, full Format2 support in IWC pipeline

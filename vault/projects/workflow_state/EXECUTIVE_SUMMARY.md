# Galaxy Workflow Validation: Strategic Value for Bioinformatics

## The Short Version

We are building infrastructure that makes Galaxy the only bioinformatics platform where an AI agent (or a human) can write a multi-step analysis pipeline, validate every parameter of every tool and every connection between tools — **before executing anything** — against a live registry of 10,000+ community-maintained bioinformatics tools. No other workflow system offers this. The same infrastructure makes Galaxy's human-writable workflow format a production-grade authoring surface, closing the gap with CLI-centric competitors while retaining Galaxy's GUI and massive tool ecosystem.

---

## Context: The Bioinformatics Workflow Landscape

Bioinformaticians compose multi-step pipelines — aligning reads, calling variants, quantifying expression, running statistical models. The dominant systems are:

| System | Strengths | Weaknesses |
|--------|-----------|------------|
| **Nextflow** | DSL2 modules, large community, Seqera platform | No centralized tool registry, no pre-execution validation of tool parameters, no GUI |
| **Snakemake** | Python-native rules, Conda integration, workflow catalog | Same — validation is "run it and see", no GUI |
| **WDL** | Strong typing, Cromwell/Terra ecosystem | Verbose, no tool registry, limited community tooling outside Broad |
| **Galaxy** | 10,000+ ToolShed tools, full GUI, accessibility | Workflow format historically opaque, no offline validation, Format2 was second-class |

All CLI-based systems share a fundamental limitation: **validation happens at execution time**. You write a pipeline, submit it, wait for it to fail, read the error, fix it, resubmit. There is no equivalent of a compiler catching type errors before you run the program. Galaxy has always had richer tool metadata than any competitor, but until now that metadata wasn't connected to the workflow authoring pipeline.

---

## What We're Building

A `galaxy-tool-util` package — **no Galaxy server required** — that provides:

1. **Per-step validation**: Given a workflow step and a tool definition, validate that every parameter name exists, every value has the correct type, every select option is legal, every conditional branch is consistent.

2. **Per-connection validation**: Given two connected steps, validate that output types are compatible with input types — including Galaxy's collection system (lists, pairs, list:paired, map-over semantics).

3. **Whole-workflow validation**: Validate every step and every connection in a workflow file, producing structured pass/fail reports (text, JSON, Markdown).

4. **Format conversion**: Losslessly convert between Galaxy's native format (.ga) and the human-writable Format2 (.gxwf.yml), using tool definitions to correctly interpret state encoding.

5. **Tool metadata cache**: Fetch and cache tool parameter schemas from the ToolShed 2.0 API — the same registry that serves 10,000+ bioinformatics tools. No Galaxy instance needed.

Six CLI tools are already working: `galaxy-workflow-validate`, `galaxy-workflow-clean-stale-state`, `galaxy-workflow-roundtrip-validate`, `galaxy-workflow-export-format2`, and `galaxy-tool-cache`. These have been validated against 111 real-world workflows from the Intergalactic Workflow Commission (IWC) covering RNA-seq, ChIP-seq, variant calling, mass spectrometry, and image analysis.

---

## Why This Matters for Agentic Development

AI agents writing bioinformatics workflows face an **intractable feedback loop** without pre-execution validation:

1. Agent writes/modifies a workflow
2. Workflow is submitted to Galaxy for execution
3. Execution takes minutes to hours
4. Failure message returns (often ambiguous)
5. Agent attempts a fix, goes to step 2
6. Repeat — consuming compute, quota, and wall-clock time

With the validation infrastructure, the loop becomes:

1. Agent writes/modifies a workflow
2. **Agent validates locally in milliseconds** — gets structured per-step, per-parameter error reports
3. Agent fixes errors immediately
4. Only valid workflows are submitted for execution

This is the difference between an agent that burns through compute and API calls trying to get a pipeline to run, and one that confidently produces correct workflows on the first or second attempt.

### Specific Agentic Capabilities This Enables

**Tool Discovery and Composition.** An agent can query the ToolShed API for tools matching a task (e.g., "align paired-end reads to a reference genome"), retrieve the full parameter schema, and know exactly what inputs and options each tool expects — including valid select options, conditional parameter logic, and collection type requirements.

**Step-by-Step Construction with Validation.** An agent building a workflow incrementally can validate each step as it's added — confirming parameter values are legal, connections between steps are type-compatible, and collection mapping/reducing semantics are correct. Errors are caught at authoring time, not execution time.

**Understanding Collections and Map/Reduce.** Galaxy's collection system (list, paired, list:paired, and arbitrarily nested types) enables implicit parallelism — a tool that takes a single file automatically maps over a list of files. The `CollectionTypeDescription` library we've extracted into `galaxy-tool-util` lets an agent reason about these semantics offline: "If I connect a `list:paired` output to a tool expecting `paired`, will it map over the list dimension?" The answer is computable without running anything.

**Workflow Repair and Migration.** When tools are updated (new parameters added, old ones removed, option values changed), workflows accumulate stale state. An agent can use `galaxy-workflow-clean-stale-state` to automatically identify and remove stale parameters, then re-validate — turning a manual, error-prone maintenance task into an automated one.

**Multi-Format Fluency.** An agent can work in whichever format is most convenient — human-readable Format2 YAML for composition, native .ga for compatibility — and convert between them with guaranteed fidelity. The round-trip validation proves the conversion is lossless.

---

## The ToolShed Advantage: 10,000+ Tools with Typed Schemas

This is Galaxy's structural moat. The ToolShed 2.0 API serves `ParsedTool` metadata for every published tool — full parameter trees with types, constraints, conditional logic, and collection requirements. No other bioinformatics platform has anything comparable:

- **Nextflow**: Modules are code snippets. Parameter contracts are implicit in the script. No machine-readable schema.
- **Snakemake**: Rules are Python code. Inputs/outputs are file paths. No parameter typing.
- **WDL**: Tasks declare typed inputs, but there's no shared registry — each institution maintains its own.

Galaxy's ToolShed is a **typed, versioned, centralized registry** of bioinformatics tools. When that registry powers validation at every layer — individual tool calls, step composition, full workflow validation — the math changes fundamentally. An agent (or a human with an IDE) composing a Galaxy workflow has access to richer pre-execution feedback than any competing system can offer.

---

## User-Defined Tools: Flexibility Without Sacrificing Validation

Galaxy's User-Defined Tools (YAML tools) are under active development and address the criticism that Galaxy's tool ecosystem is rigid compared to Snakemake/Nextflow's ability to inline arbitrary code. YAML tools allow users to define custom tools with:

- Typed parameter declarations (same schema as ToolShed tools)
- JavaScript/Python expressions for command construction
- CWL-like runtime state representation
- Full integration with Galaxy's validated state pipeline

The key insight: **user-defined tools get the same validation coverage as ToolShed tools**. A YAML tool's parameters are declared in the same schema format, so an agent composing a workflow that mixes ToolShed tools and custom YAML tools gets identical validation guarantees for both. This gives Galaxy the flexibility of "write arbitrary code" systems like Snakemake while retaining end-to-end validation.

The validated state pipeline for YAML tools (`runtimeify`) is already working — it transforms strongly-typed `JobInternalToolState` into CWL-style runtime state using the tool's parameter model, replacing the legacy unvalidated `to_cwl` path.

---

## Competitive Position

| Capability | Galaxy (with this work) | Nextflow | Snakemake | WDL |
|-----------|------------------------|----------|-----------|-----|
| Pre-execution parameter validation | **Yes — per-step, against tool schema** | No | No | Partial (type checking) |
| Pre-execution connection validation | **Yes — collection type compatibility** | No | No | Partial |
| Centralized tool registry with schemas | **Yes — 10,000+ tools** | No | No | No |
| Graphical workflow editor | **Yes** | No | No | No |
| Human-writable text format | **Yes — Format2** | Yes (DSL2) | Yes (Snakefile) | Yes |
| Inline custom code | **Yes — YAML tools** | Yes | Yes | Yes |
| AI agent validation loop | **Milliseconds, structured errors** | Minutes (execution) | Minutes (execution) | Minutes (execution) |
| Offline validation (no server) | **Yes — ToolShed API + cache** | N/A | N/A | Partial (womtool) |

---

## What's Left

The core validation infrastructure is built and working. Remaining work:

- **Connection validation engine** (Phases 2-5): extend step-level validation to inter-step connections with collection type checking. Foundation is laid (`CollectionTypeDescription` extracted, adapter with tests complete).
- **IWC corpus cleanup**: 25/111 workflows have stale keys — automated cleaning and upstream PRs.
- **IWC CI integration**: lint-on-merge to prevent state rot.
- **ToolShed API endpoint for workflow state schemas**: enables IDE/agent validation without even needing `galaxy-tool-util` installed — just HTTP + JSON Schema.

---

## Summary

Galaxy has always had the largest bioinformatics tool ecosystem and the most accessible interface. What it lacked was a way to leverage its rich tool metadata for pre-execution workflow validation. This work closes that gap — and in doing so, creates a platform uniquely suited for AI-assisted bioinformatics workflow development. No other system can offer an agent structured, millisecond validation feedback against a registry of 10,000+ typed bioinformatics tools. Combined with user-defined tools for custom logic and a full graphical interface for accessibility, Galaxy's workflow platform becomes more capable, more validatable, and more agent-friendly than any competitor.

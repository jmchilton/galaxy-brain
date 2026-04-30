# Galaxy Workflow Foundry

The knowledge base described here is the **Galaxy Workflow Foundry** (or just "the Foundry"). Skills are **cast** from **Molds** — abstract, structured templates inside the Foundry that compile into concrete Claude skills.

Repository: https://github.com/jmchilton/foundry

## Corpus-first

The Foundry is grounded in the IWC workflow corpus, not invented top-down. Patterns, Molds, and design guidance are **derived from observed structure** in real, curated, working `gxformat2` workflows. Cleaned IWC workflows live in `/Users/jxc755/projects/repositories/workflow-fixtures` (the `iwc-format2/` directory). Anything in the Foundry — a pattern page, a Mold, a piece of design guidance — should be traceable back to one or more IWC exemplars, and exemplars double as evaluation material for cast skills.

The Foundry is a **standalone project**. It lives in its own repository, has no direct or indirect dependency on galaxy-brain, and is not a subtree of any existing vault. galaxy-brain (/Users/jxc755/projects/repositories/galaxy-brain) is referenced only as a **design influence** — its ingestion pipeline, frontmatter validation, tag registry, and Astro site are useful patterns to consider, but the Foundry adopts only what fits its (more targeted) purpose and reimplements as needed. No code, content, or runtime coupling.

The Foundry is more targeted than galaxy-brain: knowledge largely (but not exclusively) exists to support a set of agentic skills around building Galaxy workflows.

I want all the information to a lot more structured around progressive disclosure than galaxy-brain. 

There should be a page on patterns. Beneath the patterns, there should be pages for collection manipulation, tabular manipulation, genomic data manipulation, visualization, conditional steps, etc...

Beneath each of those I want specific pages on particular tools or particular patterns. 

These would support skills for building up portions of workflows.

Per the corpus-first principle above: a page per IWC workflow with a category hierarchy is the foundational layer of the Foundry. Pattern pages cite these exemplars; Molds reference them as ground truth. Beyond supporting a "find and compare to nearest best-practice workflow" skill, the corpus pages are the source material the rest of the Foundry derives from.

I want to think of Claude skills as sort of artifacts of more abstract knowledge. I'd like a section of the Foundry to outline **Molds** — abstract, structured templates that describe a workflow-construction action. Each Mold can outline tooling, best practices, suggestions, point at information, etc...

I'd like to then have some way to **cast** these Molds into concrete skills. I would think it would be clear how to write a skill or LLM driven process to convert these kinds of knowledge into stand-alone skills. Still I'd like that to be part of this. I'd think like even a Haiku model could assemble Molds into skills and pull out pieces of the Foundry into skill directories.

## Mold shape (sketch — formal spec deferred)

A Mold is a **typed reference manifest with a presentation layer**, not a self-contained skill and not just a markdown page with wiki links. It lives in the Foundry, renders as a navigable page, and is tied into the rest of the Foundry via *typed* references to heterogeneous artifacts:

- **Pattern pages** — Galaxy workflow construction patterns (markdown reference).
- **CLI manual pages** — per-command/subcommand reference for `gxwf`, `planemo`, etc. (markdown content under `content/cli/<tool>/`).
- **IO schemas** — JSON Schema files declaring the Mold's input/output shape (live in `schemas/`, outside the content tree).
- **Prompt fragments** — reusable prompt snippets (where applicable).
- **Examples / fixtures** — concrete artifacts the cast skill can hand to its consumer.
- **Evaluation plan** — Foundry-only, never packaged into the cast.

Authoring a Mold is closer to writing a richly cross-linked KB page that *declares its supporting artifacts by kind* than to writing a finished skill. The body is a procedural skeleton; the manifest is what casting walks.

## Casting (sketch — formal spec deferred)

Casting produces a **condensed, isolated skill artifact** from a Mold by **per-kind dispatch** over the Mold's typed references. Different kinds are handled differently:

- **Pattern page** → LLM-condensed and inlined into the cast skill body (mixed verbatim and summarization).
- **CLI manual page** → cast to a structured sidecar (typically JSON), referenced from the cast skill body by path. *Not* dumped as raw markdown.
- **IO schema** → copied **verbatim** into the cast bundle's `references/schemas/`.
- **Prompt fragment** → inlined verbatim, no LLM rewrite.
- **Example** → copied verbatim.
- **Evaluation plan** → never packaged; Foundry-only.

The cast skill is **condensed and isolated**: no links back to the Foundry, no runtime dependency on it. Casting supports multiple output targets — standalone Claude skills, skills baked into web applications, more generic (non-Claude) skill formats, possibly others. A single Mold may cast to several targets. Casting is **LLM-driven for kinds that need condensation**, deterministic for kinds that don't (verbatim copies); the process is expected to evolve over time as models and prompting techniques improve.

A cast skill is frozen against the Foundry version it was cast from. Staying current is a re-casting concern, not a runtime concern.

## Evaluation (sketch — formal spec deferred)

Each Mold owns a **skill evaluation plan**: how the cast skill is exercised, which IWC exemplars it should reproduce or align with, pass/fail or qualitative criteria. Evaluation plans live alongside the Mold in the Foundry and are **not** packaged into cast skills. Evals are infrastructure for the Foundry maintainer; the cast skill is the consumer-facing artifact.
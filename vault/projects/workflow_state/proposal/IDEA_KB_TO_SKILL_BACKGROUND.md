# IDEA_KB_TO_SKILL_BACKGROUND.md

## Working Title

**Foundry: A Provenance-Tracked Knowledge-to-Skill Compiler for Scientific Workflows**

## Executive Thesis

The Galaxy Workflow Foundry should be framed as a new open-source infrastructure layer for AI-ready scientific workflows: a human-curated, schema-validated knowledge base that compiles into provenance-tracked agent skills, workflow documentation, MCP-style resources, and workflow conversion procedures. The key claim is not that Foundry is an agent. It is the compiler and verification toolchain that lets agents safely use existing life-science workflow infrastructure.

This framing is stronger than "workflow conversion" alone. Workflow conversion is the motivating use case, but the more fundable thesis is broader: scientific communities need a disciplined way to turn maintainer knowledge, workflow patterns, schemas, examples, and documentation into executable agent context without losing provenance or drifting from the source of truth. RAG, Claude Skills, MCP Resources, OpenAPI-to-tool generation, and `llms.txt` each solve part of this problem. None provides the full pattern Foundry is aiming at: **human-authored KB -> deterministic compile step -> target-specific skill/resource artifacts -> provenance -> validation -> drift detection -> evaluation against real scientific workflows**.

For OS4LS, this lands squarely in Track 2. The RFA prioritizes "benchmarks and standards, endpoints, or protocols that unlock the use of open source tools in agentic workflows" and "interoperability frameworks that make tools composable in AI-driven pipelines." Foundry is exactly that, if anchored in mature Galaxy infrastructure rather than pitched as a young standalone project.

## Why This Is Timely

The OS4LS call is explicitly about evolving life-science open-source software for AI-native research environments. The RFA says many foundational tools were built for manual workflows and need modernization for agents, large-scale model-training pipelines, inference, and evaluation. It prioritizes work that develops standards, endpoints, protocols, benchmarks, and interoperability frameworks for agentic workflows.

At the same time, the AI tooling ecosystem has converged on several extension primitives:

- **Function calling / tools** expose executable actions through JSON Schema-like contracts.
- **MCP** separates tools, resources, and prompts as server primitives.
- **Agent Skills** package instructions, scripts, and reference files using progressive disclosure.
- **RAG and GraphRAG** ground model outputs in external corpora.
- **OpenAPI-to-tool generation** compiles well-structured API descriptions into callable agent tools.
- **`llms.txt`** proposes curated documentation maps for agents.

These systems prove the demand for agent-ready knowledge and actions. They do not solve the maintainer problem: how a scientific community keeps the knowledge that agents consume accurate, versioned, reviewed, and tied to executable validation as the underlying software changes. Foundry's fundable contribution is to make that maintenance problem explicit and build the toolchain around it.

## The Core Failure Mode

The strongest opening problem statement is drift.

Scientific workflow construction depends on facts that change:

- Galaxy tool IDs, versions, wrappers, and parameter names.
- `+galaxyN` tool revision posture.
- Workflow input/output types and collection semantics.
- Format2 / `gxformat2` syntax and validation rules.
- CWL schema behavior.
- Nextflow DSL conventions and nf-core practices.
- IWC workflow patterns and contributor expectations.
- Agent runtime formats and context-loading behavior.

A hand-authored skill can be correct on the day it is written and stale a month later. A RAG index can retrieve fresh prose while the skill's procedural instructions still encode old behavior. An MCP resource can expose a current schema without proving that the skill instruction above it still matches that schema. A documentation site can help humans while remaining hard for agents to use deterministically.

Foundry's answer is compiler-shaped:

1. Author durable knowledge in a typed, reviewable KB.
2. Compile selected knowledge into runtime-specific artifacts.
3. Record exactly which KB entries, source hashes, schemas, prompts, and commits produced each artifact.
4. Validate both the source KB and the compiled output in CI.
5. Evaluate the resulting agent behavior against real workflow tasks.

This is analogous to generated docs, static-site builds, API client generation, or compiler pipelines: the generated artifact is not the source of truth. The KB is.

## Local Foundation: Why Galaxy Makes This Plausible

Foundry alone is young. The proposal should therefore anchor on mature Galaxy ecosystem assets and position Foundry as the integration and compilation layer above them.

Relevant local traction from `POSTURE.md` and `FOUNDRY_WHITE_PAPER.md`:

- `galaxy-workflow-validate`, `galaxy-workflow-clean-stale-state`, `galaxy-workflow-roundtrip-validate`, `galaxy-workflow-export-format2`, `galaxy-tool-cache`, and the `gxwf` umbrella are working CLI surfaces.
- Tool Shed 2.0 is serving typed schemas.
- Format2 / `gxformat2` provides a human-writable Galaxy workflow representation and validation surface.
- Round-trip validation has already run against 111 IWC workflows.
- The VSCode Galaxy workflow extension and language-server work are being extended with tool-state-aware validation and completions.
- User-Defined Tools connect custom logic to the same typed-parameter validation path.
- Foundry already has the skeleton for content types, Molds, Patterns, pipeline phases, reference manifests, cast scaffolding, provenance files, and validation.

The key Galaxy moat:

> Galaxy is the only major bioinformatics workflow system where an agent can propose a multi-step workflow and validate tool IDs, parameter state, and step connections against a centralized registry of thousands of community-maintained tools before executing anything.

That claim makes the proposal more than an AI-docs project. It gives Foundry a hard substrate for correctness that most workflow systems lack.

## Foundry's Architectural Claim

Foundry treats skills as compiled artifacts, not authored artifacts.

The local white paper already names the important pieces:

- **Patterns**: reusable Galaxy construction idioms grounded in real workflows.
- **Source-patterns**: source-to-target mapping idioms, such as Nextflow-to-Galaxy.
- **CLI command pages**: human-framed wrappers around deterministic tools like `gxwf` and Planemo.
- **Schemas**: vendored or Foundry-authored contracts used by both humans and casts.
- **Molds**: atomic action units with typed reference manifests.
- **Pipelines**: ordered Mold journeys such as `nextflow-to-galaxy`, `cwl-to-galaxy`, or `paper-to-cwl`.
- **Casts**: target-specific compiled artifacts, such as Claude-style skills or future MCP resource bundles.
- **Provenance**: the audit substrate tying every cast to Mold revision, references, hashes, commit SHA, model, prompt identity, and cast history.

This is a strong proposal frame because it gives reviewers concrete nouns. "Knowledge-to-skill compiler" can sound abstract. "Pattern, Mold, Pipeline, Cast, provenance manifest, validator, IWC eval corpus" sounds buildable.

## Landscape: What Existing Systems Solve and Leave Open

### RAG

RAG is the dominant bridge between knowledge bases and LLM outputs. It retrieves relevant documents or chunks at runtime and places them in context. The original RAG paper showed that non-parametric retrieval can improve knowledge-intensive generation. RAG remains valuable when a corpus is large, frequently changing, and impossible to precompile.

But RAG is not a maintenance model for executable workflow skills. Barnett et al. identify recurring RAG failure points, including missing content, retrieval miss, retrieved content not making it into context, extraction failure, wrong format, incorrect specificity, and incomplete answers. Their abstract emphasizes that robustness evolves during operation rather than being fully designed at the start. That posture is tolerable for search-like assistance. It is dangerous for workflow generation where one missing parameter name or wrong collection type can invalidate a pipeline.

Foundry should not argue that RAG is bad. It should argue that RAG is insufficient as the primary grounding mechanism for schema-bound scientific workflows. Runtime retrieval can augment a cast, but the core behavior should be compiled, pinned, and validated before use.

### Long Context and GraphRAG

Long-context models reduce the pressure to retrieve, but they do not eliminate context-management risk. "Lost in the Middle" showed that models often use information best at the beginning or end of long contexts and worse in the middle. This matters for monolithic workflow skills: dumping all Galaxy caveats, examples, schemas, and docs into one prompt creates exactly the kind of context where critical details can be present but unused.

GraphRAG improves over flat retrieval for global sensemaking queries by building graph indexes and community summaries. It is relevant as evidence that corpus organization matters. But GraphRAG remains primarily a retrieval/summarization architecture. Foundry's use case is different: it must produce executable action guidance with schema validation and provenance, not just better answers over a corpus.

### Corpus2Skill

Corpus2Skill is the closest published analog to Foundry's direction. It compiles a document corpus offline into a hierarchical skill directory and lets an agent navigate the resulting tree at serve time. Its abstract names the same problem Foundry cares about: RAG hides corpus organization from the agent.

The distinction is important:

- Corpus2Skill starts from an enterprise document corpus and uses automatic clustering and summarization.
- Foundry starts from curated maintainer-authored knowledge, schemas, CLI contracts, examples, and workflow corpora.
- Corpus2Skill optimizes navigation over a corpus.
- Foundry optimizes correctness of task execution against scientific workflow schemas.
- Corpus2Skill has corpus-level structure.
- Foundry needs per-artifact provenance and drift detection from source KB entries to compiled skills.

Corpus2Skill is a credibility multiplier because it shows the field is moving toward compiled corpus structures. Foundry's novelty is applying the pattern to a schema-bound scientific software ecosystem with human curation and build-time verification.

### Agent Skills

Anthropic's Agent Skills format is a strong output target but not a source-governance model. The official docs describe skills as directories containing `SKILL.md` plus optional resources such as scripts and references. Their key design feature is progressive disclosure: metadata is always available, `SKILL.md` loads when relevant, and supporting files load as needed. Claude Code docs also emphasize that `description` drives automatic loading, `SKILL.md` should remain concise, and supporting files should be referenced so the agent knows when to load them.

This validates Foundry's target artifact shape. It does not solve:

- How domain experts author the source knowledge.
- How compiled skill instructions trace back to source KB entries.
- How stale skills are detected.
- How cross-runtime variants stay equivalent.
- How to evaluate whether a skill faithfully represents its source.

Foundry can therefore say: Agent Skills are the packaging format; Foundry is the scientific build system.

### Skill Supply Chain and Trust

Recent skill-security work strengthens the provenance argument. As skills become installable packages, their natural-language metadata and instruction bodies become operational supply-chain surfaces, not passive documentation. A May 2026 preprint on `SKILL.md` supply-chain attacks studies attacks across discovery, selection, and governance stages and reports that short textual triggers can improve adversarial skill visibility, description framing can bias selection toward adversarial variants, and semantic evasion can avoid blocking verdicts. A separate 2026 survey of agent skills frames provenance as part of skill trust and lifecycle governance, citing empirical vulnerability rates in community-contributed skills.

This matters for Foundry because scientific workflow skills will carry authority. If a compiled skill tells an agent to select a Galaxy tool, set parameters, or transform a workflow, the user needs to know where that instruction came from and whether it has been reviewed. Foundry's provenance chain is therefore not just a reproducibility feature. It is also a trust and safety primitive:

- Skill instructions can be traced to reviewed KB entries.
- Bundled references can be pinned by content hash.
- Generated casts can be rejected if their source graph changes.
- Runtime targets can inherit trust only from validated source artifacts.
- Third-party or experimental skills can be labeled differently from corpus-observed or cast-validated skills.

### MCP

MCP is the strongest standards comparator. Its official spec defines:

- **Tools**: model-controlled executable functions with schemas.
- **Resources**: application-driven context objects such as files, database schemas, or application-specific information.
- **Prompts**: user-controlled prompt templates exposed by servers.

MCP Resources are especially relevant because they standardize how external context can be exposed to LLM applications. MCP Tools can also return structured content and output schemas, which aligns well with Galaxy validation and workflow-state tooling.

But MCP remains a runtime protocol. It does not tell a scientific community how to maintain a curated KB, compile it into multiple target runtimes, prove that a given skill is current, or evaluate drift from the source. The right framing is not "Foundry versus MCP." It is "Foundry can emit MCP resources and prompts, but MCP alone is not the compiler."

### OpenAPI-to-Tool Generation

OpenAPI tool generation is the cleanest existing example of compile-time grounding. Google's ADK `OpenAPIToolset`, for example, automatically generates callable tools from an OpenAPI v3 specification: it parses the spec, discovers operations, builds function declarations, and executes HTTP calls when selected by an agent.

That pattern is very close to what Foundry wants, but OpenAPI is unusually machine-readable. Scientific workflow knowledge is not just an API spec. It includes prose rationale, schema constraints, corpus-observed patterns, version-specific tool behavior, examples, test fixtures, and contributor judgment. Foundry generalizes the OpenAPI pattern from "schema -> tools" to "curated scientific KB -> skills/resources/docs/actions."

### `llms.txt`

`llms.txt` is useful prior art for curated, model-readable documentation maps. It is a lightweight convention for exposing high-signal documentation to agents and models. It helps with discovery and context economy.

It is not a provenance or validation system. It has no executable action surface, no dependency graph, no per-reference evidence status, and no guarantee that runtime agent behavior matches the linked docs. Foundry can use an `llms.txt`-style export as one low-cost surface, but the proposal should avoid making it central.

### Fine-Tuning and Model Distillation

Fine-tuning can bake domain behavior into model weights, but that is the wrong default for this grant. The RFA explicitly does not want AI/ML model development itself. More importantly, model weights are a poor provenance surface. If a Galaxy tool wrapper changes, a fine-tuned model does not know why or where its behavior came from. Foundry should be framed as model-agnostic infrastructure that makes existing tools legible to many agents, not as an effort to train a Galaxy model.

### Voyager and Skill Harvesting

Voyager-style systems grow skill libraries from successful agent experience. This is useful in open-ended domains where no authoritative KB exists. Scientific workflows are different. Maintainers already have authoritative sources: schemas, tools, tests, curated workflows, papers, tutorials, and review processes. Agent execution traces can be useful evidence, but they should flow back into the KB through human review before becoming source knowledge.

The best long-term pattern is bidirectional:

1. Human-curated KB compiles into skills.
2. Skills run against real workflows.
3. Failures and successful traces generate candidate KB updates.
4. Humans review those updates.
5. The compiler recasts the downstream skills.

That is a research direction worth naming, but not the first-year MVP.

## Why Scientific Workflows Are the Right Domain

Scientific workflows have exactly the properties that make compile-time grounding valuable:

- **Schema-bound artifacts.** Galaxy tool state, CWL documents, workflow inputs/outputs, and test fixtures are structured enough to validate.
- **High cost of plausible errors.** A hallucinated parameter or wrong tool revision can produce invalid or misleading analyses.
- **Multiple mature ecosystems.** Galaxy, Nextflow, CWL, WDL, and Snakemake have overlapping communities and corpora.
- **Human knowledge is distributed.** Workflow expertise lives in maintainers, IWC examples, GTN tutorials, Planemo conventions, Tool Shed metadata, and scattered docs.
- **Documentation and execution are coupled.** A workflow's scientific intent, expected inputs, outputs, and validation tests should travel together.
- **Agentic demand is rising.** Agents are increasingly asked to read papers, inspect pipelines, write workflows, choose tools, and validate outputs.

The Foundry idea is strongest when it does not claim to replace existing workflow engines. It makes their knowledge and validation surfaces usable by agents.

## Galaxy, CWL, and Nextflow Positioning

### Galaxy

Galaxy is the anchor because it has the best validation story. Format2 is explicitly a human-friendly YAML workflow format that converts to/from native Galaxy `.ga`. `gxformat2` provides linting, normalization, and validation. Tool Shed 2.0 and `galaxy-tool-util` provide the typed registry substrate that agents need.

Foundry should position Galaxy as the first complete target: not because Galaxy is the only workflow system that matters, but because Galaxy lets the project prove compile-time validation in a way the others cannot yet.

### CWL

CWL is the portability story. The official CWL site describes CWL as an open standard for describing command-line tools and workflows. The specification is developed by a multi-vendor working group and formally managed with community governance. That makes CWL a plausible intermediate representation or cast target for workflow translation.

The risk is political and practical: CWL tooling and community energy are thinner than Galaxy or Nextflow. The proposal should therefore avoid a "save CWL" frame. Use CWL as one target in a broader compiler: a stable, formally specified workflow representation that can support cross-system validation and portability.

### Nextflow

Nextflow is the source ecosystem with the strongest pipeline-community gravity, especially through nf-core. Official Nextflow docs describe workflows as functions specialized for composing processes and dataflow logic, with DSL2 as the current workflow model. Nextflow is highly successful for human pipeline authors, but agentic static validation is harder because process logic, channels, and Groovy semantics are not a centralized typed tool registry.

Foundry's job is not to compete with Nextflow. It is to make high-value Nextflow/nf-core patterns translatable into validated Galaxy or CWL artifacts while preserving scientific intent and provenance.

## What Is Actually Novel

The novelty should be stated carefully. None of the individual pieces is new:

- Knowledge bases exist.
- Skills exist.
- RAG exists.
- MCP resources exist.
- OpenAPI-to-tool generation exists.
- Workflow validators exist.
- Static-site content collections exist.
- Scientific workflow languages exist.

The novel contribution is the combination:

> A human-curated, schema-validated scientific workflow KB that compiles into target-specific agent skills and resources with per-reference provenance, drift detection, and validation against real workflow corpora.

More concrete novelty claims:

- **Human curation as a first-class design choice.** Unlike RAG over scraped docs or Corpus2Skill over enterprise corpora, Foundry treats maintainer judgment as the source of truth.
- **Skills as derivatives.** The maintained artifact is the KB; skills are generated deployment artifacts.
- **Per-reference evidence metadata.** References can carry `hypothesis`, `corpus-observed`, or `cast-validated` status, making confidence auditable.
- **Schema-bound validation.** Galaxy/CWL schemas and validators catch failures before execution.
- **Multi-target casting.** The same KB can emit Claude skills, MCP resources/prompts, web docs, and future agent-runtime formats.
- **Corpus-first authoring.** Patterns earn their place from observed IWC or workflow-corpus uptake, reducing speculative ontology growth.
- **Drift as a CI failure.** Staleness is not discovered by users; it is detected when compiled artifacts no longer match source hashes or validation contracts.

## Proposed Grant Shape

### One-Sentence Pitch

Build the first open, provenance-tracked compiler that turns curated scientific workflow knowledge into validated, target-portable agent skills and documentation, using Galaxy, IWC, CWL, and Nextflow translation as the proving ground.

### Track

OS4LS Track 2: Foundational Libraries and Ecosystem Initiatives.

### Priority Areas

Primary:

- Benchmarks, standards, endpoints, or protocols that unlock open-source tools in agentic workflows.
- Interoperability frameworks that make tools composable in AI-driven pipelines.

Secondary:

- Structuring scientific data/metadata for use in model training, inference, or evaluation, if workflow documentation and provenance are framed as structured scientific metadata rather than new datasets.

### Core Work Packages

1. **Foundry content and schema hardening**
   - Finalize source content contracts for Patterns, Molds, Pipelines, Schemas, CLI pages, and research notes.
   - Publish provenance schema as a standalone documented contract.
   - Add contributor-facing docs for Galaxy maintainers, IWC contributors, and AI engineers.

2. **Compiler and cast targets**
   - Harden deterministic cast generation.
   - Emit at least two target formats: Claude/Agent Skills and MCP resource/prompt bundles.
   - Define a runtime-neutral intermediate representation for skills/resources if the target divergence becomes too large.

3. **Workflow conversion exemplars**
   - Ship end-to-end casts for `nextflow-to-galaxy`, `cwl-to-galaxy`, and one `paper-to-galaxy` or `paper-to-cwl` path.
   - Ground every exemplar in real IWC/nf-core/CWL workflows or papers.
   - Include validation loops via `gxwf`, `gxformat2`, and CWL validators where applicable.

4. **Executable workflow documentation**
   - Define a structured workflow-doc schema: scientific intent, inputs, outputs, assumptions, tool choices, citations, tests, validation status, and provenance.
   - Render this for humans and package it for agents.
   - Integrate with IWC CI as a proving ground.

5. **Evaluation and benchmark**
   - Build a KB-to-skill fidelity harness.
   - Define golden workflow translation tasks.
   - Score compiled-skill behavior using deterministic validators, round-trip checks, and human review on scientific intent preservation.

6. **Community and sustainability**
   - Coordinate with Galaxy core, IWC, Tool Shed, gxformat2, GTN, and CWL stakeholders.
   - Run contributor sprints to author Patterns and workflow docs.
   - Publish docs, tutorials, and a roadmap for post-grant maintenance.

## Evaluation Strategy

The evaluation should not depend primarily on LLM-as-judge. Reviewers will trust deterministic checks more.

Suggested indicators:

- Number of curated Patterns/Molds with `corpus-observed` or `cast-validated` evidence.
- Number of compiled casts with valid provenance manifests.
- Percent of casts reproducibly regenerated byte-stably from unchanged sources.
- Number of IWC workflows with structured workflow docs.
- Number of workflow conversion tasks passing static validation.
- Reduction in hallucinated Galaxy tool IDs, missing `+galaxyN` revisions, invalid parameter names, and invalid connections relative to a baseline monolithic skill or generic agent.
- Number of successful round-trip validations on IWC workflows.
- Time-to-diagnosis for stale workflow state before and after Foundry-guided validation.
- Number of MCP/Skill/resource targets generated from the same source KB.
- Contributor adoption: PRs to Patterns, workflow docs, or validation fixtures from non-core authors.

Evaluation tiers:

1. **Source KB evaluation**: schema validity, link integrity, reference status, corpus evidence.
2. **Compilation evaluation**: provenance completeness, dependency graph correctness, deterministic recast.
3. **Artifact evaluation**: target-specific format validation, stale cast detection.
4. **Behavior evaluation**: agent runs on golden workflow tasks, scored by `gxwf`, CWL validators, and human scientific-intent review.

## Landscape Table

| Comparator | What it provides | What it lacks for this proposal | Foundry position |
|---|---|---|---|
| RAG / vector search | Runtime grounding over large corpora | Retrieval miss, weak completeness, limited source-to-instruction provenance | Use as optional runtime augmentation, not primary correctness layer |
| GraphRAG | Better corpus-level sensemaking through graph/community summaries | Still retrieval/summarization oriented; no executable skill provenance | Useful prior art on structured corpus navigation |
| Corpus2Skill | Offline corpus-to-skill navigation | Auto-clustered document corpora, not curated scientific schemas/workflows | Closest research analog; Foundry is curated and validation-heavy |
| Anthropic Agent Skills | Portable skill package with progressive disclosure | No source KB governance or compile-time provenance | Target format |
| Skill security / supply-chain scanners | Emerging analysis of malicious or vulnerable skills | Mostly registry/runtime focused; does not create trusted scientific source artifacts | Provenance and source curation become trust primitives |
| MCP Resources/Prompts/Tools | Standard runtime protocol for context/actions | No KB compiler, drift detection, or source fidelity harness | Target and integration surface |
| OpenAPI tool generation | Compile API specs into callable tools | Works for APIs, not mixed prose/schema/workflow knowledge | Narrow precedent for schema-to-agent compilation |
| `llms.txt` | Agent-readable docs map | No validation, provenance, execution, or drift detection | Low-cost discovery export |
| Fine-tuning | Embeds behavior in weights | Poor update/provenance; out of OS4LS scope | Non-goal |
| Voyager-like skill harvesting | Learns skills from execution | No authoritative human-curated source | Future feedback loop after human review |
| Nextflow/nf-core | Strong workflow ecosystem and curated pipelines | Harder pre-execution parameter validation via central typed registry | Source corpus and translation source |
| CWL | Formal, portable workflow standard | Tooling/community quieter; not enough alone | Portable cast/IR target |
| Galaxy | Mature life-science platform, typed tool registry, IWC | Needs agent-ready docs/skills/tooling | Anchor substrate |

## Risks and Mitigations

### Risk: Foundry is too new for OS4LS

Mitigation: do not submit "Fund Foundry" as a young project. Submit a Galaxy ecosystem proposal with Foundry as the compiler layer connecting mature assets: Tool Shed 2.0, `gxformat2`, `galaxy-tool-util`, IWC, Planemo, VSCode validation, GTN, and CWL.

### Risk: Reviewers think this is AI model development

Mitigation: state repeatedly that no model training is proposed. The deliverable is open-source infrastructure that existing agents can use: schemas, compilers, validators, docs, benchmarks, and provenance.

### Risk: "Why not just RAG?"

Mitigation: contrast the correctness requirements of scientific workflows with retrieval QA. A workflow cast must preserve exact tool IDs, versions, parameters, data types, and tests. Runtime retrieval can miss or omit facts. Foundry checks consistency at build time.

### Risk: "Why not just MCP?"

Mitigation: MCP is a protocol for exposing tools, prompts, and resources at runtime. Foundry is the build system that produces and validates those resources from authoritative scientific knowledge. They are complementary.

### Risk: Skills are vendor-specific

Mitigation: treat Claude/Agent Skills as one cast target. Include MCP resources/prompts and generic Markdown/site outputs as additional targets. The source KB remains runtime-independent.

### Risk: Provenance becomes bureaucracy

Mitigation: keep provenance machine-generated and tied to concrete debugging workflows: "Why did this cast say to use this tool version?" "Which Pattern made this recommendation?" "Which casts became stale after this schema update?"

### Risk: CWL politics

Mitigation: frame CWL as a portable target, not as a takeover or rescue. Seek coordination with CWL maintainers and avoid proposing a competing runner or unilateral spec fork.

### Risk: Evaluation is too fuzzy

Mitigation: make deterministic validation the backbone. Use human review only for scientific-intent preservation and edge cases. Publish the benchmark tasks, validators, and failure taxonomy.

## LOI-Ready Summary Paragraph

Scientific workflow agents need more than access to documentation: they need curated, versioned, validated knowledge that can be compiled into the exact runtime format an agent consumes, with a provenance trail back to the scientific and software sources that justify each instruction. We propose to build the Galaxy Workflow Foundry as a provenance-tracked knowledge-to-skill compiler for life-science workflows. Using Galaxy's typed Tool Shed schemas, `gxformat2` validation, the Intergalactic Workflow Commission corpus, and CWL/Nextflow translation paths as the proving ground, Foundry will compile human-maintained Patterns, workflow documentation, schemas, CLI references, and examples into target-portable agent skills and MCP resources. The project will deliver a validated compiler pipeline, workflow-documentation schema, conversion exemplars, provenance manifests, and an evaluation benchmark for agentic workflow authoring. This is not an AI model or a workflow engine; it is the open-source infrastructure layer that lets existing agents safely compose, translate, and document scientific workflows using existing community tools.

## LOI Landscape Paragraph

Most current approaches to agent grounding operate at runtime. RAG and GraphRAG retrieve or summarize external corpora but cannot guarantee that a generated workflow instruction is complete or current with respect to a tool schema. MCP standardizes runtime access to tools, resources, and prompts, but does not provide a build system for maintaining those resources from curated scientific knowledge. Anthropic Agent Skills define a useful package format with progressive disclosure, but leave source governance, provenance, drift detection, and evaluation to each adopter. OpenAPI tool generators demonstrate compile-time generation from machine-readable API specs, but scientific workflow knowledge mixes schemas, examples, prose rationale, tests, and community practice. Corpus2Skill is the closest research analog, compiling enterprise document corpora into navigable skill trees, but it is not aimed at human-curated, schema-bound scientific workflows. Foundry fills this gap by compiling reviewed workflow knowledge into validated, provenance-bearing artifacts for multiple agent runtimes, anchored in Galaxy's unusually strong typed tool registry and workflow validation ecosystem.

## Deliverable Sketch for a 24-Month Proposal

### Year 1

- Publish Foundry provenance schema and cast-target adapter contract.
- Ship first end-to-end Galaxy cast path for a real workflow conversion.
- Define workflow-documentation schema and apply it to a pilot subset of IWC workflows.
- Emit Claude/Agent Skill and static web documentation from the same source KB.
- Build stale-cast detection and deterministic recast checks in CI.
- Publish comparison docs: RAG, MCP, Agent Skills, OpenAPI, Corpus2Skill, `llms.txt`.

### Year 2

- Add MCP resource/prompt target.
- Expand conversion paths to include CWL and Nextflow sources.
- Run benchmark against a larger IWC/nf-core/CWL corpus.
- Integrate workflow-doc checks into IWC contribution flow.
- Publish training materials and contributor guides.
- Release a sustainability plan for ongoing Pattern/Mold authoring and cast maintenance.

## Open Questions Before Proposal Drafting

- Should the public term be "knowledge-to-skill compiler," "workflow knowledge compiler," or "agent-ready workflow toolchain"?
- Which target should be first-class in the LOI: Agent Skills, MCP, or both?
- Which conversion path is the strongest flagship demo: `nextflow-to-galaxy`, `cwl-to-galaxy`, or `paper-to-galaxy`?
- How much of the benchmark should use IWC only versus including nf-core and CWL examples?
- Who should be named collaborators: IWC, GTN, CWL maintainers, Tool Shed 2.0, gxformat2, Planemo, VSCode extension maintainers?
- Can the proposal include a small number of GTN tutorials as a second-domain proof, or would that dilute the workflow focus?
- Is "Tool Shed 2.0" the external-facing name, or should the proposal use "typed Tool Shed APIs"?
- What proof artifact can be produced before LOI: one annotated cast with `_provenance.json`, one workflow-doc page, or one benchmark task?

## Source Notes

Local proposal sources:

- `POSTURE.md`
- `FOUNDRY_WHITE_PAPER.md`
- `FOUNDRY_HARDENING_FOLLOWUPS.md`
- `background/BRIDGING_KB_AND_SKILLS.md`
- `background/SKILLS_IN_AI.md`
- `background/KNOWLEDGE_BASES_IN_AI.md`
- `IDEA_COMPILER_BACKGROUND.md`
- `IDEA_CWL_BACKGROUND.md`
- `IDEA_GTN_BACKGROUND.md`

External sources reviewed:

- OS4LS RFA: https://os4science.org/funding_opportunity/os4ls/
- OS4LS PDF RFA: https://os4science.org/wp-content/uploads/RFA-OS4LS.pdf
- Anthropic Agent Skills overview: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- Claude Code Skills docs: https://code.claude.com/docs/en/skills
- Agent Skills specification overview: https://www.mintlify.com/anthropics/skills/spec/overview
- Agent Skills survey, architecture/security: https://arxiv.org/abs/2602.12430
- SKILL.md supply-chain attacks: https://arxiv.org/abs/2605.11418
- MCP Tools spec: https://modelcontextprotocol.io/specification/draft/server/tools
- MCP Resources spec: https://modelcontextprotocol.io/specification/draft/server/resources
- MCP Prompts spec: https://modelcontextprotocol.io/specification/draft/server/prompts
- Google ADK OpenAPI tools: https://adk.dev/tools-custom/openapi-tools/
- OpenAI function-calling help center: https://help.openai.com/en/articles/8555517-function-calling-in-the-openai-api
- RAG, Lewis et al. 2020: https://arxiv.org/abs/2005.11401
- Seven RAG failure points, Barnett et al. 2024: https://arxiv.org/abs/2401.05856
- Lost in the Middle, Liu et al. 2023: https://arxiv.org/abs/2307.03172
- GraphRAG, Edge et al. 2024/2025: https://arxiv.org/abs/2404.16130
- Corpus2Skill, Sun et al. 2026: https://arxiv.org/abs/2604.14572
- Galaxy Format2 description: https://galaxyproject.github.io/gxformat2/v19_09.html
- gxformat2 docs: https://gxformat2.readthedocs.io/
- IWC Galaxy Hub page: https://galaxyproject.org/news/2025-11-19-iwc1/
- CWL specification: https://www.commonwl.org/specification
- CWL home: https://www.commonwl.org/
- Nextflow workflow docs: https://www.nextflow.io/docs/stable/workflow.html

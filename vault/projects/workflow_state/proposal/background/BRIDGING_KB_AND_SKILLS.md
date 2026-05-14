# Bridging Knowledge Bases and Agent Skills

*Opinionated synthesis. Companion to the neutral surveys [KNOWLEDGE_BASES_IN_AI.md](./KNOWLEDGE_BASES_IN_AI.md) and [SKILLS_IN_AI.md](./SKILLS_IN_AI.md). This document takes positions; those documents stay descriptive.*

---

## The Gap Is Not an Accident

Knowledge bases and agent skills are almost always built as separate artifacts. This is not architectural laziness — it reflects a real modularity gain. A KB can be maintained by domain experts who know nothing about prompt engineering. A skill can be tuned for a specific agent runtime without touching authoritative content. The clean separation has a direct software analogy: documentation and code.

But the analogy exposes the failure mode. Documentation and code drift apart the moment the edit gates are different. The same fate awaits KB–skill pairs whenever "updating the KB" and "updating the skill" are different operations performed by different people on different schedules with no shared verification step. Real-world evidence is now concrete: in the hermes-agent project, bundled `SKILL.md` files listed only four terminal backends while the actual codebase supported six — `daytona` and `singularity` had been added but nobody updated the skill [1]. The issue submitter framed the only sustainable fixes as either CI validation against source or compile-time generation of skill content from source.

What is load-bearing about the separation? Three things:

1. **Audience.** KB authors write for humans and long-term archive; skill authors write for a specific model with a specific context budget at a specific moment.
2. **Update cadence.** A KB accretes knowledge over months; a skill may need to change when a model API changes, not when domain knowledge changes.
3. **Format mismatch.** Authoritative knowledge is often prose, schema, and exemplars in interleaved formats; a usable skill is usually structured instructions optimized for model consumption.

What breaks when you ignore the separation entirely and conflate the two? The KB becomes a hostage to skill-formatting constraints. Domain experts start writing to prompt-engineering taste rather than accuracy and completeness. The authoritative record degrades. Conversely, skills written without a grounded KB become brittle folklore — instructions nobody can trace to a source and nobody knows how to verify.

**The position taken here:** the separation should be preserved at the **authoring** level and dissolved at the **deployment** level. A deterministic compilation step — auditable, versioned, CI-enforced — is the correct bridge. The field has not converged on this position yet, but the evidence for it is accumulating.

---

## Existing Approaches to Bridging

### RAG as Bridge

Retrieval-augmented generation is the most widely deployed bridge between KB and skill. The skill delegates grounding to runtime retrieval: the agent queries the KB when it needs it, and retrieved context substitutes for pre-baked knowledge. Every major cloud vendor now ships a first-party RAG product (Azure AI Search agentic retrieval, AWS Bedrock Knowledge Bases, Google Cloud RAG) [2][3][4].

RAG's appeal is freshness and scale. If the KB has millions of documents and unpredictable access patterns, you cannot pre-compile a skill for every possible query. RAG is the only practical architecture at that scale.

But RAG has structural failure modes that compile-time grounding avoids. A 2024 analysis identified seven failure classes in production RAG systems; the most common is retrieval miss — the right document exists but the system fails to surface it — and the second most common is proceeding without validating whether retrieved content is sufficient [5]. More fundamental: RAG gives the skill no overview of the KB. The agent cannot reason about corpus coverage, cannot know what it hasn't retrieved, and cannot verify completeness. Skill-RAG (2025) addresses this by adding a hidden-state prober that detects when retrieval has stalled and routes to recovery strategies [6]. The existence of such a paper is evidence that naive RAG is not a solved problem.

Latency is the third failure mode. VoiceAgentRAG documents the latency bottleneck in real-time agents and proposes a dual-agent architecture where a background process pre-populates a cache from predicted follow-up queries [7]. Pre-computed grounding eliminates this class of problem entirely.

**Position:** RAG is appropriate when the KB is large, heterogeneous, and frequently updated, and when retrieval miss is an acceptable failure mode. For schema-bound, high-stakes, or latency-sensitive domains, compile-time grounding beats runtime-only retrieval.

### Corpus2Skill: Navigate, Don't Retrieve

The most architecturally significant recent work on bridging is the "Don't Retrieve, Navigate" paper (2025), which introduces Corpus2Skill [8]. The core insight: RAG treats an LLM as a passive consumer of search results. The LLM sees retrieved passages but has no visibility into corpus organization — it cannot reason about what it hasn't seen.

Corpus2Skill compiles a document corpus into a hierarchical skill directory (a `SKILL.md` at each node, `INDEX.md` for routing) through iterative embedding, K-Means clustering, and LLM-based summarization. At inference time, an agent navigates the compiled tree with file-system tools rather than issuing embedding-based queries. This gives the agent explicit visibility into corpus structure: it knows what categories exist, can decide whether to go deeper, and can reason about coverage.

The benchmarks are concrete: on WixQA, Corpus2Skill achieved token F1 of 0.460 versus agentic RAG's 0.388 (+19%), with higher factuality and context recall. The cost per query was higher — a fair exchange for schema-bound, precision-critical domains.

Corpus2Skill is the closest existing analog to the "compiled-KB" shape. The differences are that Corpus2Skill compiles automatically from text corpora where the more general pattern compiles curated human-authored knowledge with explicit provenance.

### Skill Libraries Grounded in Docs

Multiple commercial AI coding tools bring KB content into skill context through bundled documentation:

- **GitHub Copilot Workspace** ingests repository documentation, README files, and schema files as grounding context for code generation.
- **Cursor** supports `/llms.txt` and direct doc indexing; the agent's context at task time includes relevant fetched content from indexed sources.
- **Claude Projects** let users upload files directly into a project knowledge base, used across all conversations in that project [9][10].
- **Custom GPTs** support up to 20 knowledge files that the model references via runtime retrieval [10].

The Claude Projects and Custom GPT patterns are essentially runtime RAG — files are vectorized and retrieved at inference time, not compiled into the skill. The skill author has no control over what gets retrieved or how. This is acceptable for general-purpose Q&A assistants; it is insufficient for skills that depend on precise adherence to schemas, version-specific CLI interfaces, or pattern libraries where retrieval miss is a correctness failure.

### MCP Resources: KB as Runtime Context

The Model Context Protocol, released by Anthropic in November 2024 and since donated to the Linux Foundation [11], defines three server primitives: tools (functions), prompts (templates), and resources. Resources are explicitly defined as "data sources that provide contextual information to AI applications" — file-like objects an agent can read for grounding.

MCP's resource primitive is the standard's acknowledgment that skills need KB context and that KB context should be explicitly surfaced rather than embedded in prompts or retrieved through opaque vector search. The June 2025 MCP revision added structured tool outputs, enabling tool chains where one tool returns machine-readable objects that feed the next — a step toward compile-time structure at runtime.

MCP's limitation as a bridging mechanism is that it is still fundamentally runtime. The agent requests a resource when it decides it needs it. There is no compile-time validation that the skill's behavior is consistent with the current state of the KB, no provenance record linking a skill instruction to the KB entry that grounds it, and no guarantee that the skill won't be invoked in a context where the resource isn't available.

### Generated Skills from Schemas

OpenAPI → tool definitions is the cleanest existing example of compile-time KB-to-skill compilation. An OpenAPI spec is a knowledge base about what an API can do. Tools like Google ADK's `OpenAPIToolset` automatically generate typed `FunctionDeclaration` objects from the spec [12]. OpenAI GPT Actions follow the same pattern; Amazon Bedrock agent action groups also accept OpenAPI schemas [13]. The open-source `openapi-to-skills` project extends this to produce `SKILL.md` files directly from OpenAPI specs [14]. These are genuinely compiled: deterministic, versioned, traceable to a source schema.

The limitation is scope. OpenAPI is a well-typed, machine-readable format designed for exactly this purpose. Most KB content — patterns, exemplars, design rationale, workflow templates — does not live in a machine-readable schema. Bridging prose and structured content into a coherent compiled skill requires a casting pipeline, not just a schema parser.

### Voyager: Skill → Harvest → KB

Voyager (Wang et al., 2023) is the canonical example of the reverse direction: an agent builds and grows its own skill library from experience [15]. In Minecraft, Voyager uses an LLM to write JavaScript programs for new tasks, verifies them through execution feedback and self-verification, and stores verified programs as reusable skills. Skill retrieval at task time uses embedding similarity against skill descriptions. The library grows monotonically; skills are temporally extended, interpretable, and compositional.

The structural distinction from human-authored KB-as-skill-source is important: Voyager's KB *is* the skill library. There is no separate authoritative knowledge base being compiled into skills. The agent generates both simultaneously from environmental experience. This is the right architecture for open-world exploration where no authoritative KB exists. It is the wrong architecture where the KB must reflect curated, validated, version-controlled domain knowledge.

Voyager's skill library also has no formal provenance. A skill is grounded in the fact that it executed successfully in a given context — not in a citation, a schema, or a human-reviewed design document. This is acceptable for a game; it is not acceptable for a scientific workflow engine.

### Knowledge Distillation into Specialized Models

Fine-tuning a model on KB content is the most radical form of bridging: the skill *becomes* the model, and the KB is baked into model weights. This approach removes runtime retrieval entirely.

The tradeoffs are well-documented. Fine-tuning excels when domain expertise must be embedded for stability, compliance, and high-volume inference [16]. But a fine-tuned model cannot explain *why* it knows something — provenance evaporates. It cannot be updated without retraining. It hallucinates when queried at the boundary of its training distribution, and it cannot signal uncertainty the way a retrieval-grounded skill can. Recent work shows that combining the two — fine-tuning for format and task understanding, RAG for factual grounding — often outperforms either alone [17].

**Position:** Distillation is appropriate for stable, slow-changing KB content where inference volume justifies retraining cost. For knowledge that changes with software versions, schema revisions, or active research areas, distillation is provenance suicide.

### llms.txt: Documentation-Driven Agent Grounding

Jeremy Howard's `/llms.txt` proposal (September 2024) addresses a narrow but real piece of the problem: how does an agent efficiently consume a documentation site that is too large for a context window [18]? The answer is a structured Markdown file at the site root that provides curated links to the most important pages, with a hierarchy distinguishing essential from optional content. The `llms-full.txt` variant embeds all content in one file for cases where the agent will consume it wholesale.

The design philosophy is noteworthy: Markdown over XML or JSON, because the file must be readable by both LLMs and humans; linking over embedding, because context windows are finite; optional sections that can be skipped when context is tight. These are sound compile-time grounding principles applied to documentation indexing. Adoption is real but uneven [18][19].

---

## Problems and Tensions

### Drift

Drift is the fundamental failure mode of the KB–skill split. KB changes; the skill doesn't notice. Skill instructions describe a reality that has been superseded.

The hermes-agent issue is the clearest example [1]. The three-repo architecture documented by Pant (2026) proposes `.source.json` provenance files in each installed skill recording the source repository and commit hash, enabling three-way merges when source and installed copies diverge [20]. A dedicated AI-assisted "synthesis-skills-manager" skill handles semantic conflicts that mechanical merge tools cannot resolve. This is sophisticated operational engineering, but it addresses drift *after* it has occurred. The compile-time pattern addresses it *structurally*: if the skill is derived from the KB by a deterministic compilation step that runs in CI, drift is impossible — the compiled output is always consistent with the current KB state.

### Provenance

Where did this skill behavior come from? Provenance is the question every auditor, every debugging session, and every "why does the agent behave this way" inquiry must be able to answer.

RAG-grounded skills have partial provenance — the retrieved documents are citations. But the skill *instructions* — the behavioral rules above the retrieval layer — typically have no traceable source. Fine-tuned models have no provenance at all; the knowledge is in the weights. Voyager-style harvested skills have execution provenance (it worked in context X) but no epistemic provenance (it was reviewed and approved by a human who understands the domain).

Compile-time grounding can carry provenance explicitly. If every skill instruction is generated from or validated against a specific KB entry with a version ID, then a skill audit can trace any behavior to its authoritative source. The deterministic legal-agent paper (2025) demonstrates this pattern in a different domain: an agent decomposes questions into an execution plan, invokes retrieval primitives against a temporal knowledge graph, and produces answers with an auditable log of graph operations [21].

### Context Economy

Skills that drag the whole KB into the prompt window are unusable. Skills that ignore relevant KB content are wrong. Context economy is the tension that shapes every bridging approach.

The Agent Skills progressive-disclosure architecture addresses this directly [22][23]. Level 1: skill name and description — median ~80 tokens per skill. Level 2: full `SKILL.md` — median ~2,000 tokens per activated skill. Level 3: referenced support files — loaded on demand. The key property is that context cost scales with actual task relevance, not with KB size. The Anthropic effective-context-engineering post generalizes this: "just-in-time strategies" where agents maintain lightweight identifiers and load data dynamically at the moment it is needed [24].

Corpus2Skill's navigation approach handles context economy differently: the agent browses a compiled tree with logarithmic navigation complexity, loading only nodes relevant to its current path [8]. This scales to large corpora while keeping context use proportional to the query's scope.

### Schema vs. Prose

When should KB content be structured (JSON, schemas, typed parameters) versus prose? The answer depends on what the consuming agent needs to *do* with it.

Schema/typed content is better when the agent needs to validate, compare, or programmatically compose knowledge. OpenAPI → tool definitions works precisely because the schema is already the authoritative specification; no loss-of-fidelity translation through prose is required.

Prose is better when the agent needs to *reason* about knowledge — understand tradeoffs, apply judgment, recognize novel situations. Most domain expertise in scientific computing, workflow design, and pattern application resists full formalization. A KB that contains only schemas loses the interpretive layer. A skill that contains only prose loses the precision layer.

The practical answer is layered: schemas for interface contracts and validation, prose for rationale and pattern description, exemplars for the cases where neither abstracts cleanly. A compile pipeline can cast each KB layer into the appropriate skill-layer format — sidecar JSON for schemas, verbatim or condensed markdown for prose, copied files for exemplars.

### Trust Boundaries

Who curates? Who validates? How does a skill consumer know the KB is trustworthy? The Agent Skills survey (2026) found a 26.1% vulnerability rate among 42,447 community skills, with executable scripts increasing vulnerability risk 2.12× relative to instruction-only skills [25]. A compiled skill that bundles executable code inherits the trust of the KB that sourced it.

A Skill Trust and Lifecycle Governance Framework (gates and tiers covering static analysis, semantic classification, behavioral sandboxing, permission-manifest validation) becomes more tractable when the KB itself has governance — when KB entries are reviewed, versioned, and have explicit trust provenance. A compiled skill from a curated KB can inherit KB-level trust. A skill written ad hoc has no such inheritance.

### Portability

A KB compiled for one agent runtime (Claude `SKILL.md` files) is not portable to another (MCP server, custom GPT, Bedrock action group) without a re-compilation step. This is a real cost of the compile-time approach — each runtime target requires a cast, and the cast is not free.

The compile-pipeline pattern makes this explicit: compilation is a first-class pipeline step, not an implicit transformation. The same KB can produce a Claude skill, an MCP resource manifest, a Bedrock action schema, and a Copilot instructions file through target-specific casts. Portability becomes a cast-coverage problem rather than a single-skill-for-all-targets problem.

### Versioning

Skills compiled from a KB at a point in time are frozen. The KB keeps evolving. This is not a defect — it is a feature for deployment stability. But it requires explicit version pinning and upgrade pathways.

The three-repo architecture uses `.source.json` commit hashes for this purpose [20]. The hermes-agent CI approach would fail builds when documented facts diverge from source [1]. Neither approach is sufficient without a shared version contract between the KB and the skills it produces. A compilation pipeline with a lockfile — analogous to `package-lock.json` in Node or `Cargo.lock` in Rust — is the right abstraction: the lockfile records which KB version produced which skill version, enabling reproducibility and upgrade auditing.

### Evaluation

How do you evaluate a skill compiled from a KB? This is genuinely unsolved. The Agent Skills survey identifies "Evaluation Methodology" as the field's most underdeveloped challenge [25]. The options are:

1. **Evaluate the KB.** Is the knowledge correct and complete? Requires domain-expert review.
2. **Evaluate the compiled skill.** Does the skill accurately represent the KB's intent? Requires comparison against KB ground truth.
3. **Evaluate the pipeline.** Is the compilation deterministic, lossless, and traceable? Testable mechanically.
4. **Evaluate the skill in deployment.** Does agent behavior match expected behavior on a task suite? Standard benchmark approach, but decoupled from KB grounding.

The right answer is all four, at different cadences. Mechanical tests cover 3; benchmark suites cover 4; KB review covers 1; compilation diffing covers 2. Current tooling addresses each in isolation. No end-to-end KB → skill evaluation harness exists as a standard.

---

## Architectural Patterns Worth Naming

### Pattern 1: KB → Compile → Skill

The KB is the source of truth. A deterministic compilation step produces skill artifacts for one or more target runtimes. The compilation is versioned, reproducible, and records provenance (which KB entry produced which skill content). CI enforces that compiled skills are always consistent with the current KB.

Where this exists: Corpus2Skill [8], OpenAPI → tool definitions [12][14], the Galaxy Workflow Foundry. Partial instantiation: hermes-agent CI proposal [1], three-repo `.source.json` provenance [20].

**Best for:** Schema-bound domains, high-stakes domains where retrieval miss is a correctness failure, latency-sensitive deployments, domains with explicit versioning requirements.

### Pattern 2: KB → RAG → Skill

The skill bundles retrieval infrastructure that queries the KB at inference time. The skill's behavioral instructions are minimal; grounding is delegated to retrieval.

Where this exists: Custom GPTs with knowledge files, Claude Projects, Azure Agentic Retrieval, Bedrock Knowledge Bases, virtually all enterprise RAG stacks.

**Best for:** Large, frequently updated, heterogeneous KB content; domains where retrieval miss is acceptable; use cases that do not require deterministic skill behavior.

### Pattern 3: KB → Navigate → Skill

A hybrid: the KB is compiled into a hierarchical navigable structure (not a flat vector index), and the skill navigates the compiled tree at inference time using file-system or directory tools rather than embedding-based retrieval.

Where this exists: Corpus2Skill [8].

**Best for:** Large corpora where the agent must reason about coverage and completeness, not just retrieve relevant passages.

### Pattern 4: KB → Fine-Tune → Model

KB content is distilled into model weights through supervised fine-tuning or knowledge distillation. The model embodies the KB; no runtime retrieval is needed.

Where this exists: domain-specific LLMs (medical, legal, code), prompt-distillation research.

**Best for:** Stable, high-volume, latency-critical deployments where provenance is less important than inference efficiency.

### Pattern 5: Skill → Harvest → KB

An agent executes tasks and stores successful programs or strategies as skills; the skill library *is* the KB.

Where this exists: Voyager [15], SAGE, SEAgent.

**Best for:** Open-world exploration where no authoritative KB exists; domains where agent-generated heuristics are an acceptable epistemic standard.

### Pattern 6: Bidirectional / Hybrid

KB drives initial skill compilation (Pattern 1); agent execution generates new entries that flow back to the KB for human review before re-compilation (Pattern 5 feedback loop closed through curation).

Where this exists: Not fully instantiated in any production system documented as of 2026. The closest is Voyager plus human review, but no standard pipeline for this exists.

**Best for:** Active research domains where the KB must grow from practice but curated provenance is still required.

---

## A Position on the Right Default

The defaults the field is converging on — bundle some docs, attach a vector index, hand the bundle to the agent — are reasonable for general-purpose assistants and tolerable for low-stakes domains. They are the wrong default for:

- **Schema-bound domains** where invalid output is a correctness failure (scientific workflow construction, financial reporting, structured code generation).
- **High-stakes domains** where retrieval miss is unacceptable (medical, legal, safety-critical systems).
- **Latency-sensitive deployments** where runtime retrieval is too slow.
- **Versioned-content domains** where the consumer needs to know exactly which version of which source produced which behavior.

For those cases, the right default is **compile-time grounding with provenance**. The KB is the source of truth. A deterministic pipeline casts selected slices of the KB into target-specific skill artifacts. The cast is versioned, the provenance is recorded, and CI rejects skills that drift from their source. Runtime retrieval, when used, augments rather than replaces compiled grounding.

This position is consistent with how compilation works in every other engineering domain. Source code is not consumed directly by the CPU; it is compiled into a target representation through a deterministic pipeline that records dependencies. Documentation generators (Doxygen, JSDoc, Sphinx) compile structured comments into navigable artifacts that no human writes by hand. Database query planners compile declarative SQL into target-specific execution plans. The KB-skill split should look more like compilation and less like attachment.

The reason it does not yet, broadly, is that the field is still treating skills as authored artifacts rather than compiled artifacts. The shift is straightforward in principle and operationally hard in practice: it requires accepting that skills are derivatives, that the KB carries the authority, and that a compilation pipeline is a load-bearing piece of infrastructure rather than a curiosity. The systems that get this right early will have an advantage that compounds — every KB improvement raises every compiled skill, and every audit lands on a source that can answer for itself.

---

## Open Questions and Research Directions

**Compilation fidelity.** When casting prose KB content into a structured skill, how much meaning is lost? There is no standard measure. The field needs a KB-to-skill fidelity metric that can be automated — analogous to how a type checker validates that code matches a type specification.

**Incremental compilation.** If 10% of the KB changes, which compiled skills need to be re-cast? Dependency tracking for KB → skill is not solved. Current systems re-compile everything or rely on humans to identify affected skills.

**Cross-runtime portability.** MCP, `SKILL.md`, Custom GPT knowledge files, and Bedrock action schemas are all different target formats. No standard intermediate representation exists that would allow a KB to compile once and cast to multiple runtimes. This is the same problem that intermediate representations (LLVM IR, JVM bytecode) solve for compilers.

**Trust transitivity.** If a KB is trusted, can that trust be automatically inherited by a compiled skill? The governance framework in [25] describes trust *tiers* for skills but not trust *derivation* from a sourced KB. Formal work on trust transitivity in agent skill provenance chains is absent.

**Evaluation harness.** End-to-end KB → compiled skill → agent behavior evaluation does not exist as a standard. Practitioners run benchmarks on deployed agents and KB reviews separately, with no automated check that the skill faithfully transmits what the KB says.

**Drift detection at scale.** When a KB has hundreds of entries and a skill has hundreds of instructions, identifying which skill instructions have drifted from their KB sources requires either full re-compilation or semantic diffing. Semantic diffing for KB–skill pairs — distinguishing intentional evolution from accidental drift — is an open problem.

---

## Sources

- [1] [hermes-agent issue #13737: SKILL.md drift](https://github.com/NousResearch/hermes-agent/issues/13737)
- [2] [Retrieval Augmented Generation in Azure AI Search](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [3] [Grounding and RAG — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-serverless/grounding-and-rag.html)
- [4] [What is Retrieval-Augmented Generation — Google Cloud](https://cloud.google.com/use-cases/retrieval-augmented-generation)
- [5] [Seven Failure Points When Engineering a RAG System (arXiv 2401.05856)](https://arxiv.org/abs/2401.05856)
- [6] [Skill-RAG: Failure-State-Aware Retrieval Augmentation](https://arxiv.org/abs/2604.15771)
- [7] [VoiceAgentRAG: Solving the RAG Latency Bottleneck](https://arxiv.org/html/2603.02206v1)
- [8] [Don't Retrieve, Navigate: Corpus2Skill](https://arxiv.org/html/2604.14572v1)
- [9] [What are Projects — Claude Help Center](https://support.claude.com/en/articles/9517075-what-are-projects)
- [10] [Custom GPTs, Gems and Claude Projects — StackViv 2026](https://stackviv.ai/blog/custom-gpts-gems-claude-projects)
- [11] [Introducing the Model Context Protocol — Anthropic](https://www.anthropic.com/news/model-context-protocol)
- [12] [OpenAPI Tools — Google ADK](https://google.github.io/adk-docs/tools-custom/openapi-tools/)
- [13] [Define OpenAPI Schemas for Agent Action Groups — Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-api-schema.html)
- [14] [openapi-to-skills — GitHub](https://github.com/neutree-ai/openapi-to-skills)
- [15] [Voyager: An Open-Ended Embodied Agent with LLMs (arXiv 2305.16291)](https://arxiv.org/abs/2305.16291)
- [16] [RAG vs Fine-Tuning — IBM Think](https://www.ibm.com/think/topics/rag-vs-fine-tuning)
- [17] [Fine-Tuning with RAG (ICLR 2026, arXiv 2510.01375)](https://www.arxiv.org/pdf/2510.01375)
- [18] [The /llms.txt file specification — llmstxt.org](https://llmstxt.org/)
- [19] [How CircleCI implemented llms.txt](https://circleci.com/blog/how-circleci-implemented-llms-txt/)
- [20] [Managing AI Agent Skills at Scale: A Three-Repo Architecture — Rajiv Pant (2026)](https://rajiv.com/blog/2026/03/23/managing-ai-agent-skills-at-scale-three-repo-architecture/)
- [21] [Deterministic Legal Agents over Temporal Knowledge Graphs (arXiv 2510.06002)](https://arxiv.org/html/2510.06002)
- [22] [Equipping Agents for the Real World with Agent Skills — Anthropic Engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [23] [Agent Skills: Progressive Disclosure as a System Design Pattern — Swirl AI](https://www.newsletter.swirlai.com/p/agent-skills-progressive-disclosure)
- [24] [Effective Context Engineering for AI Agents — Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [25] [Agent Skills for LLMs: Architecture, Acquisition, Security, and the Path Forward](https://arxiv.org/html/2602.12430v3)
- [26] [6 Agentic Knowledge Base Patterns — The New Stack](https://thenewstack.io/agentic-knowledge-base-patterns/)
- [27] [Anatomy of an AI Agent Knowledge Base — InfoWorld](https://www.infoworld.com/article/4091400/anatomy-of-an-ai-agent-knowledge-base.html)
- [28] [Versioning, Rollback and Lifecycle Management of AI Agents — Medium](https://medium.com/@nraman.n6/versioning-rollback-lifecycle-management-of-ai-agents-treating-intelligence-as-deployable-deac757e4dea)
- [29] [Voyager project page](https://voyager.minedojo.org/)
- [30] [Formal Analysis and Supply Chain Security for Agentic AI Skills](https://arxiv.org/html/2603.00195v1)
- [31] [Semia: Auditing Agent Skills via Constraint-Guided Representation Synthesis](https://arxiv.org/html/2605.00314v1)
- [32] [MCP Architecture Overview — modelcontextprotocol.io](https://modelcontextprotocol.io/docs/learn/architecture)
- [33] [SkillsBench: Benchmarking Agent Skills Across Diverse Tasks](https://arxiv.org/html/2602.12670v1)

*Note: Several arXiv citations dated 2026 surfaced during research; verify before quoting in external venues.*

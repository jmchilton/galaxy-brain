# IDEA_COMPILER_BACKGROUND.md

## Framing

The **Galaxy Workflow Foundry** is a compile-time KB→skill compiler for bioinformatics workflow conversion (Nextflow ↔ CWL ↔ Galaxy). It curates human-authored knowledge — Patterns, Molds, CLI references, and typed schemas — and deterministically compiles that knowledge into target-portable agent skills with full provenance (`_provenance.json` per cast). It is not "an agent": it is the **compiler-and-toolchain layer** that any agent (Claude, Cursor, internal LLMs, future runtimes) consumes. The Foundry anchors on Galaxy's existing demonstrated traction: Tool Shed 2.0 typed schemas, gxformat2 validators, 111 IWC round-tripped workflows, the VSCode `galaxy-workflows` extension, and User-Defined Tools. We name the architectural pattern explicitly — **Pattern 1: KB → Compile → Skill** — and position it against the runtime-only RAG and MCP-Resources alternatives now dominant in agentic AI.

## 1. Prior art and landscape

**Corpus2Skill ("Don't Retrieve, Navigate", [arxiv 2604.14572](https://arxiv.org/abs/2604.14572), Sun, Wei, Hsieh, April 2026)** is the closest published analog. Corpus2Skill distills an enterprise corpus *offline* into a hierarchical, navigable skill directory; at serve time the agent gets a bird's-eye view, drills into branches via progressively finer LLM-written summaries, and retrieves full documents by ID. On WixQA it beats dense retrieval, RAPTOR, and agentic-RAG baselines. Critically, Corpus2Skill **auto-clusters** unstructured text. The Foundry differs in two load-bearing ways: (a) its inputs are **curated**, human-authored Patterns and Molds rather than scraped documents, and (b) it emits **provenance per cast** — every compiled skill instruction links back to the KB entry (and revision) that produced it. Corpus2Skill validates retrieval quality post hoc; the Foundry validates compilation fidelity at build time against a typed schema.

**openapi-to-skills (Neutree, [github.com/neutree-ai/openapi-to-skills](https://github.com/neutree-ai/openapi-to-skills))** is a narrower precedent in the same architectural family: a CLI converts an OpenAPI spec into a tree of Agent Skill markdown files (one 7.2 MB monolithic spec → 2,135 navigable files in their example). It demonstrates the **compile-from-schema** pattern at production scale but is single-source (OpenAPI only), single-target (Anthropic skills format), and stateless — no provenance, no incremental recompile, no semantic-drift detection.

**hermes-agent SKILL.md drift ([NousResearch issue #13737](https://github.com/NousResearch/hermes-agent/issues/13737))** is the canonical worked example of why runtime-only skill systems fail. Bundled `SKILL.md` files shipped in `skills/` ship statically and silently desync from the codebase — in the cited case, the skill listed 4 terminal backends while the actual config supported 6. The issue proposes CI checks, auto-generation from source, pre-merge gating, and agent-side staleness detection. **This is exactly the failure mode the Foundry's compile-time provenance prevents by construction.**

**Three-repo `.source.json` architecture (Rajiv Pant)** — the user's synthesis cites a three-repo pattern (`source` / `compiled` / `runtime`) keyed by `.source.json` sidecars. We could not surface a primary citation in web search; we recommend the LOI either name-drop this only if Rajiv Pant has a public write-up, or generalize to "the emerging multi-repo split between authored knowledge, compiled artifacts, and runtime caches."

**MCP Resources ([Anthropic, Nov 2024](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation); donated to the [Linux Foundation Agentic AI Foundation, Dec 2025](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation))** is the obvious comparator and the explicit *gap* the Foundry fills. MCP Resources are a **runtime** primitive: an MCP server exposes context blobs that an agent loads at request time. There is no compile-time validation that a Resource is internally consistent, no provenance linking a fragment of the skill instruction to the source KB entry, no incremental rebuild graph, and no semantic-drift detection. MCP gives us the wire format; it does not give us a toolchain. With 97M monthly SDK downloads and 10K active servers reported at AAIF founding, MCP is the substrate — but the substrate alone reproduces the hermes-agent drift problem at internet scale.

## 2. Competitive frame vs Nextflow / Snakemake / WDL on agent-readiness

The four major bioinformatics workflow systems are not equivalent from an agent's perspective. The relevant question is not "can a human write a workflow" but "can an LLM agent **validate** a proposed workflow against a registry **before** dispatching jobs."

| System | Typed tool-schema registry | Pre-execution parameter validation | Offline (no-runtime) validation | Agent-loop-compatible feedback |
|---|---|---|---|---|
| **Galaxy** | Tool Shed 2.0 + tool XML/UDT JSON schemas, ~10K+ wrapped tools | Yes — every parameter and connection typed | Yes — `gxformat2 lint`, planemo, the VSCode extension | Milliseconds; no engine spin-up |
| **Nextflow** | Process scripts are Groovy DSL; nf-core supplies conventions, not a typed registry | Limited — channel typing is dynamic; param schemas optional via `nextflow_schema.json` | Partial — `nextflow inspect`, `nf-core lint`, but actual graph requires engine | Seconds to minutes |
| **Snakemake** | Rules are Python; wrappers exist but no canonical typed registry | Wildcard-resolution and input/output types checked at DAG build, not parameter-level | Partial — `--dry-run` builds DAG, requires conda envs | Seconds |
| **WDL** | Tasks typed via WDL type system; no centralized community registry of tools | Yes for task I/O types; no community-curated tool catalog | Yes — `womtool validate`, `miniwdl check` | Milliseconds for validate; minutes for engine |

The structural moat is therefore real and narrow: **Galaxy is the only bioinformatics workflow system where an agent can validate every parameter and every step-to-step connection against a registry of 10K+ community-maintained tools before executing anything.** WDL has types but no registry; Nextflow has a registry-like ecosystem (nf-core) but no typed parameter validation; Snakemake has neither at the same scale. This is the foundation the Foundry compiles *to*.

## 3. AI-readiness research landscape: compile-time grounding in schema-bound domains

The empirical case for compile-time grounding rests on three converging findings.

**RAG failure modes ([Barnett et al., "Seven Failure Points When Engineering a Retrieval Augmented Generation System", arxiv 2401.05856](https://arxiv.org/abs/2401.05856), 2024)** catalogued seven failure classes across three production case studies (research, education, biomedical). The classes most relevant here are **FP1: missing content** (the answer isn't in the corpus), **FP2: missed top-ranked documents**, **FP3: not in context** (retrieved but lost in consolidation), **FP4: not extracted**, **FP5: wrong format**, **FP6: incorrect specificity**, and **FP7: incomplete**. Two of the paper's stated takeaways are devastating for naive RAG in high-stakes domains: "validation of a RAG system is only feasible during operation" and "robustness evolves rather than being designed in at the start." That is unacceptable for a workflow conversion that will be executed against a real cluster — drift must be caught at build time.

**Lost in the Middle ([Liu et al., arxiv 2307.03172](https://arxiv.org/abs/2307.03172), TACL 2024)** showed that even long-context LLMs use the *middle* of their context window poorly: performance is U-shaped, peaking when relevant info sits at the beginning or end. RAG systems that flood the window with retrieved chunks therefore predictably miss schema constraints that land in the middle. Schema-bound domains like workflow conversion have hard correctness requirements (a `bam` input cannot connect to a `fastq` port); a 5% retrieval miss is a wrong answer, not a degraded answer.

**Faithfulness / groundedness evaluation** has crystallized around frameworks like RAGAS (faithfulness, answer relevance, context precision/recall), TruLens (groundedness triad), and recent surveys of RAG evaluation (e.g. [arxiv 2405.07437](https://arxiv.org/html/2405.07437v2)). All of these are *runtime, sample-based* metrics. None of them tell you, before deploying a skill, whether the skill is *complete* with respect to a typed schema. The Foundry's contribution is to push faithfulness checking left, into the compile step, where it can be expressed as **`compiled_skill ⊨ KB_entry`** rather than as a statistical estimate from a held-out eval set.

Together these results justify the architectural bet: when the domain has a typed schema (Galaxy tool registry, gxformat2 workflow schema, CWL types, Nextflow channel types), naive RAG is the wrong primitive. The right primitive is a compiler with provenance.

## 4. Open research questions this proposal can credibly address

A Track 2 OS4LS proposal at the $1M / 24-month scale is positioned to produce **methods and reusable infrastructure**, not just a tool. The following are tractable, peer-reviewable contributions:

1. **Compilation fidelity metrics.** Define and operationalize a fidelity score `F(skill, KB)` — e.g. coverage of KB symbols in skill, round-trip preservation through gxformat2/CWL/Nextflow, agent-task success rate gated on the compiled skill. Publish the benchmark with the 111 IWC workflows as the reference set.
2. **Incremental compilation.** Given a Pattern-level edit, which downstream compiled skills must be recast? This is the LLVM/Bazel dependency-graph question, adapted to KB→skill compilers. Naive solution: recompile all. Open: minimal-invalidation rules over typed Patterns.
3. **Cross-runtime portability / a skills IR.** Today every target (Anthropic skills, MCP Resources, OpenAI custom GPT instructions, AGENTS.md) is a separate emit path. An LLVM-IR analog — a runtime-neutral intermediate that all four backends lower from — is an obvious missing piece and a natural OS contribution.
4. **Trust transitivity.** If a skill is compiled from KB entries with provenance, what trust claims propagate to downstream agent actions? Cryptographic chains (Sigstore-style attestations on `_provenance.json`) are a credible 24-month deliverable.
5. **End-to-end KB → skill → behavior eval harness.** A reproducible pipeline that perturbs the KB, recompiles, and measures the resulting change in agent task success. This is the experimental substrate the field is missing.
6. **Semantic drift detection.** Given a KB revision and an existing compiled skill, can we detect *semantic* (not syntactic) drift before the agent silently misbehaves? Connects directly to the hermes-agent issue #13737 failure pattern.

## 5. Suggested LOI landscape-analysis paragraph (≤200 words)

> Compile-time skill compilation is an emerging architectural pattern, but no existing tool addresses schema-bound scientific workflows. **Corpus2Skill** (Sun et al., arxiv 2604.14572, 2026) auto-clusters unstructured enterprise text into a navigable skill tree but provides no curated provenance and no schema validation. **openapi-to-skills** (Neutree) compiles API specs into Anthropic skills but is single-source and single-target. **MCP Resources** (Anthropic, donated to the Linux Foundation Agentic AI Foundation in Dec 2025) standardizes a *runtime* loading protocol but explicitly leaves compile-time validation, incremental rebuild, and provenance unsolved — failures already visible in production agent systems such as the hermes-agent SKILL.md drift incident (NousResearch issue #13737). Among bioinformatics workflow systems, Galaxy is the only one with a typed, community-maintained 10K-tool registry that enables *pre-execution* validation of every parameter and connection; Nextflow, Snakemake, and WDL all require engine spin-up or lack a centralized typed catalog. The Galaxy Workflow Foundry compiles curated, human-authored knowledge into provenance-stamped, target-portable agent skills, filling the gap between MCP-as-substrate and a real toolchain for scientific workflow conversion.

## 6. Risks and weaknesses — proactive mitigations

1. **Foundry is young.** Mitigation: anchor every claim on demonstrated Galaxy traction — Tool Shed 2.0 typed schemas, gxformat2 + planemo lint, 111 round-tripped IWC workflows, VSCode galaxy-workflows extension downloads, User-Defined Tools adoption. The Foundry is the *new* deliverable; the *moat* is decade-old.
2. **"You're building an agent" misread.** The OS4LS RFA targets infrastructure, not applications, and explicitly scopes out building agents. Mitigation: frame the deliverable as a **compiler-and-toolchain** ("any agent or runtime can consume the compiled skills"), use compiler vocabulary throughout (KB, compile, emit, IR, provenance, incremental rebuild), and put concrete consumers (Claude, Cursor, MCP servers, future runtimes) in a "downstream consumers" section rather than as the product.
3. **Coordination with prior Galaxy EOSS awardees (Goecks, Blankenberg).** Both are sustaining-Galaxy PIs with prior CZI EOSS support; an OS4LS reviewer pool overlaps with CZI. Mitigation: explicit letters of collaboration; clear delineation that prior EOSS awards funded *Galaxy core sustainability* whereas OS4LS funds *the new compile-time toolchain layer above it*; show non-duplication in budget and deliverables.
4. **Reviewer skepticism that "skills" are a real abstraction.** Mitigation: cite Anthropic's MCP donation, the Linux Foundation AAIF (Dec 2025), AGENTS.md (OpenAI), and the 97M-monthly-downloads MCP adoption number as evidence of an industry-wide standard, not a vendor fad.
5. **"Why not just use MCP?"** Mitigation: the hermes-agent #13737 incident is the one-paragraph answer. MCP is the wire format; the Foundry is the compiler. You need both.
6. **Verification gap on cited prior art.** The `.source.json` three-repo pattern attributed to Rajiv Pant could not be confirmed via web search; either link to a public write-up or generalize the citation before submission.

---

## Open questions for the human

- Confirm Goecks/Blankenberg EOSS cycle numbers (Cycle 3 / Cycle 6) — couldn't verify via web search; check CZI awardee pages directly.
- Locate primary citation for Rajiv Pant `.source.json` three-repo pattern, or drop it.
- Decide LOI framing: "compiler" (precise, narrow) vs "toolchain" (broader, more accessible to non-PL reviewers).
- Pick the 24-month flagship deliverable: skills IR? fidelity benchmark? drift detector? All three is too much.
- Confirm "Tool Shed 2.0" is the name we want to use externally vs "next-gen Tool Shed" / "typed Tool Shed."
- Decide whether to cite Corpus2Skill (April 2026, very recent — strengthens novelty framing, but reviewers may not know it yet).

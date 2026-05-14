# IDEA_INTEROP_BACKGROUND.md

## Pitch framing

The proposal is two-pronged. **Prong A** specifies Galaxy's Tool Shed 2.0 typed-schema HTTP API as **`ToolEndpoint/1.0`** — an open *compile-time* agentic protocol that complements Anthropic's Model Context Protocol (MCP). MCP's Resources primitive is necessary but insufficient: it is runtime-only, lacks provenance linking generated skill instructions to source KB entries, and has no version contract or conformance test suite. Tool Shed 2.0 already serves typed `ParsedTool` schemas for ~10,000 Galaxy tools over HTTP — there is no comparable artifact in any competing workflow system, and it is the natural substrate for a compile-time KB→skill compilation pattern. **Prong B** generalizes the same pattern to a second life-sciences domain that hits OS4LS RFA priority #1 head-on: **assay metadata standards** (ISA-Tab/JSON, RO-Crate, Bioschemas, MIxS, DCAT-AP). The frame: in an era of agents, the UI for everything becomes prompts within a year — so reproducibility and standards-grounded metadata become *more* important, not less, because they are the substrate that makes scientific work legible to agents. Galaxy already sits at the intersection (Workflow RO-Crate, WorkflowHub two-way integration, ELIXIR node) which gives the proposal a natural unifying narrative across both prongs.

---

## 1. MCP landscape

**Model Context Protocol** was released by Anthropic in November 2024 and donated to the Linux Foundation (under the new **Agentic AI Foundation** umbrella) in late 2025. The spec is at modelcontextprotocol.io; reference servers and SDKs live at github.com/modelcontextprotocol. MCP defines three server-side primitives:

- **Tools** — model-invoked functions with JSON Schema arguments (action surface).
- **Resources** — URI-addressed read-only data the client may attach to context (the KB-adjacent primitive — RAG-style data snapshots).
- **Prompts** — user-invokable templated instructions.

**The 2026 MCP roadmap** prioritizes four areas: Transport Evolution and Scalability (streamable HTTP, sessions, load-balancing); Agent Communication (refining the Tasks primitive); Governance Maturation (Working Groups, contributor ladders); and Enterprise Readiness (audit, SSO, gateways). Notably, the roadmap does *not* prioritize Resources semantics or schema validation; capabilities like "streamed and reference-based result types" sit in the "On the Horizon" tier. There is one adjacent thread relevant to us: a "standard metadata format, served via `.well-known`, so that server capabilities are discoverable without a live connection" — an explicit acknowledgement that runtime-only discovery is a known gap.

**Why MCP Resources is necessary but insufficient for our use:**

1. **Runtime-only.** A Resource is a URI plus a `read` operation. Validation is performed by the server at request time (FastMCP and similar enforce URI-template validation at runtime) — there is no *ahead-of-time* contract a downstream agent or skill compiler can rely on without a live connection. URI provenance is explicitly the *client's* responsibility, out-of-band, per current authorization guidance.
2. **No provenance link from skill text to KB entry.** Once a Resource is fetched and stuffed into a prompt, the lineage from a specific instruction sentence back to the canonical KB version is lost. There is no mechanism for "this assistant utterance was compiled from KB entry X at version Y" that downstream tooling can check.
3. **No version contract.** Resources have no required versioning, semver, or change-log primitive in the protocol. Two clients consuming the same URI at different times have no protocol-level guarantee they saw the same data.
4. **No conformance test suite.** Server authors can ship anything that satisfies the JSON-RPC envelope.

The compile-time complement: a typed, versioned, conformance-tested KB endpoint whose entries are *referenceable* from generated skills, so that a regression in the KB is detectable as a regression in the skill artifact (not as a silent change in retrieval).

## 2. Tool Shed 2.0 as agentic protocol

Galaxy's Tool Shed 2.0 serves typed `ParsedTool` schemas — a normalized, validated representation of every Galaxy tool (inputs, outputs, type coercions, citations, requirements) — for ~10,000 tools over HTTP. The VSCode `galaxy-workflows` extension is a working consumer: it uses Tool Shed 2.0 schemas at edit time to drive completion and validation of workflow YAML/format2 documents. No competing workflow system (Nextflow, Snakemake, WDL) ships an analogous machine-readable typed-tool registry.

**Mapping onto MCP**: Tool Shed 2.0 is structurally a Resource server in MCP terms — read-only, URI-addressed (`toolshed://{shed}/{repo}/{tool}/{version}`), JSON-typed. But the *compile-time* value is the killer feature MCP Resources doesn't capture: a downstream agent's "use Galaxy tool X" skill can be **compiled** against the schema, with the resulting artifact pinning a specific tool version, parameter contract, and citation back to the shed entry. If the shed entry changes incompatibly, the compile fails — a CI-detectable regression, not a runtime surprise.

**`ToolEndpoint/1.0` as an open protocol** would consist of:

- An **OpenAPI 3.1 spec** for the HTTP surface (list/get/search/diff over typed tools, with content negotiation for `ParsedTool` v1).
- A **JSON Schema profile** for `ParsedTool` itself (the typed representation).
- A **conformance test suite** that any tool registry (Galaxy Tool Shed, but also bio.tools, dockstore, future Nextflow/Snakemake registries) can pass to claim compliance.
- A **provenance contract**: every generated skill carries `x-toolendpoint-source: {url, version, content-hash}` so that downstream agents can verify the skill against the live endpoint.
- An **MCP server reference implementation** that wraps `ToolEndpoint/1.0` as MCP Resources for runtime consumers, while preserving the compile-time path.

This positioning is *complementary* to MCP, not competitive — `ToolEndpoint/1.0` is the schema-bound source-of-truth; MCP is the runtime delivery mechanism for clients that need it.

## 3. Assay metadata standards landscape

| Standard | Governance | Schema location | Version state | Adoption |
|---|---|---|---|---|
| **ISA-Tab / ISA-JSON** | ISA Commons (Sansone/Oxford lineage), isa-tools.org | `isa-tools/isa-api`, isa-tools/isa-rwval (GitHub) | ISA-JSON v1; `isatools` Python lib | MetaboLights, MetabolomicsWorkbench, EBI BioStudies; FAIRification community |
| **RO-Crate** | researchobject.org community (Manchester eScience Lab) | researchobject.org/ro-crate, profiles registry | **1.2 (June 2025)**; Workflow RO-Crate 1.0; Workflow Run Crate; Process Run Crate | WorkflowHub, Galaxy export/import, EOSC, LifeMonitor |
| **Bioschemas** | bioschemas.org community (ELIXIR-aligned) | bioschemas.org/profiles | **ComputationalWorkflow 1.0-RELEASE** (Mar 2021); 1.1-DRAFT (Nov 2023); Dataset 1.0-RELEASE (Jul 2022); Sample 0.2-RELEASE; BioSample 0.1-DRAFT | bio.tools, WorkflowHub, training portals; embedded as JSON-LD in life-sci sites |
| **MIxS** | Genomic Standards Consortium (GSC) | github.com/GenomicsStandardsConsortium/mixs | **v6.x** (LinkML-generated; 6 main checklists: genomes, marker genes, metagenomes, MAGs, SAGs, UViGs) | ENA, NCBI BioSample, JGI/IMG |
| **MIAME / MINSEQE** | FGED Society | Stable text specs | Mature, mostly-frozen | GEO, ArrayExpress (legacy) |
| **DCAT / DCAT-AP** | W3C / SEMIC (EU) | w3.org/TR/vocab-dcat-3, github.com/SEMICeu/DCAT-AP | **DCAT 3** (W3C); **DCAT-AP 3.0.1** (2025, SHACL templates included) | EU data portals, EOSC catalog |

**Overlaps and incompatibilities** — important because they are *both* a risk and an opportunity:

- ISA and RO-Crate cover overlapping ground (experimental package metadata) with different surface syntax; converters exist but lossy.
- Bioschemas Dataset and DCAT Dataset overlap; Bioschemas is JSON-LD against schema.org and life-sci-flavored, DCAT-AP is RDF-first and policy/portal-flavored.
- MIxS now uses **LinkML** as its source-of-truth modeling layer — relevant because LinkML produces JSON Schema, SHACL, and OWL artifacts from one source, exactly the compile-time pattern this proposal wants to push.

## 4. Existing metadata-authoring tooling — and the gap

- **ISA-Creator (legacy GUI)** and **ISA API** (Python `isatools`): programmatic create/validate/convert for ISA-Tab/JSON. Mature but power-user-facing.
- **rocrate-py** and **rocrate-validator** (crs4): generate and validate RO-Crates against declared profiles, with SHACL-based rule packs. Active development; supports profile-level conformance.
- **Bioschemas validator**: online tool to check JSON-LD markup against profile cardinality/CV rules. Work-in-progress.
- **CEDAR Workbench** (Stanford, Musen group): metadata-template-driven authoring with ontology-assisted value selection; integrates with ImmPort, GEO, Stanford Digital Repository. **CEDAR is the most direct prior art** — a 2025 arXiv paper (*Toward Total Recall: Enhancing Data FAIRness through AI-Driven Metadata*) showed GPT-4 + CEDAR templates raised recall on BioSample/GEO submission metadata from 17.65% to 62.87%. That's empirical evidence the structured-template + LLM pattern works, and validates the prong.
- **FAIRsharing** (Oxford, Sansone): curated cross-registry of standards/databases/policies; the canonical "where do I find the standard for X?" service.
- **ELIXIR FAIR Cookbook** and **bio.tools**: tooling catalogs and recipes.

**The gap**: existing tools handle authoring or validation in isolation; none provide a *compile-time-grounded agent* that (a) selects the right standard from FAIRsharing/registry context, (b) maps free-text experiment descriptions into validated structured submissions, (c) emits provenance linking each generated field to its KB source (ontology term, profile clause, controlled-vocabulary entry), and (d) fails CI when the upstream standard changes incompatibly. CEDAR-plus-LLM proves recall lifts; nobody has packaged this as a compile-time-grounded, version-pinned agentic substrate that spans ISA *and* RO-Crate *and* Bioschemas *and* MIxS uniformly.

## 5. Why metadata is the right second domain

- **Schema-bound**: every standard above has machine-readable schema (LinkML, JSON Schema, SHACL, JSON-LD profiles). The compile-time pattern is *natural* here, not retrofit.
- **Versioned with conformance tests**: rocrate-validator, ISA validator, Bioschemas validator, DCAT-AP SHACL templates all already exist. A compile-time agent has runnable acceptance tests for free.
- **Retrieval miss = compliance failure**: missed CV terms or absent required fields cause real-world rejections at ENA, GEO, MetaboLights, and FAIR-score drops in EOSC/F-UJI. The cost function is sharp and externally measured.
- **Real unmet need**: researchers persistently struggle with submission metadata (this is the headline finding of essentially every FAIR-uptake survey since 2018). Agent-assisted authoring grounded in curated schemas is a wanted product, not a contrived one.
- **Structurally distinct from workflow conversion**: declarative not procedural — demonstrates the pattern generalizes beyond Galaxy's tool/workflow domain and is not a one-trick technique.
- **Hits RFA priority #1 verbatim**: "Representing, managing, curating, and structuring scientific data for use in model training" — and crucially, the substrate (the KB→skill compiler and schema-bound agent) is the deliverable, *not* a new ML model, which keeps it inside RFA scope.

## 6. Galaxy connection

The two prongs are not orthogonal — they share Galaxy as the anchor:

- **Workflow RO-Crate** is intensely Galaxy-relevant. Galaxy exports workflow runs and histories as RO-Crate; WorkflowHub stores published workflows as RO-Crate; 2025 brought two-way Galaxy↔WorkflowHub integration with a programmatic submission API.
- **RO-Crate spec 1.2** was released June 2025 and was a featured topic at European Galaxy Days 2025.
- **Workflow Run Crate / Process Run Crate** profiles capture executed-workflow provenance — directly produced by Galaxy.
- **Galaxy data libraries** carry typed metadata that can be re-expressed as ISA-Tab or RO-Crate.
- **ELIXIR Galaxy node** sits inside the same community that maintains Bioschemas, FAIRsharing, and WorkflowHub.

So Prong B is not a separate domain bolted on for grant-aesthetic reasons — the same RO-Crate that prong B compiles against is the format Galaxy emits for workflow runs in Prong A. The unifying narrative is real.

## 7. AI-readiness research landscape for metadata authoring

Published work to cite (do *not* pitch ML model development per RFA out-of-scope):

- **Sun et al. 2025, "Toward Total Recall"** (arXiv 2504.05307): GPT-4 + CEDAR templates on BioSample/GEO; recall 17.65% → 62.87%.
- **"Automated Standardization of Legacy Biomedical Metadata Using an Ontology-Constrained LLM Agent"** (arXiv 2604.08552) — real-time queries to authoritative terminology services; canonical-vocabulary retrieval at point of generation.
- **Agent-OM (VLDB 2025)**: dual-agent LLM framework for ontology matching, applied to OAEI 2025.
- **"LLM-supported collaborative ontology design"** (Frontiers in Big Data 2025): NeOn framework + LLM + expert-in-loop, FAIR-by-design data capture.
- **"Agentic AI for Ontology Grounding over LLM-Discovered ..."** (Semantic Web Journal 2025).
- **Taylor-Grant, Cannon, Lister, Sansone 2025**: "Making reproducibility a reality by 2035?" — publisher-side enforcement, motivates the supply-side tooling story.

These give the LOI cover that the technical direction is grounded in current literature without making us a model-training project.

## 8. Potential collaborators

The user has indicated confidence about finding collaborators on the metadata prong. The obvious doors to knock on:

- **Carole Goble (University of Manchester, eScience Lab)** — RO-Crate and WorkflowHub; already integrated with Galaxy; central node in the European workflow/FAIR community.
- **Stian Soiland-Reyes (Manchester)** — Workflow Run Crate lead; pragmatic RO-Crate tooling.
- **Susanna-Assunta Sansone (Oxford e-Research Centre)** — FAIRsharing chair; ISA Commons founder; the registry-and-policies anchor.
- **Philippe Rocca-Serra (Oxford)** — ISA tools and ISA API; Sansone group.
- **Alasdair Gray (Heriot-Watt) and Niall Beard (Manchester)** — Bioschemas leadership.
- **Mark Musen and John Graybeal (Stanford, CEDAR)** — the most direct technical-adjacency; CEDAR-plus-LLM is the closest prior art and a complementary, not competitive, partner.
- **Lynn Schriml / Chris Mungall / the LinkML community** — MIxS is now LinkML-native; aligning the compile-time path with LinkML upstream multiplies leverage.
- **Björn Grüning, Sergey Golitsynskiy (Galaxy/ELIXIR-DE)** and **Frédéric Lemoine / French Bioinformatics Institute** — Galaxy-side European partners with metadata exposure.
- **GA4GH WES/TES** community for cross-protocol alignment if relevant.

The realistic ask in an LOI is a letter from Manchester (Goble or Soiland-Reyes), Oxford (Sansone or Rocca-Serra), and one Bioschemas voice — that triangulates ISA, RO-Crate, and Bioschemas in one collaborator triangle.

## 9. Suggested LOI landscape-analysis paragraph (≤200 words)

> Two complementary substrates make scientific work legible to agents: machine-readable *tool contracts* and machine-readable *data contracts*. Anthropic's Model Context Protocol (MCP, donated to the Linux Foundation in 2025) standardizes runtime delivery of both via its Resources primitive, but the 2026 MCP roadmap explicitly defers schema versioning, provenance, and offline conformance — leaving a compile-time gap. Galaxy's Tool Shed 2.0 already serves typed `ParsedTool` schemas for ~10,000 tools over HTTP, a registry artifact no competing workflow system possesses; specifying it as `ToolEndpoint/1.0` (OpenAPI surface, JSON Schema profile, conformance suite, MCP bridge) gives the agentic ecosystem a compile-time complement to MCP Resources. The same compile-time KB→skill compilation pattern applies to assay metadata: ISA-Tab/JSON (Sansone, Oxford), RO-Crate (Goble, Manchester; spec 1.2 released June 2025), Bioschemas profiles, MIxS (now LinkML-native), and DCAT-AP 3.0.1 are all schema-bound and conformance-tested, and CEDAR-plus-LLM work has already shown recall on submission metadata can be more than tripled. Agents that author submission-ready metadata grounded in versioned, curated standards directly address OS4LS priority #1, with Galaxy/WorkflowHub/RO-Crate as the unifying anchor.

## 10. Risks and weaknesses

- **Two-prong scope creep.** Reviewers may read this as two separate projects. Mitigation: lead with the *shared* compile-time KB→skill pattern; both prongs are instances of one method, with Galaxy as the substrate that ties them together (Workflow RO-Crate is literally Galaxy output).
- **Metadata-standards turf wars.** ISA vs. RO-Crate vs. Bioschemas vs. CEDAR communities are partly overlapping and partly territorial. Mitigation: frame our work as *compiling across* schemas, not adjudicating between them; recruit letters from at least two camps; reference LinkML as a neutral modeling substrate where possible.
- **"Standards-committee navel-gazing"** risk on Prong A. MCP-protocol specification work can read as IETF-flavored process work, not science. Mitigation: anchor every spec deliverable to a runnable artifact (VSCode extension already exists; conformance suite is executable; demo agent compiles against real Tool Shed entries).
- **Political risk of appearing to "compete with MCP."** The Linux Foundation Agentic AI Foundation is a powerful new venue. Mitigation: position `ToolEndpoint/1.0` as the *compile-time-source-of-truth* that *feeds* MCP Resources, with a reference MCP server implementation in the deliverables. Frame as complementary upstream, not competitor.
- **CEDAR-as-prior-art** could undercut Prong B novelty. Mitigation: invite Musen group as collaborator; emphasize the compile-time + provenance + cross-standard-compiler angle CEDAR does not currently take.
- **RFA out-of-scope drift.** We must never sound like we're training models. Mitigation: every Prong B reference to "agents" should pair with "grounded in curated schemas" and "the substrate, not the model."
- **Tool Shed 2.0 maturity.** If Tool Shed 2.0 is still pre-1.0 internally, specifying it as a public protocol is premature. Worth a quick truth-check before the LOI lands.

---

## Open questions for the human

- Tool Shed 2.0 versioning: is `ParsedTool` schema stable enough to publish as `ToolEndpoint/1.0` v1 within 24 months, or do we need to scope a v0.x track first?
- Which collaborator triangle for the LOI: Manchester + Oxford + Bioschemas, or pull in CEDAR/Stanford too?
- Pitch CEDAR (Musen) as collaborator or as cited prior art only — partner-or-compete call.
- LinkML alignment: model `ParsedTool` and the metadata-compile pipeline both as LinkML schemas to share infrastructure with MIxS, or keep separate?
- Demo target for Prong B: ENA/MIxS submission, GEO/BioSample, or MetaboLights/ISA — which lands the most reviewable evidence in 24 months?
- Does "ToolEndpoint" naming hold up — or rename (e.g. `ToolRegistry/1.0`, `TypedToolProtocol`) to avoid MCP-Tools-primitive name collision?
- Letter of support from Anthropic / LF Agentic AI Foundation desirable, risky, or out of reach?
- Is bio.tools (ELIXIR) a Prong A consumer worth naming alongside the VSCode extension?

## Sources

- [The 2026 MCP Roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [MCP Roadmap](https://modelcontextprotocol.io/development/roadmap)
- [Model Context Protocol on GitHub](https://github.com/modelcontextprotocol)
- [FastMCP Resources & Templates](https://gofastmcp.com/servers/resources)
- [LeanIX MCP Resources](https://engineering.leanix.net/blog/mcp-resources/)
- [Galaxy Hub — RO-Crate 1.2 release](https://galaxyproject.org/news/2025-06-04-ro-crate-1.2-release/)
- [WorkflowHub](https://about.workflowhub.eu/)
- [Workflow RO-Crate profile 1.0](https://about.workflowhub.eu/Workflow-RO-Crate/)
- [RO-Crate at European Galaxy Days 2025](https://www.researchobject.org/ro-crate/blog/2025-10-09/ro-crate-at-european-galaxy-days-2025)
- [WorkflowHub Scientific Data 2025](https://www.nature.com/articles/s41597-025-04786-3)
- [Bioschemas Profiles](https://bioschemas.org/profiles/)
- [ComputationalWorkflow Profile](https://bioschemas.org/profiles/ComputationalWorkflow/1.0-RELEASE)
- [Bioschemas in WorkflowHub](https://about.workflowhub.eu/developer/bioschemas/)
- [ISA tools](https://isa-tools.org/)
- [ISA API GigaScience paper](https://academic.oup.com/gigascience/article/10/9/giab060/6371038)
- [MIxS GitHub (GSC)](https://github.com/GenomicsStandardsConsortium/mixs)
- [MIxS docs site](https://genomicsstandardsconsortium.github.io/mixs/)
- [DCAT v3 (W3C)](https://www.w3.org/TR/vocab-dcat-3/)
- [DCAT-AP 3.0.1 (SEMIC)](https://semiceu.github.io/DCAT-AP/releases/3.0.0/)
- [rocrate-validator (crs4)](https://github.com/crs4/rocrate-validator)
- [BCO RO-Crate](https://biocompute-objects.github.io/bco-ro-crate/tutorial/rocrate.html)
- [CEDAR](https://metadatacenter.org/)
- [Toward Total Recall — CEDAR + LLM (arXiv)](https://arxiv.org/pdf/2504.05307)
- [Automated Standardization of Legacy Biomedical Metadata (arXiv)](https://arxiv.org/abs/2604.08552)
- [LLM-supported collaborative ontology design (Frontiers)](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2025.1676477/full)
- [Agent-OM (VLDB 2025)](https://dl.acm.org/doi/10.14778/3712221.3712222)
- [FAIRsharing — Nature Biotechnology](https://www.nature.com/articles/s41587-019-0080-8)
- [FAIRsharing 2024 paper (Zenodo)](https://zenodo.org/records/13929397)
- [Galaxy Tool Shed API docs](https://docs.galaxyproject.org/en/master/api/ts_api.html)

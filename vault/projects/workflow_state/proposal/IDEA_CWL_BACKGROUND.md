# IDEA_CWL_BACKGROUND.md

**Pitch frame.** OS4LS Track 2 supports open-source life-sciences software with an AI-readiness emphasis. We propose to revitalize the **Common Workflow Language (CWL)** not as a competing execution engine but as a **portable intermediate representation (IR)** for agent-driven workflow translation. The Galaxy Workflow Foundry already compiles informal artifacts (papers, Nextflow scripts, .ga files) into executable workflows; CWL — with its formal, schema-salad-grounded semantics, abstract Operation class, container-resolution determinism, and language-independent parameter schemas — is the most defensible canonical form an agent can target while still emitting Nextflow, gxformat2, or WDL on the other side. Investment lines: `cwl-tool-util` (a CommandLineTool registry/validator/LSP analog of `galaxy-tool-util`), Foundry molds for `paper-to-cwl` and `nextflow-to-cwl`, a curated CWL workflow corpus analogous to IWC/nf-core, and a portability test harness proving the same logical workflow round-trips across CWL, Galaxy, and Nextflow.

## 1. CWL current state (May 2026)

- **Spec version.** **CWL v1.2.1** was ratified on **3 January 2024** as a non-breaking clarification release (typos, conformance-test additions; no behavioral changes — documents still declare `cwlVersion: v1.2`). The `cwl-v1.2` repo carries ~1,033 commits and only ~44 stars/27 forks, reflecting that the spec repo is consulted but not socially active.
- **Next version.** A `cwl-v1.3` development repository exists with `v1.3.0-dev1` in progress. There is no public release date, and `v2.0` is referenced only in deprecation notes (e.g., `loadContents` removal). Effectively, the standard has been frozen at v1.2 for over two years.
- **Governance.** CWL operates as an open multi-vendor working group with a documented Code of Conduct and a Leadership Team: **Michael R. Crusoe** (Project Lead, ELIXIR-affiliated, independent), **Peter Amstutz** (Curii / Arvados), **John Chilton** (Galaxy / JHU), **Brandi Davis Dusenbery**, **Jeff Gentry**, **Hervé Ménager** (Institut Pasteur), **Stian Soiland-Reyes** (Manchester / ELIXIR). The group is small, geographically distributed, mostly volunteer time.
- **Reference implementation.** `cwltool` is healthy: ~371 stars, ~4,800 commits, ~450 open issues, regular calendar-versioned releases (`3.2.YYYYMMDD…`), most recently in April 2026. Python 3.9–3.13 support, ReadTheDocs, conda/Debian packaging. This is the strongest single signal that the standard is not dead.
- **Arvados / Curii.** Curii (founded by Amstutz, Tom Clegg, the Wait Zaraneks, Ward Vandewege, George Church) is the de facto commercial steward. Arvados is the most feature-complete production CWL engine (supports v1.0/1.1/1.2, GPU scheduling, content-addressed storage). CWL has a documented CZI EOSS grant ("Enabling Biomedical Science with CWL") — the principal recent injection of external funding.
- **Honest decline indicators.** The CWL Timeline page lists the **2024 CWL Conference at VU Amsterdam** as its most recent event; no 2025 or 2026 conference is announced. Spec repo stars (~44) and editor activity dwarfed by Nextflow/Snakemake equivalents. Citation traffic still anchored to the 2022 CACM paper (Crusoe et al.) rather than new methods papers. The community is **stable but quiet** — not collapsed, but coasting.

## 2. CWL tooling gaps vs Galaxy / Nextflow

| Capability | CWL today | Galaxy | Nextflow / nf-core |
|---|---|---|---|
| Reference runner | `cwltool` (active) | Galaxy server | `nextflow` (very active, Seqera) |
| Cloud / K8s runner | Arvados, Calrissian, Toil, `arvados-cwl-runner` | Pulsar / Kubernetes | Native + Fusion + Tower |
| Tool/process schema lib | `schema-salad` (foundational, low surface), no `galaxy-tool-util` analog | **`galaxy-tool-util`** (rich: lint, cache, test, citations, EDAM) | `nf-core/tools` (lint, sync, template) |
| IDE / LSP | **Rabix Benten** — last release **Jan 2021**, 64 stars, effectively unmaintained | Planemo + Galaxy IDE plugins | nf-core VSCode + `nextflow-language-server` (active) |
| Validator | `cwltool --validate`, `schema-salad-tool` | `planemo lint` | `nextflow lint`, `nf-core lint` |
| Curated workflow registry | None CWL-specific. Workflows land in **Dockstore**, **WorkflowHub** (cross-language) | **IWC** (Intergalactic Workflow Commission) | **nf-core**: 124+ curated pipelines (Feb 2025); cited as 149 on portal |
| Test-data conventions | Ad-hoc; conformance tests for spec only | Planemo test conventions, baked-in `<test>` blocks | `nf-test`, `test` profiles, stub-run |
| Container resolution | `DockerRequirement` + SoftwareRequirement; Singularity/Podman supported | mulled / BioContainers / quay resolution chain | BioContainers + Wave (Seqera) |
| Parameter schemas | Strong (schema-salad, JSON-Schema-like, typed) | `tool_state` JSON; gxformat2 evolving | Groovy-ish DSL2; nf-schema plugin |

**Most important gaps for an agentic IR play:**

1. **No `cwl-tool-util`.** Galaxy has a single library (`galaxy-tool-util`) that handles parsing, linting, dependency resolution, citation extraction, test discovery, EDAM annotation, and shed metadata. CWL has `schema-salad` (parser only) and `cwltool` (runtime). An agent wanting to *manipulate* CommandLineTool documents has to roll its own utilities.
2. **No curated corpus.** IWC and nf-core are the obvious models. Dockstore/WorkflowHub indexes are heterogeneous and not curated to a single quality bar.
3. **No live LSP.** Benten is abandoned. Modern agents and IDE users alike need diagnostics and completion driven by the schema.
4. **No agent-facing translation utilities.** Translators exist (`wdl-cwl-translator`, the abandoned `cwl2nxf`, the UChicago CNT prototype claiming 81% coverage), but none is positioned as a Foundry-grade compiler.

## 3. Competitive landscape

- **Nextflow / nf-core.** Commercial sponsor (Seqera Labs). 124+ curated pipelines as of Feb 2025 (Springer paper in *Genome Biology*); >$30M VC; **Seqera AI** already advertises CWL↔Nextflow translation using Claude. Wins on community traction and developer experience. Loses on formal-semantics rigor: DSL2 is a Groovy DSL with side-effecting channels, hard to statically analyze.
- **Snakemake.** Strong in academic / Python-heavy environments; tight conda integration. Less of a clinical/cloud story.
- **WDL.** Broad Institute–backed (Cromwell, Terra). `womtool`. Strong in human-genomics consortia (GATK, AnVIL). Closed-ish governance.
- **CWL.** The only one of the four with a vendor-neutral, multi-organization spec body and an *executable* formal grammar (schema-salad). Realistic differentiation = **(a) provenance / RO-Crate alignment, (b) formal semantics suitable for static analysis and agent reasoning, (c) ability to express both concrete (CommandLineTool) and abstract (Operation) descriptions** — the latter is exactly what gxformat2 already serializes Galaxy steps into.

## 4. The IR analogy

Compiler precedents:

- **LLVM IR** — multiple frontends (Clang, Rust, Swift, Julia) lower to a single typed IR, then multiple backends (x86, ARM, RISC-V, WebAssembly) emit native code. The IR is not designed for humans; it's designed for *passes*.
- **JVM bytecode** — Java, Kotlin, Scala, Clojure, Groovy compile to a common substrate.
- **MLIR** — multi-level IR with dialects; explicitly designed to support multiple abstraction levels and domain-specific extensions (TensorFlow, PyTorch, polyhedral, hardware). Closer to what workflows need.

Workflow-language translation literature is sparser but real:

- Crusoe et al., *Methods Included* (CACM 2022) — explicitly frames CWL as a *language-independent specification*.
- UChicago **CNT** (BIBE 2023, "Semi-Automatic Translation from CWL to Nextflow") — claims 81% coverage of CWL → Nextflow.
- **wdl-cwl-translator** (common-workflow-lab) — WDL → CWL.
- **galaxy2cwl** (workflowhub-eu) — Galaxy `.ga` → abstract CWL.
- **gxformat2.abstract_export** — already emits CWL Operation classes for Galaxy tool steps.
- Seqera AI — proprietary LLM-driven CWL↔Nextflow.
- F1000Research 2026 article on a graphical Nextflow editor/translator.

No paper to date positions a single workflow language as a *canonical IR* with bidirectional lowering across the major engines. The OS4LS pitch is intellectually novel in framing but technically conservative: every individual translation pair already has a prototype.

## 5. Politics

Curii is the de facto CWL commercial steward; Amstutz is on the leadership team alongside Crusoe (Project Lead) and Chilton (Galaxy). For this proposal to land cleanly:

- **Curii must read the proposal as additive, not adversarial.** The framing should explicitly *not* propose a new runner or a competing reference implementation. Investment in `cwl-tool-util`, an LSP, and a curated corpus benefits Arvados directly. A letter of support from Curii (Amstutz or Wait Zaranek) is the single most important non-technical artifact.
- **Letters of support to seek**: (i) Curii (Amstutz), (ii) CWL Project Lead Crusoe, (iii) ELIXIR / Soiland-Reyes (provenance, WorkflowHub), (iv) Institut Pasteur (Ménager), (v) Dockstore/GA4GH for the registry interop story, (vi) at least one nf-core or Snakemake voice to neutralize the "CWL faction" read.
- **Fork risk.** Real but manageable. The risk shows up if the proposal hints at new spec versions or new conformance regimes outside the working group. Mitigation: anchor all spec-touching work in upstream PRs against `cwl-v1.3`; treat the CWL Leadership Team as the authoritative review body for any spec-adjacent artifact.
- **Receptivity signals.** Curii has previously accepted external funding (CZI EOSS) for documentation/portability work — i.e., they have welcomed external investment before. The leadership team is small and stretched; outside hands are likely to be welcomed if the framing is collaborative.

## 6. AI-readiness framing

Why CWL is the right IR for *agents* (not necessarily for humans):

1. **Formal grammar.** Schema-salad is a real schema language with named, typed records and explicit inheritance. Agents can validate generated artifacts structurally before any execution attempt.
2. **Static parameter schemas.** Inputs and outputs are typed (`File`, `Directory`, `int`, `enum`, records). Nextflow channels and Galaxy `tool_state` are far harder to introspect.
3. **Container-resolution determinism.** `DockerRequirement` + `SoftwareRequirement` give an agent a reproducible binding from logical tool to image without engine-specific resolution rules.
4. **Abstract Operation class** (v1.2). Lets the agent emit the *shape* of a step before committing to a specific runtime — exactly what gxformat2.abstract_export already exploits to round-trip Galaxy steps.
5. **Provenance.** CWL co-evolved with RO-Crate; an agent that generates CWL gets FAIR provenance metadata for free.
6. **Stable target.** The standard has been deliberately frozen at v1.2 for >2 years. For an LLM training/fine-tuning corpus or a static codegen target, *boring is a feature*.

By contrast: Nextflow DSL2 is Turing-complete Groovy with closures and channel side effects; gxformat2 is improving but still tied to Galaxy server state. Neither is a comfortable static-analysis surface.

## 7. Suggested LOI landscape-analysis paragraph (~180 words)

> The bioinformatics workflow ecosystem has bifurcated into two camps: large execution engines with engaged commercial sponsors (Nextflow/Seqera with 120+ curated nf-core pipelines, Galaxy with the Intergalactic Workflow Commission, WDL/Cromwell on Terra) and a portable open standard, the Common Workflow Language (CWL v1.2.1), governed by a vendor-neutral multi-organization working group with Curii (Arvados) as its commercial anchor. CWL's reference runner `cwltool` remains actively maintained (April 2026 release), but its IDE tooling, validators, and registries have stagnated — the Rabix Benten language server has not seen a release since January 2021, and CWL lacks a curated workflow corpus analogous to nf-core or IWC. Meanwhile, the rise of agent-driven workflow construction (Seqera AI, Galaxy's Workflow Foundry, paper-to-pipeline translators) has created new demand for a *machine-readable, formally specified* workflow IR. We see an under-served niche: revitalize CWL not as a competing execution engine but as the portable IR through which agents compile across systems.

## 8. Risks / weaknesses to address proactively

- **"Declining standard" perception.** Real. Mitigated by foregrounding `cwltool`'s active release cadence, the v1.3 development branch, and the CZI-funded recent past. We are *not* claiming CWL is winning; we are claiming it is the right *substrate* for a new layer.
- **Curii overlap.** Address head-on with a Curii letter of support and an explicit non-goal: "We will not build a competing runtime." All runtime work happens upstream in `cwltool` or as Foundry adapters.
- **Reviewer skepticism ("why bet on CWL in 2026?").** Answer: we are not betting on CWL *winning* as an end-user language; we are betting on CWL *surviving* as a stable, formally-specified compilation target. The LLVM IR analogy is the rhetorical anchor: LLVM IR did not need to be a popular source language.
- **Resuscitation-proposal pattern matching.** OS4LS Track 2 may pattern-match this as a "save a dying project" pitch. Counter-frame: this is **infrastructure investment for AI tooling**, not standard rescue. The metric is *how many engines round-trip through the IR*, not *how many users adopt CWL natively*.
- **Curated-corpus duplication.** Risk that a CWL IWC duplicates Dockstore. Mitigation: the corpus is *generated* by the Foundry from existing IWC + nf-core pipelines, not hand-curated from scratch; it serves as a regression test for the translation IR, not as a primary user destination.
- **CWL v1.3 timing.** If the spec ships v1.3 mid-grant with breaking changes, our tooling churns. Mitigation: target v1.2 explicitly; treat v1.3 work as upstream contribution, not dependency.
- **Letters-of-support coordination.** Curii alignment is on the critical path. If a Curii letter is not obtainable, the proposal should be reframed to emphasize Galaxy-side investment with CWL as one of several IRs, rather than CWL-centric.

## Open questions for the human

- Curii buy-in status — talked to Amstutz/Wait Zaranek already?
- Crusoe (CWL Project Lead) — approach as co-PI, advisor, or letter-only?
- `cwl-tool-util` scope — fork `galaxy-tool-util` and retarget, or greenfield using `schema-salad`?
- LSP — fork/resurrect Benten, or new server tied to `cwl-tool-util`?
- Curated corpus — separate registry, or contribute back to Dockstore/WorkflowHub with a "portability-certified" tag?
- Round-trip success metric — semantic equivalence (output-equality on test data) or syntactic (lossless re-emit)?
- WDL in scope, or punt to follow-on?
- Foundry molds: which two ship in 24mo — `paper-to-cwl`, `nextflow-to-cwl`, `galaxy-to-cwl`?
- v1.3 stance — passive consumer or active contributor during the grant?
- Galaxy Project as administrative host, or different fiscal sponsor?

## Sources

- [CWL v1.2 spec repo](https://github.com/common-workflow-language/cwl-v1.2)
- [cwl-v1.3 dev repo](https://github.com/common-workflow-language/cwl-v1.3)
- [cwltool reference implementation](https://github.com/common-workflow-language/cwltool)
- [CWL Timeline](https://www.commonwl.org/timeline/)
- [CWL Governance](https://www.commonwl.org/governance/)
- [Rabix Benten LSP](https://github.com/rabix/benten)
- [Calrissian (CWL on Kubernetes)](https://github.com/Duke-GCB/calrissian)
- [Curii](https://www.curii.com/)
- [CZI EOSS — Enabling Biomedical Science with CWL](https://chanzuckerberg.com/eoss/proposals/enabling-biomedical-science-with-common-workflow-language/)
- [nf-core pipelines](https://nf-co.re/pipelines/)
- [nf-core Genome Biology 2025](https://link.springer.com/article/10.1186/s13059-025-03673-9)
- [Crusoe et al., CACM 2022 — Methods Included](https://doi.org/10.1145/3486897)
- [CNT: CWL→Nextflow translator (BIBE 2023)](https://ucare.cs.uchicago.edu/pdf/bibe23-cnt.pdf)
- [wdl-cwl-translator](https://github.com/common-workflow-lab/wdl-cwl-translator)
- [galaxy2cwl](https://github.com/workflowhub-eu/galaxy2cwl)
- [gxformat2](https://github.com/galaxyproject/gxformat2)
- [WorkflowHub paper (Scientific Data 2025)](https://www.nature.com/articles/s41597-025-04786-3)
- [Dockstore](https://docs.dockstore.org/)
- [MLIR](https://mlir.llvm.org/)
- [LLVM (Wikipedia)](https://en.wikipedia.org/wiki/LLVM)

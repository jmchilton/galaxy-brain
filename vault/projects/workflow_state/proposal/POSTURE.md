# OS4LS Proposal Posture — Context Briefing

This document is a self-contained briefing for an idea-generation agent. The goal: surface concrete proposal angles for a Galaxy-ecosystem submission to OS4LS (Open Source for the Life Sciences) — the inaugural call from the Open Source for Science Fund (Renaissance Philanthropy, May 2026).

---

## 1. The opportunity

**Funder:** Open Source for Science Fund (os4science.org), a multi-donor fund anchored by CZ Biohub and Wellcome with support from The Kavli Foundation and the Research Software Alliance. Built and staffed by the team behind CZI's EOSS program. Launched 2026-05-04, $20M seed.

**Call:** OS4LS — open source software enabling "data-intensive research and AI-driven discovery in the life sciences." Strong continuity with EOSS (mature project, demonstrated adoption, community + technical work, sustainability) **plus new emphasis on AI readiness** — model training data structuring, benchmarking, interoperability, scalability.

**Tracks (24 months, ≤10% indirect):**
- **Track 1 — Domain-specific tools:** ≤ $250K total ($125K/yr).
- **Track 2 — Foundational libraries & ecosystem initiatives:** ≤ $1M total ($500K/yr). Framing favors "broadly used infrastructure-level libraries and cross-cutting ecosystem efforts, with attention to AI readiness."

**Eligibility highlights:** open license + public repo; mature codebase with adoption in life sciences; PI is a core maintainer or designated rep; organization-only grantee (fiscal sponsorship OK — NumFOCUS, Code for Science & Society, etc.); maintainer-community buy-in.

**Dates:** LOI opens 2026-05-11, **LOI due 2026-06-08**, full apps 2026-07-21, decisions Oct 2026, earliest start 2026-12-01.

**Galaxy fit:** Track 2 is the right framing — Galaxy is foundational/ecosystem, and the AI-readiness emphasis aligns with the work the team is already doing.

### Four explicit priority areas (OS4LS will prioritize applications that enable any of these)

Verbatim from the RFA:

1. **"Representing, managing, curating, and structuring scientific data for use in model training"** — data management & representation.
2. **"Developing benchmarks and standards, endpoints, or protocols that unlock the use of open source tools in agentic workflows"** — **this is directly aligned with the workflow-state / Tool Shed 2.0 / Foundry stack.** The phrase "endpoints or protocols that unlock the use of open source tools in agentic workflows" almost literally describes Tool Shed 2.0's typed schema API + offline validation.
3. **"Scalability and performance improvements, including support for hardware acceleration"** — HPC.
4. **"Interoperability frameworks that make tools composable in AI-driven pipelines"** — **Foundry's cross-format translation (nextflow ↔ cwl ↔ galaxy) maps cleanly onto this.** CWL revitalization can be framed here.

### Four-dimension reviewer rubric

Verbatim categories from the RFA, with what reviewers explicitly examine:

1. **Existing Impact** — citations, ecosystem role (esp. for AI/data-intensive), adoption growth.
2. **Quality** — team & leadership, **governance structure**, contributor diversity & breadth, project roadmap clarity & recency, docs & tutorials, commit/PR/issue cadence.
3. **Feasibility** — specificity & clarity of plan, budget appropriateness, likelihood of completion, progress tracking, **degree of unmet need given existing resources**, sustainability beyond the grant.
4. **Value of Proposed Work** — advances adoption in life sciences, unmet life-sciences needs addressed, tool integration improvements, **"advancement of native AI capabilities that support existing needs."**

### Explicit out-of-scope / rejection patterns (RFA-listed)

Critical to avoid these framings:

- Early-stage prototype not yet used beyond creators.
- **AI-assisted rewrite of a legacy tool without existing traction.**
- Proprietary tool being open-licensed via the grant.
- Hosting infrastructure for a repo/database/platform.
- General maintenance / backlog reduction / community management without significant technical goals.
- **AI/ML model development itself** — the fund supports the software that enables data preparation, not the models. *Frame any agentic angle as "tooling that makes existing tools usable by agents," never as "we will build an agent."*
- Generating new datasets.

### LOI & full-app required sections

**LOI (due 2026-06-08):** applicant + host org info, title, short summary, **expected value to life-sciences research community**, **landscape analysis vs. similar open and proprietary tools**, repo links, track selection, **statement that PI is a maintainer**.

**Full app (due 2026-07-21, by invitation):** activities + milestones + deliverables, full budget with ≤10% indirect justification, key personnel, recent institutional/financial support history, **software project metrics**, **expected outcomes + evaluation strategy with indicators**, institutional sign-off. Reviewers are confidential.

### Eligible organization types

"Domestic and foreign nonprofit and for-profit organizations, public and private institutions, including colleges, universities, hospitals, laboratories, units of state and local government, companies, and eligible agencies of the federal government." Independent OSS projects need fiscal sponsor (NumFOCUS, Code for Science & Society, others) by full-app deadline.

### Lessons from EOSS that translate (Zenodo "Insights and Impact From Five Cycles of EOSS", 11201216)

- **Nearly all funded projects produced non-technical outputs alongside technical ones** — docs, training, governance changes, community building. Plan for these as line items, not bonus material.
- **>50% of funded projects reported EOSS funding was "key" to engaging contributors from underrepresented groups.** Treat DEI activities as explicitly fundable.
- **~50% reported cross-project collaborations.** Collaborative letters of support / partner deliverables score well.
- **Identified gap:** "operational streamlining and sustainability planning" is consistently underfunded — projects that articulate this concretely stand out.
- Accessibility (users with disabilities, i18n) is an explicitly funded category.

**Prior Galaxy awards under EOSS** (see [[PRIOR_AWARDS_GALAXY]]):
- Goecks, OHSU — Cycle 3 — "Extending Galaxy for Large-Scale and Integrative Biomedical Analyses."
- Blankenberg, Cleveland Clinic — Cycle 6 (Wellcome co-funded) — "Automated Generation of Galaxy Tools."

---

## 2. The applicant ecosystem

**Galaxy:** web platform with the largest centralized bioinformatics tool registry (~10,000 tools), full GUI, long-standing usage across genomics/proteomics/imaging/mass spec. Three national Galaxy instances + 150+ public servers + 250K+ registered users.

**Foundry** (`~/projects/repositories/foundry`): the applicant project. Current scope: pipelines among workflow formats — `nextflow → galaxy`, `nextflow → cwl`, `cwl → galaxy`. Goal in this proposal context: broaden Foundry's framing to capture a fundable thesis.

**Adjacent in-flight Galaxy work that's directly relevant:**
- **Workflow tool state validation infrastructure** (this project — `workflow_state/`). Schema-aware validation of Galaxy workflows in both native `.ga` and Format2 `.gxwf.yml`, powered by Pydantic models generated from tool definitions served by **Tool Shed 2.0**. See [[EXECUTIVE_SUMMARY]] and [[PROBLEM_AND_GOAL]].
- **Tool Shed 2.0:** typed, versioned, centralized registry serving `ParsedTool` schemas for thousands of tools over HTTP. **No competing workflow system has anything comparable.**
- **gxformat2 / Format2:** the human-writable Galaxy workflow format. Validator, cleaner, round-trip checker, and Format2 export already working.
- **galaxy-workflows-vscode + galaxy-language-server:** VSCode extension being extended with tool-state-aware completions/hovers/validation driven by the Pydantic-generated JSON Schemas — first workflow editor of its kind on any platform.
- **User-Defined Tools (YAML tools):** lets users inline custom logic (JS/Python expressions, CWL-style runtime state) while keeping the same typed-parameter validation as Tool Shed tools. The `runtimeify` validated-state pipeline is working.
- **IWC (Intergalactic Workflow Commission):** community workflow repository — natural CI integration target for lint-on-merge, and the test corpus for round-trip validation.
- **Knowledge-base → agent-skill bridging experiments:** the Foundry team has been working on a human-in-the-loop pattern for connecting curated knowledge bases to agent skills — distinct from RAG and from Anthropic's Claude skills in that humans curate the knowledge surface deliberately. Novel angle the funder may not have seen.

---

## 3. The three strategic directions the PI wants ideas around

From `PROMPT.md`:

1. **Knowledge-base → agent-skill bridging.** Either deepen this approach inside Galaxy/bioinformatics, or generalize it to a new domain. Selling point: explicit human curation as a contrast to RAG and to dropped-in Claude-style skills. Why this matters for OS4LS: the AI-readiness clause in the call. The fund explicitly cares about "data structuring for model training," "benchmarking standards," "interoperability frameworks" — a curated knowledge → skill pipeline can be framed as the human-trusted interop layer between domain knowledge and agentic AI.
2. **Documentation of Galaxy workflows for humans and agents.** Today IWC workflows have inconsistent docs. Agents need machine-readable, structured documentation of what a workflow does, what inputs it expects, and what scientific question it answers. Humans need the same in narrative form. Connects to: tool state schemas, Format2, IWC, workflow round-trip fidelity — all already in motion.
3. **Revitalize CWL outside Galaxy.** CWL has been in funding decline; Curii's stewardship is thin; the standard is sound but the tooling has stagnated. Possible angle: position CWL as the lingua franca **for cross-system workflow conversion** (foundry's nextflow↔cwl↔galaxy is already this) and as the **portable IR** that lets AI agents target multiple execution engines without rewriting. Tooling investment (validators, IDE support, translators, runners) on the CWL side, anchored by Foundry.

These three are not mutually exclusive. A coherent Track 2 proposal could weave them: **a portable, validated, AI-readable workflow substrate** — Tool Shed 2.0 schemas → Foundry translators → CWL as IR → curated knowledge bases as agent skills → IWC as proving ground.

---

## 4. What we've already built (proof-of-traction material)

- 6 working CLI tools in `galaxy-tool-util`: `galaxy-workflow-validate`, `galaxy-workflow-clean-stale-state`, `galaxy-workflow-roundtrip-validate`, `galaxy-workflow-export-format2`, `galaxy-tool-cache`, plus the gxwf umbrella.
- Round-trip validation run against **111 IWC workflows** (RNA-seq, ChIP-seq, variant calling, MS, imaging). 25/111 have stale state — automated cleanup + upstream PRs are the next step.
- Tool Shed 2.0 deployed and serving typed schemas.
- VSCode extension under active development with tool-state-aware completions.
- User-Defined Tools / YAML tools land in Galaxy now.
- Foundry already produces working pipelines between three major workflow ecosystems.

This is the "demonstrated adoption + plan to address a clear technical bottleneck" shape OS4LS asks for.

---

## 5. Competitive frame

| | Galaxy + this work | Nextflow | Snakemake | WDL |
|---|---|---|---|---|
| Centralized typed tool registry | **Yes — 10K+ tools** | No | No | No |
| Pre-execution param/connection validation | **Yes — schema-driven** | No | No | Partial |
| Offline validation (no server) | **Yes — ToolShed API + cache** | N/A | N/A | womtool only |
| Human-writable workflow format | **Yes — Format2** | DSL2 | Snakefile | WDL |
| GUI | **Yes** | No | No | No |
| Inline custom code | **Yes — YAML tools** | Yes | Yes | Yes |
| Agentic loop with millisecond validation | **Yes** | No (execution-time) | No | No |

The "structural moat" sentence: **Galaxy is the only bioinformatics workflow system where an agent can write a multi-step pipeline and validate every parameter and connection against a registry of 10,000+ community-maintained tools before executing anything.**

---

## 6. Constraints / cautions

- 10% indirect cap rules out some university-owned submissions; fiscal sponsorship (e.g., NumFOCUS) is a real option Galaxy has used before.
- "Mature codebase with demonstrated adoption in life sciences" — Foundry alone is too young; the proposal must be anchored on Galaxy / gxformat2 / IWC, with Foundry as a deliverable.
- Two Galaxy PIs have already won EOSS funds (Goecks, Blankenberg). Coordinate with them — a competing Galaxy submission to the same call is a self-inflicted wound.
- CWL revitalization is technically aligned but politically delicate; Curii's role and any Arvados-overlap needs to be sorted before pitching.

---

## 7. What we want from the idea-generation agent

Generate concrete proposal ideas that:

1. Fit OS4LS Track 2 ($1M, foundational/ecosystem, AI-readiness).
2. Build on **demonstrated** Galaxy-ecosystem traction listed in §4 — not green-field.
3. Address **at least one** of the three strategic directions in §3, ideally two.
4. Pair technical work with the EOSS-style soft deliverables (docs, training, community, sustainability) from §1.
5. Have a defensible "no other workflow system can do this" claim, drawing on §5.

For each idea, produce: (a) one-paragraph thesis, (b) 3–6 concrete deliverables, (c) how it differentiates from Nextflow/Snakemake/WDL and from generic RAG/Claude-skill approaches, (d) which other Galaxy efforts it should coordinate with, (e) honest risks, (f) **which of the four RFA priority areas in §1 it lands in**, (g) **landscape/comparable tools** for the required LOI landscape analysis.

Prioritize ideas that are **load-bearing for AI-assisted bioinformatics** rather than incremental Galaxy maintenance. The funder has seen "maintain X" proposals for six years; the differentiator is "AI-era infrastructure that only Galaxy can build."

**Framing traps to avoid** (RFA-listed rejection patterns):
- Do not frame as "general maintenance" or "backlog reduction."
- Do not frame as "AI-assisted rewrite of a legacy tool."
- Do not pitch ML/AI model development — pitch the substrate that lets agents use existing tools.
- Do not pitch hosting/infra for a registry or database; the work must be the software layer above it.
- Do not pitch generating new datasets.

---

## Reference docs in this directory

- `PROMPT.md` — original user framing of the three directions.
- `PRIOR_AWARDS_GALAXY.md` — EOSS award writeups for Goecks Cycle 3, Blankenberg Cycle 6, and pointers to higher-signal EOSS retrospective writeups.
- `../EXECUTIVE_SUMMARY.md` — strategic narrative of the workflow-state work.
- `../PROBLEM_AND_GOAL.md` — full deliverable list (D1–D10) of the workflow-state project.

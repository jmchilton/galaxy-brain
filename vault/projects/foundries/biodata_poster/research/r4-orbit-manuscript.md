# R4 — Orbit manuscript (`manuscript_v2.pdf`)

> [!WARNING]
> **Private, unpublished manuscript. Internal use only.** This file summarizes it; it doesn't reproduce it.
> Results are described qualitatively, with no effect sizes or concordance numbers, and quotes are a
> few words at most. The galaxy-brain site renders `vault/projects/**` sub-files, so check with John
> before committing this file.

- **Source:** `~/Documents/private_papers/manuscript_v2.pdf`, 40 pages, read in full on 2026-10-24.
  The printed page numbers match the PDF page numbers, and `p.N` below means both.
- **Cross-checks:** foundry `origin/main` @ `bc790960` (2026-10-24). Local `loom` clone @ `4bd00cff`
  (2026-06-15, not fetched, so stale).
- **Tags:** **[V]** verified from the source, **[I]** inferred, **[NF]** looked for and not found.

## 1. Executive summary

- **What it is.** The manuscript is titled *Verifiable Agentic Science on Public Infrastructure*
  (p.1). It argues that coding agents should run analyses on public Galaxy infrastructure rather
  than in local shells, so that every step leaves a provenance record. Orbit is its desktop
  workbench. **[V]**
- **Where the Foundry fits.** The Foundry is a supporting component. It is cited as ref 14 (p.30),
  described in one Methods subsection (p.22), and used in one case study (p.9–11). **[V]**
- **Biggest risk: the methods-section case.** The *Aspergillus fumigatus* case (Hokken et al.)
  already presents a multi-step Galaxy workflow that "Workflow Foundry" compiled **from published
  methods text** (Table 1 p.8; p.9–11; Fig 6A p.11; p.23–24; Table S3 p.36). That is the abstract's
  promised "workflow built from a published methods section". If the poster reuses Hokken for that
  slot, it collides with this manuscript. **[V]**
- **Other overlap.** The Methods subsection describes the core of abstract claims 3 and 5: Molds,
  staged skill compilation, and gxwf validation against tool schemas and IWC exemplars, then
  Planemo (p.22). **[V]**
- **Clean ground for the poster.** The manuscript doesn't contain:
  - the knowledge-problem framing (claim 1);
  - the Karpathy LLM-wiki lineage (claim 2);
  - "seven pipelines" (claim 4);
  - explicit incompleteness or gap lists (claim 6);
  - knowledge update and recompile (claim 7);
  - sarek, EGAPx, any Nextflow or CWL conversion result, or the expert-interview route. **[NF]**
- **Status.** No venue, submission date or preprint is stated. "v2" and the phrase "made publicly
  accessible upon publication" (p.28) suggest it is pre-submission or under review. **[I]** Whether
  the overlap breaks the "new and unpublished" rule depends on whether this appears publicly before
  Nov 4. **Ask John.**

## 2. What Orbit is and how it relates to the Foundry

### Orbit and its stack

- **Orbit** is "a lightweight desktop workbench built on top of Pi.dev" (p.6; Fig 3 Panel 1, p.5). **[V]**
  - It is an Electron app over a headless agent runtime, an extension on Pi.dev (p.22).
  - An execution guard intercepts tool calls by model tier, path security and shell hazard. Local
    writes are confined to the workspace, and secrets are redacted from `activity.jsonl`.
  - Galaxy jobs are tracked through YAML invocation blocks in `notebook.md` (p.22).
  - It is opinionated: it routes tool execution through Galaxy, registers custom scripts as
    versioned User-Defined Tools (UDTs), and exports the session as a research notebook (p.6–8).
  - It supports commercial, public-API and local models (p.8).
- **The architecture has three panels** (Fig 3, p.5). **[V]**
  1. Agent Layer: any CLI agent, or Orbit.
  2. Guardrails: Domain Skills plus the Galaxy MCP server.
  3. Public Compute: UseGalaxy.org, ACCESS-CI and cloud.

  The manuscript calls the whole arrangement the **"Galactic plane"** (p.5 heading; p.8; p.16).
- **Supporting pieces** (all **[V]**):
  - Galaxy MCP server: 44 structured endpoints, built on BioBlend, stdio or streamable HTTP (p.21).
  - "Galactic skills" (`galaxyproject/galaxy-skills`, ref 17).
  - UDTs: YAML `GalaxyUserTool`, sandboxed ECMAScript command templating (p.22).
  - BRC-Analytics, which stages reference data (p.22).
  - "Universal Agentic Plugins" (`galaxyproject/agentic-plugins`, p.28).
- **Repos** (p.27):
  - "Orbit Workbench and Loom Runtime" → `galaxyproject/loom`.
  - Foundry → `galaxyproject/foundry`. **[V]**
- **Local `loom` README (stale clone)** says the same thing: Loom is the Pi.dev "agent brain", and
  Orbit is its Electron shell. **[V, dated 2026-06]**

### How the Foundry is related

Orbit is a **consumer and sibling, not the same system**. **[V/I]**

- p.22 says the Foundry compiles Molds into agent skills "for diverse agent runtimes such as Claude
  Code, Codex, Antigravity, and Orbit". So Orbit is one of four target runtimes. **[V]**
- In the case studies, the Foundry works alongside Orbit and BRC-Analytics: "Orbit + Workflow
  Foundry + BRC-Analytics + 3 UDTs" (Table 1 p.8; p.9). **[V]**
- Foundry roadmap item #306 states the boundary: Foundry publishes portable knowledge, and Loom owns
  stateful orchestration. A planned `loom` cast target would lower Foundry pipelines into Loom plans
  (`content/meta/roadmap.md` @ `bc790960`). **[V]** That bridge is not built yet. **[I]**

### How the manuscript describes the Foundry (p.22, "Workflow Foundry and BRC-Analytics") **[V]**

- It is a TypeScript/Node.js skill-compilation pipeline, `@galaxy-foundry/gxwf-foundry`. The package
  exists in foundry `package.json` @ `bc790960`.
- Each Mold is Markdown with Zod-validated YAML frontmatter. It declares upstream handoff schemas,
  design patterns, reference manuals and downstream output artifacts.
- Synthesis happens in stages with JSON and Markdown handoffs:
  1. Summarize the paper, Nextflow pipeline or CWL workflow.
  2. Design the Galaxy interface and the collection data flow.
  3. Resolve Tool Shed wrappers or UDTs.
  4. Assemble `gxformat2` step by step.
  5. Validate with gxwf against Galaxy tool XML and IWC exemplars.
  6. Test with Planemo.
- p.21 adds a second, looser description: Foundry skills "compile validated workflow templates into
  agent memory". **[V]**

## 3. Overlap with the abstract's claims ("new and unpublished" risk)

| # | Abstract claim | Manuscript coverage | Overlap |
| - | - | - | - |
| 1 | Translation is a knowledge problem, not a syntax problem | Not argued. The motivation is local-shell unreliability (p.1–2). | None **[NF]** |
| 2 | Inspectable knowledge base extending Karpathy's LLM wiki | No knowledge-base, wiki or Karpathy framing | None **[NF]** |
| 3 | Molds declare schemas, exemplars and contracts, then compile to skills with a provenance record | Molds, declared handoff schemas, reference manuals and staged skill compilation (p.22). Skill provenance records aren't mentioned. | **Substantial** **[V]** |
| 4 | Seven pipelines from Nextflow, CWL, methods text or interview | Source types paper, Nextflow and CWL are listed (p.22). No pipeline count and no interview route. | Partial **[V]** |
| 5 | Oracles: Tool Shed pinning → gxwf → Planemo, with failures fed back | gxwf validation against tool schemas and IWC exemplars, then Planemo (p.22). Tool Shed resolution is named but pinning is not stressed. No feedback loop is described. | **Substantial** for the chain, none for feedback **[V]** |
| 6 | Explicit incompleteness and stated requirements | Not described. "Uncovering undocumented details" in published papers (p.12) is a different idea. | None **[NF]** |
| 7 | Update knowledge, recompile the skill | Not described | None **[NF]** |
| 8 | Early results: expert specs, partial Nextflow translations | No Foundry result from Nextflow or an expert spec. The only Foundry result is from **methods text** (Hokken). | None for 8 as worded. **Collides** with the methods-section promise. **[V]** |
| 9 | Open release | Foundry repo listed as open source (p.27) | Partial **[V]** |

### The promises, one by one

- **Methods-section workflow: high risk.**
  - The manuscript already shows one built from Hokken et al. with published-result agreement
    (p.10–11, Fig 6A).
  - Foundry `origin/main` @ `bc790960` has no hokken or aspergillus mention (`git grep -il`). **[NF]**
  - The artifacts live in `github.com/scottcain/hokken_afumigatus_rnaseq` and UseGalaxy histories
    (Table S3 p.36). Scott Cain is a manuscript author, not a poster author.
  - Options for the poster:
    - pick a different methods-section target;
    - cite the manuscript, if it is public by then;
    - show the Foundry-side mechanics of that run (Molds, handoffs, gxwf report) rather than the
      biology. **[I]**
- **sarek and EGAPx: no overlap.** Neither is mentioned. **[NF]**
- **Expert-interview workflow: no overlap.** Not mentioned. **[NF]**
- **Held-out pipelines: no overlap.** Not mentioned. **[NF]**
- **CWL: named only.** It appears as a source type (p.22) with no demo. This mirrors the abstract's
  gap. **[V]**
- **nf-core usage elsewhere in the manuscript is not Foundry translation.** nf-core/rnaseq and
  nf-core/differentialabundance appear only as tools a local agent ran (p.4, p.20, Table S1 p.34).
  That doesn't overlap the poster. It is, though, the same pipeline family that Anton's foundry-paper
  replications use, which is worth knowing when reading R3. **[V/I]**

## 4. Terminology, framings and figures to stay consistent with

### Product names

- The manuscript is inconsistent about the Foundry's name: "Workflow Foundry" (p.9, p.16, p.17,
  p.21), "Galaxy Workflow Foundry" (p.22, p.27), and "Galaxy workflow Foundry" (ref 14, p.30).
  **[V]** The poster should pick "Galaxy Workflow Foundry" and the manuscript should be aligned to
  match. **[I]**
- Other names used **[V]**:
  - "Galaxy MCP server" (`galaxy-mcp`);
  - "Galactic skills";
  - "User-Defined Tools (UDTs)";
  - "BRC-Analytics";
  - "Orbit" and "Loom";
  - "UseGalaxy.org";
  - "ACCESS-CI".

### "Provenance" means two different things

This collision needs resolving.

- **Manuscript:** "provenance" is Galaxy execution provenance, meaning histories, invocations,
  notebooks and tool versions (passim, e.g. p.5, p.16). **[V]**
- **Abstract claim 3:** each compiled skill carries a provenance record. That is the build-time
  `_provenance.json` in `casts/claude/skills/*/` @ `bc790960`. **[V]**
- Suggestion: say "build provenance" or "skill provenance" on the poster, and say "execution
  provenance" if the Galaxy sense comes up. **[I]**

### Framings

- **"Galactic plane."** Use it for continuity if the poster shows Galaxy as the execution target.
  **[I]**
- **Fig 3 architecture** (Agent Layer, Guardrails, Public Compute). The Foundry naturally sits in the
  Guardrails/Domain Skills box. If the poster's system panel is drawn compatibly, the two works read
  as one ecosystem. **[I]**
- **Different motivations.** The manuscript's argument is that local agents fragment and leave no
  trail: 30-agent divergence (Fig 1 p.3) and unversioned glue scripts (Fig 2 p.4, Table S2 p.35). The
  poster's argument is that faithful translation needs current knowledge. These are complementary,
  and the poster shouldn't re-run the divergence argument as its own result. **[I]**
- **"From papers to skills"** is a manuscript section heading (p.9), and the Paper2Agent comparison
  is there too (ref 24). The poster should avoid making the same phrase its headline. **[I]**

### Figures

- No Foundry-specific figure exists. The only Foundry-attributed panel is Fig 6A, Hokken fold-change
  agreement (p.11). **[V]**
- The poster's Mold, skill and oracle diagrams therefore don't duplicate any figure. **[I]**

### Numbers to avoid citing

- The abstract says "48 biological analyses" (p.1, p.2). Table 1 and the summary say "seven
  biological investigations" (p.8, p.16), one of which is a 42-alignment batch. **[V]** The poster
  shouldn't quote 48.
- Model names come from "early-2026 benchmark logs" (p.18). **[V]**

## 5. Authorship and status

### Authors **[V]**

There are 13 authors (p.1):

- Dannon Baker
- Scott Cain
- Marius van den Beek
- John Chilton
- Danielle Callan
- Steven Weaver
- Nate Coraor
- Kelsey Beavers
- Michael C. Schatz
- Björn Grüning
- Sergei L. Kosakovsky Pond
- Anton Nekrutenko

Correspondence is to Pond (`spond@temple.edu`) and Nekrutenko.

### Overlap with the poster's authors

- All five poster authors are on the manuscript: Chilton, van den Beek, Baker, Callan and
  Nekrutenko. **[V]**
- **Callan's affiliation conflicts.** The manuscript gives Penn State plus galaxyproject.org
  (superscripts 2 and 6). RESEARCH_GOALS gives Temple. **Ask John.** **[V]**
- Baker is at JHU plus galaxyproject.org, which matches the goals file. **[V]**

### Status

- No journal, submission date, preprint DOI or version date appears anywhere in the PDF. **[NF]**
- Artifacts are "under review access controls made publicly accessible upon publication" (p.28),
  which points to pre-publication. **[I]**
- The local file is named `manuscript_v2`. **[V]**

### Companion repos (p.28) **[V]**

- `nekrut/orbit-paper`
- `nekrut/spatTrOrbit`
- `nekrut/phist`
- `veg/chronaeon`
- BRC reanalysis repos (Table S3)
- a "companion eight-model *Candida auris* benchmark" (p.17)

## 6. Open questions (ask John)

1. **Timing.** Will the Orbit manuscript be preprinted or submitted before Nov 4? If so, does the
   poster cite it?
2. **Hokken.** Is the methods-section demo off-limits for the poster? If so, which alternative
   methods-section target should we use?
3. **Hokken in the Foundry.** Was the Hokken compilation run from a Foundry commit? Which one? It
   isn't in foundry `log.md` or `git grep` @ `bc790960`.
4. **Callan's affiliation.** Temple or Penn State?
5. **Naming.** Should the poster's "Galaxy Workflow Foundry" be the canonical name, with ref 14 and
   pp.9/16/17 of the manuscript aligned to it?
6. **Provenance wording.** Is "build provenance vs execution provenance" acceptable wording?
7. **Orbit on the poster.** Should Orbit and Loom appear as a runtime target, given roadmap #306? Is
   the `loom` cast target shipping before Nov 4?
8. **Candida auris.** Is the "Candida auris benchmark" (p.17) Foundry-related, and does it bear on
   R5?

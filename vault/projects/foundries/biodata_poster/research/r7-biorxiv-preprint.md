# R7 — Orbit manuscript on bioRxiv (whitepaper)

> [!WARNING]
> **The preprint is public (CC-BY 4.0) and may be quoted. The v2 manuscript it is diffed against is
> still private.** v2 content appears only as short phrases and numbers where they are needed to show
> a change (§2), never as passages. The galaxy-brain site renders `vault/projects/**` sub-files, so
> check with John before committing.

- **Source:** `https://www.biorxiv.org/content/biorxiv/early/2026/10/28/2026.10.26.761864.full.pdf`.
  It is 44 pages and was read in full on 2026-10-29 in three Read calls (pp.1–20, 21–40, 41–44).
  The printed page numbers match the PDF page numbers, and `p.N` below means both.
- **Local copy:** `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-projects-foundries/3acdaf3c-a6bd-4a3e-8b68-0197c5bb473f/scratchpad/biorxiv/preprint.pdf`.
  - The scratchpad is session-only, so re-download the file if it is needed later.
  - Size is 21,200,650 bytes, and sha256 begins `64ccd53d…f051`.
  - PDF CreationDate is 2026-10-23. For v2 it was 2026-10-16.
- **Diffed against:** R4 (`r4-orbit-manuscript.md`), plus a term-level `pdftotext` comparison with
  `~/Documents/private_papers/manuscript_v2.pdf` (40 pp).
- **Tags:** **[V]** verified from the preprint (or from v2 for diff rows), **[I]** inferred, **[NF]**
  looked for and not found.

## 0. How it was fetched

| Attempt | Result |
| - | - |
| `curl -L -A '<Chrome 130 UA>'` on the `.full.pdf` URL given | **Worked first try.** HTTP 200, `application/pdf`, 21.2 MB **[V]** |
| Abstract page at the URL given, `…/content/10.1101/2026.10.26.761864v1` | HTTP 200, but the body is a bot-challenge page (title "\| bioRxiv", URL ends `/node/`). No metadata **[V]** |
| Abstract page at the real DOI, `…/content/10.64898/2026.10.26.761864v1` | HTTP 200 with full `citation_*` and `DC.*` metadata **[V]** |

**The DOI prefix is not `10.1101`.** The PDF's running header and the page metadata both give
`10.64898/2026.10.26.761864` **[V]**. The citation must use that prefix.

## 1. Bibliographic facts

| Field | Value | Tag |
| - | - | - |
| Title | *Verifiable Agentic Science on Public Infrastructure*, the same title as v2 | [V] |
| DOI | `10.64898/2026.10.26.761864` (`citation_doi`; running header on every page) | [V] |
| Posted | **2026-10-28**, v1 (`citation_date`; header "this version posted October 28, 2026") | [V] |
| Section and subject | "New Results", collection **Bioinformatics** | [V] |
| License | CC-BY 4.0 (header) | [V] |
| Authors (13) | Dannon Baker, Scott Cain, Marius van den Beek, John Chilton, Danielle Callan, Steven Weaver, Nate Coraor, Kelsey Beavers, **Jeremy Goecks**, Michael C. Schatz, Björn Grüning, Sergei L. Kosakovsky Pond, Anton Nekrutenko (p.1) | [V] |
| Correspondence | `spond@temple.edu`, `anton@nekrut.org` (p.1) | [V] |
| Funding (page meta + p.25) | NIH U24AI183870 (NIAID), U24HG006620 (NHGRI); NSF 2419522, 2138585 (p.25) | [V] |

## 2. Is this the Orbit manuscript made public? Diff against R4

**Yes.** The title, author core, structure, case studies and the Foundry Methods subsection all match
v2, so this is the Orbit manuscript revised and posted **[V]**. R4's question 1, "will it be
preprinted before Nov 4?", is answered: it was posted Oct 28.

### 2.1 Authorship and status

| Item | v2 / R4 | Preprint | Tag |
| - | - | - | - |
| Author count | R4 says "13" but lists 12. v2 has **12** | **13**: adds **Jeremy Goecks**, H. Lee Moffitt Cancer Center ML dept. (⁵) plus galaxyproject.org (⁷) | [V] |
| Callan affiliation | Penn State + galaxyproject.org (2,6). R4 flagged a conflict | **Temple only** (³). That matches RESEARCH_GOALS and closes R4 Q4 | [V] |
| Status | No DOI; artifacts "made publicly accessible upon publication" | Preprint DOI. That phrase is **still present** (p.25), so the artifacts may remain access-controlled | [V] |

Goecks is now a co-author **and** a discussion leader at the meeting, with a talk there (R6) **[V]**.
He is a natural person to point visitors from his talk to both boards **[I]**.

### 2.2 Structure and figures

| Item | v2 (per R4) | Preprint | Tag |
| - | - | - | - |
| Architecture figure | Main Fig 3 (p.5): "Agent Layer / Guardrails / Public Compute" | Moved to **Supp. Fig S2 (p.34)** and redrawn. Boxes: Agent (Orbit, OpenCode, Claude Code, Codex, Agy) · MCP Server · Skills · "UI: Validation and Provenance" · Public cyberinfrastructure · Tools/Data. The **"Guardrails" label is gone** | [V] |
| Main figures | Several, including Fig 5 (spatial) and Fig 6A (Hokken) | Only **three**: Fig 1 alluvial divergence (p.3), Fig 2 spatial (p.7), Fig 3 manifold dating (p.11) | [V] |
| Hokken figure | Fig 6A (p.11) | **Fig S4A (p.36)** | [V] |
| Table 1 | p.8 | **p.6**, still "seven biological investigations" | [V] |
| Table S3 (Hokken artifacts) | p.36 | **p.40** | [V] |
| Foundry Methods subsection | p.22 | **p.18** | [V] |
| "From papers to skills" heading | p.9 | **Dropped.** The spatial section is now "Uncovering a reference discrepancy…" (p.5) | [V] |

### 2.3 Text and numbers

| Item | v2 (per R4) | Preprint | Tag |
| - | - | - | - |
| "48 biological analyses" (abstract) | Present | **Dropped.** The abstract now says "a large, diverse array of studies" (p.1) | [V] |
| *Candida auris* companion benchmark | Present | **Dropped**, with no mention anywhere. R4 Q8 is moot | [V] |
| Galaxy MCP endpoints | 44 | **45 in `galaxy-mcp` v1.11.2**. A TypeScript twin, `@galaxyproject/galaxy-ops`, was added. Orbit is **v0.8.0** (p.16) | [V] |
| Planemo citation in the Foundry Methods | "…via Planemo." with no reference | "…via Planemo [47]", which is **Bray et al. 2023, *Genome Research* 33(2):261–268** (p.18, p.31) | [V] |
| Skills paragraph | Skills "ensure" agents execute verified procedures | "Skills are guidance, not enforcement" (p.16) | [V] |
| Hokken SE inflation | 18–26% (v2 Methods) | 20–26% (p.8, p.19) | [V] |
| Hokken downstream finding | "two broken downstream tools" | "three manual downstream web steps" (p.8). Table 1 reads "a decommissioned web service (AspGD) and two manual web steps" (p.6) | [V] |
| Limitations | Case studies are "n = 1 demonstration runs" | Reworded to "interactive sessions that incorporated investigator steering" (p.12) | [V] |

### 2.4 Added in the preprint

| Item | Where | Tag |
| - | - | - |
| Prior-art sentence naming ClawBio's Galaxy Bridge, plus Nextflow and AWS HealthOmics tooling | p.2 | [V] |
| "Putting this all together": `galaxyproject.org/agents/`, `agentic-plugins` registering `galaxy-mcp` "with curated Galaxy and Workflow Foundry skills", Orbit downloads | p.10 | [V] |
| Orbit evidence-gate evaluation: a prompt-only rule followed in **0 of 15** graded runs on open-weight models; the post-v0.8.0 refusal default (`evals/`, `docs/evidence-gate-audit.md`) | pp.17–18 | [V] |
| Agent-level metadata (model, thinking effort) is only in Orbit's local logs, not on Galaxy job tags, "a clear next step for server-side provenance integration" | p.12 | [V] |
| Three-stage UDT governance: user-scoped UDTs, then platform telemetry, then IUC/IWC with Planemo regression tests | pp.12–13, p.17 | [V] |
| RO-Crate on Zenodo as "the primary scientific product"; NotebookLM for re-rendering | p.13 | [V] |
| DeepSeek / open-weight remark | p.12 | [V] |

## 3. Every Foundry passage, with page numbers

These are all the hits for "Foundry" in `pdftotext` output, checked against the page images. **[V]**
throughout.

| # | Page | Context | Substance |
| - | - | - | - |
| F1 | p.5 | Results, "Uncovering analysis inconsistencies and defunct tools" | "we combined Orbit with Workflow Foundry [14]", described as compiling "published methods prose into validated Galaxy workflows". BRC-Analytics stages references |
| F2 | p.6 | Table 1, Hokken row | Stack: "Orbit + Workflow Foundry + BRC-Analytics + 3 UDTs". Highlight: "Compiles a 60-step workflow from published methods text…" |
| F3 | p.8 | Results, Hokken narrative | "Workflow Foundry compiled a 60-step Galaxy workflow (86.88% mean unique alignment vs. 86.5% published)". The pooled-model correction follows (see §3.1) |
| F4 | p.10 | "Putting this all together" | `agentic-plugins` registers `galaxy-mcp` "with curated Galaxy and Workflow Foundry skills" |
| F5 | p.16 | Methods, "Galaxy MCP Server and Modular Skills" | "Workflow Foundry skills compile validated workflow templates into agent memory [14]", followed by "Skills are guidance, not enforcement" |
| F6 | p.18 | Methods, "Workflow Foundry and BRC-Analytics" | The full description. Galaxy Workflow Foundry (`@galaxy-foundry/gxwf-foundry`) is TypeScript/Node.js and compiles **Molds** into skills for Claude Code, Codex, Antigravity and Orbit. Molds are Markdown with Zod-validated YAML frontmatter declaring handoff schemas, design patterns, reference manuals and output artifacts. Synthesis runs in staged JSON/Markdown handoffs: summarize a paper, Nextflow pipeline or CWL workflow → design the interface and collection topology → resolve "curated ToolShed wrappers or User-Defined Tools" → assemble `gxformat2` step by step → `gxwf` static validation (topology, connectivity, parameter schemas against Galaxy XML and **IWC exemplars**) → Planemo [47] |
| F7 | p.19 | Methods, Hokken | "Workflow Foundry compiled a 60-step workflow chaining `fastp`, `rna_star` (`--quantMode GeneCounts`), unstranded count extraction…, and pooled 30-sample … `deseq2` (`~timepoint`…)" |
| F8 | p.25 | Data and Code Availability | "Galaxy Workflow Foundry: https://github.com/galaxyproject/foundry" |
| F9 | p.28 | Ref [14] | "Galaxy Project. Galaxy workflow Foundry. https://github.com/galaxyproject/foundry, 2026. GitHub repository." |
| F10 | p.36 | Fig S4A caption | "A pooled 30-sample DESeq2 model compiled via Workflow Foundry reproduces published log₂ fold changes…" |
| F11 | p.40 | Table S3, Hokken row | History `bbd44e69cb8906b5a5cd735af575e8f5`, with a "60-step Galaxy workflow compiled via Workflow Foundry" |

The passage from v2 that listed the Foundry among the community components in the Discussion is
**gone**. So is v2's one-line summary of how each study was driven. The Foundry no longer appears in
the Discussion at all **[V]**.

### 3.1 The Hokken passages are ambiguous

- **p.8:** the initial pairwise outputs were compared against the supplement. Then "Switching our
  Galaxy workflow to a pooled 30-sample timepoint model" fixed the SEs. The switch is not attributed
  to the Foundry. **[V]**
- **p.19 and the Fig S4A caption (p.36):** these describe the Foundry-compiled workflow **as** the
  pooled model. **[V]**
- **Reading:** either the Foundry compiled the pooled model after the human or agent diagnosis, or
  the final workflow is credited to the Foundry as a whole. The text doesn't settle it. **[I]**
- **Implication for the poster:** don't imply the Foundry got pooling right on the first pass. The
  honest framing is that methods text omitted a modeling choice, and comparison with the authors'
  own data found it. **[I]**

### 3.2 What the preprint does **not** say about the Foundry

| Not reported | Tag |
| - | - |
| Any gxwf or Planemo outcome for the Hokken workflow | [NF] |
| A Foundry SHA or route name | [NF] |
| A Tool Shed pin list. The only mention is "curated ToolShed wrappers", p.18 | [NF] |
| A skill provenance record | [NF] |
| A failure → knowledge-update → recompile loop | [NF] |
| A gap list or open-requirements ledger | [NF] |
| A pipeline count, "seven pipelines", or the interview route | [NF] |
| sarek, EGAPx, any held-out notion, any Nextflow- or CWL-sourced Foundry result | [NF] |
| A knowledge-base or wiki framing, or Karpathy. Case-insensitive grep: "karpathy" and "wiki" give 0 hits, and "knowledge" gives only "acknowledge" (p.26) | [NF] |

## 4. Which poster claims are now public, and the "new and unpublished" verdict

| # | Abstract claim | Public now? | Where | Tag |
| - | - | - | - | - |
| 1 | Translation is a knowledge problem | **No.** The preprint's motivation is provenance, not knowledge | — | [NF] |
| 2 | Inspectable KB, Karpathy LLM wiki | **No** | — | [NF] |
| 3 | Molds → compiled skills, with a provenance record | **Molds and staged compilation: yes.** Provenance record: no | p.18 | [V] |
| 4 | Seven pipelines; Nextflow / CWL / methods / interview | **Source types paper, Nextflow and CWL: yes.** Count and interview: no | p.18 | [V] |
| 5 | Tool Shed → gxwf → Planemo, failures fed back | **Chain: yes.** The Tool Shed step is named, but pinning is not stressed, and there is no feedback | p.18 | [V] |
| 6 | Explicit incompleteness | **No** | — | [NF] |
| 7 | Update knowledge, then recompile | **No** | — | [NF] |
| 8 | Early results: expert specs, partial Nextflow | **No.** The only public Foundry result is from methods text (Hokken) | — | [NF] |
| 9 | Open release | **Yes.** The repo (p.25) and skills via `agentic-plugins` (p.10) | p.10, p.25 | [V] |
| Promise | Workflow from a published methods section | **Hokken is public** | p.5, 6, 8, 19, 36, 40 | [V] |

**Verdict [I].** The overlap R4 worried about is now *prior public work by the same group*, not
hidden overlap.

- The poster can **cite** Baker et al. 2026 for:
  - the Mold and skill-compilation mechanics;
  - the staged handoffs;
  - the gxwf → Planemo chain;
  - the Hokken demonstration.

  It shouldn't present any of these as new.
- What stays new is:
  - claims 1, 2, 6 and 7;
  - skill provenance records;
  - the seven-pipeline route set and the interview route;
  - the Tool Shed pinning detail and the failure-feedback loop;
  - per-target oracle tables;
  - DengueSeq (held-out, Planemo-green; R2), sarek, EGAPx and CWL.
- **Recommended line:** "The Foundry's compilation pipeline is described in Baker et al. 2026
  (bioRxiv); here we report its knowledge base, provenance, oracle feedback and held-out
  conversions."
- **Methods-section slot:** **use DengueSeq** as the new result. Cite Hokken as the published prior
  demonstration, which is better than avoiding it.
- **CSHL's exact rule on preprints** wasn't checked. A same-group preprint is normally fine at a
  poster meeting, but **ask John**.

**Timing risk [V/I].**
- The preprint posted on **Oct 28**, which is R5/R6's print-upload deadline. Today is Oct 29. **[V]**
- If the print file is locked, put the citation on the QR landing page or a pinned insert. **[I]**
- If it isn't locked, add it to the footer (§7). **[I]**

## 5. What to align with or cite

### 5.1 Terminology

| Term | Preprint usage | Poster action | Tag |
| - | - | - | - |
| Foundry name | "Workflow Foundry" (pp.5, 6, 8, 10, 16, 19, 36, 40); "Galaxy Workflow Foundry" (p.18, p.25); "Galaxy **w**orkflow Foundry" (ref [14], p.28). The v2 inconsistency is unchanged | Use "Galaxy Workflow Foundry". Fix ref 14's lowercase "w" in v2 of the preprint | [V] |
| Tool Shed | "ToolShed", one word (p.18) | The abstract and poster use "Tool Shed". Pick one, and prefer Galaxy's own "Tool Shed" | [V]/[I] |
| Molds, `gxformat2`, "gxwf validation engine", Planemo, IWC exemplars | p.18 | Use the same words | [V] |
| "Galactic plane" | p.3 heading, p.4 | Optional continuity | [V] |
| Skills | "domain skills", "Galactic skills" (ref 17), "Workflow Foundry skills" | "Foundry skills" is consistent | [V] |
| Provenance | Always Galaxy *execution* provenance | Still say "build/skill provenance" for `_provenance.json` (R4 §4) | [V]/[I] |
| Runtimes | Claude Code, Codex, Antigravity, Orbit (p.18). Fig S2 adds OpenCode | List the same four if runtimes are named | [V] |

### 5.2 Figures

- **Fig S2 (p.34).** The Foundry belongs in the **"Skills"** box. A poster system panel showing
  "Foundry → compiled skills → (Skills box)" reads as one ecosystem with this figure. **[I]**
- **Fig S3A/B (p.35).** The Galaxy editor flags the `tximport` collection mismatch in orange, and
  the repaired workflow shows green. This is a public visual of exactly the connection-type check
  gxwf runs offline. It's a good thumbnail or reference for the oracle panel. **[V]** figure, **[I]**
  link to gxwf.
- **Fig 1 (p.3).** Thirty agents produce 18 pipelines. Cite it as the motivation, and don't redraw it
  as a poster result. **[I]**

### 5.3 Numbers (all public now; cite, don't restate as poster results)

| Number | Page | Tag |
| - | - | - |
| 30 agents → 18 distinct pipelines; 29 of 30 differ from the published workflow; 11 designs across the 5 result-changing steps | pp.2–3 | [V] |
| 26 unversioned glue scripts, 1,266 LOC, across 3 local runs | p.3, Table S2 p.39 | [V] |
| Seven biological investigations | p.6 | [V] |
| Hokken: 60-step Foundry workflow; 30 libraries; DEG counts within 0.3–1.3% | pp.8, 19–20 | [V] |
| `galaxy-mcp` 45 endpoints (v1.11.2); Orbit v0.8.0 | p.16 | [V] |
| A prompt-only notebook-approval rule followed in 0/15 graded runs (open-weight models via TACC: Qwen3, Llama 3.3) | p.18 | [V] |

### 5.4 Shared references

- [8] Galaxy 2026 update, *NAR* 54(W1):W105–W116.
- [11] IWC.
- [14] Foundry repo.
- [17] galaxy-skills.
- [47] Planemo (Bray et al. 2023).

If the poster has a reference strip, using the same entries keeps the two boards consistent. **[V]**

## 6. New evidence that strengthens poster arguments

1. **"Skills are guidance, not enforcement" (p.16), plus 0/15 prompt-rule compliance on open-weight models via TACC (p.18).** This
   is the best public support for the poster's thesis that deterministic programs, not the model,
   decide correctness. The poster can say that the companion Orbit study found a prompt-only notebook-approval rule
   followed in 0 of 15 graded runs on open-weight models (Qwen3, Llama 3.3), so the Foundry puts correctness in gxwf and Planemo. **[V]**
   evidence, **[I]** framing.
2. **Static connection validation caught an agent error (p.4, pp.15–16, Fig S3A).** The agent wired
   an incompatible `tximport` step, and Galaxy's validator flagged it before execution. That is
   public evidence that schema-level connection checks catch real agent mistakes, which supports
   claim 5. **[V]**
3. **A semantic error that no static gate catches (p.4).** HISAT2, a spliced aligner, was run on a
   bacterium and was caught only by a human inspecting the history. It parallels foundry#655 (R5
   §5.1 #3), and it is the public argument for Planemo assertions plus expert review in the loop.
   **[V]** event, **[I]** parallel.
4. **Methods sections under-specify, repeatedly.** Each is **[V]**:
   - unstated reference assembly and pooling (*B. cereus*, p.2);
   - a pooled DESeq2 model not in the methods text (Hokken, p.8);
   - a tutorial subset cited as the full atlas (Paper2Agent, p.5);
   - per-replicate unmerged rows and tissue-specific overlap (Ruiz, p.8);
   - a hard-coded mitochondrial gene list (Wang, p.8).

   This is the strongest public case for claim 6. A methods-to-workflow translator **must** emit
   stated requirements and a gap list, because the source is silent on result-changing choices. The
   DengueSeq ledger (R2) is the Foundry's mechanism for exactly this. **[I]**
5. **The Fig 1 benchmark is a "no knowledge" baseline.** Its prompt explicitly forbids "Galaxy skills
   or infrastructure" (Table 2, p.14). The divergence it shows is what agents do without curated,
   current knowledge, which is indirect support for claim 1. Don't overclaim: the preprint attributes
   the divergence to missing infrastructure and provenance, not to missing knowledge. **[V]** prompt,
   **[I]** reading.
6. **Provenance gap = Foundry opportunity (p.12).** The preprint names "which model / thinking
   effort" on Galaxy job records as a next step. The Foundry's skill `_provenance.json` is the
   build-time half of that story: which knowledge and which skill produced this workflow. Stamping
   the cast SHA into the workflow annotation or the run record would join the two. This is an idea
   for the poster's "future" box, not a claim. **[I]**
7. **The governance path to IWC (pp.12–13, p.17).** UDTs graduate to IUC/IWC "where human
   maintainers … add Planemo regression tests". The Foundry already emits Planemo tests and compares
   against IWC exemplars, so its outputs sit on that same graduation path. This matches the
   foundry-paper open question about an IWC strategy (RESEARCH_GOALS §3). **[V]** text, **[I]** link.
8. **Distribution is public (p.10).** `agentic-plugins` ships "curated Galaxy and Workflow Foundry
   skills". That is public support for claim 9 and a ready "Get it" QR target
   (`galaxyproject.org/agents/plugins/`). Whether that page lists Foundry skills today wasn't
   checked. **[V]** text, **[NF]** live page.
9. **RO-Crate as the product (p.13).** An optional poster line: a Foundry output, meaning a
   gxformat2 workflow plus tests plus ledger, is exportable as a Workflow RO-Crate. **[I]**

## 7. Citation lines

- **Full:** Baker D, Cain S, van den Beek M, Chilton J, Callan D, Weaver S, Coraor N, Beavers K,
  Goecks J, Schatz MC, Grüning B, Kosakovsky Pond SL, Nekrutenko A. Verifiable Agentic Science on
  Public Infrastructure. *bioRxiv* 2026.10.26.761864 (posted 28 Oct 2026).
  doi:10.64898/2026.10.26.761864
- **Poster footer:** Baker et al. (2026) *bioRxiv* doi:10.64898/2026.10.26.761864 — Orbit, Galaxy
  MCP and the Foundry on public infrastructure.

## 8. Open questions (ask John)

1. **Print status.** Is the print file locked? If so, does the citation go on the QR page or a
   pinned insert?
2. **CSHL rule.** Is a same-group preprint posted Oct 28 OK under "new and unpublished", given that
   the poster cites it and claims only the non-overlapping parts?
3. **Hokken attribution.** Did the Foundry compile the pooled model directly, or was it switched
   after diagnosis? Which Foundry SHA was used? Still unknown, as in R4 Q3.
4. **Name.** Fix ref [14]'s "Galaxy workflow Foundry" and "ToolShed" in a v2 of the preprint?
5. **Goecks.** Ask him to point from his talk to the Foundry and Orbit boards?
6. **`agentic-plugins`.** Confirm it actually bundles Foundry skills today before printing the QR.

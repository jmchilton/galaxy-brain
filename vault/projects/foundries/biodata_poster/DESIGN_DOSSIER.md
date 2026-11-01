# Design Dossier: Galaxy Workflow Foundry Poster, CSHL Biological Data Science 2026

Brief for the poster design agents. Read all of it before writing anything. As of 2026-10-29.

## 1. The job

Design a **44″ × 44″ printable poster** (vector PDF) for the *Tools, Visualization, and
Infrastructure* track at CSHL Biological Data Science, Nov 4–7, 2026.

- **Audience:** genomics people, not workflow-engine people. Assembly, annotation, population
  genetics, ML. They walk past at 2–3 m and stop for maybe 20 seconds.
- **Neighbours:** two Orbit posters (Nekrutenko, Cain), a VGP Galaxy workflows poster and a Goecks
  talk. We should look nothing like a standard three-column Galaxy poster.
- **Printing:** a local print shop takes the vector PDF. A QR code links to a live results page
  that can keep updating after print.

### Authors (exact, copy verbatim)

John Chilton¹, Marius van den Beek¹, Dannon Baker², Danielle Callan³, Anton Nekrutenko¹

1. The Pennsylvania State University, University Park, PA, USA
2. Johns Hopkins University, Baltimore, MD, USA
3. Temple University, Philadelphia, PA, USA

### Title options (pick one or propose a better one; keep the ecosystem words)

- *From Papers and Conversations to Runnable Galaxy Workflows*
- *From Nextflow, CWL, Papers, and Conversations to Runnable Galaxy Workflows* (the submitted
  wording family)

## 2. The story (the lead was decided 2026-10-24)

**Lead: native Galaxy workflows written from unstructured sources**, i.e. a published methods
section or an expert's free-form description. Nextflow/CWL translation is a **supporting** case,
valuable because it has ground truth to check against.

The argument in one breath: *Writing a correct workflow isn't a syntax problem, it's a knowledge
problem. Current Galaxy practice changes faster than model training data. So the Foundry keeps that
knowledge in an inspectable wiki, compiles it into agent skills, and lets deterministic tools, not
the model, decide when a workflow is correct. What can't be resolved is written down, not hidden.*

## 3. Ideas and theory (rich material; usable by every variant)

1. **Knowledge problem, not syntax problem.** A model can read a Nextflow file or a methods section,
   but it can't be assumed to know today's Galaxy data model, collection semantics, tool
   interfaces or idioms. Without that grounding, output is plausible yet wrong.
2. **The LLM wiki, extended.** This builds on Karpathy's "LLM wiki" idea, a markdown knowledge base
   that an LLM maintains and queries. The Foundry adds typed structure: notes declare what they
   are, and action-sized **Molds** declare exactly which schemas, patterns and command contracts
   they depend on. The wiki is *compiled*, not just read.
3. **Molds → compiled skills ("casts").** Each Mold compiles into a self-contained agent skill
   with a **provenance record**: hashes of every source note, so you can trace which knowledge
   produced a skill. Skills ship as one plugin (`foundry-skills`) for Claude Code, Codex and
   Antigravity.
4. **Pipelines are routes.** Molds compose into ordered pipelines, each a route from a source
   (paper, expert interview, Nextflow, CWL) to a Galaxy workflow. There were 7 at abstract time and
   13 on `main` now (not all source→Galaxy: two emit CWL, two are review/maturation), including routes through an intermediate "workflow brief" a human can review.
   The routes share the downstream stations.
5. **The tools decide, not the model.**
   - **Tool Shed discovery** pins each tool to an installable revision.
   - **gxwf** validates structure, parameters and connections against real tool schemas.
   - **Planemo** installs the tools and runs tests.

   The model interprets, translates and repairs. The tools judge. Supporting public evidence: in the
   Orbit preprint (a companion study, open-weight models), a rule given only in the prompt was followed in **0 of 15** graded runs; always attribute it to that study, never as a Foundry result, and
   "skills are guidance, not enforcement" (Baker et al. 2026, p.16, p.18).
6. **Explicit incompleteness.** Every run produces an **open-requirements ledger**: source behaviour
   the workflow doesn't yet reproduce, stated as a requirement. Methods sections routinely omit
   result-changing choices, which the Orbit preprint also documents, so gaps are expected, and
   writing them down is the honest output.
7. **Fix the knowledge, recompile.** A failed run is diagnosed to a knowledge defect, the note or
   Mold gets fixed, and the skill is recompiled with a new provenance hash. That's the learning
   loop, and it happens in the wiki, not in model weights.
8. **Two kinds of provenance.** *Build provenance*: which knowledge made this skill. *Execution
   provenance*: Galaxy's record of what actually ran. The Foundry supplies the first, Galaxy the
   second.
9. **What a "native" Galaxy workflow means.** It uses Galaxy's own tools, pinned to Tool Shed
   revisions, with Galaxy collection semantics. It is not a wrapped container of someone else's
   pipeline.

## 4. Evidence bank

Labels show how safe each item is to put on a public poster:

- **PUBLIC:** fine to show.
- **OK-W/CAVEAT:** show, but with the caveat noted.
- **ASK:** needs John's sign-off. Design a slot for it and mark it `[[ASK]]`.

### Unstructured sources (the lead)

- **DengueSeq** (Vogels et al. 2024, *BMC Genomics*, dengue virus serotype-3 sequencing),
  2026-10-20. **PUBLIC**
  - Went from paper, to a human-reviewed workflow brief (the reviewer was John Chilton, a poster author), to a Galaxy workflow. The agent also had the paper's DENV_pipeline code, so say "from the paper", not "from methods text alone".
  - 7 Tool Shed tools pinned to changesets. `gxwf validate --strict` passes. `planemo test` is green.
  - The ledger records 5 open gaps, 2 of them deliberate stated drops.
  - The paper was chosen *after* the skills were built, so it's genuinely held out.
  - No replication of the paper's results yet.
- **Hokken et al. *A. fumigatus* RNA-seq.** **PUBLIC; cite the preprint.**
  - A roughly 60-step workflow compiled from methods text and run on public Galaxy. Its fold changes
    agree with the paper.
  - Already published in the Orbit preprint (Fig S4A, p.36 of the posted preprint). Cite it; don't present it as new.
  - Don't imply the Foundry got the statistical model right on the first pass; that's ambiguous.
- **Expert-spec workflows** (MRSA, ATAC "use cases", June). **OK-W/CAVEAT**
  - Built from a free-form written spec; only the MRSA *draft* is confirmed gxwf-valid (no ATAC summary found).
  - They are *not* live interviews, and Planemo never ran.
  - Say "expert specification", never "conversation" or "interview".

### Nextflow / CWL (supporting)

- **nf-core/atacseq and nf-core/rnaseq** (Anton's work, private repo). **ASK**
  - **What's there:** 2 pipelines, 15 runs, all gxwf-valid and Planemo-green, each with a paper
    replication (Patel 2025 RNA; Punga 2026 ATAC).
  - **Latest:** rebuilt on pinned IUC/Tool Shed tools, and they pass the unpatched released gxwf.
  - **Caveats:**
    - not held out;
    - built from an old Foundry version, and the latest versions were assembled by scripts, so say
      "Foundry-validated", not "Foundry-generated";
    - ATAC rebuild is partial.
  - **No numbers on the poster** without sign-off.
- **nf-core/sarek.** A run exists; the result isn't in hand. **OK-W/CAVEAT** as "in progress".
- **NCBI EGAPx.** The step-by-step translation produced an empty workflow; a one-tool wrapper
  exists. **OK-W/CAVEAT** as an honest partial.
- **CWL.** Nothing demo-grade.

### Loop and oracle evidence

- **Recompile instance:** the 2026-06 MRSA run falsely reported `integron_finder` missing from the
  Tool Shed. Commit `73af1f62` fixed the Mold and its eval and recompiled the skill, and the
  provenance hash changed. **PUBLIC**
- **Second recompile instance:** the same test-assertion defect showed up in 3 runs. PR #701 fixed
  the knowledge note and regenerated 8 skills. **PUBLIC**
- **Upstream fixes the conversions forced:**
  - IUC #8808 (merged);
  - usegalaxy-tools #1791 (merged 2026-10-29) and galaxy #24435 (open);
  - galaxy-tool-util-ts #204/#205, which shipped in gxwf 1.15.0, after which the Foundry recompiled
    against it.

  **PUBLIC as PR links.**
- **Validator blind spot:** gxwf accepted a workflow with zero tool steps (EGAPx). A fix exists on
  a local branch. **Honest variant only.**
- **CI:** 31 pattern workflows run `planemo test` against Galaxy 26.1 in CI, green. **PUBLIC**

### Corpus figures

Use these as of `origin/main` 2026-10-24, and re-check at print:

| Figure | Count |
| - | - |
| notes | 420 |
| Molds (27 reviewed) | 56 |
| pipelines | 13 |
| patterns | 54 |
| CLI manual pages | 36 |
| schemas | 16 |
| compiled skills | 69 |
| `eval.md` oracles | 51 |
| scenarios | 46 |

The README counts some of these differently, so quote one consistent set and footnote the date.

## 5. Names, words, numbers

- **Product name:** *Galaxy Workflow Foundry* on first use, then "the Foundry". Never "Workflow
  Foundry" alone.
- **Spellings:** *EGAPx*, *nf-core/sarek*, *gxwf*, *Planemo*, *Tool Shed* (two words).
- **Never quote:**
  - "48 analyses";
  - the retracted "six of eight returned zero processes" sweep;
  - any rate like "N of M pipelines green". There is no defensible held-out rate.
- **Don't headline:** "From papers to skills" (the Orbit manuscript used that heading). Avoid
  "AI-generated", which invites suspicion; say "agent-built, tool-verified".
- **Citation:**
  - Baker D, …, Nekrutenko A. *Verifiable Agentic Science on Public Infrastructure.* bioRxiv
    2026.10.26.761864 (2026). doi:10.64898/2026.10.26.761864
  - Karpathy's LLM wiki.
  - Vogels et al. 2024 (DengueSeq).

## 6. Links and QR targets (verified live)

- Repo: https://github.com/galaxyproject/foundry
- Docs: https://galaxyproject.github.io/foundry/
- Install the skills: https://galaxyproject.github.io/foundry/usage/
- Preprint: https://doi.org/10.64898/2026.10.26.761864
- Live results page: URL TBD. Use the placeholder `[[QR: live results]]`.

Generate QR codes as vector SVG, for example with the `qrcode` npm package, never as raster.

## 7. Production constraints (all variants)

- **Size:** 44″ × 44″ (1117.6 mm square), vector PDF, fonts embedded, no bleed required.
  - Keep critical content 1″ from the edge.
  - Body text ≥ 28 pt at full size, headings ≥ 72 pt, title ≥ 120 pt.
- **Colour:** print-safe. Avoid large areas of saturated RGB that shift in CMYK. Check legibility in
  greyscale.
- **Fonts:** free and embeddable (Google Fonts or system). Record the font names in the README.
- **Images:** vector, or ≥ 150 dpi at print size. No stock art and no AI-generated imagery.
- **Real data where possible:** workflow graphs, ledgers and provenance snippets should be rendered
  from real files rather than drawn as illustrations:
  - local run dirs: `~/projects/foundry-runs/dengueseq-denv3*`, `demo-qc-trim`, `bacass-sr-assembly`;
  - Foundry casts: `~/projects/repositories/foundry`.
- **Deliverables per design,** in `./biodata_poster/designs/<slug>/`:
  - the source files;
  - `poster.pdf` at full size;
  - `preview.png` at about 1500 px square;
  - `README.md` with build steps, fonts, data sources, `[[ASK]]` slots and open questions.
- **Rebuild with one command** documented in the README. Someone who has never seen it must be able
  to edit text and re-export.

## 8. Off-limits

- Read-only everywhere except your own `designs/<slug>/` directory. Don't commit or push.
- foundry-paper (Anton) results appear only in `[[ASK]]` slots, with no copied figures or tables.
- No fabricated numbers, logos, quotes or results. If a number isn't in this dossier or a cited
  source file, it doesn't go on the poster.

## 9. Deeper reading (optional)

Whitepapers in `./biodata_poster/research/`:

| File | Covers |
| - | - |
| `r1-foundry-system.md` | system and worked example |
| `r2-demo-targets.md` | demos |
| `r3-foundry-paper-data.md`, `r8-foundry-paper-refresh.md` | Anton's data |
| `r4-orbit-manuscript.md` | Orbit manuscript |
| `r5-benchmark-feasibility.md` | benchmark |
| `r6-venue-logistics.md` | venue |
| `r7-biorxiv-preprint.md` | preprint |

This dossier wins any conflict with them.

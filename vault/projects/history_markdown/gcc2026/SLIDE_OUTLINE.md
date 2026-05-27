# GCC2026 — Slide-by-slide Outline

> Companion to `CONTEXT.md`. Each slide entry: **tier** (MVP / Polish / Stretch), **goal**, **body sketch**, **MVP fallback**.
>
> Implementation lives at `~/projects/repositories/jmchiltondotnet/src/content/slides/gcc2026.mdx`. Sections in MDX correspond 1:1 to entries below.

## Pacing target

8 minutes presenting, 2 minutes Q&A. Roughly 16–22 slides total at 20–30s each plus two video blocks (~3 min each).

## Block A — Thesis (≈2:00)

### A1. Title — `~10s` — Tier 0
**Goal:** establish credibility and tone.
**Body:** Title (working: "Reproducibility in the Age of Agents"), subtitle ("Designing for human reproducibility, accelerating it for everyone else"), name, GCC2026.
**Notes:** terminal-aesthetic title slide matching prior decks.

### A2. The new crisis — `~25s` — Tier 0
**Goal:** state the problem with no hedging.
**Body:** "Agent-driven science is scaling faster than our ability to trust it." Volume metric or imagined headline. The phrase **"we're about to automate the reproducibility crisis"** lands here.
**MVP fallback:** text-only slide.

### A3. The temptation to adapt away — `~25s` — Tier 0
**Goal:** name the wrong move so the right move lands.
**Body:** brief acknowledgment that the easy move is to bolt chat onto Galaxy or build agent-only shortcuts that bypass provenance. Frame as the slop path.
**MVP fallback:** text-only slide; could be a one-line aside if pacing tight.

### A4. The claim — `~30s` — Tier 0
**Goal:** the headline argument of the talk.
**Body:** "The infrastructure built for human reproducibility is exactly what agents need." Galaxy should double down, not adapt away. Designing for humans **accelerates** AND **incentivizes** reproducibility for agents.
**Notes:** this is the slide whose sentence the audience should remember if they remember nothing else.

### A5. Two case studies — `~20s` — Tier 0
**Goal:** set up Block B and Block C.
**Body:** "Two new ways to construct the same Galaxy workflow against the same scientific question — one starting from a documented history, one starting from a conversation. Both leaning on the same reproducibility primitives."
**Body, line 2:** introduce the **MRSA mobile-AMR comparative-isolate** application (one-liner from `galaxy-brain#12`).
**MVP fallback:** include a single icon for each case study + the MRSA one-liner.

## Block B — Case Study 1: History → Workflow (≈3:00)

### B1. Setup — History Notebooks — `~30s` — Tier 0
**Goal:** introduce the substrate before showing the demo.
**Body:** "History Notebooks: Galaxy-flavored markdown attached to histories. Datasets, parameter tables, visualizations embedded. Every revision attributed (user / agent / restore). Already in the codebase on `history_pages`." 1 screenshot showing notebook with embedded dataset display.
**MVP fallback:** static screenshot only.

### B2. The pivot — extraction from narrative — `~15s` — Tier 0
**Goal:** name the new mechanism the demo shows.
**Body:** "Once a notebook references the outputs that matter, Galaxy walks the provenance graph backward and proposes a workflow." Point at issue #22709.
**Notes:** keep this terse; the video carries the explanation.

### B3. **Demo video 1** — `~2:30` — Tier 1 (Tier 0 fallback below)
**Goal:** the audience sees the mechanism end-to-end.
**Source:** edited cut of MRSA history → notebook narration → graph-backed extraction → workflow with seeded report. Storyboard in `DEMO1_STORYBOARD.md`.
**Tier 0 fallback:** sequence of 4–6 still screenshots advanced with reveal.js fragments; jmchilton narrates live.
**Tier 1 target:** ~3 min YouTube embed, sourced from a real (or convincingly seeded) MRSA history.
**Tier 2 stretch:** the video is from a real biological run, not seeded data.

### B4. What just happened — `~15s` — Tier 0
**Goal:** transfer takeaway from video to argument.
**Body:** "Narrative drove extraction. The notebook became the workflow's report. Same provenance graph the history already had — agents didn't need a new substrate." Pointer to **galaxy-notebooks paper** (vault link / preprint URL when available).

## Block C — Case Study 2: Conversation → Workflow (≈3:00)

### C1. Setup — the other direction — `~20s` — Tier 0
**Goal:** contrast with B1.
**Body:** "Same application. No Galaxy server in the loop yet. We're going to *build* the workflow before we ever run it — and we're going to validate it the whole way." Mention Format2 as the writable artifact and gxwf as the static-validation core.
**MVP fallback:** unchanged.

### C2. Format2 + the 10,000-tool registry — `~25s` — Tier 0
**Goal:** state the depth-of-validation differentiator.
**Body:** one-paragraph version of the gxwf executive summary's competitive claim: "Every workflow system validates *something*. Only Galaxy can validate the scientific tool invocation itself — because only Galaxy has 10,000+ typed tool schemas." Mini side-by-side: a `.ga` `tool_state` blob vs. its Format2 equivalent.
**MVP fallback:** text-only with the comparison table from `WORKFLOW_STATE_EXECUTIVE_SUMMARY.md`.

### C3. Foundry — `~20s` — Tier 0
**Goal:** introduce the agent-authoring layer above gxwf.
**Body:** "Foundry compiles workflow-construction knowledge into agent skills. Each step (Mold) author → validate-via-gxwf → fix in a tight inner loop. Today: an *interview-to-Galaxy* pipeline." One sentence is enough — the video shows it.

### C4. **Demo video 2** — `~2:30` — Tier 1 (Tier 0 fallback below)
**Goal:** show Foundry walking an MRSA-shaped intent into a validated Format2 workflow.
**Source:** edited cut of agent interview → progressive Format2 build → gxwf diagnostics → corrected workflow. Storyboard in `DEMO2_STORYBOARD.md`.
**Tier 0 fallback:** screencasted gxwf-validating-a-Format2-file-in-VS-Code only, with Foundry framed as forthcoming layer.
**Tier 1 target:** ~3 min YouTube embed with the Foundry interview pipeline driving authoring.
**Tier 2 stretch:** the Foundry-iterating-on-workflow visualization (see `FOUNDRY_VIZ_IDEAS.md`).

### C5. What just happened — `~15s` — Tier 0
**Goal:** parallel of B4.
**Body:** "Validated against the *same* tool schemas the Galaxy UI uses. Same workflow as case study 1, reached from the other direction. Format2 is now a first-class authoring surface for humans *and* agents." Pointer to **gxwf paper** and **Foundry paper**.

## Block D — Synthesis & pointers (≈0:30)

### D1. Two paths, one infrastructure — `~20s` — Tier 0
**Goal:** the through-line.
**Body:** simple diagram: MRSA story → (path A: history → notebook → graph extraction → workflow) + (path B: conversation → Foundry → gxwf → Format2 workflow) → one underlying provenance / schema substrate.
**Notes:** if a clean visual doesn't land, this slide can be a text triplet.

### D2. The three papers + long video — `~10s` — Tier 0
**Goal:** make the talk an ad for further reading.
**Body:** three boxes with paper titles + the standalone long-video URL.
**Polish target:** real DOI / preprint / repo URLs; QR code.
**MVP fallback:** vault paths + "papers in preparation."

### D3. Thanks / Q&A — `~10s` — Tier 0
**Goal:** prompt questions.
**Body:** acknowledgments (Nekrutenko lab, Galaxy community, IWC, etc.), contact, GitHub.

## Optional / Stretch slides (only if time and material both arrive)

### S1. Foundry-iterating viz — Tier 2
Standalone slide / pre-roll for demo 2 showing the workflow growing step-by-step with gxwf gating each transition. See `FOUNDRY_VIZ_IDEAS.md`.

### S2. Edit-source provenance — Tier 2
Single screenshot of a notebook revision panel with user/agent/restore badges. Embeds the "attribution as provenance" point if Q&A time allows.

### S3. IWC corpus CI — Tier 2
One screenshot of an IWC PR with `gxwf validate --strict` running. Empirically grounds the depth-of-validation claim; only include if pacing has slack.

## MDX skeleton mapping

The MDX file at `src/content/slides/gcc2026.mdx` should contain one `<section>` per slide above, in order, separated by `---`. Use reveal.js fragments (`<span class="fragment">…</span>`) for incremental reveals inside A2/A4. Embed YouTube via `<iframe>` for B3 and C4; until those videos exist, embed a placeholder `<img>` for the storyboard contact sheet.

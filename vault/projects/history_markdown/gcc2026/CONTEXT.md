# GCC2026 Talk — Context for Future Agents

> **Status:** Active planning, MVP target ~1–2 weeks from 2026-05-23. North-star plan with explicit MVP/polish/stretch tiers so any of these slides can be presented even if downstream features slip.
>
> **Owner:** jmchilton.
> **Slide implementation lives in:** `~/projects/repositories/jmchiltondotnet` (Astro + reveal.js, MDX, route auto-publishes at `/slides/gcc2026`). New deck file: `src/content/slides/gcc2026.mdx`. Dev: `make dev`. Build: `make build`.
> **Reveal.js version note:** package.json declares `reveal.js ^5.2.1` (CSS only, imported at `SlideLayout.astro` line 3); the actual JS runtime is loaded from CDN at `reveal.js@4.5.0` (lines 181/185/190). **Target v4.5.0 JS features** until the layout is upgraded.
> **All planning docs (this file, slide outline, demo storyboards, status logs) live here in `vault/projects/history_markdown/gcc2026/`.**

## Thesis (the two-minute version)

> We're about to **automate the reproducibility crisis.** Agents scale analysis faster than they scale trust. Galaxy's response should not be to adapt away from its core principles; it should be to double down on them. Infrastructure designed for *human* reproducibility is exactly what agents need — and shipping it as agent-grade tooling accelerates *and incentivizes* reproducibility on both sides.

The case-study payoff: two new ways to construct Galaxy workflows that both lean on the same reproducibility infrastructure, demonstrated against the same scientific application.

## Shared application — MRSA mobile-AMR comparative analysis

Both demos use the **MRSA mobile-AMR demo vignette** described in
[`jmchilton/galaxy-brain#12`](https://github.com/jmchilton/galaxy-brain/issues/12):

- 3–4 complete MRSA isolate assemblies (KUN1163, KUH140013, KUH140046, KUH180129 from BioProject PRJDB8599 / Hikichi 2019).
- Tools: `staramr`, `Bakta`, `ISEScan`, `IntegronFinder`, table→GFF3 conversion, JBrowse.
- Question: which resistance genes appear in mobile genomic contexts (plasmids, IS, integrons, SCCmec) across related isolates?
- Anchors in GTN: bacterial-genome-annotation, amr-gene-detection, mrsa-illumina tutorials.

Status (as of 2026-05-23): **storyboard only.** Real Galaxy history is expected to be ready in time but is not the gating risk — both demos can be presented from storyboard/seeded-history if the real run slips.

## Presentation budget (10 min slot, 2 min Q&A reserved)

| Block | Time | Content |
|---|---|---|
| Title + thesis | ~2:00 | "Automating the reproducibility crisis" + Galaxy's role |
| Framing both case studies | ~0:15 | "Two new ways to construct the same workflow" |
| Case study 1 — notebook-driven extraction | ~3:00 | embedded heavily-edited demo of #22709 against MRSA history |
| Case study 2 — building the workflow without Galaxy | ~3:00 | embedded demo of Foundry interview→Galaxy pipeline + gxwf validation, same MRSA app |
| Synthesis + paper pointers | ~0:30 | three papers as citations; site as long-video pointer |
| **Total presenting** | **~8:00** | leaves ~2:00 for questions |

## Key referenced documents

### Abstract & exec summaries (this directory)
- `ABSTRACT_CHATGPT.md` — canonical talk abstract (Reproducibility in the Age of Agents).
- `HISTORY_NOTEBOOKS_EXECUTIVE_SUMMARY.md` — what was built for History Notebooks; framing for case study 1.
- `WORKFLOW_STATE_EXECUTIVE_SUMMARY.md` — Format2 + gxwf + Foundry stack; framing for case study 2.
- `CLAUDE.md` — narrower scoping note about this directory.

### Paper manuscripts (the three citations the talk advertises)
- `vault/papers/galaxy-notebooks/manuscript.md` — History Notebooks paper draft (substantial).
- `vault/papers/gxwf/manuscript.md` — Format2 + gxwf authoring/validation paper draft (substantial).
- `vault/papers/foundry/manuscript.md` — Foundry paper (empty; see `vault/papers/foundry/outline.md`, `index.md`, `case-study.md`).

### Implementation references
- Galaxy issue [galaxyproject/galaxy#22709](https://github.com/galaxyproject/galaxy/issues/22709) — notebook-driven workflow extraction (the case-study-1 mechanism).
- `vault/projects/history_markdown/GRAPH_WORKFLOW_EXTRACTION_PLAN.md` — blocked-pending-gate plan for the extraction path.
- `vault/projects/history_markdown/HISTORY_MARKDOWN_ARCHITECTURE.md` — architecture for History Notebooks.
- `vault/projects/history_markdown/SCREEN_CAST_PLAN.md` — pre-existing screencast plan with `seed_demo_histories.py` patterns. Reuse for MVP demo 1 if MRSA history slips.
- Galaxy issue galaxyproject/galaxy#21475 — original History Notebooks proposal.
- Branch: `history_pages` in `~/projects/worktrees/galaxy/branch/history_pages`.
- Workflow-state branch: `wf_tool_state`.
- `vault/projects/workflow_state/` — CURRENT_STATE.md, PROBLEM_AND_GOAL.md, VSCODE_EXTENSION_PLAN.md.

### Slide infrastructure
- Existing slide system: `~/projects/repositories/jmchiltondotnet/src/content/slides/*.mdx` + `src/layouts/SlideLayout.astro`.
- Reference deck for style/format: `claude-lab-talk-2025-12.mdx`.
- New deck (to create): `src/content/slides/gcc2026.mdx`.
- Build: `make dev` / `make build` from `jmchiltondotnet`.
- **Decision:** extend existing infra. Reveal.js is rich enough (fragments, video embeds, transitions, code highlighting). Don't migrate.

## Slide outline

The slide-by-slide outline (with MVP/polish/stretch markers and per-slide notes) lives in **`SLIDE_OUTLINE.md`** in this directory. Read that file alongside this one.

## Demo videos

Two embedded YouTube videos, each ~3 minutes after heavy editing. Storyboards are in:

- `DEMO1_STORYBOARD.md` — history → notebook → graph extraction → workflow report (#22709 over MRSA).
- `DEMO2_STORYBOARD.md` — Foundry interview-to-Galaxy → gxwf-validated Format2 workflow (same MRSA app, no Galaxy server in the loop).

> **Note:** demo 2 deliberately does *not* mention Nextflow conversion. The Foundry mode being demonstrated is the **interview→galaxy** pipeline (currently in development). Keep this consistent across all materials.

## Tiered scope — MVP / Polish / Stretch

Every component is tracked at one of three readiness tiers so that if a feature slips, the talk can present a degraded-but-coherent version of the same material.

### Tier 0 — MVP (present even if everything below slips)
- Title + thesis slides — all content already written in `ABSTRACT_CHATGPT.md`.
- Both case studies present as **conceptual** slides + storyboards: still-frame diagrams, parameter-tree screenshots, narrated walkthrough.
- A single static screenshot or 30-second clip per case study, even if the full 3-minute video isn't recorded yet.
- Paper pointers at end.
- "Long video coming" pointer (site link), even if the long video isn't recorded yet.

### Tier 1 — Polish (target for talk day)
- Full 3-minute edited demo 1 video against a real (or convincingly seeded) MRSA history.
- Full 3-minute edited demo 2 video showing Foundry interview→galaxy on MRSA application with gxwf round-trip.
- Site auto-publishes the deck at `jmchilton.net/slides/gcc2026`.
- All three paper drafts have public URLs to cite.

### Tier 2 — Stretch (nice-to-haves)
- Foundry visualization showing the workflow growing step-by-step under Mold execution with gxwf gating each transition. (See `FOUNDRY_VIZ_IDEAS.md` — *placeholder, to be filled in by jmchilton.*)
- Real (not seeded) MRSA history with biological story (mobile context differences across the four isolates) usable as a paper figure.
- Long-form standalone video (see parallel track below).

## Parallel track — longer standalone thesis video

This is **planned in parallel** with the conference talk and shares assets but has its own timeline. Conference talk is essentially a "trailer" for this video and the three papers.

Goals:
- Longer thesis development (10–15 minutes on the reproducibility-crisis-meets-agents argument, vs. 2 minutes in the talk).
- Deeper Foundry segment (covering the compiler framing from `vault/papers/foundry/index.md`).
- Reuse the 3-minute case-study clips from the talk verbatim where useful; record extended cuts where not.
- Live independently on YouTube; link from the talk's final slide and from each paper's index.

Tracked in `LONG_VIDEO_PLAN.md` in this directory.

## Risk register

| Risk | Mitigation |
|---|---|
| MRSA history not run by talk day | Use seeded history from `seed_demo_histories.py` style; demos still functional. |
| #22709 / graph extraction merge slips | Demo 1 reverts to existing extraction surface; narrative still about "notebook-driven extraction" with graph view in storyboard. |
| Foundry interview→galaxy pipeline not demoable | Demo 2 falls back to gxwf-only authoring in VS Code; Foundry framed as forthcoming layer. Still tells the "Format2 as agent-writable artifact" story. |
| Long video slips past talk day | Talk's "long video coming" pointer becomes a "papers in preparation" pointer to vault drafts. |
| Slide infra changes needed | Existing reveal.js setup is rich; no migration anticipated. |

## Open questions

- Is the conference recording posted publicly? (Affects whether long video should redundantly cover the same case studies.)
- Does jmchilton want a hosted demo URL on slides for live audience interaction, or video-only?
- Should the long-video and conference-talk script share a single narration source-of-truth (markdown), or diverge?
- Does the foundry interview→galaxy pipeline have a name yet for the slide titles?
- When the gxwf-ui browser editor demo is mature enough, does it replace one of the embedded videos or live alongside?

## Working agreements for future agents on this project

- **Don't introduce new abstractions in the slide source unless asked.** MDX files are short — keep them short.
- **Storyboard before recording.** Don't record demo footage without an updated storyboard in this directory.
- **Track readiness in `STATUS.md`** (create if absent) — one line per Tier 0/1/2 item with date stamp.
- **Match the abstract's voice.** `ABSTRACT_CHATGPT.md` is the canonical voice; older drafts in `old/` are not.
- **Don't mention Nextflow conversion in demo 2 materials.** Foundry mode for this talk is interview→galaxy.
- **The talk is an ad for the three papers.** Every slide should be either a thesis beat or one of: notebooks-paper preview, gxwf-paper preview, foundry-paper preview.
- **Plot for failure.** A talk that needs every feature to land is fragile; we explicitly track Tier 0 so that something credible is presentable from day one.

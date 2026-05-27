# Foundry-Iterating-On-A-Workflow — Visualization Ideas

> **Placeholder.** jmchilton mentioned having specific visualization ideas for showing Foundry building/refining a Galaxy workflow. Fill this in directly — future agents should treat the captured ideas here as authoritative.
>
> Target uses: pre-roll for demo 2 video, optional standalone Tier-2 slide, possible loop on the standalone long video.

## Concept to develop (jmchilton notes here)

- [ ] Visual metaphor (DAG-grows-step-by-step? Mold-by-Mold colored badges? gxwf gate blinking green→red→green?)
- [ ] Substrate (animated SVG, browser canvas, recorded screencap, etc.)
- [ ] What does success vs. failure look like frame-by-frame?
- [ ] How is provenance from Cast/Mold sources visually carried?
- [ ] Length target?

## Constraints to inherit

- Must read at a glance from across a conference room — high contrast, big elements.
- Must work at the same aesthetic as the rest of the deck (terminal-monochrome with the #0066cc accent).
- Must not show Nextflow conversion.
- Must not require explanation that exceeds the existing demo 2 voiceover.

## Candidate hooks (to be confirmed, deleted, or replaced)

These are scaffolding only — do not implement until jmchilton fills in the section above.

- **Build-the-DAG** — graph grows node-by-node as Molds emit steps; each new node flashes when gxwf validates it.
- **Schema-as-light** — each parameter slot lights up when bound; misbound parameters glow red until corrected.
- **Mold trail** — left-side timeline of executed Molds with provenance trail back to Cast / source documents.
- **Inner-loop scribble** — split-screen of agent text on left, growing Format2 YAML on right, gxwf diagnostics flickering as the Format2 evolves.

## Decisions

- [ ] Will any of the above be a standalone Tier-2 slide?
- [ ] Will any be embedded as a pre-roll for demo 2?
- [ ] Will any be a recurring loop on the long video?

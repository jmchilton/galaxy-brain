# Demo 2 Storyboard — Conversation → Foundry → gxwf → Workflow

> 3-minute (target) edited YouTube embed for Block C of the GCC2026 talk. **Same application** (MRSA mobile-AMR) as demo 1. Mechanism: **Foundry interview→Galaxy pipeline** + `gxwf` validation. No Galaxy server in the loop until the very end (and optionally not even then).
>
> **Status:** storyboard. Foundry interview→Galaxy pipeline is in development. Must check status before recording.

## Hard constraint

**Do not mention Nextflow conversion.** The Foundry mode demonstrated here is the *interview*-driven pipeline. Other Foundry pipelines (nextflow-to-galaxy, cwl-to-galaxy, paper-to-galaxy) exist but are off-topic for this video.

## Source materials to reuse

- `vault/projects/history_markdown/gcc2026/WORKFLOW_STATE_EXECUTIVE_SUMMARY.md` — competitive framing.
- `vault/papers/gxwf/manuscript.md` — Format2 example, gxwf CLI surfaces, IDE behaviors.
- `vault/papers/foundry/index.md` + `outline.md` + `case-study.md` — Foundry architecture (Patterns, Molds, Pipelines, Schemas, Casts).

## Scenes (target durations)

| # | Length | Scene | Notes |
|---|---|---|---|
| 1 | 0:15 | Title card: "Same problem, no Galaxy server. Yet." | Set the contrast with demo 1 immediately. |
| 2 | 0:30 | A terminal or chat surface; user invokes the Foundry interview pipeline. Agent asks targeted questions: "What organism? What inputs? Comparing isolates?" | This is the "agent skill compiled from curated knowledge" beat. |
| 3 | 0:30 | Agent emits an *intent document* — small structured summary (organism, isolates, ARG questions, mobile-context dimensions). Schema-validated; provenance to source Mold visible. | The compile-time-grounded artifact. |
| 4 | 0:30 | Cast skills decompose the intent into Format2 step proposals: staramr, Bakta, ISEScan, IntegronFinder, table conversions. | Show the Mold-by-Mold authoring. |
| 5 | 0:30 | gxwf validates each emitted step against the ToolShed-served schema for the named tool. One deliberate "bad" parameter triggers a diagnostic with the legal options listed. Agent corrects. | The deterministic inner-loop feedback. The "milliseconds vs. minutes" point. |
| 6 | 0:20 | Final Format2 file opens in VS Code (galaxy-workflows-vscode extension). Completions, hover docs, no diagnostics. | Visible parity with demo 1's workflow. |
| 7 | 0:15 | Optional: convert to native `.ga` and run against a Galaxy server with the MRSA inputs — same workflow, executes. | Skip if pacing is tight; the talk's argument doesn't require execution. |
| 8 | 0:10 | Cut to side-by-side: workflow from demo 1, workflow from demo 2. Same graph. | The synthesis moment that slide D1 will echo. |

## Voiceover script (rough)

**Opening (Scene 1):** "Same MRSA question. This time, no Galaxy server. We're going to *build* the workflow before we run it."

**Foundry interview (Scenes 2–3):** "An agent walks me through the analysis. It's not free-text RAG — it's a compiled skill from a curated knowledge base. The intent document it produces has explicit schemas and provenance back to its source materials."

**Mold authoring + gxwf (Scenes 4–5):** "Each step is authored by a Mold and validated by gxwf — not at runtime, in milliseconds. Names, types, select options, conditional branches, collection semantics. When the agent gets something wrong, the feedback is structured and specific."

**IDE handoff (Scene 6):** "The Format2 file looks the same in VS Code as it does coming out of Foundry. Completions, hovers, diagnostics — same validator, no Galaxy server required."

**Synthesis (Scene 8):** "Same workflow as demo one. Two paths in. One reproducibility substrate."

## Editing notes

- Use color or font to distinguish (a) agent text, (b) intent document, (c) Format2 YAML, (d) gxwf diagnostics. The audience needs to track four layers.
- The bad-parameter beat in Scene 5 should be the most legible single moment in the video.
- Caption-friendly pacing on terminal output.

## Open production decisions

- [ ] Foundry interview pipeline must be demoable. If not, fall back to a hand-driven gxwf authoring demo in VS Code with Foundry framed as forthcoming.
- [ ] Decide whether to show real ToolShed schema fetches or a pre-warmed cache (probably cache, for cleanliness).
- [ ] Decide how to render Cast/Mold provenance visually — sidebar overlay, callouts, or terminal trace?
- [ ] Should the "Foundry iterating on a workflow" viz (`FOUNDRY_VIZ_IDEAS.md`) be used as pre-roll for this video, as its own slide, or as a stand-alone clip? jmchilton to fill in.

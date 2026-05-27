# Demo 1 Storyboard — History → Notebook → Workflow

> 3-minute (target) edited YouTube embed for Block B of the GCC2026 talk. Application: MRSA mobile-AMR comparative analysis (`galaxy-brain#12`). Mechanism: notebook-driven workflow extraction via [galaxyproject/galaxy#22709](https://github.com/galaxyproject/galaxy/issues/22709).
>
> **Status:** storyboard. No footage exists. MRSA history not yet run.

## Source materials to reuse

- `vault/projects/history_markdown/SCREEN_CAST_PLAN.md` — proven screencast patterns + `seed_demo_histories.py`.
- `vault/projects/history_markdown/HISTORY_MARKDOWN_ARCHITECTURE.md` — UI element naming and component anchors.
- `vault/projects/history_markdown/GRAPH_WORKFLOW_EXTRACTION_PLAN.md` — the graph-extraction surface this demo features. Note: blocked-pending-gate as of 2026-05-17; check status before recording.

## Scenes (target durations)

| # | Length | Scene | Notes |
|---|---|---|---|
| 1 | 0:15 | MRSA history opens, 3–4 isolate assemblies visible. | Tag with `notebooks-screencast` tag (plural) like `SCREEN_CAST_PLAN.md` does. |
| 2 | 0:20 | Click "Galaxy Notebooks" button in history panel. Notebook auto-creates with history's name. | Same beat as screencast-plan clip #1. |
| 3 | 0:25 | Drag staramr summary collection into notebook. AMR matrix renders inline. Drag IS/integron outputs. | Multiple drag-drops; pause on each rendered embed. |
| 4 | 0:30 | Type a Methods paragraph; open chat panel; ask "Summarize this history and draft a Results section." Agent calls `list_history_datasets`. | Section-level patch lands; user accepts; "AI" revision badge shows. |
| 5 | 0:20 | Notebook now has narrative + embedded matrices + accepted-AI Results section. Annotated voiceover: "This is what the *human* and *agent* are converging on." | Static framing shot. |
| 6 | 0:35 | New beat — "Now we extract a workflow." User selects history graph view; backward closure from notebook-referenced outputs highlights. | The #22709 mechanism. If the graph view isn't merged yet, fall back to the existing extraction surface (legacy form) and frame narration as "today's surface; the graph view is what's coming." |
| 7 | 0:20 | Workflow editor opens with the extracted graph. Workflow report seeded from notebook narrative. | The payoff: notebook *is* the workflow's report. |
| 8 | 0:15 | Re-run the workflow on a fifth isolate — comparative AMR matrix updates. | Optional; skip if total runtime exceeds 3 min. |

## Voiceover script (rough)

**Opening (Scene 1–2):** "Here's a Galaxy history with four MRSA isolates. We've run AMR detection and mobile-element profiling. Now we want to *document* what we found."

**Notebook authoring (Scene 3–5):** "History Notebooks are markdown attached to the history. I drag results in — they render inline. The AI assistant can read the history, draft a section, and propose changes for me to review. Every revision tracks who wrote it."

**Extraction (Scene 6–7):** "Now the move that's new. The notebook already points at the outputs that matter. Galaxy walks the provenance graph backward — every job needed to reproduce those outputs — and proposes a workflow. The notebook becomes the workflow's report. The same narrative travels with every future invocation."

**Close (Scene 8):** "Same workflow runs on the fifth isolate. The reproducibility story stays attached."

## Editing notes

- Cut aggressively to keep under 3:00.
- Show one mouse cursor; no rapid tab switches.
- Use subtle zoom-ins on agent badge transitions and the graph-extraction highlight.
- Captions for accessibility.

## Open production decisions

- [ ] Decide whether to record real MRSA history or a `seed_demo_histories.py`-style fake. Affects scientific honesty footer.
- [ ] Confirm #22709 merge status before recording; otherwise present graph view as storyboard / coming-soon overlay.
- [ ] Hosting: YouTube unlisted vs. self-hosted MP4 in `public/`. Default to YouTube unlisted for the embed.
- [ ] Length target on disk: ~10 MB if MP4, else not relevant.

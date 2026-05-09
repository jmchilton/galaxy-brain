PR #22361, Guerler 2026-04-27:

> "Important new feature, can you add a screencast? Also — what happened to Pages? Are Reports the new Pages? Should we have a Notebooks activity as well or instead?"

The architecture doc shows the headline capabilities: history-attached editor, drag-from-history, AI agent with 5 history tools, per-section diff accept/reject, revisions with provenance badges (Manual / AI / Restored), unified Reports+Notebooks editor.

`for_workflows/` has: `cat`, `head`, `mapper` (fake BAM), `pileup`, `split`, `count_list`, `create_input_collection`, etc. — enough to fabricate a believable mini-analysis without real tools.

## Screencast ideas (each ~20–45s, GIF/MP4 under ~10MB)

Histories are pre-seeded by `seed_demo_histories.py` (tag `notebooks-screencast`):

| Scenario              | History name                          |
| --------------------- | ------------------------------------- |
| notebook-from-scratch | `RNA-seq pilot - sample A`            |
| methods-draft         | `ChIP-seq pilot - replicate 1`        |
| per-section-diff      | `ChIP-seq pilot - replicate 2`        |
| revisions             | `Variant calling pilot - patient 042` |
| reports-vs-notebooks  | `Quick interval check`                |

1. **The headline clip — "Notebook in 30 seconds"** (do this one for sure) — history `RNA-seq pilot - sample A`
   Already has `head` + `cat` outputs on a text input. Click the **Galaxy Notebooks** button in the history panel → notebook auto-creates titled after the history. Drag a dataset from history into the editor → `history_dataset_display` directive auto-inserted. Type a sentence. Save. Done. Shows: entry point, auto-create, drag-drop, save.

2. **"Let the AI draft my Methods"** — history `ChIP-seq pilot - replicate 1`
   Has `mapper` (BAM) + `head` + `cat` outputs over fastq/fasta/notes. Open chat panel (60/40 split). Type: *"Summarize this history and draft a Methods section."* Show the agent calling `list_history_datasets` → returning a `SectionPatchEdit`. Accept the proposal → revision badge "AI" appears. The single most differentiated capability vs. plain Pages.

3. **"Per-section diff: accept one, reject one"** — history `ChIP-seq pilot - replicate 2`
   Same shape as #2 (mapper + head over fastq/fasta/bed) so you can record back-to-back. Pre-existing notebook with `## Intro` and `## Methods`. Ask: *"Tighten the intro and expand methods."* Show the section diff with two checkboxes — uncheck Intro, keep Methods, click Apply. Highlights the granular review story.

4. **"Revisions & rollback"** — history `Variant calling pilot - patient 042`
   Has `mapper` → `pileup` chain. Edit-save (Manual badge) → AI edit-save (AI badge) → open revision panel, preview prior, click Restore → "Restored" badge. ~15 seconds, very visual.

5. **"Reports vs Notebooks — same editor"** (directly answers Guerler's Pages question) — history `Quick interval check`
   Split-screen or quick cut: open a standalone Report from `/pages/list` (no history tools in chat, has Permissions button) → then open a Notebook from this history (has history tools, no Permissions). Same editor chrome. Could be the README's lead clip.

I'd recommend posting **#1 + #2** as the main two and optionally #4 as a third short. That covers entry-point, AI value, and provenance — under ~90s total.

Also worth answering Guerler's second question in the PR reply, not just the screencast: clarify the Pages → (Notebooks + Reports) split and whether you intend a top-level Notebooks activity or the history-panel button is the canonical entry.

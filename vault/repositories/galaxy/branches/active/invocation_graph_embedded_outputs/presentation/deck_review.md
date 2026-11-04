# Deck review: outputs inside the invocation graph

I built [slides.md](slides.md) and the published deck, [Outputs inside the invocation graph](https://claude.ai/artifact/MkMtfLBNXquaSYhGfXyxMz), from the three stages' existing screenshots, then reviewed them cold. The review covers three things: the feature as the screenshots show it, the story the deck tells, and a prioritized list of polish ideas.

## What I built, and what I didn't check

- **15 main slides and 12 extras** after a divider, built by [build_slides_deck.py](build_slides_deck.py) (adapted from compare_runs). The slides use crops made by [make_slide_crops.py](make_slide_crops.py). The 28 crops are in `../screenshots/presentation/slides/` (gitignored) and are uploaded to the artifact.
- **No new captures**, so there is no `capture_debrief.md`. Every invocation frame from the three stages is 1280×1000 with the same panels. One crop (859×858, invocation header to canvas bottom) removes the chrome that differs between stages and keeps every flip aligned. The crops drop four kinds of chrome: four random test user names, a storage meter that reads anything from 0 b to 121 KB, "Unnamed history", and test-tool dataset names in the history panel. A recapture would have paid off only with better demo data (P1 below), and that needed more than a deck pass.
- **Flips:** 2→3, 5→6, 8→9 and 12→13 in the main deck, and E1→E2→E3 and E4→E5 in the extras. Each flip slide pins its frame at the same spot (96, 111) at 1:1. Slides 10 and 14 put two frames side by side.
- **Not verified:** I didn't render the published deck. The Slides type's instructions say not to verify unless asked. Two kinds of slide are the most likely to need a nudge when John pages through:
  - The side-by-side slides 10 and 14 and extras E6 and E8 are estimated at 1,030–1,060 px tall against 1,080.
  - Slide 15 puts a table and a card side by side in a grid.

## (a) The feature, as the screenshots show it

### What works

- **The flips are convincing.** Stage 2's ChIP-seq pair (slides 8→9) is the best evidence in the deck that "nudge, never re-layout" holds. Bowtie2 and the left side stay put, and the rest slides right. The 18→06 pair (slides 12→13) shows stage 3's idea at a glance: two boxes become one.
- **The running invocation pair (slide 10)** looks finished and trustworthy: a placeholder, then the table in the same spot, with the job counts changing in the header.
- **Stage 1's popovers** are clean. The image popover is the nicest single frame in the set.
- **Cards look like Galaxy.** The navy header with the output icon matches Galaxy's palette, and the dashed connectors read clearly as "belongs to".

### What looks unfinished, cluttered or confusing

1. **Placeholder content dominates every real-workflow frame.** On the IWC replicas almost every card is a white box with the word "test" or a one-column table: MACS2 peaks, MACS2 report, coverage, histogram of fragment length, and MultiQC. Stage 3's flagship cases show this most. "Compute fragment length histogram drawn as its histogram" (E3) and "summary of MACS2 drawn as its report" (E5) are big empty boxes. The feature's value is seeing data, and these frames show none. This is the biggest weakness of the screenshots.
2. **Every table is the same table.** top_rows, summary, final_table, cat_table, mapping stats and filtered BAM all show `1 68 4.1 / 2 71 4.6` under the headers `0 1 2`. In a close-up, the audience can't tell one output from another by its content.
3. **Table snapshots show two rows out of five, under a sortable header.** In a 170 px card, the sort-arrow header row (`0 ⇅ 1 ⇅ 2 ⇅`) takes about a third of the body, so two data rows fit (slides 7, 12, 13). The sort arrows are interactive affordances on an inert snapshot, the same class of problem as the pagination row that stage 2's polish removed.
4. **A grown step doesn't say which output it shows** (slide 13). After dedup, head_table is drawn as a green-headed step holding a table, and the label `top_rows` no longer appears anywhere on the graph. Stage 2's card was labelled. Stage 3 drops the workflow output's name, which is the one label the author chose for that output.
5. **Two visual grammars for "an output's preview".** In the same view, cards have navy headers with an output icon, and grown steps have green step headers with a tool icon (slide 13: plot card against head_table). It's defensible, since a grown step is still a step, but nothing in the frame explains the difference.
6. **Images don't fill their box.** The plot uses about half of its card's width at 100% (slide 7) and about two thirds of the grown step at 150% (E7). At 100% the plot is a thumbnail inside a mostly white card.
7. **Edges run under cards.** In dense layouts, edges between other steps pass under unrelated cards and come out the other side: MACS2 peaks in slide 9, several cards in E2. In slide 7, the head_table→final edge appears to start at the top_rows card's right edge. That one is semantically right, but the unrelated ones look like wiring errors.
8. **Fit views waste the canvas.** In slide 6 (53%) and stage 3's 04/05 (45–50%), the graph fills only the top 55–60% of the canvas. The fit is limited by width, because the history panel takes 290 px. These cards are the smallest in the deck exactly where the "whole run at a glance" claim is made.
9. **Floating controls cover content.** The minimap covers the numbers_b card (slides 7, 12, 13). In stage 3's 08 and stage 2's 13, the zoom controls and the Embed Outputs button sit on top of cards. Cards aren't drawn in the minimap either (a known gap), so it shows gaps where the cards are.
10. **The collection summary reads awkwardly.** It shows "lines" in the header, "lines" again in the body, then "a list with 2 data datasets" and the elements "1" and "2" (slides 7, 13).
11. **The editor frame (slide 11) is cluttered.** The Attributes panel takes a third of the uncropped frame. My crop removes it, but the final step is still cut at the right edge. Outputs read "top_rows (input)", "plot (input)", which looks like a bug; it's the test tools' declared format. The Best Practices badge shows a red 1.
12. **An outline star on every tool output**, in every workflow, for a feature that only shows with Embed Outputs on. Each output row now carries three small, unlabelled icons: a checkbox, a star and an eye. That noise is permanent for every editor user.
13. **Stage 1's hover target is invisible.** No pointer appears in the frames, so the audience never sees what to hover. It's the output terminal, a 10 px circle, and the popover hangs from the topmost terminal. The table popover also covers final and head_cat.
14. **A grown step loses its job-count line** ("1 job successful"). State survives only as the header colour and checkmark. That's fine here. For a mapped-over step, "3 of 5 jobs" is information the user loses.
15. **The not-ready state is a sentence in an empty white box** (slide 10, E6). The step beside it is orange; the card has no state cue apart from that sentence.

### Consistency across stages

- The canvases are consistent. The chrome is not: four different test user names, storage readings from 0 b to 121 KB, and "Unnamed history" against named histories. The deck's crops hide all of it. The PR descriptions use the uncropped frames, so the inconsistency shows there.
- Stage 1's frames and stage 2's 01–03 come from E2E runs, while the rest of stage 2 and most of stage 3 are live. Slide 12 (stage 3's 18) exists only to give slide 13 a stage 2 frame with the same chrome. That's sound, but the audience sees nearly the same frame on slides 7 and 12.

## (b) The story

### Strengths

- **The arc is clear:** state but no data, then one step at a time, then every workflow output, then the step itself as its output. Each stage answers the limit of the one before. Each stage opens on the same test workflow before moving to the IWC replicas, so the audience learns the graph once.
- **The flips carry the claims** rather than captions: the nudge (8→9), the dedup (12→13) and the running fill (slide 10).
- **It's honest:** placeholder content is named on slides 8 and 9 and in E3–E5, stage 3's dense-column cost is in slide 13's notes, the limits and the no-PR status are on slide 15, and the one-way door is in E11.

### Weaknesses

1. **The problem is shown on a toy.** "A finished run, and no data in sight" (slide 2) uses a 10-step test workflow whose outputs are meaningless. The pain is real on a ChIP-seq run with nine outputs. The deck can't open there, though, because the replica's outputs are placeholders too (P1).
2. **One test workflow carries most of the deck.** "Output previews" is on 9 of the 15 main slides. By slide 13 the audience has seen the same seven steps nine times.
3. **The IWC frames are hard to read when projected.** At 50%, node titles are about 5 px tall on a 1:1 crop. Slides 8, 9 and 14 depend on positions, not text. That works, but only once the audience is told where to look. The Focus lines do that; a callout would do it faster.
4. **Stage 3's benefit on real workflows is subtle.** On slide 14 the difference is 25 screen pixels between two side-by-side crops. The claim, "one step moves 34 pixels instead of four moving 49", lives in the notes. Without a guide line, the audience will see two nearly identical pictures.
5. **Two stated behaviours are never shown:** that toggling off restores the layout exactly, and that clicking a grown step opens its interactive output. Both are claimed in the notes.
6. **No failure state.** Every run succeeded, so the deck never shows what an errored step's card or grown step looks like.
7. **The ask is generic.** "Does the layout still look like yours?" is right for users, but the deck also wants reviewers. The decisions they could weigh in on (ship order, the `preferred_output` name, star visibility) are in the extras only.

## (c) Polish ideas, in priority order

**Meaningful** means it would visibly improve the screenshots or the story; the rest are nitpicks. Effort is a rough estimate for one agent session, including recapturing the frames the change affects.

| # | Idea | Tag | Effort | Impact | Meaningful |
| --- | --- | --- | --- | --- | --- |
| P1 | Realistic demo content: named table columns and different values per step in the test workflow. Feed the IWC replicas small real-looking inputs that their pass-through test tools carry into the outputs, such as a Bowtie2 mapping-stats text, a MACS2 peaks BED excerpt, a MACS2 summary, a fragment-length histogram PNG and a MultiQC general-stats TSV. Then recapture the stage 2 and 3 live frames with the recorded anchors (`shots_s3/shots.py --exact-anchor …` in stage 3's `screenshot_debrief.md`). | capture | 0.5–1 day | High | **Yes** |
| P2 | Compact table snapshots: hide the sort arrows, tighten row padding and use a smaller font, so a 170 px card shows 4–5 rows instead of 2. Stage 2's card CSS, which stage 3 moves into `InvocationOutputSnapshot.vue`. Do it on stage 2 and resolve the conflict in stage 3's refactor commit on rebase. | product · `invocation_graph_embedded_workflow_outputs` | 2–3 h with recapture | High | **Yes** |
| P3 | Label the output a grown step shows, for example a one-line caption "top_rows" above the snapshot, or the output label after the step title. This restores the workflow output label that dedup removes. | product · `invocation_graph_embedded_outputs` | 2–4 h (the caption height feeds the layout constants) | High | **Yes** |
| P4 | Make image snapshots fill the card or grown-step body (`max-width:100%`, `object-fit:contain` at the body's size). | product · `invocation_graph_embedded_workflow_outputs` (shared with stage 3 through the snapshot) | 1–2 h | Medium–high | **Yes** |
| P5 | Open the deck on a real workflow once P1 lands: the ChIP-seq run with no data as the problem, and the same view embedded as the payoff. Cut the test workflow to the stage 1 and stage 3 close-ups. | deck | 1 h after P1 | Medium–high | **Yes** |
| P6 | Recapture the editor frame: close the Attributes panel, fit the graph so final isn't cut, give the test workflow real formats (tabular, png) instead of "(input)", and clear the Best Practices badge (add a readme, as compare_runs did). | capture | 1–2 h | Medium | **Yes** |
| P7 | Recapture the fit-view frames (stage 2's 01/02, stage 3's 04/05, the whole ChIP-seq graph) with the history panel closed, or at 1600 px wide, so the embedded graph fills the canvas. Every flip partner needs the same panels, so retake each pair together. | capture | 2–3 h | Medium | **Yes** |
| P8 | Show the two unshown behaviours. Add a flip from slide 6 back to the restored layout after toggling off, and a frame of a grown step clicked, with its step details open below the graph showing the interactive table. | deck + capture | 1–2 h | Medium | **Yes** |
| P9 | Slide 14: pin a vertical guide line at filter MAPQ30's left edge on both crops, and put "4 steps moved 49 px" and "1 step moved 34 px" under the labels, so the stage 3 gain is visible. | deck | 30 min | Medium | **Yes** |
| P10 | Draw edges above cards at low opacity, or give cards a white edge halo, so through-edges aren't hidden and don't seem to start at a card. | product · `invocation_graph_embedded_workflow_outputs` | 0.5 day (z-order inside `WorkflowGraph.vue`'s node-area slot) | Medium on dense layouts | **Yes** |
| P11 | Editor: show the outline star only on the hovered output row or the selected step, and keep filled stars visible. This removes permanent noise from every editor. It's a design call for John. | product · `invocation_graph_embedded_outputs` | 1–2 h | Medium | **Yes** |
| P12 | Stage 1 hover frames: show the hover target, either with a pointer drawn into the capture or with a terminal highlight while the popover is open. | capture (product if it's a highlight, on `invocation_graph_output_previews`) | 1 h | Medium | **Yes** |
| P13 | Give the not-ready snapshot a state cue: the step's state tint or a small spinner beside the sentence. | product · `invocation_graph_embedded_workflow_outputs` | 1 h | Low–medium | No |
| P14 | Pan the close-ups so the minimap and the zoom and Embed Outputs controls don't cover cards (stage 2's 03 and 13, stage 3's 06, 08 and 18). The flip anchors need to move together. | capture | 1 h | Low–medium | No |
| P15 | Collection summary: drop the repeated name line, and name the test collection's elements meaningfully. "2 data datasets" is the history panel's shared string; leave it. | product · `invocation_graph_embedded_workflow_outputs`; capture for the element names | 1 h | Low | No |
| P16 | Keep a one-line job-count footer on grown steps. It matters for mapped-over steps, not for these shots, and it changes the grown height the layout uses. | product · `invocation_graph_embedded_outputs` | 2–3 h | Low for the shots | No |
| P17 | Consistent chrome in the PR-description frames: rename the test user (as compare_runs did through `PUT /api/users/{id}`), hide the quota meter, name the histories. Alternatively, put the deck's crops in the PR descriptions. | capture | 1 h | Low for the deck, medium for the PRs | No |
| P18 | Add a failure frame: a step forced to fail, with its card or grown step showing the error state. | capture + deck | 1–2 h | Low–medium | No |
| P19 | A sharper ask: one closing line for reviewers (ship order, the field name, star visibility) next to the user question. | deck | 15 min | Low | No |
| P20 | Make the Embed Outputs pressed state clearer, for example by changing its label to "Hide outputs" when on. | product · `invocation_graph_embedded_workflow_outputs` | 30 min | Low | No |

### Suggested order

P1 is the multiplier: it improves every real-workflow slide and unlocks P5. P2, P3 and P4 are cheap product changes that change how every card and grown step looks. Make them before any recapture, so frames are retaken once. After that, P6–P9 and P12 are a single capture-and-deck pass.

Two of the product ideas, P3 (an output label) and P11 (when to show the star), change what a reviewer sees in the PR. They're worth a quick decision from John before the PRs open, not after.

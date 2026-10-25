# Slides clarity review 1: workflow-step-params deck

**Verdict:** the deck's evidence was already solid (real screenshots, honest comparison). It was weak in three places, all fixed: the problem was pitched in developer terms, the decision only appeared on the last slide, and cost and risk were missing from the main deck. **The changes are BIG**: three new extra slides and two new cropped images, so a second render-polish pass is due under PROCESS_SLIDES.md. The main deck is still 11 slides (about 10 min), plus a divider and 6 extras (3 before this pass).

The weakest link is in the source, not the deck. Nothing in the sources says *who* hit this: no user reports, Help forum threads or linked issues, only "some users". I didn't paper over that in the deck (the slide 2 note says so).

## Changes per slide

Slide numbers here are 1-based, matching the `{/* SLIDE N */}` comments. The render polish report numbers from 0 (its `#/N` hash), so its "slide 9" is slide 10 here.

| Slide | Change | Why |
|---|---|---|
| 1 cover | Lede "An issue and two spikes" → "An issue to file, and two spikes that test it" | Signals there's a decision at stake |
| 2 problem | 2 cards → 3 user-facing cards: "Everything, every time" / "What did I change?" / "Reruns stuck there" (the held-back fixes moved into card 3). Callout kept | The old "What's stuck" card was about the author, not users. Added the two user pains the sources do support: you can't see your deliberate overrides among all the submitted params (RERUN_ISSUE "Recording exposed parameters"), and reruns are pinned to the legacy form (RERUN_UX Problem). The note marks "hundreds of defaults" as illustrative and unmeasured, and says no user reports are linked |
| 3 proposal | Added navy callout: "To decide: file this as an issue? Pick parameters from a tree, or from the graph?" | States the decision early, as a question |
| 4 tree | Heading → "A parameter tree that reads like the tool form" | Claim instead of label (LESSONS UI lesson 1) |
| 5 rows | Heading → "Rows show values, help and why a row is locked". Body adds "Internal keys are never shown." | Clearer claim. The old "no internal names" moved to the body |
| 6 cards | Image `fig-tall` → `fig`. Added note: each card is a one-input tool form, so validation, widget and parsing come free | Says why the design is cheap (LESSONS UI lesson 2) |
| 8 graph | Heading → "Same rows, picked from the graph" | Sets up the comparison claim. A first, longer wording overflowed (691px) and was shortened (644) |
| 10 comparison | Bullets now say which side wins. Tree: "One modal, no editor changes", "Add-only: take select/deselect from the graph". Graph: added "No search across steps" and "Subworkflow overrides dropped on rerun". Note reworded (fixes the "apart." orphan) | The old bullets mixed pros and cons without saying which was which, and the graph's biggest loss (search) was missing |
| 11 recommendation | Bullets → **Cost** / **Risk** / **Gap**. Risk: G1 strict keys turn silently ignored keys into 400s, and the audit covered only the run/rerun test tools. Gap: column params are locked, and they're probably what users most want. Callout → "Ask: file the issue, then PRs in order: G1, G2 + G4 API, client." | The pitch shape asks for cost and risk stated honestly. G1 breaking callers is where Galaxy devs will push back first |
| Extra: scope (new) | Can pick / Not yet cards | Likely question: "what can't I expose?" |
| Extra: links (new) | New crop `link-preset-dropped.png` from `rerun_link_preset_and_dropped.png` | Shows F2 (`step_param` links with presets and dropped keys), which wasn't in the deck |
| Extra: fallback (new) | New crop `rerun-unrecorded-legacy.png` from `rerun_unrecorded_expanded.png`, with text on #24177 alone vs recorded keys | Answers "why not just merge #24177?" and "what happens to old runs?". The note says it's a spike-branch capture of a 2-step test workflow |
| Extra: payload | Note reworded | Fixes the "the expanded form." orphan |
| Extra: tests | Note now records the client unit test count conflict (see below) | Sourcing honesty |

`.note` orphans were fixed by rewording, not CSS. I didn't touch `SlideLayout.astro`.

**Render check:** walked all 18 slides at 1280x933. Every slide has scrollHeight ≤ 655 of 700. I looked at screenshots of the changed slides, saved in `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-spike/bf29b5cf-2616-4226-bc10-fdc18e54dd9a/scratchpad/clarity/`.

**One inline style:** the fallback extra has `style="margin-top: 0.8em;"` on its note. Inside a `split` column, `<p>` gets no spacing under Tailwind preflight, and no existing class stacks two text blocks there. `npx prettier --check` passes. Nothing committed.

## Recommendations for the source work

1. **Find who hit it** (highest value). The process doc's issue+spike shape asks for "who hit it". RERUN_ISSUE says only "some users rely on the legacy expanded workflow run form". Before filing, link real requests to the issue's Problem section and add them to slide 2:
   - Help forum or Matrix threads
   - GitHub issues asking to set tool params at run time
   - IWC or training material that tells people to use the expanded form
2. **Screenshot the actual pain.** No capture shows the expanded form on a realistic multi-step workflow with steps expanded; the only one is a 2-step test workflow with echo collapsed. One full-page screenshot of the legacy form on a real IWC workflow, ideally beside the simple form with 2 cards, would make slide 2 a show-don't-tell slide. Count the unconnected params it submits, so "hundreds of defaults" becomes a real number. Measuring render time would also back the issue's unmeasured "slow to render".
3. **Back the column-param claim or soften it.** "Column choice is probably what users most want" appears in both the issue and the deck with no evidence. Either cite requests (see 1) or call it a guess. It's the biggest scope risk, so it deserves a sentence on whether the follow-up is in or out of the first milestone.
4. **G1 risk needs a plan in the issue.** The issue lists what to audit but not how to roll out. Say whether strict mode ships default-on or behind a flag/deprecation warning first. Galaxy devs will ask.
5. **Fix count drift.** Client unit tests: RERUN_ISSUE says 10, LESSONS_LEARNED and spike_debrief say 8, and the graph alt says 11. Branch head: spike_debrief says `147dac7222a`, index.md says `a6e08520821`. Update spike_debrief and LESSONS to the polished head's numbers.
6. **Fix the raw-key leftovers before using screenshots in the issue.** Both the dropped-keys alert (links extra) and the graph spike's alert show raw keys like `1|cond|pattern`, while the deck claims keys are hidden. Small fix, and it makes the screenshots match the design.
7. **"Rerun with this changed" UX.** Per-row icons are flagged as noisy, but there's no screenshot of the alternative. Not needed to file the issue, but a mock of the one-button option would settle it before the client PR.
8. **Issue ordering (pitch advice).** RERUN_ISSUE goes Problem → long Proposal spec. Put the spike screenshots (tree picker and cards) right after Problem, and fold the spec sections ("Exposure key", "Submission", "API work") into `<details>`. Also drop the issue's `@jmchilton` self-mention line or reword it to first person, per the no-mentions rule.

## Friction with the process doc and tooling

- **Slide numbering:** the polish report counts from 0 and the deck comments count from 1. PROCESS_SLIDES.md should pick one (the 1-based comment numbers) for subagent reports.
- **No class to stack two text blocks** in a split column: `<p>` spacing is stripped by preflight. A small `.stack` or `.body + .note` spacing rule would help.
- **"Who hit it" gap:** the issue+spike deck shape asks for it, but the vault sources have nothing to fill it with. The issue process should collect it before the deck stage.
- **Screenshots land in the cwd:** they had to be moved with `find -exec mv`. Fine, but the task prompt's instructions were needed.
- **zsh:** `echo =====` fails (`=` expansion), which cost a retry when reading files.

## Unsourced or soft claims

- No claim on a slide is unsourced. Soft spots, all flagged in notes:
  - "users" on slide 2 has no linked reports.
  - "probably what users most want" (slide 11) is the issue's own judgement.
  - The 20–30 line estimates are from the spike, not a review.
- Client unit test counts conflict across sources (10 / 8 / 11). The deck shows no count on a slide, and the note lists all three.

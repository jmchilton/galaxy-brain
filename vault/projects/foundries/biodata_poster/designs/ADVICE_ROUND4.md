# Advice for round 4 (non-binding)

**[said]** = stated in `FEEDBACK_ROUND3.md`/`FEEDBACK_ROUND4.md`. **[inferred]** = my reading of those, the previews and the decks. Numbers cite their source inline; re-check counts at print.

## Part 1: What John seems to like and dislike

1. **One idea per poster, made visible, works. Scope that is too narrow does not.**
   - [said] known-unknowns: "what it does is very clear", but "too specific".
   - [inferred] It is clear because it has one receipt, numbered notes that each point at one line, and one motion (31 → 0). It is too specific because it is the lightning talk turned into a poster: its README says the Foundry appears "only in a QR caption". A reader learns the draft format, not the Foundry.
2. **"Rails, not reminders" is the one constant favourite.**
   - [said] It was his favourite use of Orbit in round 3, and he praised it again on two posters in round 4.
   - [inferred] It is the whole argument in three words, and turns Orbit's 0/15 from failure into principle.
3. **A metaphor must read with no caption.**
   - [said] He likes the tape, the receipts and "one note, many skills". He likes binaries ("metaphor is good"). He doesn't understand the spike.
   - [inferred] Tape and receipts are everyday objects; a receipt spindle is not, and at 2–3 m (dossier §1) the spike reads as a stray line.
   - [inferred] The "jobs needed" column fails the same test: a derived visual repeating each slip's number, relabelled by review (spike `REVIEW.md` MUST 2) just to stop reading as failure.
4. **Density means payoff per square inch, not more prose.**
   - [said] Round 3 says "keep it low; the round-1 complaint still stands", with a 400-word cap. Round 4 lifts the cap and asks for higher density on every poster except, perhaps, skills-are-binaries, whose right panel is "largely wasted".
   - [inferred] Not a contradiction. typed-not-guessed used 395 of 400 words (README) and ranks fifth; much is texture (14 PASS rows, QTY digits). He wants more distinct ideas and diagrams per area and no empty quadrants (skills' lower right, spike's margins, side-by-side's left receipt bottom). Reviews' "density cut" items over-trimmed; stop cutting toward a number.
5. **Evidence alone isn't enough; he wants to know what it is and how to use it.**
   - [said] "A poster should also tell a reader what the Foundry does and how to use it, not only show evidence." Side-by-side has "a lot of good information" but doesn't teach that.
   - [inferred] Receipts answer "why trust it"; no top-5 poster answers "what goes in, what comes out, what do I type". The decks do, with diagrams.
6. **Symmetry is static.**
   - [said] Side-by-side is "too symmetric".
   - [inferred] Mirrored widths and QR stacks stall the eye. Asymmetry should carry meaning.
7. **Don't open on failure.**
   - [said] No 0/15 hero. Swap JOBS RUN and wall time. Don't show the whole Nextflow workflow.
   - [inferred] Any large "0" is risky unless it is a balance paid off (known-unknowns' BALANCE DUE 0 works).
8. **Spike's content may be the right poster.**
   - [said] Despite the metaphor, he "wonders whether this is the best overall approach".
   - [inferred] It alone shows the whole journey (cast → pin → validate → test), the nearest thing to "what the Foundry does".

**Slide ideas no top-5 poster has used** (`gcc2026.mdx`, `foundry-pattern.mdx`):
- the machine: KB → Mold → cast → frozen skill + provenance (`foundry-machine.svg`, FP slides 6–11);
- pipelines are journeys, and Interview → Galaxy as four numbered steps;
- the same analysis in two directions: a `gxwf mermaid` ATAC graph, extracted vs constructed;
- the draft/extracted pair (`foundry-mobile-reformat-draft.png` / `-extracted.png`, "valid at every resolution");
- an oracle at every step (the FP pipeline-eval flowchart);
- the authoring chain `draft-next-step → draft-validate → gxwf validate → validate-tests → planemo test`;
- Galaxy model → JSON Schema → pinned package ("schemas are inherited as contracts and enforced as rails");
- the Galaxy-side arrows (`rnaseq-gx-arrows.png`); typed-not-guessed used only the nf-core side;
- "Format 2 is good for agents because it is good for humans" as three boxes;
- the Matt Might circle and dent.

## Part 2: Per-poster advice

### 1. known-unknowns-receipt (342 body words, README)

- **Keep:** burn-down receipt and bars; note 6; BALANCE DUE 0 + PROMOTED; notes that point at lines.
- **Change:** widen scope one ring. The DengueSeq `foundry-run.yml` lists 11 phases; phase 5 (`advance-galaxy-draft-step`) ran 7 iterations, exactly the burn-down rows. Draw the 11-station strip with station 5 expanded into the receipt. Add a one-line "what the Foundry is" under the thesis. Add Scott Cain (preview predates round 3).
- **Density:** 550–700 words. Add the phase strip; the lightning deck's draft/extracted diagram pair as a taped clipping; a 3-line "use it" note (`draft-validate`, `draft-next-step`, docs QR).
- **Cut:** the Rumsfeld clipping (keep the triad as labels; round 3 called the quote too much); the 0/15 block if tight.
- **Ideas:** (a) a "you are here" pin at station 5, so the receipt is one stop on a route. (b) Put the bacass stub on a Nextflow lane beside DengueSeq's paper lane: one loop, two sources. Its test failed (README), so no PASS.

### 2. receipts-side-by-side (382 body words, README)

- **Keep:** title; gutter note ③; both receipts' data; "Good for humans, so good for agents".
- **Change: give the pair a direction.** BUILD is an input to the run; TYPE-CHECK judges its output. Make the left slip shorter, narrower and higher, the right longer and lower, with a pen arrow "the skill the agent used → the workflow it wrote". README Q2 says the left is airier: let it be short, don't pad.
- **Density:** 550–700 words. Add a "what it does" band under the title (pen machine: notes → Mold → cast skill → agent writes Format 2 → gxwf judges) and a "how to use" note (install lines, r1 333–335; `/usage/` QR). Optionally restore `cast_history` (README Q2).
- **Cut:** mirrored QR stacks (one QR row); one optional QR; the thesis's last clause (REVIEW item 3).
- **Ideas:** (a) tilt the slips differently and overlap A's torn foot onto B's header, as if handed over. (b) Turn the IWC tally into a big pen stamp across the bottom-right corner, so the right is heavier on purpose.

### 3. skills-are-binaries-receipt (355 body words, README)

- **Keep:** hero; BUILD receipt; notes 1–3, 5; NEVER HAND-EDITED; KEEP THIS RECEIPT.
- **Change: the right panel is the job.** Replace the Z-report bars and the prompt/gate sketch with one big "one note, many skills": `galaxy-workflow-testability-design` as a taped index card, 20 pen lines fanning to 20 small cast stubs (README: 20 skills cite it), the other notes as a smaller ranked tail (12, 11, 10, 9). Caption: "fix a caveat once, in the note, not in 20 copies". Not "one Mold → many targets": only `casts/claude` exists (README).
- **Density:** 400–500 words; he exempted it, so fill space, not prose. Add the machine (KB → Mold → cast → skill + provenance) as a pen sketch by note 1; keep "104 of 360 … hypothesis" as the fan's footnote.
- **Cut:** the knowing≠gating sketch (round 3: the oracle side is "a little too technical"); "Text is cheap"'s footnote.
- **Ideas:** (a) draw the fan as a recast: one red correction on the card, the same red tick on all 20 stubs. (b) Label stubs with real skill names at 24 pt, or leave them as blank tear-offs if they don't fit.

### 4. receipts-spike (307 body words, README)

- **Keep:** four real slips and SIGNED lines; notes 2–4 ("Pinned, not named" is new and good); run-order stepping; closing pitch.
- **Change:** drop the spike for the decks' idiom, a station line of the run's phases. Hang each slip off its station: CAST and PINNED on phase 5, VALIDATED on 9, TESTED on 10 (`foundry-run.yml`). Make the hero name the subject (README Q3). Stay a stepped diagonal; don't box it (the traditional direction does boxes).
- **Density:** 550–700 words. Add the Tool Shed drift aside: `ivar_trim 1.4.4+galaxy1` resolves to `8b20bc80ebf4` today vs `6606a8c97889` pinned (README Q2): same name and version, different code. Add one line per slip on what its station does.
- **Cut:** the jobs column and the three "JOBS RUN … 0 none needed" rows (keep JOBS RUN 7 on TESTED).
- **Ideas:** (a) 11 numbered phase dots; slips hang from 5, 9 and 10, the bare dots show they sample a longer run. (b) Pen the model's part between slips ("model picks a tool", "model writes the step"), making "the model translates, a program signs" literal.

### 5. typed-not-guessed-receipt (395 body words, README)

- **Keep:** TYPE-CHECK receipt; VOID tear-off; the entrance contrast; the Format 2 card.
- **Change:** apply round 3 (no full Nextflow drawing; wall time before JOBS RUN). Add the missing preprint QR and Scott Cain. Shrink the middle lists. Strengthen side points (round 3: "weakest"): crop the nf-core map to its circled entrance and set a small Galaxy-side `rnaseq-gx-arrows.png` beside it: one arrow vs arrows everywhere.
- **Density:** 500–650 words, moved from receipt texture into explanation. Add GCC's "Tool state, validated" BAMX example as a typed slip, and a note on where gxwf sits in a Foundry run.
- **Cut:** fold the tool rows to about 3 plus "… N more"; note 4's IDE list if crowded.
- **Ideas:**
  - (a) Show the receipt literally longer than the nf-core slip, with a pen ruler down the side marking "checked here" at every section.
  - (b) Give the VOID tear-off a "repair" stub: the corrected line and a re-printed PASS, only from a real gxwf re-run. It shows the sub-second repair loop (`data/timing.txt`).

## Part 3: The traditional direction

**Shared base:**
- the side-by-side title "Build better skills. Build better workflows. Keep the receipts." and its header strip;
- spike's four receipts and notes;
- the palette, tape, torn edges and graph paper.

**Tension to name:** dossier §1 says look nothing like a standard three-column Galaxy poster (VGP and Orbit posters are neighbours). Tape, torn edges and graph paper keep a boxed layout ours: make boxes taped cards, never flat ruled panels.

### Info boxes

1. **What it does** (80–110 words).
   - The dossier §2 one-breath: "a knowledge problem, not a syntax problem"; knowledge in an inspectable wiki, compiled into skills; tools decide.
   - Diagram: redraw the machine (KB → Mold → cast → skill + provenance) after `foundry-machine.svg` and FP slides 6–11, as vector boxes.
   - Don't embed `foundry-casting-molds-story.png`. It looks like a generated illustration (dossier §7 bans AI imagery), and its text would print under 24 pt.
2. **How it works: the pipeline diagram** (the centrepiece, 60–90 words).
   - Build from real phase lists (r1 §2, `foundry-run.yml`), not `foundry-site-pipelines.png`, whose counts are stale.
   - Honest shape: Paper and Nextflow lanes each run a `*→ WORKFLOW BRIEF` planning pipeline (r1 line 13) into a **human-reviewed workflow brief**, then one shared spine: interface → data flow → compare IWC → template → [loop] advance-draft-step → test plan → implement test → validate → run test → debug.
   - DengueSeq and bacass both ran `workflow-brief-to-galaxy` (`foundry-run.yml`, 11 phases). Don't label them `paper-to-galaxy`/`nextflow-to-galaxy`; draw those direct routes (reviewed / draft, r1 §2) as a dashed bypass if wanted.
   - Pipeline count (7 at abstract time vs 13 on main) is John's call (r1 line 13); print none until he picks.
3. **The Orbit story: rails** (70–100 words).
   - "Skills are guidance, not enforcement" (preprint p.16).
   - The connection check caught the agent's bad `tximport` wiring before execution (p.4, pp.15–16, Fig S3A).
   - Orbit refuses by default after v0.8.0 (pp.17–18).
   - Hokken as cited prior public work: a 60-step workflow from methods text, DEG counts within 0.3–1.3% (r7 §5.3). Use r7's recommended line, and don't imply the pooled model was right first pass.
   - 0/15 is small and attributed, or absent.
4. **Get started** (50–80 words).
   - `/plugin marketplace add galaxyproject/foundry`, then `/plugin install foundry-skills@galaxy-workflow-foundry`; the Codex equivalent (r1 lines 333–335).
   - `npm install -g @galaxy-tool-util/cli` for gxwf (GCC "Published CLI + docs").
   - QR codes: Foundry, `/usage/` and preprint. Never a lightning-talk QR.
5. **Optional: what's in the KB** (40 words). One dated corpus row from dossier §4 (420 notes, 56 Molds, 54 patterns, 69 skills; as of 2026-10-24). Pick that one set and footnote the date.

### Receipts that earn a place

- **PINNED** (spike): the best "how it works" evidence. Add the drift aside.
- **VALIDATED** (spike) or the TYPE-CHECK stub (side-by-side): one, not both.
- **TESTED** (spike), with the PASS stamp: the only receipt with jobs.
- **CAST/BUILD:** a 5–7-line stub only; the "what it does" box carries the concept.
- **Optional:** a burn-down stub (known-unknowns) on the loop station. It is the most legible data visual we have.
- **Cut:** the jobs column; the Z-report; the IWC tally unless a typed box wants it.

### Per designer

- **A: three columns mixing receipts and boxes.**
  - Left: What it does + CAST stub.
  - Centre: the pipeline diagram on top, with PINNED → VALIDATED → TESTED below in run order.
  - Right: Orbit/rails + Get started.
  - Vary the column widths (for example narrow–wide–narrow) so it isn't the neighbours' grid.
- **B: columns.**
  - Two or four columns reading What → How → Evidence → Use; receipts span gutters to break the grid.
  - Risk: a report. Keep one receipt the largest object on the sheet.
- **C: header band, receipts connected in the middle, footer band.**
  - Header band: What it does + the machine.
  - Middle: the pipeline spine drawn across the full width as a pen line, with each receipt hanging off the station that printed it. CAST and PINNED sit in the loop (`discover-shed-tool` runs inside `advance-galaxy-draft-step`, r1 line 100). The burn-down sits on the loop, VALIDATED on validate and TESTED on run-test.
  - Footer band: Orbit rails, Get started, QR codes.
  - This is the strongest answer to "what does it do" and "keep the receipts" at once.

### Word budget

**700–1,000 body words**, counted the keeper way (current posters: 307–395, per READMEs).
- Boxes: about 300–450.
- Receipts: about 250–350.
- Notes and captions: about 150–200.

The 28 pt body floor still holds, so fit comes from diagram area, not smaller type.

### Pitfalls

- Stale or invented counts: no numbers taken from screenshots.
- Raster screenshots with text under 24 pt that the audit can't see (see typed-not-guessed's metro-map exception).
- Leading with 0/15, or with any big zero.
- Calling the brief-route runs `paper-to-galaxy` / `nextflow-to-galaxy`; DengueSeq also had the paper's code, so say "from the paper", not "from methods text" (dossier §4).
- Bullet-list boxes that repeat the receipts. A box should explain; the receipt should prove.
- Losing "Rails, not reminders": put it as the Orbit box head or the bridge note.
- Anton's nf-core work: an `[[ASK]]` slot with no numbers, or absent.
- Authors are verbatim, with Scott Cain before Nekrutenko.

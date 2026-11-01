# Design review: six Foundry poster drafts

**Scope:** design only. Content and claims are covered by a separate review.
**As of:** 2026-10-29.
**Inputs:**
- each design's `preview.png` and any greyscale or 25% check images;
- the README and source files;
- `pdfinfo`, `pdffonts` and `pdfimages` on each `poster.pdf`;
- one common-scale montage I made (all six at 375 px and 200 px, plus a greyscale version).

**All six pass the basics.** Each is one page at 3168 × 3168 pt with 0 raster images and all fonts embedded. Every design has a one-command rebuild. Status never depends on colour alone in greyscale. I checked all six at full size: five from the agents' grey renders, and receipt-grounded from my own `pdftoppm -gray` render.

The differences that matter are:
- whether the hero reads at 2–3 m;
- whether there is one dominant image;
- how much of the poster is a wall of 28 pt text.

## 1. Ranking

| # | Design | One-line reason |
| - | - | - |
| 1 | **transit-grounded** | It has the strongest single image at distance: a big, thick-lined map that runs into a black terminal. The hero sits on its own line at 92 pt, and the copy is the most editable of the six (`content.yml`, with ledger drift guards). Its bottom half, though, is a standard three-panel text block. |
| 2 | **receipt-grounded** | It has the most legible hero of the six: three stacked lines at 104 pt, with red on the last. The column read is clear and the PASS/FAIL stamps work at distance. Its receipts are grey slabs of mono text, and the header is crowded. |
| 3 | **specimen-vision** | It has the most refined typography and the best real-data graphic: the ELK DengueSeq graph at 1:1, with legible nodes. The "Key to the plate" stat strip is excellent. It is quiet at 3 m (italic Garamond hero), its QR codes are small, and the frame sits too close to the trim. |
| 4 | **receipt-vision** | It is the most distinctive object in the room: a taped receipt on graph paper, which stops people. But the thesis never appears at headline size. Long handwritten paragraphs strain legibility, the notes zig-zag, and the layout is absolutely positioned. |
| 5 | **transit-vision** | It has the best ideas: 30→18, the ×7 draft loop, "route ≠ journey" and "Board here". But floating panels shrink the map and cut into it, and the bottom third is a six-card grid. It is the most "standard poster" of the transit pair. |
| 6 | **specimen-grounded** | It is the densest. Its hero is 62 pt, below the dossier floor, and the No. 2 and No. 4 graphs have node labels of about 14 pt. The card grid has no focal point besides No. 1. It does have the best status-glyph system and the defect pins, which are worth borrowing. |

### Hero and distance table, from source

Signage rule of thumb: about 1 in of cap height for every 10 ft of distance. At 3 m that means a bold sans hero of **≥ 100 pt**. A light or italic serif hero needs **≥ 120 pt**. 60–72 pt reads to only about 1.5–2 m.

| Design | Title | Hero line | Hero verdict | QR size |
| - | - | - | - | - |
| transit-grounded | 132 pt Overpass Black | 92 pt black, one line, `white-space: nowrap` | borderline-good | 2.5 in |
| transit-vision | 124 pt | 86 pt white on black band, plus a 52 pt amber sub | borderline (the band helps) | about 1.8 in of code inside a 2.0 in box |
| receipt-grounded | 128 pt Plex Sans Cond Bold | 104 pt bold, three lines, red last line | **best** | 2.08 in |
| receipt-vision | 146 pt Archivo Black | no thesis line; "Agent-built…" is 66 pt Kalam | **fails** (only the title carries) | 2.3–3.0 in |
| specimen-grounded | 124 pt Fraunces | `.hero p` 62 pt, top-right corner | **fails** (below the 72 pt floor) | 1.7 in |
| specimen-vision | 152 pt EB Garamond | 104 pt *italic* Garamond | marginal (small x-height) | 1.62 in |

The agents' own "25%" checks range from 375 px to 1056 px, so they can't be compared. All six redesigns should use the common check in §3.

## 2. Per poster

### 1. transit-grounded

**Keep:**
- the full-width map with thick lines merging into the trunk;
- the black terminal box;
- the interchange pills with their `hit | weak | miss` and `pass | fail` state labels;
- the dotted return track ("fail: diagnose, repair…");
- the numbered service notices hung under the map;
- the `content.yml` single source for copy;
- the `journey.expect` drift guard.

**Problems:**
- **The bottom half (about 45% of the area) is three dense text panels.** These are the DengueSeq journey record, the map key and the depot. Together they read as the standard three-column poster the dossier wants to avoid. The map gets only about 35% of the page.
- **Station labels are rotated −40°** (`build.mjs` `stationLabel`). Rotated text is the slowest thing to read at distance, and these labels are the map's vocabulary.
- **"0 of 15" floats in the top-right pocket** with no visual tie to the interchanges it explains.
- **The DengueSeq journey record (bottom left) doesn't connect to the M line.** Nothing on the map shows that this one run is *the* journey.
- **The header band runs edge to edge.** `.band` sits at `left: 0; top: 0; width: 4224px` in near-black, with no bleed, so any trim error leaves a white sliver. A 7.3 in band of RGB near-black will also print as a 4-colour rich black.
- **Out-of-gamut and non-portable colour and glyphs:**
  - `--ask: #ff4fa3` is out of the CMYK gamut. It's a placeholder, but it must not reach the test print.
  - `●`, `→` and `−` fall back to Apple Helvetica and Menlo, so a build on another OS won't reproduce the PDF.
- **Ledger tags are 34 px (25.5 pt).** That's fine as an exception, but ledger slugs set in mono at body size are long and hard to scan.

**Improvements:**
0. **Raise the hero to ≥ 100 pt.** Change `.hero-head` in `style.css` from 122 px (92 pt) to ≥ 134 px. It is `white-space: nowrap` and already spans about 40 in at 92 pt, so allow it to wrap to two lines ("A correct workflow is a knowledge problem, / not a syntax problem.") and re-flow the map top accordingly.
1. **Give the map about 55% of the height.**
   - Grow `MAP`/`T` so the trunk sits around 40% of the page height.
   - Move the depot counts into a single stat strip under the hero, as in **specimen-vision's "Key to the plate"** (big numerals with arrows: notes → Molds → skills → tools decide → recompile).
   - That frees one bottom panel.
2. **Draw the DengueSeq journey on the map.**
   - Adopt **transit-vision's pale journey band** along the M line, with timestamps in station pills ("15:10", "22:17" …).
   - Then the bottom-left record can drop its line diagram and become a short "ticket".
3. **Set station labels horizontal** in two-line stacks above each station, as **transit-vision** does ("Workflow / brief", "Galaxy / interface"). Raise them to at least 36 pt.
4. **Show the draft loop as a loop.** Replace the "Draft loop 2–4" pill with **transit-vision's ×N loop roundel** between Tool Shed and gxwf. It is the single best visual for "model drafts, tools judge, repeat".
5. **Move "0 of 15" next to the interchanges.** Hang it under the gxwf/Planemo interchanges as a callout with a leader line, the way **receipt-vision** points notes at receipt lines.
6. **Make the map key a vertical legend** down the left margin, beside the line termini. Then the bottom row is the journey ticket plus the recompile and QR area, not three equal text boxes.
7. **Header and glyphs.**
   - Inset the band to the 1 in margin with rounded corners, as **transit-vision's `.hero`** does, or add 0.125 in bleed.
   - Replace the fallback glyphs with inline SVG, as **specimen-vision** does.

### 2. receipt-grounded

**Keep:**
- the three-line hero "The model drafts. / The tools decide. / The gaps are written down." with its red last line, at 104 pt;
- two receipts of different widths: hero DengueSeq centre, narrow bacass right;
- the PASS stamp and FAIL stamp, and the red FAIL bar;
- the `AGENT TIME / MODEL COST / HUMAN` totals, which are the best receipt trope of the six;
- the "Other routes" status list with status tags;
- the numbered "How a receipt prints" list.

**Problems:**
- **The centre receipt is about 70% mono 28 pt line items.** At 2–3 m it's an even grey column. Only the 92 pt headline and the stamp break it up.
- **The header is crowded:**
  - the title (four-source variant, 128 pt condensed) is set at `leading: 0.24em`, so its two lines almost touch;
  - the QR row (`poster.typ` ~l.137) sits right under the end of title line 1.
- **The background `#E3DED3` is the darkest tint of the six.** It's a large mid-value area that will print slightly muddy and lowers text contrast. Full-bleed without bleed.
- **24 pt is used widely:** tags, column headers, references and QR captions.
- **The left column has nearly as much 28–30 pt prose as the receipts.** It competes rather than annotates.
- **In greyscale the hero's emphasis inverts.** The red "The gaps are written down." turns mid-grey, lighter than the two black lines above it, so the key line looks de-emphasised.

**Improvements:**
1. **Give the receipt rhythm.** Set the section heads (`head()`, now 30 pt) and the totals block at 40–48 pt bold. Then each receipt reads as five chunks from distance: SOURCE / BUILD PROVENANCE / TOOLS PINNED / CHECKS / GAPS. Collapse the 13-row stage list to about 6 rows plus "+7 more".
2. **Connect the theory to the receipt lines.** Borrow **receipt-vision's margin annotations with arrows**, but in this poster's sans. Turn the left column's "How a receipt prints" items into numbered callouts that point at the matching receipt section ("Skills → top of the receipt", "Judges → the stamps", "Ledger → the tear-off").
3. **Header.**
   - Raise title leading to about 0.32em.
   - Move the QR codes out of the header into the bottom-right under "Other routes", at 2.5–3 in. **transit-vision's "Board here"** block (install command plus QR codes) is a good model.
4. **Background.** Lighten to `#EEEAE1` or use **specimen-vision's cream `#f4efe4`**. Keep the receipts white so the paper-on-counter contrast survives.
5. **Greyscale hero.** Darken the red to about `#8f2b1d` (specimen-grounded's `--bad`), or add an underline or italic, so the last hero line stays the strongest in greyscale.
6. **Status encoding.** Adopt **specimen-grounded's glyph system** (filled disc pass, hatched square fail, half disc partial, dashed ring not run) in the "Other routes" tags. Then the status reads without the text and in greyscale.

### 3. specimen-vision

**Keep:**
- the "Key to the plate" stat strip (13 → 420 → 56 → 69 → 0 of 15 → recompile);
- Fig. 2, the ELK DengueSeq graph at 1:1 with changeset hashes in red;
- the Fig. 1 anatomy table (kind / wiki note / cast / source→copy / skill file);
- the Fig. 3 "Molting" fan-out (one note → 8 skills);
- the Fig. 4 reference-collection drawer;
- the inline-SVG glyphs (the only design with zero system fonts);
- the `<28 pt` and overflow build warnings.

**Problems:**
- **The hero is quiet.** It's 104 pt *italic* EB Garamond (`.hero h2`). Garamond's small x-height and light italic strokes read like about 75 pt sans at distance. The red bold "knowledge problem" helps, but the rest fades.
- **The frame is too close to the trim.** `.poster::before/::after` draw a double rule at 0.55 in and 0.7 in from the edge, which will show any trim skew or uneven margin.
- **QR codes are 1.62 in** (`.qr`). That scans from only about 40 cm.
- **The lower-left quadrant is all 28 pt text.** Specimens II and III are small boxed afterthoughts, and the Fig. 3 fan list is condensed 28 pt.
- **Fig. 1 is a table of 28 pt mono hashes.** It's handsome close up but meaningless at 2 m, and it holds the top-left, the most valuable spot.
- **Title length.** The title drops "Conversations" (content call, flagged for the content reviewer). For design it's the shortest title, which is why it can run at 152 pt on one line. Any hybrid has to choose.

**Improvements:**
1. **Hero.** Set it in **upright** semibold Garamond at ≥ 120 pt, or keep the italic and switch the face to Fraunces 800 like **specimen-grounded's** title. Keep the red emphasis.
2. **Fig. 1 visual.** Add a big visual to Fig. 1: draw the Mold as a dissected specimen, with leader lines from the Mold box out to its five references. That is the plan's "anatomy" brief made literal, rather than a table. The leader-line treatment comes from **receipt-vision's arrows**.
3. **Frame.** Move the rules to ≥ 0.9 in or drop them. A rule just outside the 1 in safe area is fine; one at 0.55 in is not.
4. **QR codes.** Enlarge to about 3 in and group them as **transit-vision's "Board here"**, with the install command.
5. **Pins on the graph.** Borrow **specimen-grounded's defect pins** (numbered D1–D5 on the graph nodes, solid for open, outlined for dropped). Then the known-gaps list ties to the graph. Use form only; the open DengueSeq gaps are within this poster's stance.
6. **Lower-left quadrant.** Give it one strong element instead of three boxes. Expand Fig. 3's hash flip `256e3861 → 2e5fa1f8` to about 60 pt as the visual anchor, in the manner of **receipt-vision's "REPRINT" stub**.

### 4. receipt-vision

**Keep:**
- the taped receipt on graph paper (the most distinctive silhouette of the six);
- the anchored arrows (`#anchor` / `point-at`), which follow the receipt automatically;
- the VALIDATED and TESTED rubber stamps;
- the circled "5" on OPEN REQUIREMENTS;
- the "REPRINT" stub for the recompile;
- the "KEEP THIS RECEIPT." footer with its in-receipt QR;
- the vendored fonts and the `show-ask` toggle.

**Problems:**
- **No thesis at headline size.**
  - At 2–3 m the visitor gets the title and a receipt, but not *why*.
  - "Agent-built. Tool-verified. Open gaps written down." is 66 pt Kalam (l.293) in pen blue, top-right, under a translucent highlighter.
  - "A knowledge problem" is a 56 pt handwritten note head.
- **Long handwritten paragraphs.** Notes 1, 2, 3, 5 and 7 are 4–6 lines of 40 pt Kalam (`#note(size: 40pt)`). Script faces are measurably slower to read, and dyslexic readers find them harder still. Handwriting should be annotation, not body copy.
- **The reading order zig-zags.**
  - Numbered notes sit at 1, 2, 3, 5, 6 on the left and 4, 7 on the right.
  - Unnumbered notes ("Here, a human reviewed…", "Also from methods text", the `[[ASK]]` sticky) are mixed into the right column at the same weight.
- **The notebook margin rule runs through the title.** It's at 12.85 in (`poster.typ` l.107), full height, so it cuts through "Papers" and the author line.
- **The receipt body is 29 pt mono throughout.** Same grey-slab issue as receipt-grounded.
- **Transparency** is used for the tape, shadow, highlighter and stamps. Most RIPs handle it, but ask for a flattened preflight.
- **Fragile layout.** It's absolutely positioned (19 `place()` calls). Notes use hard `#note(x, y, …)` inches, so copy edits don't reflow. This is the hardest of the six to edit safely, after transit-vision.

**Improvements:**
1. **Add a typeset thesis band** under the title, in Archivo Black or Plex Mono Bold at ≥ 100 pt: "A correct workflow is a knowledge problem, not a syntax problem." Use **transit-vision's black hero band** or **receipt-grounded's stacked three-liner**. Keep the handwriting as the voice that comments on it.
2. **Cap each handwritten note at a ≤ 2-line Kalam head plus ≤ 2 lines.** Move the remainder into Plex Mono 28 pt "typed" footnotes under the note. The model for this is **receipt-grounded's** compact numbered list: one bold line plus one plain line.
3. **Fix the order.** Number all seven theory notes in receipt order, alternating sides strictly (odd left, even right), or put all numbered notes on the left. Render the unnumbered context notes in pencil grey (`ink-soft`) with no badge.
4. **Stop the margin rule below the header.** Change `start: (12.85in, 0pt)` to start at about 7 in.
5. **Give the receipt rhythm.** Set `sect()` at ≥ 40 pt and the OPEN REQUIREMENTS total at ≥ 56 pt. Then the receipt reads in chunks, same as receipt-grounded #1.
6. **Graph glimpse.** Optionally swap the 7-row TOOL SHED PINS block for a tiny **transit-vision-style "ARRIVED" branch graph** (the git-like workflow strip) beside the pins, so the receipt shows what was built as well as what was paid.

### 5. transit-vision

**Keep:**
- the black hero band with the amber "The model translates. The tools decide. The gaps are written down.";
- **30→18** as a hook stat;
- the **×7 rounds** loop between Tool Shed and gxwf;
- timestamped station pills (`15:13`, `22:17` … `PASS 00:33`);
- the "Route ≠ journey" device and the pale journey band;
- the "ARRIVED" mini graph;
- the "Service notices" panel with the hazard stripe;
- "Board here" (install command plus QR codes);
- the build warnings for overflow, headings and the safe margin.

**Problems:**
- **The map is boxed in.**
  - Three panels (JOURNEY, EARLIER ON THIS LINE, ARRIVED) sit above the trunk.
  - The [[ASK]] box and the depot sit below it, cutting into the N line's curve.
  - The lines are thin relative to the page, so at 3 m the map reads as a stripe, not a network.
- **The bottom third is six equal cards** (`.k`, 72 pt heads, 28 pt text). That is the standard three-column poster look, and it duplicates the header's line legend (top right).
- **Too many competing focal points:** the hero band, 30→18, the ×7 loop, the depot bar, the Service notices block and "Board here". Three of them are large near-black areas.
- **The terminal box text is cramped.** "GALAXY WORKFLOW" nearly touches the box edges at the right margin.
- **Font and editing fragility:**
  - `→`, `≠` and `×` fall back to Lucida Grande, Menlo and Helvetica (Apple fonts).
  - Prose sits in 17 absolutely positioned `.abs` divs with inch coordinates, so editing copy means re-placing boxes.

**Improvements:**
0. **Raise the hero to ≥ 100 pt.** Change `.hero .big` in `poster.html` from 86 pt, and grow the `.hero` band height (now 3.75 in) to fit two lines.
1. **Free the map.** Move JOURNEY, EARLIER and ARRIVED into a single "journey ticket" under the map, or pin them as narrow cards above their stations with leader lines. Thicken the lines about 1.5× and let the map run 1 in → 43 in horizontally. **transit-grounded's** line weights and full-width trunk are the target.
2. **Replace the six key cards with a map-style legend.** Use one row of six symbol + one-sentence entries in **specimen-vision's "Key to the plate" strip** form, at about 40% of the current height. Fold the corpus counts in as numerals. The freed space goes to the map.
3. **Drop the header line legend** (it duplicates the key). Use the freed width for the two-line title at ≥ 124 pt with looser leading. The full title is about 50 in wide on one line at 124 pt, so it cannot go to one line.
4. **Cut the black areas to two:** the hero band and the terminal. Render "The depot" and "Service notices" as outlined panels with hazard-stripe headers.
5. **Make editing robust.** Move prose into a YAML file rendered into the template, following **transit-grounded's `content.yml`** pattern, and keep absolute positions only for map-anchored callouts.
6. Replace the fallback glyphs with inline SVG (**specimen-vision**).

### 6. specimen-grounded

**Keep:**
- the **status-glyph system** (filled disc, hatched square, half disc, dashed ring), which is the clearest greyscale-safe encoding of the six;
- the **numbered defect pins** (D1–D5) placed on graph nodes from the ledger's `step:` field;
- the "Empty mounts" drawer as the honest-partial device;
- the HABITAT / COLLECTED / ORIGIN label grammar;
- the `prepare.mjs` gloss guard;
- the `textUnder28pt` audit;
- the Fraunces + Source Serif pairing.

**Problems:**
- **The hero is below the floor.** `.hero p { font-size: 62pt }` (`styles.css` l.52) is under the dossier's 72 pt heading floor, tucked into the top-right corner. The 1a heading at 54 pt is also under the floor. Both **block**.
- **Specimens are unreadable.**
  - No. 2 and No. 4 graphs are scaled 0.51–0.53, giving about 14 pt nodes.
  - No. 1 is at 0.75, giving 21 pt nodes and about 16 pt versions.
  - 1a is a text-free silhouette.
  - A specimen plate whose specimens can't be read defeats the concept. specimen-vision's 1:1 graph shows it can be done.
- **About 10 regions of near-equal weight:** No. 1, 1a, 2, 3, 4, key, recompile, drawer, legend and tray. The black 3 px borders make it a card grid, the closest of the six to a standard poster.
- **The footer reference tray** (30 thumbnails at about 0.5 in) is texture, not information.
- **QR codes are 1.7 in.** The QR placeholder text is 18 pt.

**Improvements:**
1. **Fewer, bigger specimens.**
   - Mount No. 1 DengueSeq full-width at 1:1 (≥ 28 pt nodes), using **specimen-vision's ELK layout** (`scripts/gxgraph.mjs`).
   - Keep one red specimen (No. 3 bacass) at ≥ 0.85 scale.
   - Move No. 2, No. 4 and 1a into the "Empty mounts" drawer as text-only labels with their status glyphs.
   - Grounded honesty survives; it just moves into the drawer.
2. **Hero.** Set it to ≥ 100 pt and give it the full width under the title, like **receipt-grounded's** stacked "The agent drafts. / The tools decide. / *Defects go on the label.*". Move "0/15" next to the Planemo/gxwf marks.
3. **Replace the vertical "Key to the plate"** with **specimen-vision's horizontal numeral strip** under the hero. This frees the centre column for the bigger specimens.
4. **Lighten the cards.** Drop the 3 px black card borders for hairline plate rules and whitespace, as in **specimen-vision**. Then the eye goes to the drawings, not the boxes.
5. **Footer.** Delete the thumbnail tray or enlarge it into a real drawer like **specimen-vision's Fig. 4**. Make the QR codes about 3 in.

### Editability ranking (for the redesign agents)

1. **transit-grounded.** All copy is in `content.yml`, with drift guards and an overflow report.
2. **specimen-grounded, receipt-grounded, specimen-vision.** HTML or Typst in flow or grid layout, with data-driven parts and size and overflow warnings. specimen-grounded also has gloss guards, but only its defect glosses and QR targets are in `specimens.yml`; the title, hero, key and drawer text are in `poster.html`.
3. **receipt-vision.** Absolute `#note(x, y)` positions don't reflow, though the arrows auto-anchor.
4. **transit-vision.** Prose sits in 17 absolutely positioned HTML boxes.

The three Node designs each pin a different Playwright and Chromium revision: 1.57/1200, 1.59.1/1217 and 1.64.x/1248. Rebuilding on another machine needs `npx playwright install chromium` with that exact version, so document it in each README.

## 3. Cross-cutting fixes (all six)

1. **One distance test.** Render every redesign at 25% of 44 in, i.e. 11 in at 96 dpi, which is **1056 px**. View it at arm's length; that is roughly equivalent to 44 in at 2.5 m. Also make a 200 px thumbnail.
   - **Pass** if the hero sentence and the one dominant image read at 1056 px, and the poster's shape (map, receipt or plate) is recognisable at 200 px.
   - Save the outputs as `checks/preview-25.png` and `checks/preview-gray.png` in every design, so the comparison artifact can tile them.
2. **Hero sizes.**
   - The hero is ≥ 100 pt bold sans, or ≥ 120 pt for an upright serif. Italic serif heroes don't count.
   - It has the highest contrast on the page.
   - Every heading is ≥ 72 pt.
3. **One dominant visual, about 40–55% of the area.** The rest supports it. No poster should end in a row of equal text cards.
4. **Cut about 25% of body words.** A 20-second visitor reads the hero, the image and one stat. Body copy is for the 2-minute visitor who already stopped.
5. **Bleed and trim.**
   - All six use tinted full-bleed paper, and no design exports bleed.
   - Either export at 44.25 in with 0.125 in bleed and crop marks, or confirm with the shop that it prints edge to edge on the trimmed size.
   - No border rules or frames parallel to the trim between 0.25 in and 0.9 in from the edge. Full-bleed textures such as receipt-vision's grid are fine.
6. **QR codes.**
   - At least 2.5 in, about 3 in preferred, with a 4-module quiet zone, black on white.
   - The live-results QR is the largest and sits nearest the hero or bottom-right, because it is the call to action that keeps updating.
   - Caption at least 28 pt.
7. **Size floors.**
   - Body 28 pt.
   - Labels, tags and references no lower than 24 pt.
   - Graph node text ≥ 24 pt after scaling (make the `textUnder28pt`-style audit a hard failure below 24 pt).
   - Mono hashes truncated to 8 characters, consistently.
8. **Glyphs and fonts.** No system-font fallbacks: draw arrows, `≠`, `×`, `✂` and `●` as inline SVG (specimen-vision's approach), or use an OFL font that has them. Afterwards, `pdffonts` should list only the declared OFL families.
9. **Colour.**
   - Keep saturated colour to strokes, badges and stamps.
   - No out-of-gamut placeholders in a test print: the hot pink must go.
   - Use RGB near-black only for text and small fills. Large dark bands should be specified as a K-heavy rich black or confirmed with the shop.
   - Order a small proof of each tint.
10. **Placeholders.**
    - Every design gets a single build flag that hides all `[[ASK]]` slots without leaving holes (receipt-vision's `show-ask` pattern).
    - The live-results QR slot **always** renders. It is swapped for a real QR once the URL exists, never hidden.
    - Placeholders share one style across designs: a dashed ochre outline, no fill.
11. **Borrow form, not content, across stances.** When a section above says "adopt X from poster Y", take the *visual device*:
    - a vision poster borrowing a status table or drawer does **not** import EGAPx, sarek, CWL, bacass or the validator blind spot;
    - a grounded poster borrowing a theory device keeps its stated limitations.
12. **Vault hygiene.** Three designs keep `node_modules/` (tens of MB, `.md` files that Obsidian and the site glob pick up) inside the vault. Delete them after export, or move the build tree outside `vault/`.

## 4. Hybrid candidate (proposal, not a decision)

**"One journey, one receipt."** The rule for any hybrid: exactly one dominant visual. Either the map or the receipt dominates, never both at full size.

**Option A: map-dominant (recommended to explore first)**

- **Header:** specimen-vision's header grammar (eyebrow, title, authors), with **receipt-grounded's stacked three-line hero** at ≥ 100 pt underneath.
  - The title length must be settled first. The four-source title forces 2 lines at about 128 pt; the short one fits 1 line at 150 pt.
- **Under the hero:** **specimen-vision's "Key to the plate" numeral strip**, re-labelled as the map key (line → route, station → Mold/skill, interchange → tool decides, notice → gap, depot → recompile).
- **Middle 50%:** **transit-grounded's thick-line map**, with:
  - **transit-vision's journey band, timestamped station pills and ×N loop**;
  - **specimen-grounded's defect pins** on the stations where the DengueSeq gaps arise.
- **Bottom right:** the terminal opens into a **narrow DengueSeq receipt** in receipt-grounded's style. It's short: SOURCE, PINS, CHECKS with stamps, totals, and a tear-off ledger as "service notices". The receipt is the *ticket* the journey printed, not a second hero.
- **Bottom left:** the recompile story as **receipt-vision's REPRINT stub**, plus the 0/15 callout.
- **Footer:** **transit-vision's "Board here"**, with QR codes at about 3 in.
- The grounded and vision stances then differ only in the drawer and notice content.

**Option B: receipt-dominant**

- receipt-vision's taped receipt on graph paper as the hero object, with a typeset thesis band.
- **specimen-vision's ELK DengueSeq graph** drawn as a sketch on the graph paper beside the receipt ("what it built" next to "what it cost").
- Margin notes cut to 2-line annotations.
- Higher stopping power, but weaker on teaching the system.

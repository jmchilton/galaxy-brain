# skills-are-binaries-transit

Pitch **`skills-are-binaries`** (`../PITCHES.md`, Pitch 3), drawn as a **transit map**. The visual language comes from `../transit-vision-v2/`: lines, stations, interchanges, termini, a key that teaches, Overpass signage type and the paper and ink palette. None of v2's content or structure is reused. 44 × 44 in poster for CSHL Biological Data Science 2026.

## The idea

- **Title:** *Agent Skills Are Binaries. Keep the Source.*
- **Hero (112 pt, white on black):** *Don't hand-edit agent skills. Compile them from a knowledge base people read.*
- **Sub:** the deck's line, "No serious engineering culture treats the compiled binary as the place you make changes."

The one data visual is a **convergent network map** built from real `_provenance.json` files:

- **Lines = notes**, the source code. These are the five most-cited notes, each labelled with the first 8 hex digits of its sha256.
- All five lines pass through one **Cast** interchange, the compiler.
- They run on as parallel tracks past **28 skill columns**.
- A **stop** means that skill compiles the note in. A ring means it loads on demand; a solid dot means it loads up front.
- Each column drops through a **gate**, drawn only where the skill's Mold has an `eval.md`, to a **terminus**: a dark "01" chip, the binary.
- Each line ends in its fan-out count: **20, 12, 11, 10, 9**.

The map key is the binary analogy:

| Map | Means |
| - | - |
| Line | note (source) |
| Stop | compiled in |
| Cast | compiler |
| Gate | oracle |
| Terminus | binary |
| Ticket | build log |

Four short callouts hang off the map:

1. **Restating the textbook is a commodity.** The blind-regeneration result on two skills.
2. **Progressive disclosure is a compile-time contract.** A real reference YAML, the schema rule, and 226/360 on demand with 104 still labelled hypothesis.
3. **Knowing is not gating.** Orbit 0/15, attributed to the preprint, plus the `integron_finder` false miss in one sentence.
4. **Build log.** A ticket rendered from `validate-galaxy-workflow/_provenance.json`. Its `testability-design c7dc5421` row matches line 1's hash chip.

### Changes from the pitch

- **Lines are notes, not reference kinds.** The pitch's six width-scaled kind lines (217 down to 2) would make the smallest invisible and wouldn't show "one note, many skills". With lines as notes, the fan-out *is* the map, and every stop is a real (note, skill) pair.
- **360 references come from 56 casts, not 69.** The 13 `pipeline-*` casts have `_assembly.json` and no `_provenance.json`. The poster says "Foundry-wide, 321 of 360 references cite a source other skills share".
- **eval.md is not called deterministic.** Across all 51 `eval.md` files, properties are 104 `check: deterministic`, 175 `llm-judged` and 8 both. The poster says "oracle" and "properties every output must meet", and gives the verdict to gxwf and Planemo.
- **"Not run counts as a failed trial" is not used.** The closest source text is "never reported as a pass" (`run-workflow-test`), and the line was cut for words.
- **Receipt uses `validate-galaxy-workflow`, not `discover-shed-tool`.** It sits on line 1, so the ticket ties into the map. `discover-shed-tool` cites none of the five notes.
- **The YAML comes from current source**, not the QA slide. The slide's `paired reads` trigger no longer exists at origin/main.

### In and out

- **In:**
  - the binary analogy, as the key;
  - blind regeneration (two skills);
  - the right-sized Mold and the load/evidence contract;
  - one note feeding many skills;
  - the oracle and the false miss (one line);
  - the provenance hashes;
  - Orbit 0/15, attributed to the preprint;
  - "hand edits are flagged as drift and overwritten".
- **Out:**
  - DengueSeq, the draft format, gxformat2 typing;
  - other Foundries;
  - the gap/requirements ledger (also excluded from the fan-out);
  - the recompile narrative (only "the fix was a new oracle property");
  - named skill repos;
  - Pinecone;
  - the stale install-screenshot counters;
  - Hokken;
  - corpus counts other than 69 skills, which only appears in the footnote as "all 28 skills on these lines".

## `[[ASK]]` and placeholder slots

- **No `[[ASK]]` slot.** The pitch has no place for Anton's foundry-paper work (nf-core rnaseq/atacseq): it excludes Galaxy workflow detail and other Foundries. That work is left out entirely, so there is no `SHOW_ASK` flag and no `SHOW_ASK=0` render.
- **`[[QR: live results]]`** sits top right, 4.15 in, as a dashed ochre placeholder. When the URL exists, replace the `live-ph` div in `build.mjs` with `await qr(url)`.

## Rebuild

```sh
./build.sh            # content.yml + data/network.json -> poster.pdf, poster-bleed.pdf, preview.png, checks/
./build.sh extract    # first re-read galaxyproject/foundry origin/main (read-only, via git show) into data/network.json
```

`build.sh` installs npm deps, once, into `/private/tmp/claude-503/skills-are-binaries-transit-deps`. Override the location with `DEPS=`. It symlinks `node_modules` in only while building and removes the link on exit, even when a build fails. Nothing from npm stays in the vault.

Chromium comes from the Playwright cache (`chromium-1248`, playwright 1.64.1). It also needs `pdffonts`, `pdfimages` and `pdftoppm` (poppler).

**Outputs:**

- `poster.pdf`: 3168 pt square, vector, 0 raster images, fonts embedded;
- `poster-bleed.pdf`: 44.25 in, paper extended 0.125 in on every side;
- `preview.png`: 1500 px;
- `checks/preview-25.png`: 1056 px;
- `checks/preview-gray.png`;
- `checks/thumb-200.png`.

**The build fails** in any of these cases:

- any callout, key item, footer block, header, hero, map or key overflows;
- callouts overlap, or a block ends past the 1 in margin;
- any text is under 24 pt (SVG text is measured after scaling);
- body copy (`p`, `li`) is under 28 pt;
- the hero is under 100 pt;
- a `.heading` is under 72 pt;
- `pdffonts` shows a non-Overpass font, or `emb` isn't `yes`, in either PDF;
- the PDF contains a raster image;
- a QR code would be under 2.5 in;
- body words exceed **400**;
- `extract.mjs` finds a cast whose `src_hash` for a mapped note differs from the note's actual sha256.

Labels between 24 and 28 pt are listed as warnings. Today that is only the affiliation superscripts. The YAML snippet is set at 28 pt, like body text.

### Body word count: **362** (397 including the method footnote)

The count covers every text node on the page, including SVG map labels, hash chips, YAML, the ticket, the key and the kicker. It excludes elements marked `.nocount`: the title, authors, affiliations, references with the method footnote, QR captions and the live-QR placeholder text. Tokens without a letter or digit (`·`, `=`) are skipped. The build writes the tokens to `build/body-words.txt`. The method footnote adds 35 more, so the total is 397, still under 400.

### Where to edit

| What | File |
| - | - |
| All copy (title, hero, map headings, note titles, callouts, key, QRs, refs) | `content.yml` |
| Map geometry, line/column/callout positions (`MAP`, `CAST`, `LY`, `OY`) | `map.mjs` |
| Styles and colour tokens | `poster.css` |
| Real data | `data/network.json`, written by `extract.mjs` |

## Fonts and colour

- **Fonts:** Overpass (500–800, plus italics) and Overpass Mono (600–700). Both are SIL OFL, from `@fontsource`, copied to `build/fonts/` and embedded as subsets. There are no system fallbacks.
- **Lines:**

  | Line | Colour | Greyscale cue |
  | - | - | - |
  | 1 | navy `#1F3A6B` | dark |
  | 2 | amber `#E9A419` | ink edge (light) |
  | 3 | green `#58A872` | light-mid |
  | 4 | plum `#7E2F6C` | dark-mid |
  | 5 | sky `#3B8FC4` | white centre stripe |

  The greyscale check separates all five.
- **Other colours:**
  - paper `#F6F3EA`;
  - ink `#17191F`, for the hero band, the Cast box and the termini (ask the shop for a K-heavy rich black);
  - gate bar `#A8322A`;
  - ticket `#FBF1D6`;
  - placeholder ochre `#9C6B12`.

## Sources for every fact

Foundry facts are from `galaxyproject/foundry` origin/main **`eb2de3f1`** (2026-10-30), read with `git show`. Every count matches the pitch's `9f83fd55`; both were checked. Decks are jmchiltondotnet origin/main `ac69980`.

| On the poster | Source |
| - | - |
| Hero sub quote | `foundry-pattern.mdx:257` |
| Binary / code / compiler / build-log analogy (key) | `foundry-pattern.mdx:197-220` |
| "Notes written for people" | `foundry-pattern.mdx:101` ("authored to be read and learned by a person") |
| Cast: scoped to one action, isolated, frozen | `foundry-pattern.mdx:155-180`; "one Mold = one action" from `foundry-qa.mdx:538` |
| Five notes, titles, sha256 prefixes, fan-out 20/12/11/10/9, 28 skills, stop load styles | `data/network.json`, from `casts/claude/skills/*/_provenance.json`. Titles are from each note's `title:` or H1. Each prefix is checked against `sha256(git show eb2de3f1:<note>)`, and every citing cast carries the same hash. Excluded from the top five: `open-requirements-ledger` (22, per the pitch) and `summarize-nextflow#summaryNextflowSchema` (12, a package schema, not a note). |
| Gate on 26 of the 28 columns | the Mold dir of each cast has `eval.md` (`nextflow-to-test-data` and `cwl-to-test-data` don't) |
| "321 of 360 references cite a source other skills share" | 100 distinct `src`, 61 cited by 2 or more casts, together 321 of 360 `refs[]` entries across the 56 casts with `_provenance.json` |
| 226 on demand / 104 hypothesis (of 360) | same files: `load` and `evidence` tallies (also 134 upfront; 223 corpus-observed, 33 cast-validated) |
| On-demand needs a `trigger`, hypothesis needs a `verification` | `foundry-qa.mdx:724`; enforced in foundry `packages/gxwf-foundry-note-schema/src/types/context.ts:209` and `.../mold/kind.md:46` |
| "Progressive disclosure is a compile-time contract" | `foundry-qa.mdx:750` |
| Reference YAML | `content/molds/workflow-brief-to-galaxy-test-plan/index.md:74-80` (`ref`, `load`, `evidence`, `trigger`; `used_at`, `mode` and `purpose` omitted; trigger truncated with "…") |
| Blind regeneration: topic and format only, two skills, spine and defaults verbatim, light page better, can't supply a traceable source or enforced check | `foundry-pattern.mdx:488-592`; blog post (ref [2]) |
| 0/15, open-weight models | Baker et al. 2026, doi:10.64898/2026.10.26.761864 (dossier §3.5), attributed in the callout |
| `integron_finder` false miss, fixed by a new oracle property | `foundry-pattern.mdx:1754-1785`; foundry commit `73af1f62` (2026-06-18; `discover-shed-tool/eval.md` +11) |
| gxwf and Planemo give the verdict | dossier §3.5 |
| Ticket: `validate-galaxy-workflow`, Mold rev 5, cast 2026-09-26, 3 refs with evidence and source-hash prefixes | `casts/claude/skills/validate-galaxy-workflow/_provenance.json` |
| "Hand edits to a skill are flagged as drift and overwritten at the next cast" | `content/meta/cast-walkthrough.md:70` ("reported as drift by `cast --check` and overwritten by the next `make casts`") |
| QR targets (all returned 200 on 2026-10-30) | `galaxyproject.github.io/foundry/`; `galaxyproject.github.io/foundry-pattern/case/`; `jmchilton.net/slides/foundry-pattern/`; `doi.org/10.64898/2026.10.26.761864` |

## Open questions

1. **Title.** The dossier asks to keep the ecosystem words, and this pitch's title has none ("Galaxy Workflow Foundry" is only in the kicker). Keep it, or use *Agent Skills Are Binaries: Keep the Source in a Galaxy Workflow Foundry*?
2. **Blind-regeneration skills.** Those two skills were not Galaxy skills (single-cell clustering, multiple testing). Is "two science skills" enough, or should the poster name the domains?
3. **Live-results URL?**
4. **Re-extract at print?** Run `./build.sh extract`; the hash guard fails if a cast drifts from its note.
5. **Bleed.** Send `poster-bleed.pdf`, or does the shop print edge to edge on the 44 in trim?
6. **Heading sizes.** Dossier §7 asks for headings of at least 72 pt. The map headings (120 px = 90 pt) and the key title (72 pt) meet it. The callout leads (50 pt) and key terms (42 pt) are treated as sub-heads, as in v2. Is that OK?

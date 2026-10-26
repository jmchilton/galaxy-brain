# R6 — Venue and Poster Logistics

Researched 2026-10-24. Meeting: Biological Data Science 2026, CSHL, Nov 4–7, 2026.

Labels: **[V]** means verified against the cited source today. **[I]** means inferred. **[NF]** means not found.

## TL;DR

- **The poster must fit within a 44" × 44" (1.1 m × 1.1 m) square.** That makes it effectively square. The common US 36×48 does **not** fit, and neither does A0 portrait (33.1 × 46.8 in). Safe sizes are 42×42, 44×44, or 36×44 in either orientation. [V size, I orientation]
- **CSHL printing costs $110.** Upload at least 7 days before the meeting starts to avoid a late fee, which means **by Wed Oct 28**. [V]
- **Session times are not published in advance.** CSHL policy is to release them with the abstract book PDF about 3 working days before the start, so around Oct 29–30. [V policy, I date]
- **John is listed as presenting author on two posters.** One is this Foundry poster; the other is Galaxy user-defined tools. That settles "Presenter TBC" for the Foundry poster. If both boards share a session, someone has to staff one of them. [V listing, I staffing risk]
- **There are about five Galaxy-adjacent entries:** two Orbit posters, the VGP Galaxy workflows poster, and a Goecks *talk* on Galaxy AI/ML, plus John's two posters. Cross-reference them, keep each one distinct, and watch the Orbit overlap (R4). [V]
- **The QR targets are live:** the repo, the docs site, and the `/usage/` install page. [V]

## 1. Poster size and orientation

| Finding | Status | Source |
| - | - | - |
| "Posters should fit within a 1.1m x 1.1m (44" x 44") space." | V | https://meetings.cshl.edu/information.aspx?meet=DATA&year=26 (DATA-specific) |
| Print form max: "Maximum size 44 x 44 inches (1.1 m x 1.1 m)", recommended 300 DPI, PDF preferred, < 200 MB | V | https://meetings.cshl.edu/submitprintposter/ |
| The same 44"×44" rule appears in CSHL's ITCR 2026 guidelines, so it's a campus-wide standard, not a DATA quirk | V | https://meetings.cshl.edu/pdf/ITCR%20Presentation_Guidelines.pdf (p.1) |
| Orientation is not stated anywhere. "Fit within a square" means portrait and landscape are equivalent as long as both sides are ≤ 44" | I | as above |
| Hanging supplies are "provided during the poster sessions" | V | information page |
| Poster areas have wireless internet (campus network `GUEST`), so a live demo from a laptop or phone is possible | V | information page; ITCR PDF |
| Board material and mount/removal times | NF | not on any page; ask Kelley McGrath (mcgrath@cshl.edu) |

Size arithmetic [I]: 44" is 111.8 cm.
- 36×48 does not fit (48 > 44).
- A0 (84.1 × 118.9 cm) does not fit.
- A1 (59.4 × 84.1 cm) fits but is small.

Recommendation: **42×42 or 44×44 square**, or 36×44 if the design needs a rectangle. Leave a small margin rather than printing at exactly 44.

## 2. Deadlines and printing (counted back from the Wed Nov 4 start)

| Item | Date | Status | Source |
| - | - | - | - |
| Poster abstract deadline | Oct 1, 2026 (passed; our abstract is listed, see §4) | V | https://meetings.cshl.edu/meetings.aspx?meet=DATA&year=26 |
| CSHL print order/upload ("at least seven days prior to the start of the meeting") | **by Wed Oct 28** | V rule, I date | information page |
| Print cost | $110.00; pickup from "the bins next to the front doors of Grace Auditorium"; unpaid balances settled at the Meetings & Courses window | V | information page |
| Late registration fee | applies after 5:00 pm ET, Oct 29, 2026 | V | meeting page |
| Abstract book PDF with the schedule | emailed "three working days prior to the first day", so about Oct 29–30 | V rule, I date | https://meetings.cshl.edu/abstracts.aspx?meet=DATA&year=26 |
| Virtual Poster Gallery upload | DATA is in the form's dropdown. PDF only, ≤ 6 MB, 72 DPI, Landscape/Portrait option, "latest upload" wins; questions to virtualposters@cshl.edu | V | https://meetings.cshl.edu/submitposter/ |
| Virtual gallery deadline for DATA | not stated. ITCR's was 5 days before its July 15 start, so DATA's is plausibly around Oct 30 | NF / I | ITCR PDF; ask mcgrath@cshl.edu |

Note: the virtual-gallery PDF (≤ 6 MB, 72 DPI) and the print PDF (300 DPI, < 200 MB) need separate exports. [I]

## 3. Session and schedule

| Finding | Status | Source |
| - | - | - |
| Starts Wed Nov 4 at 7:30 pm and ends with lunch Sat Nov 7. A pre-meeting BioDATA ASCENT Code-a-Thon runs Nov 3–4 (https://biodata-ascent.github.io/) | V | meeting page |
| Themes: Algorithmics; Population Genetics & Personalized Medicine; Machine Learning; **Tools, Visualization, and Infrastructure**; Functional Genomics; Spatial Genomics & Spatial Biology | V | meeting page |
| Organizers: Karlsson (UMass Chan), Schatz (JHU), Vallejos (Edinburgh). Keynotes: Karen Miga (UCSC), Aaron Quinlan (Utah). Goecks is one of 12 discussion leaders | V | meeting page |
| "Dates and times of specific talks or sessions are not given out prior to electronic circulation of the abstract book PDF." Only first-night and keynote speakers get told early | V | information + abstracts pages |
| Poster-session count, times, and whether posters stay up all meeting | NF | will be in the abstract book. CSHL usually runs two or more evening poster sessions [I, general CSHL practice, not verified for DATA 26] |
| Check in at Grace Auditorium. After 7:30 pm on day 1, packets are on the lower level. Call 516-367-8346 if arriving after 10 pm | V | information page |
| Hashtag `#cshldata26` | V | meeting page |
| The meeting page shows a "You are viewing a past event" banner even though the meeting is upcoming. Probably a site artifact (abstracts closed); the listed details are all current-year | I | meeting page |

## 4. What posters at this meeting look like

Primary evidence: the public abstract-status table at https://meetings.cshl.edu/abstracts.aspx?meet=DATA&year=26, parsed from raw HTML on 2026-10-24.

**Size of the field [V].** There are 207 entries: 165 posters, 41 talks, and 1 marked "talk/poster". Columns are Presenting Author, Abstract Title, Talk/Poster.

**Galaxy cluster [V].** All of these are verbatim rows:
- Chilton, John M: "From Nextflow, CWL, papers, and conversations to runnable Galaxy workflows". Poster; this one.
- Chilton, John M: "From research code to reproducible infrastructure with Galaxy user-defined tools". Poster.
- Nekrutenko, Anton: "Orbit—Reproducible agentic workflow development with cloud execution included". Poster.
- Cain, Scott: "Orbit and Galaxy user-defined tools for reproducible, auditable computational biology". Poster.
- Lariviere, Delphine: "Resolving both haplotypes of vertebrate genomes through dual curation with the VGP Galaxy workflows". Poster.
- Goecks, Jeremy: "Artificial intelligence and machine learning advances in the Galaxy Computational Workbench". **Talk**.

What follows from the cluster [I]:
- **Staffing.** John presents two posters. If both land in the same session, the Foundry board needs a co-author present (van den Beek, Baker, Callan or Nekrutenko), or the boards should be placed next to each other.
- **Differentiation.** Orbit (two posters) and the Foundry both pitch "agentic + reproducible Galaxy". The Foundry poster should say in one line how it relates to Orbit and point to the Orbit boards. The "new and unpublished" overlap belongs to R4.
- **Goecks's talk** may mention the Foundry. It's worth asking him to put up a slide or QR code pointing to the poster.

**Agentic / LLM neighbours [V titles, I relevance]:**
- AGOUTIC (agentic long-read processing; Abdollahzadeh)
- labWeaver ("reliable agentic data analysis grounded in laboratory knowledge"; Guo)
- Researcher Profiles (Sheffield)
- "An AI agent enables drug target identification…" (Tokheim)
- "Quantum computing for biology in the age of LLMs" (Blankenberg)
- **"Refining and enriching SRA metadata using deterministic logic and large language models"** (Seacord). This is the closest pitch to the Foundry's "deterministic tools, not the model, judge correctness". Expect visitors to compare the two directly.

Infrastructure and tool posters (Refgenie, GAIn, Celldega, ZENBU, SorghumBase, brisc) are the other tools-track neighbours.

**What makes a tools poster land with this audience [I].** This comes from the organizer and keynote profile (assembly, T2T/centromeres with Miga, genome tooling with Quinlan, population genetics, ML) and from the field above.
- Name a real genomics pipeline and show a concrete before/after: nf-core/sarek variant calling, EGAPx annotation.
- Have a correctness number or a pass/fail table, not a description of the architecture. There are many agent posters, and checked outcomes will set this one apart.
- Show visible failure modes and gaps. Genomics tool builders distrust LLM claims with no oracle.
- Make it install in one line, with a QR code. Wi-fi makes a live laptop demo possible: Claude Code running a Foundry skill, or the docs site gallery.

## 5. QR-code targets

All checked 2026-10-24 against `galaxyproject/foundry` `origin/main` @ `bc7909600151a5cb2bc136921edf11c85d910595`.

| Target | URL | Status | Source |
| - | - | - | - |
| Repo (public) | https://github.com/galaxyproject/foundry | V. `gh repo view`: PUBLIC, homepage set to the docs site | `gh` |
| Docs site | https://galaxyproject.github.io/foundry/ | V. HTTP 200. Last `deploy.yml` run succeeded on `bc79096` (2026-10-24 18:22 UTC) | README.md; `gh run list` |
| Install page (best "get the skills" QR) | https://galaxyproject.github.io/foundry/usage/ | V. 200. Has Claude Code, Codex and Antigravity commands | site; also `homepage` in `casts/claude/.codex-plugin/plugin.json` |
| Story page (narrative entry) | https://galaxyproject.github.io/foundry/story/ | V. 200 | site nav |
| Pipelines / Molds | https://galaxyproject.github.io/foundry/pipelines/ and https://galaxyproject.github.io/foundry/molds/ | V. 200 | site nav |
| Gallery | https://galaxyproject.github.io/foundry/gallery/ | V. 200 (contents not reviewed) | `site/src/pages/gallery` |
| Cast skills source | https://github.com/galaxyproject/foundry/tree/main/casts/claude/skills | V. 200. 69 skill dirs on `origin/main` | `git ls-tree` |

Install text for the poster [V, from README.md @ `bc79096` and the `/usage/` page]:

```text
# Claude Code
/plugin marketplace add galaxyproject/foundry
/plugin install foundry-skills@galaxy-workflow-foundry

# Codex CLI
codex plugin marketplace add galaxyproject/foundry
codex plugin add foundry-skills@galaxy-workflow-foundry
```

Antigravity uses `git clone https://github.com/galaxyproject/foundry` then `agy plugin install foundry/casts/claude`. The marketplace is `galaxy-workflow-foundry` and the plugin is `foundry-skills` v0.2.0 (`.claude-plugin/marketplace.json`, `casts/claude/*/plugin.json`).

**License [V].** `LICENSE` is MIT (© 2026 John Chilton), and all three plugin manifests say `"license": "MIT"`. GitHub's API reports the license as "Other", probably because of the `LICENSES/` dir of vendored-upstream licenses. A visitor scanning the repo will see "Other" in the sidebar. [I cause]

**npm packages [V]** (`gh api …/releases`): `@galaxy-foundry/gxwf-foundry@0.3.0`, `@galaxy-foundry/gxwf-pi-harness@0.4.3`, `@galaxy-foundry/summarize-nextflow@0.4.0`. These are a secondary QR candidate at most.

**Consistency risks for scanners [V, for R1 to resolve].**
- The README's generated corpus table on `origin/main` says **13 pipelines** and **56 Molds (29 draft / 27 reviewed)**. The abstract says *seven pipelines* and the goals doc says 47 Molds.
- The README lists 7 conversion pipelines plus 2 lifecycle journeys.
- Visitors who scan the QR will see the live counts, so poster figures should match `origin/main` at print time (about Oct 28) or be phrased so they still read true.

## 6. Open items (ask John / email CSHL)

- Email mcgrath@cshl.edu: board material and size, mount/removal times, the virtual gallery deadline, and whether one presenter's two posters can be placed next to each other.
- Who staffs the Foundry board if John's two posters share a session?
- Print at CSHL ($110, by Oct 28) or bring a print? A square 42–44" print rules out most standard tube or stock sizes.
- Should the poster cross-reference Orbit (Nekrutenko, Cain), the user-defined-tools poster, and the Goecks talk?
- Freeze the corpus counts against a specific `origin/main` SHA at print time?

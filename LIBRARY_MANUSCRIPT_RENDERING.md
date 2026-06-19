# Manuscript rendering improvements — implementation plan

Plan for making `/papers/<paper>/` render as a polished, integrated reading view
instead of a drafting dashboard. Covers three approved tracks:

- **A** — machine-readable bibliography + inline-linked citations + real reference list
- **B** — manuscript-as-front-door: metadata header band, badges, abstract, sticky TOC
- **D** — integrated Supporting Information: linked SI mentions + download cards

Generalize across all three papers (`foundry`, `galaxy-notebooks`, `gxwf`) — they
share file layout (`index.md`, `manuscript.md`, `references.md`,
`supporting-information.md`, `figures.md`, `si/`, `figures/`).

**Decisions locked:** (Q2) `/papers/<paper>/` renders the manuscript as the
primary view, drafting dashboard moves to `/workspace/`. (Q4) Build + generalize
across all three papers from the start.

## Current state (verified)

- Paper route `site/src/pages/papers/[paper]/[...path].astro` renders any paper
  sub-file as plain prose (`paperFiles` collection, passthrough schema → sub-files
  *may* carry frontmatter without breaking validation; validator skips non-index
  paper files).
- `/papers/<paper>/` (the `index.md` note) renders via `[...slug].astro` — a
  drafting dashboard, not the paper.
- Citations: inline plain text `[Surname YEAR]`, multi-cite `[A; B; C]`.
  `## References` in `manuscript.md` is a stub ("keyed to references.md").
- `references.md` mixes bibliography entries **and** editorial notes ("Use in
  Introduction…") — not machine-readable as-is.
- SI (`supporting-information.md`) already has a clean contents table + stable
  links + download paths (`/galaxy-brain/si/*.ga`). Inline mentions
  ("SI Recipe S1–S3") are unlinked prose.
- Markdown pipeline = remark plugins in `site/astro.config.mjs`
  (`remark-wiki-links`, `remark-md-links`, `remark-mermaid`). New linking logic
  fits as one more **paper-scoped** remark plugin (gate on source path
  `papers/**/manuscript.md` inside the transformer).

## Foundational dependency (do first)

Track A rests on a canonical bibliography. Regex over `references.md` prose is
fragile.

**Create `vault/papers/<paper>/references.yml`** keyed by citation key
(`Surname YEAR`, the form already used inline). One-time generation from
`references.md`, then maintained by hand. `references.md` stays as the human
editorial-notes doc.

Proposed shape:

```yaml
# references.yml
"Goecks 2010":
  authors: "Goecks J, Nekrutenko A, Taylor J, The Galaxy Team"
  year: 2010
  title: "Galaxy: a comprehensive approach for supporting accessible, reproducible, and transparent computational research in the life sciences"
  venue: "Genome Biology 11:R86"
  doi: "10.1186/gb-2010-11-8-r86"
  url: "https://doi.org/10.1186/gb-2010-11-8-r86"
  note: "Foundational Galaxy citation; cite for Pages-as-documents."   # optional, drafting-only
```

Open: keep `note` (nice for a *drafting* site, noisy for a *published* look) —
render it only behind a "drafting mode" toggle, or drop it. (Q3)

**DONE (step 1).** Deviation from the original parse-`references.md` idea: the
three papers use three incompatible reference formats (foundry = bold-key
bullets, galaxy-notebooks = plain author-year bullets + notes, gxwf = BibTeX
blocks), so a single md→yml parser would be three brittle parsers. Instead:

- `references.yml` is **hand-curated canonical data** (keyed by inline citation
  key), one per paper — committed for all three.
- `check_references.py` (PEP 723) is a **coverage linter**: extracts inline
  `[Author YYYY]` citations from `manuscript.md`, verifies each resolves to a
  `references.yml` entry, validates entry shape (title; author-year keys need
  authors+year), and warns on uncited entries. `--check` exits 1 on errors.
- `make references` (report) / `make check-references` (CI gate); tests in
  `test_check_references.py` (25 tests). The linter caught 3 citations missed in
  first-pass hand entry (`Soiland-Reyes 2022`, `Mölder 2021`, `O'Connor 2017`).

This keeps the renderer from ever meeting an unknown citation key.

**Sync pass (references.md retired).** `references.yml` is now the *single*
source of truth — `references.md` was deleted for all three papers. Each YAML
was expanded to hold the full bibliography (cited + backlog), full author lists
(no `et al.` except where the source itself truncates), PMIDs where available,
and the per-entry editorial guidance + section-level notes ported in as `#`
comments (not rendered). Backlog (uncited) entries are inert for rendering and
no longer warn — the linter reports them as a count (`cited / backlog / total`).
Cleanup: removed the `references/` workspace links from each `index.md`,
repointed `references.md` prose mentions (manuscripts, outline, tasks) at
`references.yml`. Caught during the port: gxwf's `BioAgents 2025` is the same
paper as galaxy-notebooks' `Mehandru 2025` (Scientific Reports 15:39036) —
filled in from that record. Counts: foundry 10 cited / 3 backlog, gn 19 / 17,
gxwf 20 / 3.

**Hand-written bullets removed.** Before deleting the foundry/gxwf manuscript
`## References` bullet lists, cross-checked every bullet DOI + bold-key against
`references.yml` — all present (caught one gap: gxwf was missing `gxformat2`,
now added; adding it also made an inline `[gxformat2]` resolve, 20→21 cited).
Bullets removed; the intro sentence stays (source-only — the plugin strips the
whole section body and regenerates the list). foundry keeps a source-only note
that `[Galaxy Notebooks]`/`[gxwf]` are companion cross-refs (kept as yml
comments; they render as plain text inline pending cross-paper linking, Track F).

## Track A — inline citations + reference list

**DONE (step 2).** `site/src/lib/remark-paper-citations.ts` (registered in
`astro.config.mjs`), scoped to `papers/*/manuscript.md`:
- Links inline `[Author YYYY]` / short-key citations (incl. multi-cite
  `[A; B; C]`) to `#ref-<slug>`, each with a hover popover (`.cite-pop`)
  carrying the full citation + DOI link.
- Replaces the body under `## References` (stub in galaxy-notebooks, hand-written
  bullets in foundry/gxwf) with a generated, anchored, alphabetical list from
  `references.yml` — single source of truth.
- Reads the sibling `references.yml` by vfile path (cached), so no per-paper
  page wiring. Styles in `site/src/styles/global.css` (`.cite`, `.cite-wrap`,
  `.cite-pop`, `ol.reference-list`, `:target` highlight).
- Verified across all three papers: foundry 8 refs, galaxy-notebooks 19, gxwf 17;
  0 unresolved.

Gotchas hit & fixed:
- **smartypants**: Astro rewrites straight `'`→curly `'` in text nodes before
  the plugin runs, so `O'Connor 2017` missed a literal lookup. Fixed with a
  `normKey()` normalizing curly→straight on both sides.
- **content-layer cache**: editing the plugin requires `rm -rf
  site/node_modules/.astro` (Astro 5 caches rendered content there); `.vite`/
  `.astro` alone is not enough. Stale cache silently serves the old render.

Decision taken (Q5): **author-year inline + alphabetical reference list**
(matches target venues / existing prose). Q1 stands: YAML keyed by inline key.
Q3 (popover note): drafting `note` is shown in the popover/list in italics for
now.


**Data load:** in `papers/[paper]/[...path].astro`, read
`vault/papers/<paper>/references.yml` (sibling of the rendered file) into a map.

**Inline linking (remark plugin `remark-paper-citations`):**
- Gate on source path ending `papers/*/manuscript.md`.
- Walk text nodes, match `\[([A-Z][a-zA-Z]+ \d{4}(?:[;,] [A-Z][a-zA-Z]+ \d{4})*)\]`.
- Split multi-cites on `;`; for each key, emit a link node
  `[Surname YEAR](#ref-<slug(key)>)` with a class for popover styling.
- Unknown keys: leave as plain text + emit a build warning (don't silently link).

**Reference list:** replace the `## References` stub. Two options:
1. Renderer injects an auto-built `<ol>` of **cited-only** entries after the
   article (collect keys seen during the remark pass → pass to the page →
   render list). Order: appearance (numbered) or alpha. (Q5)
2. Keep `## References` heading; append list under it.

Prefer (1) — keeps `manuscript.md` clean, list always matches what's cited.

**Popover:** hover/focus on an inline cite shows full citation (authors, title,
venue, year, DOI link). CSS-only popover or a tiny client component. Each entry
gets `id="ref-<slug>"` so the inline link scrolls + highlights.

**Tests:** `remark-paper-citations` unit tests (single cite, multi-cite,
unknown key passthrough, non-paper file untouched). Bibliography parser tests in
`generate_references.py`'s suite.

## Track B — manuscript as front door

**DONE (step 3, part 1 — header band + TOC).** New
`site/src/components/PaperManuscript.astro`, wired into the manuscript branch of
`papers/[paper]/[...path].astro` (gate: `entry.id` ends `/manuscript`):
- **Header band** from the parent `index.md` frontmatter: `short_title` eyebrow,
  authoritative title, `status` / `paper_stage` / `paper_kind` / `target_venue`
  pills, `central_claim` lede, Workspace + Raw + Copy actions, revised/rev line.
- **Title source:** the manuscript's own H1 is authoritative (the band shows it;
  the in-article H1 is hidden via CSS to avoid duplication). This surfaced a
  content divergence between `index.md` `title` and the manuscript H1 for
  **galaxy-notebooks** and **gxwf** (foundry already matched), now reconciled:
  galaxy-notebooks standardized on the workspace title (updated the manuscript
  H1 — its abstract foregrounds workflow extraction); gxwf standardized on the
  manuscript H1 "Schema-Aware Authoring and Validation…" (updated `index.md` —
  its abstract names validation depth as the contribution).
- **Sticky TOC** built from Astro's `render().headings` (depth-2 sections);
  IntersectionObserver scroll-spy highlights the active section. Hidden below
  `lg`; the article gets `min-w-0` so the grid track can shrink.
- Styles in `global.css` (`.paper-pill`, `.paper-toc`, `.toc-active`, band).

Gotchas hit & fixed:
- **Grid blowout:** the `1fr` article track has default `min-width:auto`, so a
  wide child expanded it to ~4500px and pushed the TOC off-screen — fixed with
  `min-w-0` on the article.
- **Citation popover overflow:** the (Track A) hover popovers are absolutely
  positioned at 80vw and, anchored at right-edge citations, forced a horizontal
  scrollbar at narrow/`lg`-edge widths even while hidden. Fixed with
  `overflow-x: clip` on the article (leaves upward popovers visible, doesn't
  touch the sibling sticky TOC) — verified no h-scroll at 480/768/1024/1280.

Still TODO for Track B: the routing flip (manuscript → `/papers/<paper>/`,
dashboard → `/workspace/`), abstract pull-quote, Track E frontmatter promotion.

**Routing (Q2 — locked: manuscript primary):** `/papers/<paper>/` renders the
**manuscript** as the primary view; drafting dashboard moves to
`/papers/<paper>/workspace/`. Implementation: special-case the paper-root path in
`papers/[paper]/[...path].astro` (or add `papers/[paper]/index.astro`) to load
`manuscript.md` + `index.md` frontmatter; add a `/workspace/` route rendering
`index.md`. Watch: existing inbound links to `/papers/<paper>/` (e.g. SI table,
Index.md) now land on the manuscript — audit and update any that meant the
dashboard.

**Header band** (from `index.md` frontmatter, already present):
`title`, `short_title`, `target_venue` + `paper_stage` badges, `central_claim`
as lede, optional word count + figure count. Abstract pulled from
`manuscript.md`'s `## Abstract` as a styled pull-quote.

**Sticky TOC:** build from H2/H3 of `manuscript.md` (rehype heading-ids already
or add `rehype-slug`); render a sticky side nav with scroll-spy. Reuse for all
papers.

**Drafting workspace:** demote `index.md` prose (Working Claim, Current Emphasis,
Target) into a collapsible panel or `/workspace/` route. "View raw / download
markdown" already exists via `/raw/papers/<paper>/manuscript.md`.

**Track E (folded in):** promote durable index prose → frontmatter. Add optional
fields to `paper` schema in `meta_schema.yml` + `content.config.ts` as needed
(`word_count_target`, `figures_count`) and render in the header. Editorial prose
stays as notes.

## Track D — integrated Supporting Information

**Inline SI links (same remark plugin or sibling):** match
`SI (Recipe|Workflow|Data) S\d+` and `Table \d`, `Figure \d[a-z]?` in
`manuscript.md` text → anchor links to the SI item / figure / table on the page.

**SI cards:** render `supporting-information.md`'s contents table as a styled
card grid — type icon (recipe / workflow / data), vignette badge, **download
button** for `.ga`/`.yml` (paths already stable under `/galaxy-brain/si/`),
"render" link for recipe pages. Either embedded at the manuscript's
`## Supporting Information` section or as a persistent sidebar "Downloads" block.

**Figures (Track C, optional polish):** wrap embeds in `<figure><figcaption>`,
auto-number, anchor; link inline "Figure 3a"/"Table 1" to targets; click-to-zoom.
Pull richer alt text from `figures.md`. Lower priority.

## Generalization

All logic keys off the shared layout, so build once and it covers all three
papers. Guards: papers missing `references.yml` or `si/` degrade gracefully
(skip the block, no error). `foundry` currently has no `si/` — verify it
no-ops cleanly.

## Sequencing

1. ~~`references.yml` + linter (+ make targets, tests)~~ — **DONE for all three papers.**
2. ~~Track A remark plugin + reference-list rendering + popover~~ — **DONE, all three papers.**
3. ~~Track B header band + sticky TOC~~ — **DONE, all three papers.** Routing
   flip (dashboard → /workspace/) + abstract pull-quote still pending.
4. Track D SI cards + inline SI/figure links.
5. Track C figure polish (optional).
6. Generalize/verify across `foundry` + `gxwf`.

## Unresolved questions

1. Bibliography format — `references.yml` keyed by `Surname YEAR` (lean) vs CSL-JSON/BibTeX.
2. ~~Routing~~ — **locked: manuscript primary, dashboard → /workspace/.**
3. Citation popover — full citation only, or also drafting `note` behind a toggle.
4. ~~Scope~~ — **locked: all three papers from the start.**
5. Reference list order — appearance/numbered vs alphabetical.
6. Word/figure counts — compute at build from `manuscript.md`/`figures.md`, or store as frontmatter.

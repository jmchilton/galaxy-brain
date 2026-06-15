# UC1 debrief — MRSA mobile-AMR context across isolates (issue #12)

Built interactively via the notebooks MCP against the local Galaxy (worktree `history_pages`), 2026-06-12. This is the debrief for use case 1; setup story is in `SETUP_DEBRIEF.md`, operational facts in `index.md`.

## Artifacts produced

| Thing | ID / location |
|---|---|
| History | `MRSA mobile AMR context across isolates` — `60559d1a5f859493` |
| Notebook page | `b887d74393f85b6d` (history-attached; latest revision `eca0af6fb47bf90c`) |
| Isolate collection | `MRSA isolate assemblies` (`f597429621d6eb2b`), 4 elements |
| bedtools closest output collection | `fb85969571388350` |
| Figure 1 — ARG location heatmap (PNG) | `60e680a037f41974` |
| Figure 2 — ARG counts by mobile context (PNG) | `55504e7a2466a2e3` |
| Bakta GFF3 (solo runs, populated) | KUN1163 `2f4933c7d721d5e8`, KUH180129 `b1cd55a75be0e1ad`, KUH140046 `f2f5db583bb871d6` |
| Plotting tool installed | `iuc/ggplot2_heatmap2` (the only plotting tool available) |
| Bakta light DB v5.1 | `database/bakta_db/db-light` (1.48 GB tar → 3.4 GB) + AMRFinder DB `database/bakta_db/amrfinderplus-db` |

## What was done

4 complete *S. aureus* isolates (Hikichi 2019, BioProject PRJDB8599), each imported as a **combined chromosome + plasmid FASTA** straight from ENA's comma-separated FASTA API (`.../fasta/AP020324.1,AP020325.1`):

- KUH140013 ST8, KUH140046 ST8, KUH180129 ST6313, KUN1163 ST764.

Pipeline, **all mapped over the assemblies collection** (so it extracts as one reusable workflow):

```
assemblies → staramr ──── resfinder.tsv ─ awk→BED ─ SortBED ┐
          → ISEScan ───── results.gff ── awk→BED ─ SortBED ┴─ bedtools closest -d → ARG↔IS distances
          → Integron Finder ── (zero integrons)
```

staramr (ResFinder+PlasmidFinder+MLST, PointFinder disabled), ISEScan, Integron Finder, then `Text reformatting (awk)` → BED, `bedtools SortBED`, `bedtools closest -d`. All jobs ran in Docker/BioContainers.

## Headline finding (survives review)

**The same gene `aac(6')-aph(2'')` sits in a different mobile context depending on location** — next to an **IS6** element on the plasmids of KUN1163 (80 bp) and KUH140046 (467 bp), but next to an **IS256** element on the chromosome of KUH180129 (84 bp). Same resistance gene, different mobilizing-element family. Supporting comparative points: KUH180129 is `mecA`-negative (genotypically MSSA) and ST-divergent; integrons absent in all four (expected for *S. aureus*); plasmids are IS6-enriched; KUH180129's chromosome has an 18-copy IS256 expansion.

## Design decisions worth keeping

- **Plasmid vs chromosome is classified by contig length, NOT PlasmidFinder presence.** Every isolate carries a chromosomal rep marker (rep7c/rep22/repUS43), so replicon presence can't discriminate. This was the user's "data-driven" ask and the empirically-correct call.
- **Combined chr+plasmid FASTA per isolate** keeps each isolate one collection element → clean map-over → clean extraction.
- **Collection map-over throughout** so the whole thing is workflow-extractable (the eventual UC goal).

## Snags / environment findings

1. **MCP upload bug (fixed in worktree).** `upload_file_from_url` in `lib/galaxy/agents/operations.py` pre-decoded `history_id` to an int and passed it to `FetchDataPayload.history_id` (a `DecodedDatabaseIdField` that wants the encoded string) → every upload failed. One-line fix (pass encoded id through). **Present in `dev` and `release_26.1`** — originating PR #21942, commit `36a5e66089`. Full writeup + diff: `../FETCH_MCP_ISSUE.md`.
2. **MCP `run_tool` can't express collection map-over.** Core Galaxy rejects a bare `{src:hdca}` on a single input; map-over needs the `{"batch":true,"values":[{"src":"hdca",...}]}` encoding, which `run_tool` doesn't surface. Every mapped step here was driven via direct `POST /api/tools` instead. Noted as a related gap in `FETCH_MCP_ISSUE.md`.
3. `history_dataset_as_table` directive args with spaces must be **quoted** (`title="..."`); one directive per ```` ```galaxy ```` fence.
4. **Bakta light DB collides with its wrapper.** The bakta light DB v5.1 *bundles* an `amrfinderplus-db/` dir, but the Galaxy wrapper does `mkdir amrfinderplus-db && ln -s db-light/* database_path` → `ln: database_path/amrfinderplus-db: File exists`, all jobs error. Fix: move the bundled `amrfinderplus-db` *out* of `db-light`, register it as the separate AMRFinder DB, leave `db-light` without it. The bundled AMRFinder is already indexed (`2023-11-15.1`), so no separate download/indexing was needed — registered both DBs manually in the `.loc` files (`bakta_version` col must = `1.7`; amrfinder `db_version` col must = `3.12`), repointed `shed_tool_data_table_conf.xml` off the `.loc.sample` files, and restarted (data-table `.loc` path changes need a restart — there's no working reload endpoint).
5. **No general plotting tool** is in the installed set — only deeptools/pyGenomeTracks (genomic-signal). Installed `iuc/ggplot2_heatmap2` for the figures; it does heatmaps only, so the "stacked bar" was rendered as a context-count heatmap. Matrices were created as datasets via the `/api/tools/fetch` `pasted` source.
6. **Bakta AMRFinder version skew (silent failure).** Bakta ran fine through CDS prediction then crashed at "conduct expert systems" with `amrfinder error code 1`. Root cause: the amrfinder binary in the bakta 1.9.4 container is **3.12.8**, which requires DB **≥ 2023-12-15.2**, but the bakta light DB bundles amrfinder DB **2023-11-15.1** (too old). The wrapper has **no `--skip-amr` option**, and the `bakta ... | tee` pipe swallows bakta's non-zero exit → the job reports **`ok` with 0-byte outputs**. Fix: `amrfinder_update --force_update --database <dir>` inside the bakta container (downloads + indexes **2024-07-22.1**), repoint the amrfinder `.loc`, restart, re-run. Diagnosis required running bakta/amrfinder manually in the container (`quay.io/biocontainers/bakta:1.9.4--pyhdfd78af_0`).
7. **Bakta OOM under 4-wide emulation.** Mapped over 4 isolates, only 1 produced output (again silent-`ok`-empty); the other 3 ran out of memory under concurrent amd64-emulated diamond/blast. Fix: run the failed isolates **one at a time** (each then succeeded, ~3.5 MB GFF3). Lesson: on this machine, run Bakta serially, not mapped 4-wide.

## Review pass (subagent) — corrections applied

A review subagent checked the notebook against the raw data and issue #12. It caught two factual errors (now fixed) and several overclaims (now caveated):

- **Fixed:** `blaZ` matrix cell for KUN1163 said `C`; KUN1163 has no `blaZ` → now `–`.
- **Fixed:** headline claimed `aac(6')-aph(2'')` ~80 bp on *both* plasmids; KUH140046 is actually 467 bp → now per-isolate (80/467/84).
- **Caveated:** `tet(M)`↔IS256 45 bp was framed mechanistically; `tet(M)` is Tn916-class and the proximity is likely coincidental in an IS256-dense chromosome → reframed.
- **Caveated:** Tn554 / Tn4001 / pUB110 identities demoted from facts to annotation-pending candidates; added an explicit *adjacency ≠ mobilization* caveat and a *Method caveats* section.

## Closing the paper-worthy gap (in progress)

After the review, the user chose to close the gap: **figures + Bakta**.

- **Figures — DONE.** Fig 1 = ARG location heatmap (9 genes × 4 isolates; 0=absent / 1=chromosome / 2=plasmid) — visually carries the headline (`aac(6')-aph(2'')` teal=plasmid in KUH140046/KUN1163 vs brown=chromosome in KUH180129). Fig 2 = ARG counts by mobile context (Plasmid / Chromosomal-IS-adjacent <1kb / Chromosomal-distal), computed from the full `bedtools closest` output. Both via `ggplot2_heatmap2`; Fig 2 is a count-heatmap standing in for the requested stacked bar (no bar tool installed).
- **Bakta — DONE, and it confirmed every transposon candidate.** Annotated 3 of 4 isolates (KUH140013 deferred — minimal resistome). Gene-context around each ARG locus:
  - `aac(6')-aph(2'')` (`aac(6')-Ie`): flanked both sides by **IS6/IS257 transposases** on the plasmids (KUN1163, KUH140046; co-located with `fosD`+resolvase in KUH140046), but by **IS256 transposases = Tn4001** on the KUH180129 chromosome → the headline contrast is now a *named-element* contrast.
  - `erm(A)`+`ant(9)-Ia`: **"Transposase B from transposon Tn554"** directly upstream of every pair → Tn554 confirmed.
  - `aadD`+`bleO`: **IS431mec transposase** within `mecI`/`mecR1`/`mecA` → pUB110 cassette in SCC*mec* confirmed.
  - `tet(M)`: adjacent **"Conjugative transposon protein"** (Tn916-family) — the nearby IS256 is incidental. This **validates the reviewer's correction** that tet(M) is Tn916-borne, not IS-mobilized.
  - Solo Bakta GFF3 datasets: KUN1163 `2f4933c7d721d5e8`, KUH180129 `b1cd55a75be0e1ad`, KUH140046 `f2f5db583bb871d6`.
- Notebook (revision `6fc9fbb81c497f69`) now embeds both figures + a **Structural confirmation (Bakta)** section; the transposon claims are upgraded from "candidates pending annotation" to confirmed.

## Still-open gaps vs issue #12

- **SCC*mec* not typed** — Bakta gives `mecI`/`mecR1`/`mecA`+IS431mec context but no typed cassette (SCCmecFinder not installed).
- **Stacked bar** rendered as a count-heatmap (no bar-chart tool installed); cosmetic.
- **No JBrowse** locus view.
- **KUH140013 not Bakta-annotated** (just `blaZ`+`mecA`, deferred).
- **Workflow not yet extracted** — pipeline is a clean collection map-over; PR #22860 extraction path not yet exercised.

## Extractability — core pipeline extractable; figures + Bakta are not

Job-graph scan: the `MRSA isolate assemblies` collection exists and **staramr / ISEScan / Integron Finder / awk→BED / SortBED / bedtools closest all run mapped over it** ("on collection 25"). So the **mobile-context pipeline extracts cleanly** as a collection-parameterized workflow — this is the model the other two should follow.

Two things would NOT survive extraction and should be redone if a fully-extractable workflow is wanted:

- **The 2 `ggplot2_heatmap2` figures.** Their input matrices (ARG presence/absence; context-category counts) were computed in **Python and pasted in** — the computation isn't a Galaxy job, so the workflow can't reproduce them. Redo: build those matrices with Galaxy text tools (`tp_awk`/`datamash` over the `resfinder`/`closest` outputs) → then heatmap.
- **Bakta is messy in the graph** (a failed map-over run, then 3 **solo** re-runs on individual datasets, plus KUH140013 unannotated) and there is a **duplicate staramr** (one combined `on dataset 1-4` feeding the notebook tables, one mapped feeding the BED pipeline). For a clean workflow, run Bakta **once, mapped over the collection** (after fixing the AMRFinder DB so it doesn't OOM/skew), and drop the combined staramr in favour of the mapped one.

## Page-extraction audit — 2026-06-13 (the cleanest of the three)

Ran the real page-based extraction (`extract_next`/#22860, now merged) against page `b887d74393f85b6d`. **Best result of the three use cases.** Summary: 24 rows, 18 seeded, **9 exposed outputs**, **12 map-over (ICJ) steps** (size-4: isescan, integron_finder, staramr, awk×2, sortbed×2, closest all mapped over the 4 isolates), 0 warnings, 0 seed_warnings, 0 invalid. Extracted workflow `ebfb8f50c6abde6d`: **18 steps, zero dangling, 9 workflow outputs, 0 report warnings** — the notebook→report rewrite carried over clean. The map-over core is exactly the collection-parameterized shape we want.

Two real weaknesses confirmed at extraction:
- **The 2 heatmap figures extract as dead-ends.** Each `ggplot2_heatmap2` is fed directly by a `data_input` — the pasted ARG matrices (`ARG location matrix…`, `ARG mobile-context counts…`) computed in Python. They *connect* (so no dangling) but aren't reproducible: a user must supply the matrices. Same "computed outside Galaxy" anti-pattern UC2's datamash rebuild fixed — redo here the same way (`tp_awk`/`datamash` over the `staramr`/`closest` outputs → heatmap).
- **Duplicate staramr both extract.** The combined `staramr on dataset 1-4` (reduces the 4 individual assemblies) *and* the mapped `staramr` (icj4) both come through as steps — redundant. Drop the combined one for a clean workflow.

Net: UC1 is the **strongest notebook-extraction showcase** — a genuine map-over pipeline that extracts fully connected with its outputs starred. Its only gap is the pasted-matrix figures (a known, already-solved pattern). No new bug; the A/A2 seeding fix (`7e1d6d730f`) wasn't even exercised here (no loose-element consumption).

## Next-time recipe — make the figures extractable (data transform VERIFIED 2026-06-13)

**Both pasted matrices are exactly reconstructable from one tool output already in the graph: the `bedtools closest` collection (hid 135, ARG↔IS per isolate).** Verified by recomputing both locally from the real closest-collection elements + a contig→location classifier and diffing **cell-for-cell** against the pasted `ARG location matrix` (hid 140) and `ARG mobile-context counts` (hid 142) — exact match on all 9 genes × 4 isolates and all 3 contexts × 4 isolates. The closest output is **sufficient** (it contains every ARG incl. `blaZ`/`fosD`, not just IS-adjacent ones), so no need to go back to `resfinder`/`detailed_summary`.

The closest row schema (per isolate element): `contig, arg_start, arg_end, gene, IS_contig, IS_start, IS_end, IS_family, distance`.

**Contig → location (plasmid vs chromosome).** Two tool-only options:
- *Robust:* `fasta_compute_length` (devteam, installed) on the assemblies collection → `(contig, length)` → `tp_awk` `length<200000 ? plasmid(2) : chromosome(1)`. (Watch the contig-id form: the closest BED uses `ENA|AP020324|AP020324.1`; normalize if the FASTA header id differs before joining.)
- *Self-contained (verified):* `datamash` group-by contig `max(arg_end)` over the closest data → `(contig, maxcoord)` → `tp_awk` `maxcoord<200000 ? 2 : 1`. Avoids any FASTA-header matching; works because S. aureus chromosome ≫200 kb ≫ any plasmid. This is what the local verification used.

**Build — VERIFIED LIVE 2026-06-13 (simpler than first planned; only 2 new tools needed):**
```
closest collection (hid 135)
  └─ Collapse Collection (filename|add_name=true, place_name=same_multiple)   → flat table, isolate prepended as col1
       (cols: 1 isolate, 2 contig, 3 arg_start, 4 arg_end, 5 gene, 6-9 IS…, 10 distance)
  ├─ tp_awk  → Matrix 2 (context × isolate)   [ONE job does it all]
  └─ tp_awk  → Matrix 1 (gene × isolate)       [ONE job]
  → ggplot2_heatmap2 (image_file_format=png, cluster_cond|cluster=no) on each → PNG  (on-graph, extractable)
```
The key simplification: **a single `tp_awk` END-block does classification + count + pivot in one pass** — no `datamash`/`easyjoin`/`tp_multijoin` and no separate contig-length tool. It stores each row, tracks `max(arg_end)` per contig (→ `code = max<200000 ? plasmid(2) : chromosome(1)`, the self-contained classifier), then in `END` accumulates `matrix[label][isolate]` and prints the wide matrix with sorted isolate columns. Matrix 2 label = context (`code==2→Plasmid-borne`; `code==1 & dist<1000→Chromosomal IS-adjacent (<1kb)`; else `Chromosomal distal`); Matrix 1 label = gene, value = `code` (plasmid wins on mixed copies). The exact awk programs are in the session; both are short.

Plus: **drop the duplicate combined `staramr on dataset 1-4`** — keep only the mapped `staramr` (icj4).

**Verification status — DONE, end-to-end in Galaxy:** ran the chain live (Docker up). Galaxy-built **Matrix 2 is byte-identical to the pasted `hid 142`**; Galaxy-built **Matrix 1 cells are identical to `hid 140`** (alphabetical row order vs the curated order — cosmetic). Both `ggplot2_heatmap2` PNGs render correctly (context × isolate / gene × isolate). So the figures are now genuine on-graph tool outputs and the heatmaps walk back through awk → Collapse → closest → … → assemblies — i.e. the pasted-matrix anti-pattern is eliminated and the figure steps extract. (Installed: `nml/collapse_collections`, `devteam/fasta_compute_length` [the latter not needed in the end — the awk max-coord classifier is self-contained].)

**One caveat to record:** the END-block awk pivot **hardcodes the isolate column set** (collected + sorted at runtime, so it adapts to whatever isolates are present — but the *figure shape* is still one column per isolate in the flattened table). This is clean for the map-over study. The only structural limit, as elsewhere, is that there is no `crosstab` tool in `datamash_ops`; the awk END-block is the substitute and works for any isolate count present in the data.

## CLEAN REBUILD — 2026-06-13 (fresh history, fully extractable, extraction VERIFIED)

Rebuilt from scratch in a clean history per the next-time recipe, to make the whole notebook extract as one workflow. **Result: 14-step workflow, zero dangling, 9 outputs, report rewrite flawless — the cleanest of the three.**

Artifacts:
- History `MRSA mobile AMR context across isolates (clean)` — `48916fac0de9a85d`
- Notebook page `eafb646da3b7aac5`
- Extracted workflow `33b43b4e7093c91f` (`/tmp/uc1_workflow.ga`)
- Input collection `MRSA isolate assemblies` (list, 4) — `1fad1eaf5f4f1766`
- closest collection `fa6833a4eadf9064` (**byte-identical to the original `fb85969571388350` across all 4 isolates**)
- Fig 1 location heatmap `29e36fb8642bf5ed`; Fig 2 context heatmap `579ae69ccbd17e45`
- Matrix 2 `6c6a07bc5ecdefae` (**byte-identical** to orig `6d9affd96770ffb9`); Matrix 1 `00c10bb0de3a0ccd` (cells identical to orig `68013dab1c13fb37`, alphabetical row order)

How it was built (every step a clean map-over / on-graph tool):
1. **Clean upload** — all 4 combined chr+plasmid FASTAs fetched directly into ONE `list` collection in a single `/api/tools/fetch` call (ENA `…/api/fasta/<chr>.1,<plasmid>.1`), element ids = isolate names. Not 4 separate uploads.
2. **staramr mapped** over the collection (PointFinder `disabled`) → implicit collections. Only the mapped run — the duplicate combined `staramr on dataset 1-4` is gone.
3. **ISEScan mapped** — **`remove_short_is=true`** (see gotcha below), **Integron Finder mapped** (`--circ`, zero integrons).
4. ARG→BED awk (`NR>1 {min/max → contig,start,end,gene}`) on resfinder; IS→BED awk (`/family=/ → contig,start,end,family`) on ISEScan gff; SortBED each; **bedtools `closest -d`** (k=1, ties=all, mdb=each) mapped over both — all map-over.
5. **Figures on-graph:** Collapse Collection (`add_name=true`, `same_multiple`) → flat table → **one `tp_awk` END-block per matrix** (self-contained `max(arg_end)<200000` plasmid classifier + pivot) → `ggplot2_heatmap2` (png, cluster=no). No pasted matrices.

**Gotcha caught + fixed mid-build (important for reproducibility):** the first ISEScan run used the tool default **`remove_short_is=false`**, which keeps partial/unclassified (`family=new`) elements and injected spurious distance-0 IS overlaps (KUN1163: 25 IS vs the validated 17), corrupting the chromosomal-IS-adjacent counts. The headline still held (`aac(6')-aph(2'')`→IS6 plasmids / IS256 chromosome, 80/467/84 bp) but the context matrix was noisy. **The original used `remove_short_is=true` (complete elements only).** Re-ran with `true`, purged the bad IS branch → closest then matched the original byte-for-byte. **Record this as a required ISEScan param for this analysis.**

**Extraction (page-based, #22860) — VERIFIED clean.** Summary: 18 rows, **14 seeded** (the clean pipeline), **9 exposed**, **8 map-over ICJ steps**, 0 warnings / 0 seed_warnings / 0 invalid. The 4 unseeded rows are orphan jobs from the purged bad-ISEScan branch (outputs purged) — excluded from extraction. Extracted `.ga`: **14 steps (1 input + 13 tools), every input_connection resolves (zero dangling), 9 workflow outputs, report rewritten with 0 leftover instance ids.** Topology exactly: input collection → {staramr, ISEScan, Integron} → BED→Sort×2 → closest → Collapse → 2 matrix awks → 2 heatmaps.

**Bakta deliberately omitted** from the clean core — it's the non-mapped/OOM-prone messy part. The notebook reframes the headline at the **IS-family level** (fully supported by the extractable closest data) and lists Bakta as *optional structural confirmation* outside the extractable core. This keeps the graph pristine; the comparative payoff (IS6↔IS256 flip across 3 isolates) survives without it.

## Suggested next moves

Build the JBrowse locus view, optionally add Bakta structural confirmation (as a separate enrichment, not in the extractable core), or move on to UC2 (TAL1, issue #13) / UC3. UC1 is now a **fully-extractable** issue-#12 showcase.

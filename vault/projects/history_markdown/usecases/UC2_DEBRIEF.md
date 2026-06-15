# UC2 debrief — TAL1 peaks to candidate regulated genes (issue #13)

Built interactively via the notebooks MCP against the local Galaxy (worktree `history_pages`), 2026-06-13. Setup story in `SETUP_DEBRIEF.md`, operational facts in `index.md`. Sibling: `UC1_DEBRIEF.md`.

## Artifacts produced

| Thing | ID / location |
|---|---|
| History | `TAL1 peaks to candidate regulated genes` — `f30a35c999095ed7` |
| Notebook page | `f0f309c56aff0025` (history-attached) |
| G1E TAL1 narrowPeak (261) | `e516d7c43b2ce824` |
| Megakaryocyte TAL1 narrowPeak, pooled R1+R2 (150) | `7f09d52a860db821` |
| common / G1E-only / mega-only peaks | `5bb18c11f5b70a41` / `38d70b27d179c236` / `603e7db97773b4d1` |
| promoter windows (TSS −1000/+500) | `b735ed9e5e005602` |
| distance-to-TSS figure (PNG) | `d33e32db742aed56` |
| bowtie2 + mm10 index installed | `devteam/bowtie2`; `database/bowtie2_index/mm10` (prebuilt, registered in `bowtie2_indices.loc`) |

## Data-source decision

The tutorial's TAL1 **narrowPeak files are tutorial *outputs*, not hosted inputs** (Zenodo 197100 has only FASTQ + the RefSeq/ROI BEDs). GSE51338 hosts real TAL1 peaks but in **mm9 broadPeak** (build mismatch with the mm10 RefSeq). User chose **mm10 + regenerate peaks**: align the tutorial FASTQ to mm10 and call peaks ourselves. (Rejected: mm9+ENCODE peaks [build switch], liftover, synthetic.)

## What was done

G1E (erythroid) and megakaryocyte TAL1 ChIP, 36 bp single-end, **R1 per condition for G1E**, **pooled R1+R2 for megakaryocyte**:

```
FASTQ ─► Bowtie2 (mm10 prebuilt index) ─► BAM ─► MACS2 callpeak (TAL1 vs input, gsize mouse) ─► narrowPeak
RefSeq mm10 BED12 ─► awk TSS±window (promoters) + awk TSS points
bedtools intersect (G1E vs mega) ─► common / G1E-only / mega-only
   ├─ ∩ promoters (-u) ─► promoter-bound candidate genes
   └─ closest -d vs TSS ─► nearest gene + distance
```

No read trimming (36 bp, good quality — documented simplification).

## Headline result (textbook-correct)

The erythroid↔megakaryocyte **lineage switch falls out of the differential TAL1 binding**:
- **Promoter-bound, G1E-only:** `Gata1` (master erythroid TF) + erythroid program (`Cpox`, `Tfr2`).
- **Promoter-bound, mega-only:** `Fli1` (master megakaryocyte TF) + `Tal1` autoregulation.
- **Common:** `Cbfa2t3` (ETO2, a TAL1-complex member), `Pf4`.
- **Distal nearest-gene network:** `Runx1` (all classes), `Erg`, `Cd44`, `Nprl3` (α-globin locus, erythroid).
- **Most TAL1 peaks are distal** (median 12–24 kb to TSS) → enhancer-dominated, as expected.

Peak-set sizes: G1E 261, mega 150 (pooled), common 39, G1E-only 222, mega-only 110.

## Snags / findings

1. **Megakaryocyte single-replicate gave only 17 peaks.** Cause: deep TAL1 (4.4M reads) vs shallow input (750k) → MACS2 scales the larger library *down* to the smaller, killing sensitivity. **Adding Tal1 R2 alone would NOT fix it** (worsens the imbalance); the fix is deeper *control*. Pooled R1+R2 for *both* treatment and control → 150 peaks. (The 17 were all real, at Gata1/Gata2/Runx1/Cbfa2t3.)
2. **mm10 bowtie2 index setup** (Bakta-style infrastructure): downloaded the genome-idx prebuilt mm10 index (3.4 GB zip → 6 `.bt2`), registered in `tool-data/shed/bowtie2_indices.loc` (cols `value, dbkey, name, path`; path = index basename), restarted. The shed install of bowtie2 auto-registered the `bowtie2_indexes` data table. Prebuilt index avoids a slow emulated `bowtie2-build`.
3. The MCP upload bug (UC1) and `run_tool`-no-map-over gap (UC1) still apply; UC2 used `run_tool` for flat/conditional params (worked) and didn't need map-over.

## Review pass (subagent, live-verified) — corrections applied

A review subagent verified every quantitative claim against the live Galaxy data (peak counts, gene lists, promoter-window logic, dedup), checked MACS2 params, and fact-checked the biology. Verdict: clears the issue #13 MVP bar; all six peak counts, all three promoter-bound gene lists, the strand-aware window logic, and the distance bins matched the data exactly. Fixes applied to the notebook (rev `5114a2a207b7caff`):

- **Biology framing (the important one):** G1E is a **GATA1-null** erythroid line, not an "erythroid progenitor." The earlier "Gata1 (master erythroid TF) bound only in G1E" implied GATA1 is active in G1E — it is not. Reframed to "TAL1 occupies the *Gata1* locus only in G1E," with an explicit note that this is differential TAL1 *binding at the Gata1 gene*, not GATA1 activity. The lineage-contrast headline survives (it rests on differential binding).
- **Stale medians:** notebook said median dist-to-TSS 12/15/24 kb (computed over tie-inflated `closest` lines); corrected to **14/15.5/20 kb** (deduped per peak; reconfirmed live).
- **Intersect-count asymmetry:** `common`=39 is the G1E-side count (reciprocal is 40 mega-side); added a footnote so 39+222=261 and 40+110=150 both reconcile.
- **Genes in both lists:** `Pdcd4`/`Fli1` appear promoter-bound *and* distal (separate peaks at one gene) — clarified.
- Minor: `Cbfa2t3` described as ETO2/MTG16 corepressor of the TAL1 complex.

Completeness gaps the review flagged (beyond the open list below): the issue's **bar chart of candidate counts by class** and a consolidated **peak-set summary table** (peaks / promoter-overlapping / nearest-assigned per set) aren't present — minor, would strengthen paper-worthiness.

## Still-open gaps vs issue #13

- **Expression stretch not done** — no RNA-seq cross-reference (the issue's stretch; needs verified GSE51338 processed tables).
- **No JBrowse** locus view (Gata1 vs Fli1).
- **Distance-to-TSS "distribution"** rendered as a binned count-heatmap (no histogram tool installed).
- **Workflow not extracted** — pipeline is linear/clean but not yet run through PR #22860 extraction; note the G1E (R1) vs mega (pooled) asymmetry would need harmonizing for a single clean workflow.

## Extractability — original NOT extractable; **extractable rebuild done** (`a912e9e5d84530d4`)

A full extractable rebuild was done in a fresh history **`TAL1 peaks to candidate genes (extractable)` (`a912e9e5d84530d4`)**, notebook **`72ad249754f05d26`**. It reproduces the original science *exactly* (G1E 261 / mega 150 peaks; common 39 / G1E-only 222 / mega-only 110; same promoter-bound genes incl. Gata1 G1E-only, Fli1 mega-only) but as a clean tool/collection DAG:
- **6 FASTQ fetched into ONE list collection** (`TAL1 ChIP reads`, `cbbbf59e8f08c98c`) → **one map-over Bowtie2** step → BAM collection (`964b37715ec9bd22`). Replaces the original's 6 independent uploads + 6 alignment jobs.
- MACS2 ×2 (G1E; mega R1+R2 pooled) pulling treatment/control BAMs from the collection.
- bedtools intersect (classes + promoter overlap), awk promoters/TSS, SortBED, closest — all tools.
- **Candidate gene lists via the `Group` tool** (group by gene column), not bash — so the gene set is a reproducible dataset (`b489799d…`/`981bfb3a…`/`cc428750…`).
- Op note: Docker has only 7.75 GB, so 4-wide Bowtie2 (3.4 GB index each) would OOM — set the local runner to **`workers: 2`** in `config/galaxy.yml` (left at 2; safer for heavy emulated jobs).
- **Distance-to-TSS figure now also extractable.** Installed `iuc/datamash_ops` and rebuilt the figure entirely with tools: `bedtools closest` (ties=first) → `awk` bins → `Datamash` count-per-bin (×3 classes) → `Multi-Join` on the bin column (filler 0) → `cat` a header-label row → `ggplot2_heatmap2` (PNG `cb1423dc5924128e`). Counts identical to the original (common 4/11/22/2, G1E-only 18/66/97/41, mega-only 5/30/45/30). Only non-tool input is a tiny header-label constant. So the **figure tail extracts cleanly** — but see the extraction-test section below: the alignment→MACS2 seam does NOT wire (element-addressing), so the workflow isn't fully runnable until the `Extract Dataset` bridge is added.

This history is the one to run extraction against. The original `f30a35c999095ed7` remains as the first-pass reference. Original redo instructions retained below for reference.

## Extraction test — run 2026-06-13 (feature WORKS; map-then-reduce-by-element seam breaks)

Booted local Galaxy and ran extraction against `a912e9e5d84530d4` **both ways** — the worktree first had only PR #22706 (history-based extraction); jmchilton then merged `extract_next`/#22860 mid-session, so the page-based flow was re-tested properly.

### Run B (the real feature) — page-based `extract_next`/#22860

`GET /api/pages/72ad249754f05d26/workflow_extraction_summary` → `POST /api/workflows/extract {…, from_page_id}`. Workflow `f597429621d6eb2b`, `.ga` at `/tmp/uc2_page_workflow.ga`.

**What works (the headline — the feature is sound):**
- **Smart subgraph seeding.** The page summary seeds only the subgraph behind the notebook's displayed outputs (31/36 rows) and pre-exposes exactly the 3 outputs the notebook shows (2 Group gene-lists + the heatmap figure) — not the whole history. 0 summary warnings.
- **Workflow outputs set from the notebook.** The extracted workflow has the 3 displayed outputs marked as workflow outputs with labels.
- **Report rewrite is flawless.** The notebook markdown became the workflow `report` (4126 chars): all 3 display directives rewritten to workflow-relative `output="…"` labels, **zero leftover instance ids**, **0 report_warnings**. The analysis story travels into the workflow correctly. (`/tmp/uc2_report.md`.)

**Two real defects this history exposes — both rooted in *map-over then reduce-by-named-element*:**

**(A) Seeding bug — the map's input collection is dropped when its output is consumed as loose elements. → FIXED.** In `lib/galaxy/managers/workflow_extraction_summary.py::_backward_job_closure`, map-input recovery (reading `implicit_input_collections` and enqueuing the input collection) fired **only when the queue item was the output HDCA**. But MACS2 consumed individual BAM *elements* (`src=hda`, e.g. G1E_Tal1 BAM hid 10 `3ee1d7c9a966c95c`). Walking back from a loose element, the code seeded the Bowtie2 ICJ but never enqueued the reads collection. **Net effect:** the reads collection (hid 1) was **not seeded** (`hdca_ids: 0`), so Bowtie2 extracted **dangling**, and a spurious hidden fastq element (`G1E_Tal1` hid 3) was surfaced as a loose input.
  - _Fix applied:_ factored the recovery into `_enqueue_mapped_input_collections(output_hdca, queue)` and now also call it in the job loop when `icj_assoc is not None` — iterating the ICJ's `output_dataset_collection_instances` to recover their `implicit_input_collections`. So a map reached via a loose element seeds its input collection just like one reached via the output HDCA.
  - _Tests:_ new red→green unit test `test_loose_element_of_map_output_seeds_input_collection` (verified failing without the fix); `MockIcjAssoc`/`MockJob` extended to model the real `implicit_collection_jobs` relationship. Full unit suite green (`test_workflow_extraction_summary.py` 16/16, `test_extract_report.py` + `test_markdown_export.py` 58/58).
  - _Confirmed end-to-end:_ after the fix, the page summary seeds `TAL1 ChIP reads` (collection) and the spurious `G1E_Tal1` input is gone; re-extracted workflow `1cd8e2f6b131e891` has **Bowtie2 wired to the collection input** and only the 2 MACS2 steps dangling (= issue B alone). _Still recommended before any PR:_ run the API tests `TestNotebookWorkflowExtractionSummary` (live-server, left to CI).

**(A2) Sibling elements of a shared fetch job silently dropped → resolved as a side effect of A.** The `seen_jobs` guard meant all 6 fastq elements sharing one `__DATA_FETCH__` job → only 1 of 6 surfaced as a boundary input. Now moot: with A fixed, the per-element fastqs are skipped (their input name matches the recovered `mapped_input_names`) and the collection is seeded instead, so no loose element surfaces at all. (The underlying `seen_jobs`-drops-siblings behavior remains latent for any non-map "one upload, N siblings" shape, but no longer affects this pipeline.)

**(B) Fundamental topology limit — "pick named element out of a collection → single-dataset input" has no workflow-connection representation.** MACS2 reads specific BAM elements (treatment vs control, pooled replicates) out of the alignment collection. Even with A fixed (collection seeded), the two MACS2 steps come out **disconnected** (`input_treatment_file: null`), because a collection→single-dataset element edge can't be a workflow connection. Confirmed independently in **Run A** (classic full-history extract, workflow `f2db41e1fa331b3e`, `/tmp/uc2_workflow.ga`): there the collection *was* seeded and Bowtie2 wired, but MACS2 still dangled — isolating B from A. Not a bug; a real limit.

### Net verdict & fix

**The extraction feature itself is solid** — summary, subgraph seeding, output exposure, and the notebook→report rewrite all work cleanly at this scale. What `a912e9e5d84530d4` exposed in a **map-over-then-reduce-by-element** pipeline was one real seeding bug (A/A2 — **now fixed**, Bowtie2 wires) and one inherent topology limit (B — the MACS2 element-addressing seam, history-side fix only). So the earlier "the whole UC2 now extracts" claim was over-stated — the *figure tail* extracts and (post-fix) the *alignment map* extracts, but the *map→MACS2 reduce-by-element seam* still needs the `Extract Dataset` bridge below.

### Redo recipe for B — structure the reads so MACS2 reduces/maps instead of element-addressing

The decisive tool fact: **MACS2 callpeak's treatment and control pooling inputs are `multiple="true"` data params** (not `<repeat>`) — `iuc/macs2 .../macs2_callpeak.xml`, `treatment` conditional "Are you pooling?" → `input_treatment_file multiple="true"`, same for `control|c_multiple`. `multiple="true"` data inputs participate in collection **reduction + map-over** (`LIST_REDUCTION` / `NESTED_LIST_REDUCTION`). So the pooling we needed isn't an obstacle — it's what a `list:list` reduces into.

**Build the reads as two `list:list` inputs (outer = condition, inner = replicate):**
```
treatment_reads : list:list  { G1E:{r1:G1E_Tal1},  mega:{r1:Mega_Tal1_R1, r2:Mega_Tal1_R2} }
control_reads   : list:list  { G1E:{r1:G1E_input}, mega:{r1:Mega_input_R1, r2:Mega_input_R2} }

Bowtie2  map-over each            → treatment_bams / control_bams (list:list, structure preserved)  [NESTED_LIST_MAPPING]
MACS2    map treatment_bams over treatment(multiple) + control_bams over control(multiple),
         linked on the outer (condition) key                                           [NESTED_LIST_REDUCTION ×2, linked]
   → peaks : list { G1E:…narrowPeak, mega:…narrowPeak }
```
Inner list **reduces** (pools replicates — handles the G1E-1-rep vs mega-2-reps asymmetry for free, since `multiple="true"` takes 1+); outer list **maps** (one MACS2 job per condition); treatment/control **link** on the shared outer key → matched inputs. One Bowtie2 step per input, **one MACS2 step, zero element-addressing** — extracts clean, and a new user just supplies their own two `list:list` (condition→replicates). Strictly better than the `Extract Dataset` bridge, which hard-codes `element="G1E_Tal1"` and only works for these sample names.

_One assumption to verify before banking on it:_ that Galaxy maps **two** `list:list` over MACS2's two `multiple="true"` inputs simultaneously, linked on the outer key. Compositionally supported by the semantics rules but not pinned by a specific test — worth a one-off live prototype (build the two collections, map-align, run MACS2 once).

**Why not sample sheets** (the semantically perfect model — the sample-sheet backend doc literally motivates it with ChIP-seq `condition`/`replicate`/`control_sample`): (1) it's an **authored input**, not a derivable shape — `column_definitions` live on the workflow input parameter and are user-filled at run time; extraction emits plain `data_collection_input` steps and has no path to reconstruct the schema. (2) **No tools consume the metadata yet** — bowtie2/MACS2 see a sample sheet as a list; routing treatment/control *from* the columns needs a "split/route by sample-sheet column" tool that the doc's own Limitations list as future work. So sample_sheet = best hand-authored input, not an extraction target. The nested `list:list` encodes the same grouping **structurally** and needs no metadata-aware tools — which is why it extracts. (`paired_or_unpaired` doesn't fit at all: treatment/control ≠ forward/reverse, and it caps at 2 elements.)

### The residual — and why UC2 is a stress-test, not a showcase, for *single-notebook* extraction

The `list:list` restructure dissolves the **MACS2** addressing, but **not** the downstream **G1E-vs-mega comparison** (common / G1E-only / mega-only). That's an inherent **2-way set comparison of two named conditions** — picking two specific elements out of the `peaks` list, the same addressing problem in a new spot. The *ideal* engineering answer is to split into two workflows (a map-over peak-**caller** + a 2-data-input pairwise **comparator**), but **we're demoing notebook→one-workflow extraction**, so a split defeats the point. Within the one-notebook constraint, the comparison tail still needs 2 condition-pinned `Extract Dataset` steps (`element="G1E_Tal1"` etc. — workflow-compatible, so it *runs*, just not reusably).

**Honest verdict:** a *differential two-condition* analysis is **not the cleanest showcase** for "notebook → one reusable workflow." Its irreducible 2-way comparison means the best single-notebook outcome is a runnable-but-condition-pinned workflow. It is, however, a genuinely **good robustness test** — it found and drove a real seeding-bug fix (A). For a pristine happy-path demo, prefer a **naturally map-over** analysis with no cross-sample comparison (per-sample/per-isolate — closer to UC1's shape); save UC2 as the "extraction survives a realistic messy pipeline" story. (Fixing A/A2 was a code change to #22860's seeding walk — committed `7e1d6d730f`. The `list:list` rebuild and the prototype are not yet done; documented here as the next-run recipe.)

### Original redo instructions (now executed above)

Job-graph scan: **0 collections**; the 6 FASTQ were uploaded individually → 6 separate `bowtie2` jobs (no map-over), the volcano-style figure used a Python-computed pasted matrix, and the candidate-gene lists were produced in bash (`awk`/`sort -u`), not as Galaxy datasets. So PR #22860 extraction would yield a sprawling fixed-sample DAG (6 named FASTQ inputs, parallel hardcoded alignments) plus dead-ends where external computation was injected — not a reusable workflow.

**To redo so it extracts cleanly:**

1. **Upload reads into a collection, not individually.** Build a list (or list:paired) collection of the FASTQ samples (e.g. one collection of TAL1 ChIP samples + one of matched inputs, with element identifiers = sample names). Use the dataset-collection builder, *not* N separate `upload_file_from_url` calls. Via API: `POST /api/histories/{id}/contents` with `type=dataset_collection`.
2. **Map Bowtie2 over the collection** (`{"library|input_1": {"batch": true, "values": [{"src":"hdca","id":...}]}}`) → one BAM collection, one workflow step instead of six branches.
3. **MACS2 with matched treatment/control.** Either call MACS2 per condition (TAL1 BAM vs input BAM) as explicit steps, or pair via collections; keep the pooled-replicate handling as a single MACS2 step (it already pools — that part is fine). Avoid the one-off R1-only run.
4. **Do every downstream transform as a Galaxy tool** (these already are, keep them): `bedtools intersect` for common/G1E-only/mega-only, `tp_awk` for promoter/TSS, `bedtools closest` for nearest-gene.
5. **Produce the candidate-gene list as a dataset, not in bash.** After the promoter ∩ peaks intersect, extract + dedupe gene symbols with `text_processing` (`Cut` column 4 → `Sort` → `Unique`), so the gene list is a workflow output, not a terminal `awk` in the shell.
6. **Build the figure's count matrix with Galaxy tools** (datamash/awk on the `closest` output), not Python → pasted, so the figure step is reproducible.

The interpretive bedtools half is already tool-based and would survive extraction; the alignment front-end and the figure/gene-list tails are what break it.

## CLEAN REBUILD — 2026-06-13 (list:list MACS2 validated; full extractable workflow with one pinned seam)

Rebuilt from scratch in a clean history with the `list:list` restructure from the redo recipe above. **The prototype assumption is now confirmed live, and the whole analysis extracts into a complete runnable workflow** — better than the earlier "stress-test, not showcase" verdict: the MACS2 seam fully dissolves, and even the 2-way comparison extracts (condition-pinned).

Artifacts:
- History `TAL1 peaks to candidate genes (clean, extractable)` — `96d9e11f37f34b29`
- Notebook page `42a2c611109e5ed3`
- Extracted workflow `5969b1f7201f12ae` (`/tmp/uc2_workflow.ga`)
- treatment_reads `90240358ebde1489` / control_reads `86cf1d3beeec9f1c` (both `list:list` {G1E:{r1}, mega:{r1,r2}})
- peaks list `846fb0a2a64137c0` (G1E 261, mega 150); figure PNG `3e28f7bb496103da`

**The decisive prototype — MACS2 maps two `list:list` (the assumption the recipe flagged "verify before banking").** Confirmed the encoding:
- Naive `{"batch":true,"values":[{"src":"hdca","id":X}]}` on a `multiple="true"` input maps over **all leaves** (3 jobs, replicates NOT pooled). Wrong.
- **`{"batch":true,"values":[{"src":"hdca","id":X,"map_over_type":"list"}]}`** splits the `list:list` into inner-`list` subcollections → **outer-map (condition) + inner-reduce (pool replicates)**. Exactly 2 MACS2 jobs (G1E single; mega pools R1+R2 — 2 treatment + 2 control BAMs), output a `list` of 2 condition narrowPeaks. The two `list:list` link automatically on the outer key. (`map_over_type` is read in `lib/galaxy/tools/parameters/meta.py`.)

Science reproduced **exactly** from the clean tool graph: G1E **261** / mega **150** peaks; common **39** / G1E-only **222** / mega-only **110**; promoter-bound `Group` gene lists = Cbfa2t3/Pf4 (common), **Gata1**+11 (G1E-only), **Fli1**/**Tal1**/Dock8/Lgi1 (mega-only); figure bin counts common 4/11/22/2, G1E-only 18/66/97/41, mega-only 5/30/45/30 (note: figure closest uses **ties=first**, one row per peak — `ties=all` tie-inflates and was caught/fixed mid-build).

**Extraction — fully runnable workflow, one pinned seam, plus a real seeding-walk gap.** Page summary: 31 seeded, 4 ICJ (2 Bowtie2 + 1 MACS2 — the two MACS2 summary rows share one ICJ, so dedupe `implicit_collection_jobs_ids` before POSTing `/api/workflows/extract`). The extracted `.ga` (with the fix below): **34 steps, every tool step has inputs, 0 dangling, 3 workflow outputs, report 0 leftover ids.** MACS2 wires to both Bowtie2 BAM collections — the `list:list` step survives extraction as a single mapped step.
- **The seam: the G1E-vs-mega comparison uses `__EXTRACT_DATASET__` (element=G1E / element=mega) → bedtools intersect.** Confirmed it extracts as condition-pinned `Extract dataset` steps that *run*, so the workflow is complete and runnable — just not sample-agnostic at that seam (the irreducible 2-way comparison, as predicted).
- **Seeding gap — FOUND, ROOT-CAUSED, and FIXED.** The page-extraction summary originally did **not** surface `__EXTRACT_DATASET__` jobs, so the auto-built payload (= what a UI "extract" sends) omitted them and the comparison intersects came out **input-less (dangling)**. Root cause (DB-confirmed): the Extract Dataset output HDA has **both** `copied_from_history_dataset_association` (→ the MACS2 peaks element) **and** its own creating job (`__EXTRACT_DATASET__`); `galaxy.workflow.extract._original_hda` unconditionally walked `copied_from`, so both `summarize` and the closure normalized the extracted dataset back to the MACS2 element and dropped the Extract Dataset step entirely (the summary even showed `G1E`/`mega` as MACS2 outputs). **Fix (`lib/galaxy/workflow/extract.py`):** `_original_hda`/`_original_hdca` now stop walking `copied_from` when the content has its own `creating_job_associations` — a passive copy (drag-drop) has none and still normalizes; a collection-operation output (Extract Dataset, Filter, Relabel, Flatten, …) has one and is kept as a real step. Generalizes to **every `DatabaseOperationTool`**. Tests added (`test_extract_report.py::test_index_does_not_normalize_collection_operation_output`, stub extended); 34 extraction unit tests pass. **Verified live:** post-fix the page summary surfaces 2 seeded `Extract dataset` rows (no Bowtie2 duplication), and the **auto-built** extraction yields a complete 34-step workflow with the Extract Dataset bridge connected and **zero dangling** — a UI extract now works.

**Net:** UC2 is no longer just a "robustness test" — with `list:list` it's a genuinely extractable differential-ChIP workflow whose *only* non-reusable point is the inherent 2-condition comparison (condition-pinned, but runnable). The clean uploads (2 `list:list` from Zenodo), all-tool graph (no bash, no pasted matrix), and exact science reproduction hold.

### Two-workflow split — VERIFIED reusable (2026-06-14)

To make the differential analysis fully sample-agnostic (vs the single condition-pinned workflow), it extracts cleanly as **two** workflows via `extract_by_ids`:
- **WF1 peak caller** `3f5830403180d620`: 5 steps — two `list:list` reads inputs → Bowtie2 ×2 (map-over) → MACS2 (one mapped step) → condition peaks list. Fully map-over reusable (supply your own condition→replicate reads).
- **WF2 differential comparator** `e85a3be143d5905b`: 29 steps — 4 inputs (G1E peaks, mega peaks, RefSeq, header) → 3-way `bedtools intersect` (common/only/only) → promoters/TSS → Group gene lists + closest→datamash→heatmap figure → 3 outputs (2 gene lists + figure). All tools connected, edges resolve, **no condition-name pinning** (the two peak sets are plain data inputs — feed any A-vs-B).

Both verified: all tool steps connected, all edges resolve. Chaining WF1→WF2 still requires picking the two condition elements out of WF1's peaks list (the irreducible 2-way comparison), but each workflow is individually fully reusable. This is the clean answer to "differential A-vs-B doesn't fit one reusable notebook→workflow": split the map-over caller from the pairwise comparator.

## Suggested next moves

JBrowse locus view, the RNA-seq expression stretch, or move on. UC2 now extracts **either** as one complete condition-pinned workflow (post `_original_hda` fix) **or** as two fully-reusable workflows (caller + comparator).

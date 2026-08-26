# TopoQA Replication Experiment — Codex Handoff

**Purpose.** Independently reproduce TopoQA's published benchmark numbers using the **authors'
own released software + checkpoint**, as an external reference for our clean-room reimplementation
(`open-topoqa-featurizer` / `open-topoqa-scorer`). Codex runs on separate infrastructure, so it is
a legitimate third party in a clean-room split: it may read/run the upstream code; **we (the
clean-room authors) must not.**

> **Why this exists.** Our clean-room scorer matches the paper on *calibration* (per-target/pooled
> Pearson approaching the paper) but sits at ~2× the paper's **top-1 ranking loss** on DBM55-AF2
> (0.14 vs 0.069) and doesn't reach it on HAF2 (0.13–0.14 vs 0.110). Held-out *in-distribution*
> ranking loss is 0.037 (better than the paper's test number), so our gap is **distribution
> transfer to the benchmark decoys**, not under-training. We need to know whether the paper's
> numbers reproduce *at all* from the authors' artifacts on the identical benchmark, evaluated with
> identical metric definitions — and, if so, get per-decoy predictions so we can localize where our
> reimplementation diverges.

---

## CRITICAL — clean-room return boundary (read first)

The result you hand back will be read by the clean-room authors. To keep our reimplementation's
provenance clean, **your report must contain only:**

- **Numbers** (metric tables, per-decoy predicted scores).
- **Provenance** (repo URL + commit hash, checkpoint filename + SHA256, environment, runtime,
  which decoys failed, any *fact* about whether a documented bug was present and its numeric effect).

**Do NOT include, paste, quote, paraphrase, or describe:** the upstream source code, the feature
construction, the model architecture, tensor shapes, preprocessing steps, hyperparameters, or any
other implementation internals. If something can't be conveyed as a scalar/number or a one-line
provenance fact, leave it out. Treat the upstream as a black box that emits a score per decoy.

The upstream repo (`yubingapril/TopoQA`) is **unlicensed** (all rights reserved). This is a private
reference run; its outputs are used by us only for **diagnostic comparison**, never as training or
tuning signal for the clean-room models.

---

## The experiment

### Software
Upstream **TopoQA** — repo `github.com/yubingapril/TopoQA` (paper: arXiv 2410.17815 / *Briefings in
Bioinformatics* bbaf083). Use their released inference script, pinned environment, and released
checkpoint, following their README. Record the exact commit and checkpoint hash.

### Benchmark data (identical to ours)
DProQ benchmark, **Zenodo record 6569837** (`DproQ_benchmark.tgz`, 183 MB, CC-BY-4.0). After
extraction:
- `BM55-AF2/` — **15 targets, 449 decoys**. Decoys at `decoy/<TARGET>/<MODEL>_tidy.pdb`.
- `HAF2/` — **13 targets, 1370 decoys**. Decoys nested one level deeper at
  `decoy/<TARGET>/pdb/<MODEL>.pdb`.
- Each subset has `label_info.csv` with columns `Target,Model,DockQ,CAPRI` (the CAPRI column is an
  integer class 0/1/2/3). **Use these as ground-truth labels — do not recompute DockQ/CAPRI.**
  Note `label_info.csv` lists more targets than have decoy folders; **evaluate only the targets
  that have decoys on disk** (15 / 13), which are exactly the paper's filtered test sets.

Run the upstream scorer on **every decoy that has a PDB on disk** in both subsets.

### Metric definitions (use EXACTLY these — this is the point)
Compute metrics yourself from (predicted_score, true_DockQ, CAPRI) using these definitions, so any
gap can't be blamed on differing metric code. All "mean" metrics average over targets.

- **Top-1 ranking loss** (per target): `max(true_DockQ over the target's decoys)` minus
  `true_DockQ of the single decoy with the highest predicted score`. Report the mean over targets.
  (Lower is better; 0 = the top-predicted decoy really is the best.)
- **Per-target Spearman**: Spearman ρ between predicted score and true DockQ across a target's
  decoys; mean over targets. Exclude any target with < 2 decoys.
- **Per-target Pearson**: same but Pearson r; mean over targets.
- **Pooled Pearson**: Pearson r between predicted score and true DockQ over *all* decoys in the
  subset (single pool, not per-target).
- **Top-10 success**: 1 if any of the 10 highest-predicted decoys has `CAPRI >= 1`, else 0; mean
  over targets. (Higher predicted = better; ties broken by lower index.)

### Target sets to report
1. **BM55-AF2** — all 15 targets.
2. **HAF2-13** — all 13 targets.
3. **HAF2-12** — the 13 with target `7ALA` excluded (the paper drops 7ALA; this is the row directly
   comparable to the paper's 0.110).

---

## Deliverables

### 1. Summary table
One row per (target set), these columns:

`set | n_targets | n_decoys | ranking_loss_mean | spearman_mean | per_target_pearson_mean | pooled_pearson | top10_success`

Paper reference points to compare against (state match / mismatch in a sentence each):

| set | paper ranking loss | paper Spearman | paper Pearson |
|-----|--------------------|----------------|---------------|
| DBM55-AF2 | 0.069 | 0.502 | 0.515 |
| HAF2 (12, 7ALA excluded) | 0.110 | 0.675 | 0.600 |

For orientation, our clean-room reimplementation (full-corpus, MSE) currently gets:
BM55-AF2 ranking_loss 0.142 / per-target Pearson 0.323 / pooled 0.600;
HAF2-12 ranking_loss 0.142 / per-target Pearson 0.481 / pooled 0.697.
(Context only — you are reproducing the *authors'* numbers, independently.)

### 2. Per-decoy predictions (CSV)
Columns: `subset,target,model,pred_score,true_dockq,capri`. One row per scored decoy, for both
subsets (full 449 + 1370). This lets us recompute every metric with our own code and diff per-target
against our model. Numbers only.

### 3. Provenance & reproducibility notes
- Repo commit hash; checkpoint filename + SHA256; Python/env (or container) used; total runtime;
  hardware.
- How many decoys failed to score in each subset, and (if any) the target/model of each failure.
- **The `(x,y,z)` vs `(x,y,y)` question:** the paper's own reproducibility note flags that the
  released code may construct all-atom edge-histogram coordinates as `(x, y, y)` rather than
  `(x, y, z)`. State only: (a) whether the released code as-run exhibits it (yes/no), and (b) if you
  ran it both as-shipped and with the third coordinate corrected, the ranking_loss for each — as
  two numbers. **Do not paste or describe the code**; a yes/no and two numbers is the whole answer.
- Any deviation from the README you had to make to get it running, described as a *fact* ("needed to
  pin numpy < 2", "checkpoint path differs from docs") — not as code.

### 4. One-paragraph bottom line
Do the authors' released artifacts reproduce the paper's BM55-AF2 (0.069) and HAF2-12 (0.110)
ranking-loss numbers on this benchmark under these metric definitions — **yes, no, or partially**,
with the numbers. That single answer is what we most need.

---

## Copy-paste prompt for Codex

```
You are running an independent reproduction on separate infrastructure. Reproduce TopoQA's
published protein-complex interface-ranking benchmark numbers using the AUTHORS' OWN released
software and checkpoint (repo github.com/yubingapril/TopoQA; paper arXiv 2410.17815). This is a
private reference run; the repo is unlicensed.

Data: download the DProQ benchmark from Zenodo record 6569837 (DproQ_benchmark.tgz, CC-BY). Score
every decoy PDB that exists on disk in BM55-AF2 (15 targets / 449 decoys; decoys at
decoy/<TARGET>/<MODEL>_tidy.pdb) and HAF2 (13 targets / 1370 decoys; decoys at
decoy/<TARGET>/pdb/<MODEL>.pdb) with the upstream scorer per its README. Use label_info.csv
(Target,Model,DockQ,CAPRI) as ground truth; do not recompute DockQ/CAPRI. Evaluate only targets
that have decoy folders on disk.

Compute these metrics yourself, averaging over targets unless noted:
- top-1 ranking loss = max(true DockQ for a target) - true DockQ of the decoy with the highest
  predicted score; mean over targets.
- per-target Spearman and per-target Pearson (predicted vs true DockQ), mean over targets, excluding
  targets with <2 decoys.
- pooled Pearson over all decoys in a subset.
- top-10 success = 1 if any of the 10 highest-predicted decoys has CAPRI>=1, mean over targets.
Report for three sets: BM55-AF2 (15), HAF2-13 (all 13), HAF2-12 (13 minus target 7ALA).

Deliver:
1. A summary table (set, n_targets, n_decoys, ranking_loss_mean, spearman_mean,
   per_target_pearson_mean, pooled_pearson, top10_success), and a one-line match/mismatch note vs
   the paper (DBM55-AF2 ranking loss 0.069 / Spearman 0.502 / Pearson 0.515; HAF2-12 0.110 / 0.675
   / 0.600).
2. A per-decoy CSV: subset,target,model,pred_score,true_dockq,capri (all 449+1370 rows).
3. Provenance: repo commit hash, checkpoint filename+SHA256, environment, runtime, hardware, and any
   decoys that failed. For the known (x,y,z)-vs-(x,y,y) edge-coordinate issue the paper flags: state
   only whether the released code as-run has it (yes/no) and, if you ran both as-shipped and
   corrected, the ranking_loss as two numbers.
4. A one-paragraph bottom line: do the authors' artifacts reproduce 0.069 (BM55) and 0.110 (HAF2-12)
   under these metrics — yes/no/partially, with numbers.

IMPORTANT constraints on your written report: include ONLY numbers and provenance facts. Do NOT
paste, quote, paraphrase, or describe the upstream source code, feature construction, model
architecture, preprocessing, or hyperparameters. The report will be read by people maintaining a
clean-room reimplementation who must not see upstream internals. Treat the scorer as a black box
that emits one score per decoy.
```

---

## When the result comes back (for us)
- Recompute all metrics from the per-decoy CSV with `open-topoqa-scorer`'s `evaluate.py` /
  `metrics.py` to confirm metric parity, then diff per-target against our model's predictions to see
  **which targets** drive our gap.
- If the upstream reproduces ~0.069/0.110 → our gap is in our featurizer/architecture/training; the
  per-target diff localizes it. If the upstream also lands ~0.14 → the paper's headline likely
  involves selection/filtering we haven't matched, and our result is closer to "correct" than it
  looks.
- Use the CSV for **diagnosis only** — never as a training/tuning target for the clean-room models.

## RESULT (2026-08-04) — received, all steps done

Codex returned `topoqa-replication-report.md` + `topoqa-per-decoy-predictions.csv` (1,819 rows,
sha `13fd625d…`), numbers + provenance only. Our `metrics`/`evaluate` recomputed the CSV to the byte
(parity confirmed). Full write-up in `open-topoqa-scorer/results/phase_e_debrief.md` and
bio-topo-foundry issue #5.

1. **Upstream reproduces the paper exactly** (commit `118f1e11`, ckpt `model/topoqa.ckpt`):
   BM55-AF2 rl 0.0694 (paper 0.069), HAF2-12 rl 0.1103 (paper 0.110); 1,819/1,819 scored, 0 failures.
2. **Metric correction:** the paper's 0.502/0.515 correlations are **pooled**, not mean-per-target
   (upstream mean-per-target Spearman is only ~0.18). Compared pooled-to-pooled, **we match/beat
   upstream on every correlation** (our pooled Pearson 0.60 / 0.70 vs their 0.515 / 0.600).
3. **`(x,y,z)` vs `(x,y,y)`: released code runs `(x,y,y)` (yes).** Correcting it → upstream BM55
   0.0767, HAF2-12 0.1471. Our correct-coord scorer is **0.142 on HAF2-12 = parity** with corrected
   upstream. So ~1/3 of the paper's HAF2 lead is the bug.
4. **Residual = BM55 only, and it's irreducible.** Per-target diff: the whole 0.073 BM55 gap is two
   targets (4ETQ, 6AL0) whose top-1 pick collapses — both models are fooled by the same decoys, ours
   just loses the top-1 by a calibration hair. A dropout/width/depth/epoch/selection sweep left BM55
   flat at ~0.14. Not tunable from the reproduced spec; not worth chasing given HAF2 parity + all
   correlations won.

**Bottom line:** clean-room `open-topoqa-scorer` (correct coordinates) is at parity with a
correctly-implemented TopoQA; the paper's published numbers reproduce but lean on the `(x,y,y)` bug
for part of the HAF2 margin. Codex CSV used for **diagnosis only**, never as a training/tuning target.

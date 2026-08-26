# Issue draft — Protein flexibility: replicate, harden, extend across ProDy, CAL, and WHL

**Repo:** `jmchilton/bio-topo-foundry`
**Status:** filed as [jmchilton/bio-topo-foundry#84](https://github.com/jmchilton/bio-topo-foundry/issues/84), revised 2026-08-17 after review.
**Depends on:** [jmchilton/bio-topo-foundry#83](https://github.com/jmchilton/bio-topo-foundry/issues/83).
That issue creates the Protein Flexibility page, which is where every result below is recorded.
Land it first; this issue's findings have no home until it exists.

---

> 🤖 Posted by Claude (AI assistant) on @jmchilton's behalf — not authored by them personally.

## Summary

Run one `replicate → harden → extend` arc across three per-residue B-factor predictors that share
an input and a target — **ProDy/GNM**, **CAL**, and a clean-room **WHL** — on the released
346-protein corpus, through locked biopixi environments, ending in a controlled feature ablation,
a three-way comparison, and a `predict-residue-flexibility` mold whose limited likely practical
value is stated explicitly.

**Frame it as methodology, not as a contribution to protein science.** The finding is benchmark
hygiene: two protocols sharing one name, pooled-versus-per-target correlations, unlabelled
consensus columns, and margins reported without dispersion. Working practitioners have largely
moved off crystallographic B-factor prediction, and the notes must say so rather than let the
corpus assert a relevance it does not have.

Arising from [#63](https://github.com/jmchilton/bio-topo-foundry/issues/63) and the
[weighted-hodge-laplacians](https://github.com/jmchilton/bio-topo-foundry/pull/76) note.

## Are the three actually comparable?

Yes, with two traps that would silently invalidate the comparison — and one has already produced
numbers in this literature that look comparable and are not.

### Trap 1 — two tasks share the name "B-factor prediction"

- **Least-squares approximation** — per protein, fit to that protein's own B-factors. Source of
  GNM 0.565, pfFRI 0.626, ASPH 0.65, opFRI 0.673, EH 0.698, mDG 0.715 on Set-364 (mDGL's README).
- **Blind prediction** — train across proteins, test on held-out proteins. Source of mDGL 0.407,
  CAL 0.456, WHL 0.480.

Same methods, same dataset membership, ~0.25 apart. Anyone lining up "GNM 0.565" against "WHL
0.480" concludes the 1997 model wins. Blind protein-level prediction is the primary comparative
protocol here; least-squares approximation may appear only as a separately labelled diagnostic.

**The property that makes ProDy the right anchor:** per-protein Pearson correlation is invariant
under positive affine rescaling, and classical GNM's entire fit is one scale plus offset per
protein. Its per-protein PCC therefore needs no fitted scale or offset, consumes no training data,
and structurally cannot leak. That is exactly what the multiscale variants give up: the founding
paper's
`B_i = Σ_{r=2..12} w_r B_i^r + w_0` fits eleven weights per protein, and PCC very much responds,
which is the in-sample criticism already recorded in [[persistent-spectral-graph]].

### Trap 2 — per-protein mean vs pooled correlation

0.48 and 0.86 are the same model. This has bitten us before: the TopoQA work turned up pooled
rather than per-target correlations. Fix one definition in the harness and make the other
impossible to report by accident.

### Where inputs and outputs do align

All three are Cα-only, one scalar per residue. Per-protein PCC is invariant to per-protein
normalization (`B = (B−μ)/σ`), so that choice does not bite for the primary metric. It does change
pooled PCC and RMSE, so both secondary metrics must state whether and where normalization occurred.

The real hazard is **residue indexing**: missing residues, altlocs, multiple chains, zero
occupancy. That is what the exclusion lists exist for. The faithful track retains each released
parser and records the residue set it actually scored. The harmonized track feeds all three models
from one shared parser and residue map. Using only the shared parser would make a clean comparison
while quietly giving up the attempt to reproduce the released procedures.

### The confound to control

CAL's and WHL's headline numbers include 12 PDB/STRIDE features (R-value, resolution, heavy-atom
count; three packing densities, residue type, occupancy, secondary structure, φ/ψ, solvent-
accessible area). ProDy has no equivalent. The clean three-way is **descriptors-only**, with
consensus variants as a separately labelled row — precisely the labelling failure the WHL note
criticises, so we must not reproduce it.

That comparison is necessary and not sufficient. The WHL weight is itself an FRI-style local
packing signal, so ProDy versus CAL versus WHL still cannot answer what the Laplacian contributes.
The extension must include a matched **weight/FRI-only** control, passed through the same regressor,
split, and metric as the non-zero WHL spectrum. This is the load-bearing ablation surfaced by
[[weighted-hodge-laplacians]].

## What is already verified

Checked against the artifacts, not the papers:

- The corpus membership is **exactly** shared. `ZHHMCI/CAL:data/list-superset.txt` and
  `fenghon1/MDG_bfactor:datasets/list-blind-prediction.txt` are **byte-identical, 346 entries**.
  They are lists, not released ten-fold assignments; this experiment must publish its own exact
  grouped folds and seeds and use them identically across the harmonized arms.
  (An earlier draft of the WHL note claimed CAL ran 348; that came from a summarizer's 364−16
  arithmetic and has been corrected.)
- **ProDy** — MIT (in `LICENSE.rst`; GitHub reports `NOASSERTION` only because it cannot parse
  reStructuredText), 554 stars, pushed 2026-08-11. Actively maintained.
- **CAL** — `ZHHMCI/CAL`, MIT with a real LICENSE file, updated 2026-07. Ships `cal_features.py`,
  `extract_ca_coordinates.py`, and three CV drivers: `train_rf_gbdt_protein_blind.py`,
  `_residue_blind.py`, `_lopo_blind.py`.
- **mDGL** — `fenghon1/MDG_bfactor`. **Licence defect:** the README shows an MIT badge and says
  "see the [LICENSE](LICENSE) file", and there is no LICENSE file; the GitHub API reports no
  licence. Deny-by-default makes that `missing`, not MIT.
- **CAL's own dispersion** — 0.456 ± 0.161 (GBDT, protein-level) over 100 runs, 10 folds × 10
  seeds. WHL reports single averages with none.
- **WHL** — no implementation released. Eigenvalues in MATLAB; the only link is to mDGL's
  repository.

## The arc

### Step 0 — ProDy environment and the shared harness

Anchor first. Cheapest thing that produces environment-backed evidence, and it establishes the
harness against a no-training baseline before any learned model is involved.

- biopixi Environment for ProDy.
- A protocol committed before model runs: the 346-protein list and acquisition checksums; exact
  grouped outer folds and seeds; residue inclusion and mapping; mean per-protein PCC as the primary
  estimand; pooled PCC as a separately labelled secondary metric; and the normalization policy for
  each.
- Shared harmonized parser plus adapters that preserve each released parser for the faithful track.
- ProDy note is an **Environment, not a Package note** — the existing convention for non-TDA
  supporting tools (`dssp`, `dockq`, `biopython`, `mmseqs2` all have Environments and no Package
  note; `dssp` carries an application tag and no method tag).

**Why first:** no replication in this corpus currently has a biopixi environment at all, and
`status: complete` requires one. This would be the first. Prove the machinery on the simplest arm.

### Step 1 — CAL faithful rerun and benchmark variance

First rerun `train_rf_gbdt_protein_blind.py` through CAL's released parser and procedure. Then run
CAL through the harmonized parser and the prespecified grouped folds. Repeat the harmonized track
across the fixed seeds to estimate fold-to-fold and seed-to-seed variation.

CAL's published 0.456 ± 0.161 is fold dispersion, not a standard error and not a benchmark "noise
floor". The comparison must report paired differences between models on identical outer folds and
seeds, with uncertainty on those differences. That is the quantity that can say whether 0.456 →
0.480 → 0.524 is distinguishable from evaluation variation.

This satisfies the replication record directly: environment-produced evidence, identical
prespecified folds in the harmonized track, a stated metric, and a matched non-topological baseline
from step 0.

### Step 2 — WHL clean-room

No code, no intermediate values, one schematic figure and one table. Exact numerical reproduction
may be impossible, but "vaguely the same results" is not an acceptance criterion. Before running,
the protocol must declare numerical tolerances or outcome bands for the reported point estimate and
ordering, plus the conditions that classify the reconstruction as reproduced, partially
reproduced, not reproduced, or inconclusive.

Smaller than the paper looks: the experiment uses only `L^B_{3,f}` — one degree, normal boundary
conditions, Hodge star replaced by the identity. Required path is level set → cubical grid →
projection matrices → `D_k` → weighted BIG Laplacian → eigenvalues. Not the general weighted Hodge
machinery.

Parameters as published: FRI density with `r = 1.7`, `τ = 1`, `c = −0.1` for the manifold; weight
with 11 Å cutoff, `τ = 5`, `η = 4`; grid length 1; features `β₀` plus the first *k* non-zero
eigenvalues; GBR from scikit-learn 1.4.2 (1,000 estimators, depth 7, lr 0.002, subsample 0.8,
max_features sqrt). Note `τ` carries different values in the two equations — a notation collision
worth guarding in the implementation.

Self-consistency anchors, which check the implementation against the *theory* rather than against
the paper's numbers:

- Constant *f* must reduce the weighted BIG Laplacian to the unweighted one up to a constant.
- `β₀` must equal the connected-component count of the level set.
- Kernel dimension must be identical across every atom of a protein.

The faithful track reproduces the reported *k* sweep: sweep in tens and retain the value that scores
best on the reporting cross-validation. The hardened track uses nested selection inside each outer
fold. Report both and label the first as selection on the evaluation metric; the optima landing at
120/90/150/70 across four settings is exactly why the corrected track is needed.

### Step 3 — controlled feature ablation and three-way comparison

Run ProDy vs CAL vs clean-room WHL under the harmonized protocol: one parser, exact shared folds,
one primary metric, and paired uncertainty. Report structural/descriptors-only and consensus
variants in separate labelled tables.

Within WHL, run at least four explicitly named feature sets through the same regressor:

1. weight/FRI-only summaries — the non-topological local-packing control;
2. WHL non-zero spectrum only;
3. WHL non-zero spectrum plus β₀, verifying whether the constant topological feature changes
   anything;
4. WHL consensus, with the twelve PDB/STRIDE features.

This is the comparison that can say what the Laplacian contributes beyond information already in
its weight. Without it, the arc would reproduce the paper's most important missing control.

### Step 4 — mold

`predict-residue-flexibility` — a per-structure operation matching `score-docking-poses` in shape:
one target in, a per-residue table out, guardrails that the output is a model prediction and not a
measurement. `references` is an array, so one mold can carry all three environments plus a backend
parameter.

Land the Mold even if the experiment concludes that crystallographic B-factor prediction has
little current practitioner value. Its documentation must say that plainly: B-factors are a
contaminated proxy, the operation is primarily a reproducible methodological artifact, and no
backend is presented as a modern protein-flexibility state of the art. The Mold demonstrates a
typed, runnable delivery path; it does not manufacture a usefulness claim from the fact that the
path exists.

The **benchmark harness itself does not go in the mold** — the replication record requires the full
protocol, narrative, code, figures, and evidence to live in an upstream standalone repository.

Order matters: the mold comes after the environments exist and after the comparative evidence can
set honest defaults and caveats. No placeholder directories.

## Repository layout

Per the replication record, the protocol and evidence live upstream, with short
`replication_experiment` notes here linking pinned revisions. This is one bounded comparative study:
one shared upstream repository, one pinned revision, one replication note, and one composite
benchmark Environment capable of rerunning the recorded evidence. Backend-specific Environments
also exist because the Mold needs independently runnable references. Following the `open-topoqa-*`
pattern, the upstream repository goes under `~/projects/repositories/`.

Use one shared repository. The whole point is that the harmonized arms share the parser, folds,
metric, evidence schema, and comparison code; splitting them would reintroduce the divergence the
arc exists to eliminate. Keep the WHL clean-room implementation as an isolated module inside it
unless a second consumer later creates real pressure for a separate package.

## Upstream contribution

Open an issue on `fenghon1/MDG_bfactor` asking them to add the MIT LICENSE file their README
already links. Small, friendly, and it would repair the direct provenance path to their split list.
It does not block this experiment because CAL carries the byte-identical list under MIT. The fix
still belongs at the layer that owns it rather than being worked around downstream. **Needs sign-off
before posting** — outward-facing action on someone else's repository.

## Honest framing, to be carried in the notes

Crystallographic B-factors absorb crystal packing, static disorder, resolution, occupancy, and
refinement/TLS choices alongside real motion. The WHL paper never names any of these — zero
occurrences of "crystal", "disorder", AlphaFold, protein language model, ESM, cryo-EM, NMR, RMSF,
CASP, or CAMEO; one "molecular dynamics", a 1977 citation. Its biological motivation rests on two
docking/drug-design citations from 2000 and 2009.

That is not a criticism of the paper. It is a math.DG submission (MSC 58A14, 55N31) that uses
B-factor prediction to validate a framework and is honest about doing so. The risk of misreading
sits on the reader's side, which is ours — hence the framing above and the Protein Flexibility page
in the companion issue.

Neither modern option is a drop-in fourth arm: OPUS-BFactor has no licence and ships via Google
Drive, and FastProtFlex predicts MD RMSF rather than B-factors. Adding either is a separate
decision, not a stretch goal here.

## Acceptance

- Each arm has a biopixi Environment and is rerun through it; evidence recorded, not transcribed.
- The complete study also has one composite benchmark Environment named by its replication note.
- Faithful and harmonized tracks are separate: released parsers for reproduction, one parser and
  exact shared folds for comparison.
- Blind mean per-protein PCC is primary; pooled PCC and least-squares approximation are secondary
  and labelled.
- Exact folds and seeds are committed. Paired model differences carry uncertainty; fold dispersion
  is not called a noise floor.
- The WHL reconstruction has prespecified numerical outcome bands plus the theory-level
  self-consistency checks.
- Both the reported and nested *k*-selection protocols are run and labelled.
- Descriptors-only and consensus results in separate, labelled tables.
- The weight/FRI-only control is compared directly with the WHL non-zero spectrum under the same
  regressor, folds, and metric.
- Findings recorded on the Protein Flexibility page, including any negative result.
- The replication study is not marked `status: complete` until its composite benchmark Environment
  has rerun the pinned repository and the outcome is recorded.
- The Mold lands after the evidence and states that it may be a methodological artifact rather than
  a practically useful modern flexibility predictor.

## Decisions

1. Blind protein-level grouped CV is the primary comparison. Least-squares approximation may be a
   separately labelled diagnostic, never a row on the same leaderboard.
2. Use one shared harness repository and one composite benchmark Environment; keep backend-specific
   Environments for independent execution and the Mold.
3. Keep the WHL clean-room as an isolated module in the shared repository until another consumer
   justifies extracting it.
4. The mDGL licence request remains a separate outward-facing action requiring sign-off before it
   is posted. It does not block the experiment because CAL carries the byte-identical list under
   MIT; provenance and the missing upstream grant are still recorded.
5. Proceed with the WHL reconstruction even if CAL variance covers the published margin. That
   negative result changes the interpretation, not the value of testing reproducibility and the
   missing weight-only ablation.
6. Land the Mold, but describe it as a runnable methodological artifact unless the evidence earns a
   stronger usefulness claim.

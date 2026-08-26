# Issue draft — Add an `application` note kind, starting with Protein Flexibility

**Repo:** `jmchilton/bio-topo-foundry`
**Status:** filed as [jmchilton/bio-topo-foundry#83](https://github.com/jmchilton/bio-topo-foundry/issues/83), revised 2026-08-17 after review.
**Blocks:** [jmchilton/bio-topo-foundry#84](https://github.com/jmchilton/bio-topo-foundry/issues/84)
(the replicate/harden/extend arc). That issue reports its findings onto the page this one creates,
so this lands first.
**Depends on:** nothing.

---

> 🤖 Posted by Claude (AI assistant) on @jmchilton's behalf — not authored by them personally.

## Summary

Add an `application` note kind: this Foundry's account of one biological problem — what the task
is, how it is scored, what currently does it best, and where topological methods actually sit
against that. Ship it with one note, **Protein Flexibility**.

The corpus can currently say a great deal about *methods* and nothing at all about *problems*.
`content/methods/` has seven notes and `meta_tags.yml` has seven `method/` values, held together by
a checked bijection. The `application/` facet has four declared values — `clinical-outcome`,
`molecular-sciences`, `single-cell`, `structure-qa` — that classify a dozen notes and have prose
nowhere. A reader can find out what this Foundry thinks a persistent Laplacian *is*. They cannot
find out what it thinks structure quality assessment *is*, or whether topology is winning at it.

## Why now

Reviewing [#63](https://github.com/jmchilton/bio-topo-foundry/issues/63) surfaced a fact that no
Paper note can carry, because it is not a fact about any paper:

**Three literatures predict protein flexibility, and none of them cites the others.**

| Target | Line | Reported | Evaluated on |
| --- | --- | --- | --- |
| Crystallographic B-factor | Wei group — mDGL, PSL, CAL, WHL | 0.407–0.524 | Opron-364 (346 used), random 10-fold CV |
| Crystallographic B-factor | OPUS-BFactor (ESM-2 + transformer) | 0.58–0.67 | CAMEO82 / CASP15, temporal holdout |
| MD RMSF | FastProtFlex (graphlet degree vectors) | 0.70–0.82 | ATLAS MD, NMR ensembles, cryo-EM |

Reading that as a leaderboard is wrong three separate ways, and each way is invisible from inside
any single paper:

1. **Different targets.** A crystallographic B-factor would equal RMSF up to `8π²/3` if it
   contained only thermal motion. It does not — it also absorbs crystal packing, static disorder,
   resolution, occupancy, and refinement/TLS choices. RMSF is the cleaner target and therefore has
   the higher ceiling. FastProtFlex's 0.82 is not "better than" OPUS-BFactor's 0.67.
2. **Different protocols under one name.** "B-factor prediction" means both *least-squares
   approximation* (fit per protein to that protein's own B-factors — GNM 0.565, mDG 0.715 on
   Set-364) and *blind prediction* (train across proteins, test on held-out ones — mDGL 0.407,
   CAL 0.456, WHL 0.480). Same methods, same dataset, ~0.25 apart.
3. **Different correlation definitions.** Protein-level (mean of per-protein PCC) versus atom-level
   (one PCC over pooled residues) differ by 0.48 vs 0.86 *on the identical model*.

Note also that OPUS-BFactor benchmarks ProDy's NMA at 0.31–0.43 — meaning the entire topological
line is competing inside the band occupied by a training-free elastic network model from 1997,
while the language-model state of the art on held-out targets sits at 0.67. Different datasets, so
that is not a like-for-like comparison and the note must not present it as one. The structural
observation stands on its own.

Today this knowledge would be smeared across paper reviews, where it reads as criticism of
individual papers rather than as a standing fact about a task.

## What an Application note is for

Four things, in rough order of durability:

1. **What the problem is**, in the terms a working practitioner would use.
2. **How it is scored, and how scoring goes wrong** — the traps above are the durable content, and
   they will outlive every number on the page.
3. **What currently does it best**, dated, including non-TDA tools.
4. **Where topological methods sit against that**, honestly, including when the answer is "behind".

Point 4 is the one with no home today. *"TDA does not currently beat ProDy at this"* is a genuine
finding and the corpus has nowhere to put it.

## Design

### Granularity: pages are finer than tags, and that is deliberate

Copying Method's strict bijection would be a mistake. Tags are a browse vocabulary and want few
members, each with enough notes to be worth clicking. Pages want to be as fine as the subject.
Method gets away with a bijection only because the method vocabulary happens to be the corpus's
spine.

So:

- An Application note **may** declare `facet_tag` when it sits exactly on an `application/` facet
  member; it is **optional**.
- Checked one-directionally: no facet member may have two landing notes, and a note that claims an
  anchor must carry that tag. Method's refinement rule, minus the coverage half.
- **Dropped:** "every facet member must have a page."

This is strictly weaker than the Method rule and can be tightened later if the vocabulary wants it.

**Consequence worth stating plainly: this adds no new tag.** The Protein Flexibility note carries
`application/molecular-sciences` and declares no `facet_tag`. No new facet member, no retagging of
existing notes, no bidirectional-check scramble. An earlier sketch of this proposed adding
`application/protein-flexibility`; resisting the bijection removed the need.

### Naming

`application`, matching the facet's existing label and description ("The bioinformatics problem or
analysis setting a note serves"), and matching what `facet_tag` would literally hold. Not
"Biology" (misfits `clinical-outcome`), not "Biological Problem" (misfits `single-cell`, and coins
a synonym against a registry that exists to prevent exactly that). Directory
`content/applications/`.

### Frontmatter sketch

```yaml
type: application
title: Protein Flexibility
summary: <20–160 chars>
facet_tag: application/structure-qa   # optional, omitted here
assessed: "2026-08-17"                # see below
tags:
  - application/molecular-sciences
  - modality/molecular-structure
```

### The `assessed` field, and the claim-rot problem

"OPUS-BFactor leads at 0.67" is a present-tense sentence about a moving field with no drift check.
That runs against two standing rules — *link the authority, do not restate it*, and *do not write a
present-tense sentence about machinery that does not exist*. Three mitigations, all of which should
land with the kind:

- A required ISO date in `assessed`, so a state-of-the-art claim is timestamped and reviewable
  rather than ambient. This is `access_date`'s role on source notes, for the same reason.
- Bias the body toward **durable** content — what the task is, why the target is contaminated,
  which evaluation traps exist — over a leaderboard. The traps do not rot; the rankings do.
- Where a specific number is load-bearing, source it from a Paper note that owns it, so the
  citation audit covers it.

`assessed` stays in the schema. It complements citations rather than replacing them: every
load-bearing SOTA number and cross-literature comparison still names its primary source, while the
date says when the synthesis itself was last evaluated. Some of what the page needs to say — for
example, which literatures fail to engage with each other — is not any single paper's claim and
cannot be routed through one Paper note.

### Scope alignment, not scope expansion

This makes non-TDA **rivals** first-class in the corpus for the first time. There is precedent for
non-TDA *dependencies* — `dssp`, `dockq`, `mmseqs2`, `biopython` all have Environments and no
Package note — but naming competitors is new. It is also the whole point: it is what makes the
Foundry's thesis falsifiable rather than promotional.

This does not require a new principle. [[positioning]] already says that the organising question is
which mathematics earns its place against which biological problem, and its "Not an advocate for
topology" boundary already requires a matched non-topological baseline. [[guiding-principles]]
already makes the same requirement operational under "Be Honest About What Topology Buys". The new
kind gives that existing thesis a durable authored surface; it does not widen it.

## The first note: Protein Flexibility

Named for the property, **not** for "B-factor prediction". The most valuable sentence the page can
carry is *"B-factors are one proxy for this, and a contaminated one"*, and a page named after the
proxy cannot say that without arguing with its own title.

Proposed spine:

1. **The property** — what flexibility is and why it matters (docking, allostery, thermal
   stability, regional activity).
2. **The proxies and what each contaminates** — MD RMSF, NMR ensemble spread, cryo-EM local
   resolution, crystallographic B-factors. The `8π²/3` relationship and why it does not hold in
   practice.
3. **B-factor prediction as the dominant task** — the Opron-364 benchmark, the two-protocol trap,
   pooled vs per-target, unlabelled consensus columns. Practicality concerns live here: this is a
   task working practitioners have largely moved away from, and the page should say so rather than
   let the corpus assert a relevance it does not have.
4. **State of the art per proxy, dated** — ProDy/GNM as the training-free anchor, OPUS-BFactor for
   B-factors, FastProtFlex for RMSF.
5. **Where topology sits** — currently inside the band a 1997 elastic network model occupies, on a
   benchmark whose baselines it does not run.

Then [[weighted-hodge-laplacians]] and [[persistent-spectral-graph]] link *to* this page instead of
each re-litigating the context, and the arc in the companion issue reports its results onto it.

## Work required

The Method kind is the template; copy it.

- [ ] `site/src/types/application/{schema.ts,kind.md}` — optional `facet_tag` with the
      one-directional refinement, required `assessed`.
- [ ] Collection table entry; run `pnpm kinds` and commit the regenerated manifest.
- [ ] Browse surface at `/applications/`, plus the tag-page "leads with its guide" treatment where
      an anchor is declared.
- [ ] Generalize the tag-page guide label, which is currently hard-coded as "Method guide", so an
      Application anchor renders as an Application guide without weakening the Method treatment.
- [ ] Conformance test: no facet member has two landing notes; a declared anchor is carried in
      `tags`. Explicitly **not** a coverage test.
- [ ] `site/tests/application-schema.test.ts`, mirroring `method-schema.test.ts`.
- [ ] `content/applications/protein-flexibility.md`.
- [ ] Records: `content-model.md` (the kind and its contract), `repository-layout.md` (the new
      directory), `code-architecture.md` (registry/browse seam), `architecture.md` (router).
- [ ] `content-model.md` should say **why `application` gets a landing-note kind and `modality`
      does not** — a modality is a classifier, not a subject with a state of the art. Otherwise the
      remaining asymmetry reads as an oversight.
- [ ] Retarget the context paragraphs in [[weighted-hodge-laplacians]] to link the new page.
- [ ] Do not backfill pages for the four broad `application/` facet members in this change; add a
      page only when a real subject demands one.

## Acceptance

- `pnpm validate` green from `site/`.
- The Protein Flexibility note names at least one non-TDA tool as current best, with `assessed`
  set, and states plainly where topological methods sit relative to it.
- The page distinguishes the three targets and the two protocols, and does not present the
  cross-literature table as a leaderboard.
- No new tag facet member added.

## Decisions

1. `facet_tag` is optional and checked one-directionally; no Application coverage rule lands.
2. Ship the kind with Protein Flexibility as its one real note. That is corpus-first; placeholder
   examples or speculative backfill would not be.
3. Keep required ISO-date `assessed`, and continue to cite every load-bearing external claim.
4. Add no new falsifiability principle: `positioning` and `guiding-principles` already own it.
5. Backfill no broad facet landing pages in this milestone. Future notes arrive only when a real
   subject needs them.

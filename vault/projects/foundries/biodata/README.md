# CSHL Biological Data Science 2026 — abstract submission

Two competing abstract drafts for the Galaxy Workflow Foundry, both on the same spine:
cross-ecosystem workflow conversion, with deterministic validation in the loop.

## Meeting

- **Biological Data Science** (7th meeting), Cold Spring Harbor Laboratory
- **November 4–7, 2026**
- Organizers: Elinor Karlsson (UMass), Michael Schatz (JHU), Catalina Vallejos (Edinburgh / HDR UK)
- Keynotes: Karen Miga (UCSC), Aaron Quinlan (Utah)
- Sessions: Algorithmics · Population Genetics and Personalized Medicine · Machine Learning ·
  **Tools, Visualization, and Infrastructure** · Functional Genomics · Spatial Genomics
- Discussion leaders include Jeremy Goecks — whose three questions close the 2026-08-13 deck
- <https://meetings.cshl.edu/meetings.aspx?meet=DATA&year=26>

## Submission constraints

- **Abstract deadline for talk consideration: August 28, 2026.** Poster-only accepted until October 1.
- **3,200 characters total** — title + authors + affiliations + body combined, not body alone.
- Abstracts "should contain only new and unpublished material."
- **You must be registered for the meeting for a submitted abstract to be considered.**
  Registration deadline October 29.
- Form offers Invited Speaker / Talk or Poster / Poster Only, plus a revised-resubmission checkbox.

## The drafts

| file | framing | title+body chars |
| - | - | - |
| `abstract-b1-artifact-and-oracle.md` | leads with the system | 2,621 |
| `abstract-b3-deliverable.md` | leads with what a user gets | 2,161 |

Authors and affiliations are now written in (242 characters as pasted). Against the
3,200 limit that leaves **B1 337 characters and B3 797 characters** of real headroom. Both reserve their final
paragraph for the evaluation that will be presented.

## Author line, 2026-08-28

    John Chilton¹, Marius van den Beek¹, Dannon Baker², Danielle Callan³, Anton Nekrutenko¹

    1. The Pennsylvania State University, University Park, PA, USA
    2. Johns Hopkins University, Baltimore, MD, USA
    3. Temple University, Philadelphia, PA, USA

All affiliations verified.

## Named demonstration targets, 2026-08-28

Both final paragraphs now name `nf-core/sarek` (template-conformant variant calling) and NCBI's
`EGAPx` (eukaryotic genome annotation, no nf-core template) as the pipelines that will be
presented. These are stated in the future tense as demonstration *targets*, not as results — the
construction commits to presenting them, not to having succeeded. The "which follows no such
template" clause pre-frames a partial EGAPx result as informative rather than as a shortfall,
which matters because EGAPx is PI-driven scope rather than settled work.

This is why the abstract now carries biology at all: the previous drafts named no assay, organism,
or analysis type anywhere, which is a problem for a program committee whose sessions are
genomics-facing and whose organizers and keynotes are assembly/annotation people.

## Polish pass, 2026-08-28

**Both drafts stay in play** — two options for readers, not one submission. Applied to both:

- **Hedge de-stacking.** "Early applications … and *preliminary* translations of *complex*
  Nextflow analyses" → "…and *partial* translations of Nextflow pipelines. Incompleteness is
  explicit by design: …". No claim changed. "Preliminary" described the author's confidence;
  "partial" describes the artifact. Also fixed a drift — B1 said "analyses", B3 said "pipelines".
- **Stakes sentence added:** "Porting an analysis between workflow ecosystems is today a manual
  expert task, which is why most analyses never move." Neither draft previously said what the
  status quo costs. Opens B1 (replacing a flat negation-of-an-abstraction start); closes B3's
  first paragraph (the imperative opener must stay first).

B3 only:

- Title now claims rather than lists: "…to **Runnable** Galaxy Workflows".
- Sentence 2 rebuilt as a parallel triple instead of three passives.
- Machinery paragraph names its actor ("Independent programs, not the model, determine…") and
  closes short: "The model proposes and repairs. The tools decide when it is done."

**Deliberately kept:** the Karpathy eponym, at author request, acknowledged as weak in its current
form. The weakness is that "an extension of a Karpathy-style LLM wiki" neither says extended *how*
nor glosses the referent for readers who don't know it. A drop-in that keeps the name and fixes
both is on the table but unapplied.

B1 brought to parity in a second pass:

- **Title names the ecosystems** — "…for Translating Nextflow and CWL Pipelines into Galaxy"
  replaces the abstract "Cross-Ecosystem Workflow Translation".
- **The 7-sentence paragraph 2 was split.** It carried the knowledge base, the Mold model, the
  pipeline composition, the three validators and the feedback loop in one block. Now two
  paragraphs; sentence counts per paragraph are 6/4/4/2/2 instead of 6/7/2/2.
- **Machinery paragraph names its actor**, matching B3, and closes on the feedback loop —
  deliberately a different closing line from B3's "The tools decide when it is done," since the
  two drafts are shown as alternatives.
- **"Molds" kept** as the project's coined term, but "typed reference manifest" dropped — it added
  jargon without adding meaning.

Before the 2026-08-30 B3 pass, both drafts opened that paragraph with the same sentence
("Independent programs, not the model, determine whether a translation is correct"). B3 no longer
uses the shared sentence.

**Resolved 2026-08-30:** paragraph 3 of B3 was the densest jargon ("corpus exemplars, command
contracts, action-sized skills composed into seven source-to-target pipelines"). It now describes
the knowledge base, focused skills, and provenance in direct terms.

## Stop-slop pass, 2026-08-30

B3 now names people as actors where the original relied on abstractions, removes its em dash and
binary contrasts, and replaces the slogan ending of the validation paragraph with a description of
how the model uses tool reports. The pass also replaces the unsupported "most analyses never move"
with the narrower claim that many analyses stay in their original system. The technical acceptance
criteria and all evaluation targets remain unchanged.

## Claims pulled, 2026-08-27

Both drafts originally carried an evaluation paragraph citing an nf-core overfitting sweep — "six
of eight non-template pipelines returned zero processes against ground truth of 9 to 99," held to
an "80-percent-of-ground-truth threshold." **Those paragraphs are removed and should not come
back in that form.** A third draft built entirely on that finding was deleted.

The numbers were real in the sense that they were transcribed from `foundry/content/log.md`
(2026-05-03, "summarize-nextflow ad-hoc fixture sweep"). They were not sound as abstract claims:

1. **It was a debugging sweep, not an experiment.** No protocol, no hypothesis, no held-out set.
   The entry exists to justify a resolver fix list, and the fix landed.
2. **The ground truth was `grep -c '^process '`, which is known-wrong in both directions.** The
   2026-05-02 entry in the same log shows that grep *undercounting* against the resolver on
   nf-core pipelines (34 vs 31, 76 vs 66, 123 vs 90, 61 vs 51) because it misses indented and
   multi-line declarations. It cannot be the denominator.
3. **The 80% threshold is a fudge factor around that bad oracle**, not a quality bar — the log
   says so outright: "80% rather than exact to allow for genuine false-positive grep matches."
4. **"Zero processes" was a one-line bug, not a finding.** `discoverProcessFiles()` looked only
   under `<root>/modules/**/main.nf`; pipelines using another layout returned nothing.
5. **It is stale.** The resolver now walks all `.nf` files with multi-process-per-file support.
   The sweep was never re-run — `workflow-fixtures/pipelines/` is gitignored and not cloned.

## What a defensible version would need

A trustworthy ground truth, then a re-run on current code:

- **Use Nextflow itself as the oracle.** `nextflow inspect` / the DSL2 parser yields the real
  process inventory. See `foundry/content/research/component-nextflow-inspect`. Comparing the
  resolver to the language runtime is defensible; comparing it to a grep is not.
- **Or hand-label a small set.** Five to eight pipelines counted by hand once, committed as
  labelled fixtures. Small n, but real and citable.

The claim then states only what it supports: recovery rate across N pipelines verified against
`nextflow inspect`.

Better still, the number worth having for this abstract is the end-to-end one, not extraction
fidelity: **of N upstream pipelines, how many yield a Galaxy workflow that `gxwf validate`
accepts and `planemo test` runs green.** That is the benchmark both drafts promise and neither
has.

## Open items

1. **Presenter designation** still TBC. Every affiliation on the line is now verified.
2. **Registration** — required before the abstract counts. Confirm before Friday.
3. **The benchmark**, per the section above.
4. **`EGAPx` styling** — confirm against NCBI's own docs before submission. The GitHub repo is
   lowercase `ncbi/egapx`, but the product appears to be styled `EGAPx`; the drafts currently use
   `EGAPx`. A misrendered tool name in an abstract is a cheap, visible credibility hit.
5. **The Sarek data.** If existing Sarek results are solid, Sarek should also replace the vague
   "preliminary translations of complex Nextflow analyses" in the present-tense paragraph. A named
   partial result in present tense is what makes the future-tense paragraph read as a plan on
   rails rather than as aspiration. Not yet done — the data has not been reviewed.
6. **CWL is now unnamed** in both demonstration lists, which name only Nextflow pipelines. Either
   name a CWL target too, or accept that CWL survives only in the earlier body text.

## Corpus figures the drafts still rely on

Verified against the `foundry` repository, 2026-08-26:

- 341 notes · 47 Molds · 7 pipelines · 54 patterns · 32 CLI manual pages · 14 schemas
- 54 cast skills, installable as a Claude Code / Codex plugin
- 36 `eval.md` oracles · 32 `scenarios.md` case files

Exact counts from the repository. Note that neither draft currently cites them; both stop at
"47 atomic actions" and "seven ordered pipelines," which are also exact.

Two figures from the deleted paragraphs were looser than presented and should be re-checked
before reuse: the fixture corpus breakdown ("38 pinned pipelines — 16 nf-core, 10 ad-hoc
Nextflow, 12 CWL" — the 38/16/10 are exact `fixtures.yaml` flavor counts, but "12 CWL" lumps
`bio-workflow`, `conformance`, `tool-library` and `user-guide`, and several of those are docs or
tool libraries rather than pipelines), and "120 curated Galaxy workflow skeletons" (quoted from
`content/meta/corpus.md`, revised 2026-05-10; the skeleton corpus is generated and gitignored, so
the current count is unverified).

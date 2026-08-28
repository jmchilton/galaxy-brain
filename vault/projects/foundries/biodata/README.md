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
| `abstract-b1-artifact-and-oracle.md` | leads with the system | 2,520 |
| `abstract-b3-deliverable.md` | leads with what a user gets | 2,396 |

Before authors and affiliations, B1 leaves roughly 680 characters and B3 roughly 800 characters
under the limit. Both now reserve their final paragraph for the evaluation that will be presented.

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

1. **Affiliations.** Author line follows GCC 2026 (Chilton, van den Beek, Baker, López, Awan,
   Nekrutenko); institutions still need confirming, as does the presenter designation.
2. **Registration** — required before the abstract counts. Confirm before Friday.
3. **The benchmark**, per the section above.

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

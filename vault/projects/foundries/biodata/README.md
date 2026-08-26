# CSHL Biological Data Science 2026 — abstract submission

Three competing abstract drafts for the Galaxy Workflow Foundry, all on the same spine:
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
| `abstract-b1-artifact-and-oracle.md` | leads with the system | 2,618 |
| `abstract-b2-negative-result.md` | leads with the measurement — **recommended** | 2,521 |
| `abstract-b3-deliverable.md` | leads with what a user gets | 2,415 |

All three leave roughly 580–785 characters for the author and affiliation block, which is ample for
six authors.

### Why B2

Every group at this meeting is now making a model emit structured output. B2's finding —
an empty array is well-formed, so schema conformance reads as correctness until checked against
independent ground truth — generalizes past Galaxy to all of them. It is also the draft where the
honesty is the product rather than a trailing caveat, which is the best available answer to
Goecks's "when does Foundry deliver a real benefit versus existing solutions?"

B3 is the better poster and the better recruiting pitch. B1 is the most complete but leads with
machinery, and the Tools/Infrastructure session is already full of machinery-first tool abstracts.

Cheap hybrid worth considering: keep B2 entire, but open with B3's first sentence so the reader
knows what the system *does* before hearing what it got wrong.

## Open items

1. **Affiliations.** Author line follows GCC 2026 (Chilton, van den Beek, Baker, López, Awan,
   Nekrutenko); institutions still need confirming, as does the presenter designation.
2. **Registration** — required before the abstract counts. Confirm before Friday.
3. **The commitment.** All three drafts promise "the end-to-end conversion benchmark," which does
   not exist yet. What exists is per-stage evaluation plus one extraction sweep. Delivering it
   means cloning the 38 pinned fixtures and running the full journey to a `planemo test` verdict
   on a defensible subset before November 4.

## Evidence the drafts draw on

Verified against the `foundry` repository, 2026-08-26:

- 341 notes · 47 Molds · 7 pipelines · 54 patterns · 32 CLI manual pages · 14 schemas
- 54 cast skills, installable as a Claude Code / Codex plugin
- 36 `eval.md` oracles · 32 `scenarios.md` case files
- 38 pinned upstream fixtures — 16 nf-core, 10 ad-hoc Nextflow, 12 CWL-family
- 120 curated IWC workflow skeletons as corpus grounding
- Negative result (`content/log.md`, 2026-05-03): of 8 non-nf-core pipelines, 2 hard failures and
  6 exiting 0 with schema-valid summaries reporting **zero** processes against ground truth of
  9, 11, 12, 17, 94, 99
- Remediation (`content/log.md`, 2026-08-19): layout-agnostic discovery recovers 95 processes,
  68 subworkflows, 54 edges, 6 conditionals from `ncbi/egapx`; standing oracle requires ≥80% of
  independent ground truth

# Case Study

Working plan behind the manuscript's Evidence section. The six requirements a worked case study must demonstrate are listed in the manuscript; this file tracks candidate fixtures and the open selection decisions.

## Candidate cases

**Primary (the path that runs): a construction-from-intent case** via `interview-to-galaxy` — a real analysis intent built into a `gxwf`-valid, `planemo`-exercised Galaxy workflow through the decomposed Mold loop. This is what we can demonstrate end-to-end today; pick an intent with a known IWC equivalent so tool choices can be grounded and outputs sanity-checked.

Conversion candidates (architecturally supported, not yet demonstrated — for the follow-on once a path is exercised end-to-end):

- A small nf-core pipeline or module path with representative channel semantics (exercises `summarize-nextflow` → Galaxy design Molds; the only summarizer with runtime code).
- A CWL user-guide or bio-domain workflow summarized and translated into a Galaxy skeleton (CWL→Galaxy path; `summarize-cwl` is emulation-tier, note nested-subworkflow gap when scoping).
- A paper methods section with a narrow, well-known tool chain (`summarize-paper` path; emulation-tier).

## Open decisions

- **Which intent, and how many.** One clean construction case is the floor. A second construction case on different biology strengthens breadth without needing the conversion paths. Strongest case is the one with the best artifact, not the most impressive biology.
- **Emulation vs. automated run.** A fully harness-automated run is the higher bar; an honestly-labelled agent-driven run may suffice for a first draft if the artifacts and validation are real **and the `planemo` gate actually runs**. Decide framing before writing results.
- **Oracle without ground truth.** Construction-from-intent has no upstream equivalent to diff against, so the load-bearing metric is fabrication-catch (schema/`gxwf`/`planemo`) vs. an unguided-agent baseline, not output concordance. Picking an intent with a known IWC equivalent recovers a weak concordance check.
- **Venue.** Pulled back from Genome Biology (its Software section wants demonstrated biological application the construction path does not supply). Working target is now Genome Research methods/resource, with Bioinformatics as the floor — see `index.md`.

## What a result looks like

A results table (Molds exercised, validation outcome, any signal recovered/drift caught) plus the failure-comparison vignette. Artifacts (summary, briefs, `gxformat2` draft, `gxwf` report) go to Supporting Information.

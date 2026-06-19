# Case Study

Working plan behind the manuscript's Evidence section. The six requirements a worked case study must demonstrate are listed in the manuscript; this file tracks candidate fixtures and the open selection decisions.

## Candidate fixtures

Pick one constrained conversion that yields the most checkable artifact (before GCC):

- A small nf-core pipeline or module path with representative channel semantics (exercises `summarize-nextflow` → Galaxy design Molds).
- A CWL user-guide or bio-domain workflow summarized and translated into a Galaxy skeleton (exercises the CWL→Galaxy path; note current `summary-cwl` nested-subworkflow gap when scoping).
- A paper methods section with a narrow, well-known tool chain (exercises `summarize-paper` → Galaxy path).

## Open decisions

- **Which fixture, and how many.** One is the floor; two distinct source axes (e.g. one Nextflow, one CWL) strengthens the breadth claim. Strongest case study is the one with the best artifact, not the most impressive biology.
- **Emulation vs. automated run.** A fully harness-automated run is the higher bar; an honestly-labelled agent-driven run may suffice for a first draft if the artifacts and validation are real. Decide framing before writing results.
- **Biological weight.** A recovered-signal or parameter-drift vignette is what a top venue (Genome Biology Software) wants; it is the PhD-contributor work flagged in the target ladder (`index.md`).

## What a result looks like

A results table (Molds exercised, validation outcome, any signal recovered/drift caught) plus the failure-comparison vignette. Artifacts (summary, briefs, `gxformat2` draft, `gxwf` report) go to Supporting Information.

# B1 — "Artifact and oracle"

Leads with the system. Most complete of the three; weakest hook for a talk slot.

## Title

Compiling Trustworthy Agent Skills for Cross-Ecosystem Workflow Conversion

## Authors

John Chilton, Marius van den Beek, Dannon Baker, David López, Ahmed Hamid Awan, Anton Nekrutenko

*(affiliations TBC; presenter TBC)*

## Body

Reproducible analysis is fragmented across workflow ecosystems. A Nextflow pipeline, a CWL
description, and a Galaxy workflow encode the same science in incompatible dialects, and porting
between them is expensive enough that most groups simply do not. Language models can read a
pipeline and propose a translation, and they fail the same detectable ways every time:
hallucinated tool identifiers, dropped revision suffixes, fabricated parameter names, and
serializations the parser rejects on line one. The usual response is a large hand-authored
"convert a workflow" prompt that enumerates these failures as prose caveats. Those caveats do not
compose, cannot be tested, and rot on the next regression.

We take a different shape. Workflow conversion is decomposed into 47 atomic actions, each a typed
reference manifest declaring exactly the schemas, corpus exemplars, and command contracts it
depends on, and each compiled into a self-contained, frozen agent skill carrying a provenance
record. Seven ordered pipelines compose those actions end to end: Nextflow, CWL, a published
paper, or a domain-expert interview in; a validated, executable Galaxy workflow out. Determinism
is enforced rather than requested. Every authored step is schema-validated inline by gxwf, tool
identifiers resolve against the live Tool Shed, and the journey does not terminate until planemo
executes the workflow's own generated tests. The model translates and repairs; independent tools
select, validate, execute, and classify.

The corpus is grounded in 120 curated Galaxy workflow skeletons and evaluated against 38 pinned
upstream pipelines spanning nf-core, ad-hoc Nextflow, and CWL. That evaluation surface — 36
fixture-independent oracles and 32 concrete case files — is what makes the negative results
legible. Our Nextflow resolver initially overfit to the nf-core template: on eight pipelines that
do not follow it, two failed outright and six exited zero emitting schema-valid summaries
containing zero processes, against ground truth of 9 to 99. Conformance passed while fidelity
collapsed silently. Rebuilding discovery to be layout-agnostic recovered 95 processes, 68
subworkflows, and 54 edges from a pipeline that previously returned nothing, and added a standing
oracle requiring recovery within 80 percent of independent ground truth.

We will present the full conversion benchmark across the corpus, the failure taxonomy it exposes,
and the artifacts: an open knowledge base, 54 installable skills, and the deterministic tooling
that gates them.

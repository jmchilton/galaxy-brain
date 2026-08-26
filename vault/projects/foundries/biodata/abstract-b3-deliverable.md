# B3 — "The deliverable"

Leads with what a user gets. Most accessible; the better poster and the better recruiting pitch.

## Title

From nf-core Pipeline or Interview to a Tested, Executable Galaxy Workflow

## Authors

John Chilton, Marius van den Beek, Dannon Baker, David López, Ahmed Hamid Awan, Anton Nekrutenko

*(affiliations TBC; presenter TBC)*

## Body

Point at an nf-core pipeline, a CWL description, or a published methods section — or just
describe your analysis in conversation — and get back a Galaxy workflow whose every step is a
real, version-pinned tool, whose parameters validate against the Tool Shed, and which ships with
tests that have actually been run. That is the deliverable we are building, and it works today on
pipelines we did not develop it against.

Getting there required rejecting the obvious approach. A single large prompt instructing a model
to "convert this workflow" fails in predictable, detectable ways — hallucinated tool identifiers,
dropped revision suffixes, fabricated parameter names, serializations the parser rejects
immediately — and the usual patch is a growing list of prose caveats that cannot be tested and
rot on the next regression. Instead we decompose conversion into 47 atomic actions. Each is a
typed manifest declaring the schemas, corpus exemplars, and command contracts it depends on, and
each compiles into a small frozen agent skill carrying a provenance record naming exactly what it
was built from. Seven ordered pipelines compose them end to end. The knowledge base, not the
skill, is the source of record, so improving a conversion means editing inspectable domain
knowledge and recompiling, not hand-patching a prompt.

Correctness is enforced by tools, not requested from the model. gxwf schema-validates each
authored step as it is written, tool identifiers resolve against the live Tool Shed, and the
journey does not terminate until planemo executes the workflow's own generated tests. The model
translates and repairs; independent programs select, validate, execute, and classify.

We evaluate against 38 pinned upstream pipelines — 16 nf-core, 10 ad-hoc Nextflow, 12 CWL —
using 36 fixture-independent oracles and 32 concrete case files, grounded in 120 curated Galaxy
workflow exemplars. That surface caught our own worst bug: extraction tuned on nf-core silently
returned zero processes for six of eight non-template pipelines carrying 9 to 99, while passing
every schema check. Layout-agnostic discovery now recovers 95 processes and 68 subworkflows from
one such pipeline, held to a standing 80-percent-of-ground-truth threshold.

We will present the conversion benchmark, the failure taxonomy, and 54 installable open skills.

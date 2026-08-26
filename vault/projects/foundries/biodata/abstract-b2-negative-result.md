# B2 — "The negative result leads" (recommended)

Leads with the measurement. The finding generalizes past Galaxy to anyone making a model emit
structured output, which is what makes it a discussion talk rather than a tool talk.

## Title

Schema-Valid and Empty: Measuring What Agent-Generated Workflow Conversions Actually Recover

## Authors

John Chilton, Marius van den Beek, Dannon Baker, David López, Ahmed Hamid Awan, Anton Nekrutenko

*(affiliations TBC; presenter TBC)*

## Body

We built an agent system that converts Nextflow and CWL pipelines into validated, executable
Galaxy workflows, and then tried to measure whether it works. The measurement is the finding.

Our pipeline summarizer emits a schema-constrained JSON description of an upstream pipeline —
processes, channels, parameters, containers, tests — which downstream agent steps consume to
construct a Galaxy workflow. Against the seven nf-core pipelines it was developed on, it passed
every schema check. We then ran it against eight Nextflow pipelines that do not follow the nf-core
template. Two failed outright. The other six exited zero and produced schema-valid summaries
reporting zero processes, against filesystem ground truth of 9, 11, 12, 17, 94, and 99. A
downstream agent consuming those summaries would have concluded, with full schema conformance,
that these pipelines contain no computational steps.

This is the failure mode we think matters for agentic scientific tooling generally. Structural
validity is cheap to enforce and easy to mistake for correctness. An empty array is well-formed.
The gap closes only with fidelity oracles that compare recovered content against evidence obtained
independently of the extractor — here, a naive grep over every source file. Rebuilding discovery
to be layout-agnostic recovered 95 processes, 68 subworkflows, 54 edges, and 6 conditional guards
from a pipeline that had previously returned nothing, and we now hold every fixture to recovering
at least 80 percent of independent ground truth. A second obligation follows: when evidence is
genuinely absent upstream, the system must report absent evidence rather than absence.

The measurement is possible because the system is built to be measured. Conversion is decomposed
into 47 atomic actions, each compiled from an inspectable knowledge base into a frozen agent skill
with a provenance record, and each carrying a fixture-independent oracle separate from its
concrete test cases — 36 oracles and 32 case files over a 38-pipeline pinned corpus spanning
nf-core, ad-hoc Nextflow, and CWL. Deterministic tools own every verdict: gxwf schema-validates
each authored step, tool identifiers resolve against the live Tool Shed, and no conversion is
complete until planemo executes the workflow's generated tests.

We will present the end-to-end conversion benchmark, the failure taxonomy, and an open knowledge
base with 54 installable skills.

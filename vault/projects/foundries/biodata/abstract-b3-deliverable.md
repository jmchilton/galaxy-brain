# B3: "The deliverable"

Leads with what a user gets. The most accessible framing and the strongest hook.

## Title

From Nextflow, CWL, Papers, and Conversations to Runnable Galaxy Workflows

## Authors

John Chilton¹, Marius van den Beek¹, Dannon Baker², Danielle Callan³, Anton Nekrutenko¹

1. The Pennsylvania State University, University Park, PA, USA
2. Johns Hopkins University, Baltimore, MD, USA
3. Temple University, Philadelphia, PA, USA

*(presenter TBC)*

## Body

Give the Galaxy Workflow Foundry a published methods section, an analysis described in
conversation, a Nextflow pipeline, or a CWL workflow. You receive a Galaxy workflow with validation
results and an explicit list of gaps that need human attention. The Foundry records the evidence
needed to inspect, install, run, and repair the workflow. An expert must reconstruct an analysis by
hand to move it between workflow ecosystems, so many analyses stay in the system in which they were
written.

We have used the Foundry to produce working Galaxy workflows from free-form expert specifications
and partial translations of Nextflow pipelines. The Foundry lists unresolved source behavior as
explicit requirements in its output.

We maintain current Galaxy schemas, working examples, validation commands, and design knowledge in
an inspectable source of record based on Karpathy's LLM wiki pattern. The Foundry packages this
knowledge into focused skills and assembles them into seven translation pipelines. For each skill,
we record its source material in a provenance record. A developer can update the domain knowledge
behind a failed conversion and compile the skill again.

We use Tool Shed discovery, gxwf, and Planemo to set the acceptance criteria. Tool Shed
discovery pins candidate tools to installable revisions; gxwf checks workflow structure,
parameters, and connections; Planemo installs the tools and runs source-derived or generated
tests. The model uses their reports to revise the workflow.

We will present workflows built from a published methods section and from a conversation with a
domain expert, alongside conversions of nf-core/sarek, a template-conformant variant-calling
pipeline, and NCBI's EGAPx eukaryotic genome annotation pipeline, which follows no such template.
We selected some evaluation pipelines after developing the skills. For each we report tool
coverage, gxwf validation, whether Planemo tests run green, and where the translation remains
incomplete. We release the Foundry knowledge base and compiled skills for others to inspect,
install, and extend.

# B3 — "The deliverable"

Leads with what a user gets. The most accessible framing and the strongest hook.

## Title

From Nextflow, CWL, Papers, and Conversations to Galaxy Workflows

## Authors

John Chilton, Marius van den Beek, Dannon Baker, David López, Ahmed Hamid Awan, Anton Nekrutenko

*(affiliations TBC; presenter TBC)*

## Body

Give the Galaxy Workflow Foundry an nf-core or non-nf-core Nextflow pipeline, a CWL workflow, a
published methods section, or an analysis described in conversation. It constructs a Galaxy
workflow in which tools are resolved to installable revisions, parameters and connections are
checked against Galaxy tool schemas, and executable tests accompany the result. The deliverable
couples the Galaxy workflow with the evidence needed to inspect, install, run, and repair it.

Early applications have produced working Galaxy workflows from free-form expert specifications
and preliminary translations of complex Nextflow pipelines. Source behaviors not yet captured are
surfaced as explicit unresolved requirements instead of being hidden behind a syntactically
plausible result.

This behavior comes from treating an inspectable knowledge base—an extension of a Karpathy-style
LLM wiki—as the source of record, rather than one large "convert this workflow" prompt. The
Foundry assembles current Galaxy schemas, corpus exemplars, command contracts, and design
knowledge that no model can be assumed to know, then makes selected slices actionable through
dozens of action-sized skills composed into seven source-to-target pipelines. Provenance records
exactly what produced each skill. Improving a conversion therefore means updating reviewable
domain knowledge and recompiling, rather than accumulating untestable prompt caveats.

Machine-checkable correctness is delegated to independent tools. Tool Shed discovery verifies and
pins candidate tools; gxwf validates workflow structure, parameter state, and data connections;
Planemo installs the tools and executes source-derived or generated tests. The model proposes and
repairs translations, while structured failures keep the process from silently declaring success.

This work will demonstrate and discuss Galaxy workflow construction from published methods,
free-form expert descriptions, and pinned nf-core and non-nf-core Nextflow workflows, including
sources not used to develop the conversion instructions. For each, we will report preservation of
the source analysis, step and tool coverage, gxwf validation, Planemo test completion, and
remaining translation gaps. The Foundry knowledge base and compiled skills are open and
installable for independent use and extension.

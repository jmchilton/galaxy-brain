# B3 — "The deliverable"

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

Give the Galaxy Workflow Foundry an nf-core or non-nf-core Nextflow pipeline, a CWL workflow, a
published methods section, or an analysis described in conversation. It returns a Galaxy workflow:
every tool pinned to an installable Tool Shed revision, every parameter and connection checked
against that tool's schema, tests included and runnable. The deliverable couples the Galaxy
workflow with the evidence needed to inspect, install, run, and repair it. Porting an analysis
between workflow ecosystems is today a manual expert task, which is why most analyses never move.

Early applications have produced working Galaxy workflows from free-form expert specifications, and
partial translations of Nextflow pipelines. Incompleteness is explicit by design: source behavior
not yet captured stays visible as a stated requirement rather than hidden behind a syntactically
plausible result.

This behavior comes from treating an inspectable knowledge base—an extension of a Karpathy-style
LLM wiki—as the source of record, rather than one large "convert this workflow" prompt. The Foundry
assembles current Galaxy schemas, corpus exemplars, command contracts, and design knowledge that no
model can be assumed to know, then makes selected slices actionable through dozens of action-sized
skills composed into seven source-to-target pipelines. Provenance records exactly what produced
each skill. Improving a conversion therefore means updating reviewable domain knowledge and
recompiling, rather than accumulating untestable prompt caveats.

Independent programs, not the model, determine whether a translation is correct. Tool Shed
discovery verifies and pins candidate tools; gxwf validates workflow structure, parameter state,
and data connections; Planemo installs the tools and executes source-derived or generated tests.
The model proposes and repairs. The tools decide when it is done.

We will present conversions of nf-core/sarek, a template-conformant variant-calling pipeline, and
NCBI's EGAPx eukaryotic genome annotation pipeline, which follows no such template, alongside
workflows built from a published methods section and from a conversation with a domain expert,
including pipelines the skills were never written against. For each we report tool coverage, gxwf
validation, whether Planemo tests run green, and where the translation remains incomplete. The
Foundry knowledge base and compiled skills are open and installable for independent use and
extension.

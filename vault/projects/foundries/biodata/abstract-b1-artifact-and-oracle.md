# B1 — "Artifact and oracle"

Leads with the system. Weaker hook for a talk slot than B3.

## Title

Test-Gated Agent Skills for Cross-Ecosystem Workflow Translation

## Authors

John Chilton, Marius van den Beek, Dannon Baker, David López, Ahmed Hamid Awan, Anton Nekrutenko

*(affiliations TBC; presenter TBC)*

## Body

Faithful workflow translation is not primarily a syntax-conversion problem. It requires current,
ecosystem-specific knowledge: how source concepts map to Galaxy data models, collection
semantics, tool interfaces, reference data, and workflow idioms. Much of this knowledge lives in
fast-moving code, schemas, and expert practice rather than stable documentation or model training
corpora. A frontier model can read a Nextflow or CWL workflow, but cannot be assumed to know the
latest Galaxy representation that preserves its scientific intent. Without that grounding, a
translation can be plausible yet structurally or scientifically wrong.

We present the Galaxy Workflow Foundry: an inspectable knowledge base of current Galaxy
practice—an extension of a Karpathy-style LLM wiki—whose structure makes that knowledge
actionable. It decomposes workflow translation into dozens of action-sized units, or Molds. Each
Mold is a typed reference manifest that declares the schemas, corpus exemplars, and command
contracts it requires, and compiles into a self-contained agent skill with a provenance record.
Seven pipeline skills compose these actions into routes from Nextflow, CWL, published methods, or
a domain-expert interview to Galaxy. The model interprets, translates, and repairs; deterministic
programs constrain the machine-checkable parts of the result. Tool Shed discovery resolves tools
to installable revisions, gxwf validates workflow structure and parameters against Galaxy tool
schemas, and Planemo executes source-derived or generated workflow tests. Structured failures
feed back into the authoring loop instead of being accepted as plausible output.

Early applications have produced working Galaxy workflows from free-form expert specifications
and preliminary translations of complex Nextflow analyses. These prototypes make incompleteness
explicit: unresolved source behavior remains visible as a requirement for further work instead of
disappearing into a plausible translation. This work will demonstrate and discuss Galaxy workflow
construction from published methods, free-form expert descriptions, and pinned nf-core and
non-nf-core Nextflow workflows, including sources not used to author the conversion instructions.
We will report source-step recovery, resolved and version-pinned tool coverage, gxwf validation,
Planemo test completion, and observed failure modes, alongside the open knowledge base and its
installable skills.

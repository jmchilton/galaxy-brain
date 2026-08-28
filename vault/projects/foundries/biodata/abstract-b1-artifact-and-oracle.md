# B1 — "Artifact and oracle"

Leads with the system. Weaker hook for a talk slot than B3.

## Title

Test-Gated Agent Skills for Cross-Ecosystem Workflow Translation

## Authors

John Chilton, Marius van den Beek, Dannon Baker, David López, Ahmed Hamid Awan, Anton Nekrutenko

*(affiliations TBC; presenter TBC)*

## Body

Equivalent analyses are expressed differently across Nextflow, CWL, and Galaxy, making faithful
porting labor-intensive. Language models can propose translations, but often introduce defects
that domain tools can detect: invented tool identifiers, lost version pins, invalid parameter
names, incompatible data connections, and malformed workflow documents. A monolithic conversion
prompt accumulates the rules for avoiding these defects as prose that is difficult to test,
attribute, or reuse.

We present the Galaxy Workflow Foundry, which decomposes workflow translation into 47
action-sized units, or Molds. Each Mold is a typed reference manifest that declares the schemas,
corpus exemplars, and command contracts it requires, and compiles into a self-contained agent
skill with a provenance record. Seven pipeline skills compose these actions into routes from
Nextflow, CWL, published methods, or a domain-expert interview to Galaxy. The model interprets,
translates, and repairs; deterministic programs constrain the machine-checkable parts of the
result. Tool Shed discovery resolves tools to installable revisions, gxwf validates workflow
structure and parameters against Galaxy tool schemas, and Planemo executes source-derived or
generated workflow tests. Structured failures feed back into the authoring loop instead of being
accepted as plausible output.

Early applications have produced working Galaxy workflows from free-form expert specifications
and preliminary translations of complex Nextflow analyses. These prototypes expose unsupported
conditional paths and parameters rather than treating partial coverage as a complete translation.
This work will demonstrate and discuss conversions of pinned nf-core and non-nf-core workflows
not used to author the conversion instructions. We will report source-step recovery, resolved and
version-pinned tool coverage, gxwf validation, Planemo test completion, and observed failure modes,
alongside the open knowledge base and its 54 installable skills.

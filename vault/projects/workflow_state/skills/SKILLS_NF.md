# White Paper: `nf-to-galaxy` Skill Family

A technical description of the `nf-to-galaxy` skill bundle as it exists in
`galaxy-skills/wf_dev` (path: `nf-to-galaxy/`). This document describes
the skills' structure, content, methodology, and assumed runtime context.
It does not evaluate fit against any external goal.

---

## 1. Shape and Packaging

`nf-to-galaxy` is a **router skill with three sub-skills** and a flat collection
of reference markdown files. The directory layout:

```
nf-to-galaxy/
  SKILL.md                                  # router
  README.md                                 # navigation index
  nf-process-to-galaxy-tool/SKILL.md        # sub-skill: 1 process -> 1 tool
  nf-subworkflow-to-galaxy-workflow/SKILL.md# sub-skill: subworkflow -> .ga
  nf-pipeline-to-galaxy-workflow/SKILL.md   # sub-skill: full pipeline -> N .ga + tools
  nextflow-galaxy-terminology.md            # concept mapping reference
  process-to-tool.md                        # detailed process->XML reference
  workflow-to-ga.md                         # detailed .ga authoring reference
  container-mapping.md                      # container -> bioconda lookup
  datatype-mapping.md                       # nf glob pattern -> Galaxy datatype lookup
  check-tool-availability.md                # tool discovery procedure
  tool-sources.md                           # placement decisions for new tools
  testing-and-validation.md                 # routing stub
  scripts/check_tool.sh                     # simple availability helper
  examples/                                 # CAPHEINE-based worked examples
```

Sub-skills are entered through the router (`SKILL.md`) which dispatches by
**conversion granularity**: single process, single subworkflow, or whole
pipeline. The router is decision-tree only; it carries no conversion logic.

Total content: ~5,100 lines of markdown. Body text is roughly 80 % reference
material (mappings, examples, caveats) and 20 % procedural step-lists in the
sub-skill files.

## 2. Conceptual Model

The skill imposes a fixed mapping between Nextflow and Galaxy concepts:

| Nextflow concept       | Galaxy concept                  | Cardinality |
|------------------------|---------------------------------|-------------|
| Process                | Tool (XML wrapper)              | 1 : 1       |
| Module (directory)     | Tool directory                  | structural  |
| Subworkflow            | Workflow (`.ga`) or subworkflow | 1 : 1..N    |
| Workflow (top-level)   | Workflow (`.ga`)                | 1 : 1..N    |
| Container declaration  | `<requirements>` package        | 1 : 1       |
| `path('*.ext')` glob   | Galaxy datatype string          | lookup      |
| Channel connection     | Step input_connection           | 1 : 1       |
| `flatten()` / scatter  | Dataset collection              | pattern     |
| `collect()` / gather   | Collection-aware tool input     | pattern     |
| `task.ext.args`        | Advanced section / explicit param | translation |
| `when:` / conditional  | Workflow variants               | duplication |

The **golden rule** stated repeatedly across the skill: *one Nextflow process =
one Galaxy tool XML*. Subworkflows decompose into a sequence of tool steps with
explicit `input_connections`. Pipelines are expected to **decompose into a
family of smaller `.ga` workflows** ("splitter pattern") rather than a single
mega-workflow when the source has many flags or optional branches.

## 3. Conversion Methodology

Each sub-skill enforces the same outer loop:

1. **Scope clarification with the user** — required inputs include workflow
   name, author, license, annotation, tags. Placeholder values are explicitly
   forbidden.
2. **Static analysis of the Nextflow source** — enumerate processes, channels,
   conditionals; produce a DAG.
3. **Tool discovery** before authoring anything — see § 4.
4. **Plan presentation and approval gate** — the user must confirm the plan
   before any `.xml` or `.ga` is emitted.
5. **Generation** — XML for tools, JSON for workflows.
6. **Validation** — Planemo lint/test for tools; Galaxy import + warning
   triage for workflows.
7. **Documentation** — usage notes, version disclosure, divergence from
   the Nextflow source.

The pipeline-level sub-skill additionally requires a "best-practice
bioinformatics sanity check" gate: if the requested scope omits steps the
agent considers standard (sort/index, QC, MultiQC aggregation), the agent
must flag and ask before proceeding.

## 4. Tool Discovery Procedure

`check-tool-availability.md` defines a fixed search order:

1. Local clone of `galaxyproject/tools-iuc`.
2. `tools-iuc` on GitHub.
3. Other known repositories: `genouest/galaxy-tools`, `bgruening/galaxytools`,
   `ARTbio/tools-artbio`, `galaxyproject/tools-devteam`.
4. Galaxy Main ToolShed search.
5. Web search.

A distinction is drawn between **installed on target instance**, **available
to install** (wrapper exists somewhere), and **missing** (no wrapper at all).
Only the third case authorizes new tool authoring. Discovery output is
recorded as an explicit tool inventory table (process / tool / status / action)
that becomes input to the conversion plan.

A `check_tool.sh` shell helper composes search URLs for several repositories;
no automated cross-repo querying is shipped beyond that. A separate
`galaxy-integration` skill (referenced but outside this directory) provides
MCP / BioBlend-based live querying of a Galaxy instance.

## 5. Process → Tool Translation

`process-to-tool.md` defines a per-element transformation:

- **Container** (`biocontainers/<pkg>:<ver>--<hash>`) → `<requirement
  type="package" version="<ver>"><pkg></requirement>`. A lookup table for
  ~14 common tools is included; otherwise the package name is parsed from the
  container string or `environment.yml`.
- **`path()` inputs** → `<param type="data" format="...">`. Format is selected
  via `datatype-mapping.md`, which tabulates ~30 file-extension → Galaxy
  datatype mappings (sequence, alignment, tree, annotation, tabular, JSON,
  HyPhy-specific).
- **`val()` inputs** → typed `<param>` (`select`, `boolean`, `int`, `float`,
  `text`).
- **Optional inputs** → `optional="true"` plus Cheetah `#if` guards in the
  command block.
- **Outputs** → `<data>` elements; `emit:` name becomes the `name` attribute.
  `versions.yml` is dropped (Galaxy tracks versions itself).
- **Script** → `<command detect_errors="exit_code"><![CDATA[…]]></command>`,
  with single-quoted variable interpolations and CDATA wrapping.
- **`task.ext.args`** → either an "advanced" section with a free-text param
  or explicit per-flag parameters.

A worked example (`HYPHY_FEL`) is included in full.

## 6. Workflow → `.ga` Translation

`workflow-to-ga.md` describes the `.ga` JSON schema as understood by the
skill:

- Workflow inputs are `data_input` / `data_collection_input` steps.
- Tool steps carry `tool_id`, `tool_version`, `inputs` (parameters and
  `connections`), and `label`.
- Connections are by upstream step `id` + `output_name`.
- Collections are produced and consumed via `discover_datasets` and
  collection-aware operators (`__FLATTEN__`, `__MERGE_COLLECTION__`,
  `__FILTER_FAILED_DATASETS__`).
- Three authoring routes are presented: Galaxy UI export (recommended),
  programmatic via `galaxy-mcp`, and direct hand-written JSON ("error-prone").

The skill encodes a substantial **caveats section** that dominates the
`.ga`-authoring procedure. The most-emphasized failure modes:

1. **UUID validity** — every `uuid` field must be a real UUID4 and unique
   across the workflow; descriptive strings cause import errors.
2. **Tool-ID / owner / version mismatch** — a tool may exist under a
   different ToolShed owner than expected, and `+galaxyN` suffixes vary
   per instance. The agent is instructed to resolve against the target
   instance when accessible and otherwise to mark `tool_id` / `tool_version`
   as placeholders.
3. **Tool semantics ≠ tool existence** — finding a same-named wrapper does
   not prove it does what the Nextflow step does. Example given:
   `seqkit_split2` exists but splits into chunks, not one-record-per-dataset.
4. **`input_connections` parameter-name mismatches** — tool XML often
   exposes inputs through conditional paths
   (`reference_cond|reference_history`, not `reference`). Wrong key →
   silent dataset-empty warnings on import.
5. **Conditional selectors in `tool_state`** — connecting an upstream
   dataset is insufficient if a `select`-driven branch was not chosen;
   Galaxy will treat the input as missing.
6. **Galaxy import-warning interpretation** — distinct categories
   (benign default-fill, real bug, environment mismatch) are listed with
   recommended responses. The agent is told to ask the user to paste the
   warning report after import.

These caveats are repeated nearly verbatim in
`nf-pipeline-to-galaxy-workflow/SKILL.md`, indicating they were considered
load-bearing across all `.ga`-emitting flows.

## 7. Validation Surface

The skill assumes external validators:

- **Planemo** for tool-level XML lint and test execution.
- **Galaxy instance import** for workflow-level structural validation; the
  instance's import warnings are the primary signal.
- **Manual semantic comparison** of Galaxy outputs against Nextflow outputs
  for end-to-end validation.

There is no in-skill schema-driven validator. Static checks reduce to
"read the tool XML and compare strings." Type-level checks of input/output
compatibility between connected steps are not described.

## 8. Inputs, Outputs, and User-Interaction Pattern

**Inputs the agent expects to be available:**
- Nextflow source tree (processes, subworkflows, main workflow).
- Optional clone of `tools-iuc` (improves discovery latency).
- Optional credentials for a target Galaxy instance (enables tool-version
  resolution and import-warning triage).
- User responses for metadata, scope, and tool-placement decisions.

**Outputs produced:**
- Galaxy tool XML files (one per missing process).
- Galaxy workflow `.ga` JSON files (one per subworkflow / workflow variant).
- Optional auxiliary files: `macros.xml`, test data, README.

**Interaction pattern:** the skill is explicitly **gated**. Approval
checkpoints exist at scope confirmation, tool placement (tools-iuc vs.
custom), and post-plan-pre-implementation. Caveats are surfaced to the user
rather than auto-resolved.

## 9. Dependencies on Other Skills

The skill references but does not contain:

- `../../galaxy-integration/` — MCP / BioBlend integration for live tool
  lookup, workflow import, invocation monitoring.
- `../../tool-dev/` — generic Galaxy tool authoring procedure (used when
  the chosen placement is `tools-iuc`).

Discovery of tools on a live instance, programmatic workflow import, and
invocation monitoring are delegated to `galaxy-integration`.

## 10. Coverage and Known Gaps

Explicitly handled:

- Linear pipelines, parallel branches, scatter / gather via collections.
- Container-based requirement extraction.
- A fixed set of common datatype extensions.
- A small set of common bioconda packages.
- HyPhy-specific output typing.

Explicitly limited or workaround-only:

- **Conditionals** beyond simple selector branches — recommended workaround
  is "publish multiple workflow variants."
- **Dynamic file patterns** — collections + discover_datasets, with manual
  pattern authoring.
- **Groovy logic in scripts** — pre-processing tools or manual translation;
  no automated approach.
- **`task.ext.args` configuration layering** — flattened to either explicit
  parameters or a free-text advanced field.
- **Meta-map propagation** — discarded; element identifiers used instead.

Not addressed:

- Sub-workflow nesting beyond a brief mention of Galaxy 21.05+ syntax.
- Programmatic emission of `.ga` from a structured intermediate
  representation; the skill assumes either UI export or hand-written JSON.
- Differential / round-trip fidelity (Galaxy → Nextflow direction).
- Type-checked connection compatibility prior to instance import.

## 11. Example Material

`examples/capheine-mapping.md` documents an end-to-end conversion of the
CAPHEINE viral-genomics pipeline. Highlights:

- 15/15 tools were already present in `tools-iuc`; no new tool authoring
  was required.
- Conversion reduced to workflow assembly (two `.ga` files: preprocessing,
  analyses).
- The example is referenced from all three sub-skills as the canonical
  case study; it represents the "ideal case" where tool discovery succeeds
  for every process.

`tool-checking-example.md` walks the discovery procedure for a single tool
across each repository in the search order.

## 12. Summary

`nf-to-galaxy` is a **prose-and-procedure skill** that translates
Nextflow source artifacts into Galaxy artifacts by:

- modeling Nextflow → Galaxy as a fixed concept-mapping table,
- discovering existing wrappers before generating new ones,
- generating tool XML from per-element transformations,
- generating workflow `.ga` JSON from a DAG with explicit step / connection
  modeling,
- validating externally via Planemo and Galaxy instance import,
- gating each major step on user approval.

Conversion correctness is enforced by **read-the-source discipline** (read
the actual tool XML, the actual ToolShed owner, the actual installed
version) and by **post-hoc instance feedback** (import warnings).
There is no programmatic schema or static type system in the loop;
correctness obligations rest on the agent's adherence to the procedure
and on validators run after generation.

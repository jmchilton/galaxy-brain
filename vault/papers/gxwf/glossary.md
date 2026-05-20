# Glossary

Shared vocabulary for the gxformat2/gxwf paper. If the manuscript, outline, figures, or agent planning drift on terminology, update this file first and then normalize the dependent text.

## Canonical Usage Rules

- Use **Format 2 workflow** for the human-readable and writable Galaxy workflow representation.
- Use **`gxformat2`** for the library/project that works with Format 2 workflows.
- Use **`.gxwf.yml`** for the typical YAML file extension.
- Use **native Galaxy workflow** or **native `.ga` workflow** for Galaxy's JSON workflow representation.
- Use **`gxwf`** for the schema-aware validation and authoring tooling built around Format 2/native workflow validation.
- Avoid using `gxformat2` to mean the format itself.
- Avoid using **Format2** in prose unless quoting source code, command output, or existing documentation.

## Terms

**Agent-writable workflow** — A workflow representation that is compact, structured, and explicit enough for an AI agent to generate or edit, and that can be checked by tools before execution. This does not mean the agent is assumed to be correct; it means the artifact supports a validation-and-repair loop.

**Authoring surface** — The representation or interface where a workflow is created or modified. In this paper, the key authoring surfaces are Format 2 YAML, the `gxwf` CLI, VS Code, the browser editor, and CI-style validation.

**Connection validation** — Static checking that workflow step outputs are compatible with connected inputs, including Galaxy data and collection semantics.

**Format 2 workflow** — A human-readable and writable Galaxy workflow, typically expressed in YAML and stored with the `.gxwf.yml` extension. This is the format-level artifact humans and agents can inspect, edit, generate, diff, and review.

**Galaxy workflow** — A reusable Galaxy analysis graph: inputs, tool steps, connections, step state, annotations, and related workflow metadata. A Galaxy workflow may be represented as native `.ga` JSON or as a Format 2 workflow.

**`gxformat2`** — The library for working with Format 2 workflows. Use this term for the software package/project, not for the workflow format.

**`gxwf`** — The schema-aware workflow validation and authoring tooling around Galaxy workflows. In the paper, `gxwf` names the layer that validates Format 2 and native workflows against Galaxy tool metadata and exposes that capability through CLI, browser, VS Code, reports, and CI-style workflows.

**Human-readable workflow** — A workflow representation whose structure and meaningful state can be understood in text form without relying on the Galaxy GUI. In this paper, human-readable should also imply reviewable in ordinary software workflows such as diffs and pull requests.

**Human-writable workflow** — A workflow representation a person can reasonably edit directly, not merely a serialization that happens to be text. Format 2 is the paper's key human-writable Galaxy workflow representation.

**Native Galaxy workflow** — Galaxy's native JSON workflow representation, usually exported as `.ga`. Native workflows are complete and operationally important, but their encoded `tool_state` is not the preferred human/agent authoring surface.

**Schema-aware validation** — Validation that uses Galaxy tool schemas, not only generic workflow syntax. This includes parameter names, parameter types, select options, conditional branches, repeats, sections, connected inputs, and collection requirements.

**Static validation** — Validation performed before workflow execution. Static validation can catch authoring errors without scheduling jobs or consuming compute.

**Structural validation** — Validation of the workflow document's general shape: steps, inputs, outputs, connections, required top-level fields, and syntax. Structural validation is necessary but shallower than schema-aware validation of individual tool invocations.

**Tool schema** — The machine-readable declaration of a Galaxy tool's inputs, parameter types, constraints, select options, conditional structure, help text, outputs, and collection requirements.

**Tool state** — The saved parameterization of a Galaxy tool step inside a workflow. In Format 2 workflows, this appears as structured `state`; in native `.ga` workflows, this is commonly encoded as `tool_state`.

**ToolShed metadata** — The versioned Galaxy tool metadata available through ToolShed/TRS APIs and local caches. In this paper, ToolShed metadata is the source of the typed tool schemas that make deep static validation possible.

**Workflow-state validation** — The broader validation problem of checking saved workflow step state against tool definitions. In the manuscript, prefer the more specific phrase **schema-aware workflow-state validation** when describing the core contribution.

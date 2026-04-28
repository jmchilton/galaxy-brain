# White Paper: `workflow-reports` Skill

A technical description of the `workflow-reports` skill in
`galaxy-skills/wf_dev` (path: `workflow-reports/`). This document
describes the skill's structure, content, methodology, inputs/outputs,
and the underlying Galaxy "workflow report" mechanism it targets. It does
not evaluate fit against any external goal.

---

## 1. Shape and Packaging

A single, flat skill — no sub-skills, no router. Layout:

```
workflow-reports/
  SKILL.md                                  # entry point, full procedure
  README.md                                 # short orientation
  references/directives.md                  # full Galaxy markdown directive reference
  examples/histology-staining.md            # complete worked example
  examples/tissue-microarray-analysis.md    # second worked example
```

Total content: ~700 lines of markdown. The skill is self-contained;
unlike `nf-to-galaxy` it does not delegate to or compose with other skills.
The skill description string in frontmatter explicitly enumerates trigger
phrases ("create a report for this workflow", "draft a workflow report
template", "write a Galaxy report for workflow <id/url>").

## 2. Domain Object: The Galaxy Workflow Report

The skill targets a specific Galaxy artifact: the **markdown stored at
`report.markdown` inside a Galaxy workflow**. This markdown is rendered by
Galaxy after a workflow invocation and is also editable in the Workflow
Editor's **Report** tab. A `.ga` workflow file already contains a
`report.markdown` field; Galaxy populates it with a minimal default
(`invocation_inputs`, `invocation_outputs`, `workflow_display`) which the
skill is designed to replace.

The markdown is a **template**: it is authored once, against the workflow
definition, and re-rendered for every invocation by substituting live
invocation data into the embedded **directives**. The skill therefore
operates on the *workflow definition*, not on any particular run.

## 3. Directive Mechanism

Galaxy markdown reports interpolate live data through fenced "directive"
blocks:

````
```galaxy
directive_name(arg=value)
```
````

Strict rules encoded in the skill:

- **Block syntax only.** One directive per fenced block. Inline
  `${galaxy ...}` syntax is documented as non-functional.
- **Reference by label, not ID.** In a workflow template the agent uses
  `input="<label>"`, `output="<label>"`, `step="<label>"`. Encoded
  history/dataset IDs (`history_dataset_id=`) belong to direct/notebook
  contexts, not to templates.

`references/directives.md` enumerates the full directive surface in five
categories:

- **Dataset directives** — render history items: `history_dataset_display`,
  `history_dataset_as_image`, `history_dataset_as_table`,
  `history_dataset_embedded`, `history_dataset_link`,
  `history_dataset_peek`, `history_dataset_info`, `history_dataset_name`,
  `history_dataset_type`, `history_dataset_index`,
  `history_dataset_collection_display`. Common arguments include `output`,
  `input`, `title`, `footer`, `compact`, `show_column_headers`, `collapse`.
- **Invocation directives** — `invocation_inputs()`,
  `invocation_outputs()`, `invocation_time()`, `history_link()`.
- **Job directives** — keyed by step label: `job_parameters(step=)`,
  `job_metrics(step=)`, `tool_stdout(step=)`, `tool_stderr(step=)`.
- **Workflow directives** — `workflow_image()`, `workflow_display()`,
  `workflow_license()`.
- **Utility directives** — `generate_time()`, `generate_galaxy_version()`,
  `instance_access_link()`, `instance_citation_link()`,
  `instance_help_link()`.
- A universal `collapse="<link text>"` argument wraps any block into a
  collapsible section.

## 4. Required Inputs

The skill requires the **full workflow definition** in either form:

**Option A — `.ga` file.** Read the file directly. Output is written into
its `report.markdown` field with user confirmation.

**Option B — Galaxy API.** GET
`https://<instance>/api/workflows/<id>/download?style=editor`. The
`?style=editor` qualifier is **required**: the standard endpoint omits
`step.label` and `workflow_outputs`, both of which are necessary to write
label-based directives. The skill instructs the agent to derive the
download URL from a browser URL when the user supplies one.

The skill optionally consumes a co-located `README.md` next to the `.ga`
file (common in IWC workflows) for richer prose than the `annotation`
field provides.

## 5. Procedure

The skill defines a four-step authoring procedure:

### Step 1 — Parse the workflow

Extract from each step:

- **Inputs**: steps where `type ∈ {data_input, data_collection_input}`.
  Capture `label` (used in directives), `annotation` (used only in prose),
  `type` (single vs. collection).
- **Workflow outputs**: steps where `workflow_outputs` is non-empty.
  Capture `workflow_outputs[].label` (for `output="..."`), `step.label`
  (for `step="..."`), `step.annotation` (for prose).
- **Top-level metadata**: `name`, `annotation`, `tags`, `license`,
  `creator`.

A distinction is emphasized: `step.label` is a short identifier suitable
for directives, while `step.annotation` is a long prose description that
must not be substituted into directive arguments.

### Step 2 — Select which outputs to feature

Not every marked output should appear as a section. The skill encodes a
selection heuristic:

- **Always include**: the terminal tabular result; outputs that are the
  direct basis of the quantitative result (e.g. the binary mask the area
  measurement was computed from).
- **Include selectively**: intermediate images that aid debugging, biased
  toward outputs closer to the pipeline tail.
- **Skip / collapse**: pure intermediates and outputs duplicating
  information shown elsewhere.
- Tie-breaker: which output would a user inspect first if results
  looked wrong.

### Step 3 — Classify selected outputs to directives

A short type → directive table:

| Output type                       | Directive |
|-----------------------------------|-----------|
| Image (TIFF, PNG, JPEG)           | `history_dataset_as_image(output="…")` |
| Collection of images              | `history_dataset_as_image(output="…")` (same directive) |
| Tabular / TSV / CSV               | `history_dataset_as_table(...)` + `history_dataset_link(...)` |
| HTML / text                       | `history_dataset_embedded(output="…")` |
| Unknown                           | `history_dataset_display(output="…")` |

For inputs: `history_dataset_as_image(input="…")` for image inputs;
`invocation_inputs()` otherwise.

### Step 4 — Build the report

A fixed section skeleton:

1. **Title + run timestamp** (`invocation_time()`).
2. **Summary** — one paragraph synthesized from `name`, `annotation`,
   step annotations; ends with `workflow_image()`.
3. **Inputs** — prose plus appropriate input directive.
4. **Key output sections** — one per selected output, each with brief
   conditional prose plus its directive.
5. **Results** — present when tabular outputs exist: a markdown table
   describing expected columns *before* the data directive, followed by
   `history_dataset_as_table(...)` and `history_dataset_link(...)`.
6. **Reproducibility** — `history_link()`.

Optional sections: `job_parameters(step=…, collapse=…)` for analytically
significant steps; `invocation_outputs()` when the full output listing is
warranted; `workflow_display(collapse=…)` for the full step breakdown.

## 6. Authorial Discipline

The skill enforces a "templates are pre-run" stance. Three rules:

- **No assumption of input validity** — prose uses "expects",
  "is designed to", "should be".
- **No assumption of run success** — prose uses "if the run completed
  successfully, this should show…".
- **No biological / scientific interpretation** — column descriptions
  state what a column *measures*, never what a value *means*.

Annotations from the workflow definition are used to *inform* prose; the
skill explicitly prohibits verbatim copying.

## 7. Documented Failure Modes ("Gotchas")

The skill enumerates a small set of recurring issues and prescribed
responses:

| Issue | Response |
|---|---|
| `step.label` is null | Skip `job_parameters(step=…)` for that step; use it only where label is non-null. |
| A step whose output should be reportable has empty `workflow_outputs` | Surface to the user; instruct them to star the output in the Workflow Editor and save. The directive cannot reference unmarked outputs. |
| An important terminal output (e.g. final column-computation step) is unmarked | Name the step and what it produces; do not silently substitute an upstream output. |
| Step annotations are very long | Use as prose source; never copy verbatim into report body. |
| Multiple image outputs across stages | Prefer the output closest to the final result. |

After drafting, the skill requires the agent to explicitly flag any
**unmarked-but-needed** outputs and any **label-less steps** referenced
in prose.

## 8. Outputs

Two delivery modes:

- **`.ga` file workflow**: the drafted markdown is written into the
  `report.markdown` field of the `.ga` file (with explicit user
  confirmation).
- **Live-instance workflow**: the drafted markdown is presented in a
  fenced code block for the user to paste into the Workflow Editor's
  Report tab.

Either way the deliverable is a self-contained markdown document
combining prose, markdown column tables, and Galaxy directive blocks.

## 9. Example Material

`examples/histology-staining.md` is a complete worked artifact. It
includes:

- The extracted input table (one `data_collection_input` step with its
  label and annotation).
- The extracted `workflow_outputs` table (six entries, with step label,
  output label, and type).
- A noted gap: a `Percent area computation` step computes the
  `percent_area` column but is not marked as a workflow output; the
  marked output is the pre-`percent_area` table. The example explicitly
  flags this and says the user must star it.
- The selected step labels for `job_parameters`.
- A column-description table for the final tabular output.
- The fully assembled report template.
- A short "notes" section explaining the choice of which image output to
  feature and why `job_parameters` was omitted from this particular
  template.

A second example, `tissue-microarray-analysis.md`, follows the same
pattern for a different imaging workflow.

## 10. Coverage and Limits

Explicitly handled:

- Single-dataset and collection inputs.
- Image outputs (single and collection, identical directive).
- Tabular outputs with column documentation tables.
- HTML / text outputs.
- Workflows authored both as `.ga` files and as live-instance entities.
- `step.label` and `workflow_outputs` extraction from
  `?style=editor` API output.
- Conditional, pre-run authorial style.

Out of scope:

- Modifying the `.ga` itself beyond writing `report.markdown` (the skill
  does not star outputs or set step labels — it requests the user do so).
- Generating reports from a workflow that lacks `workflow_outputs`
  entirely; the skill falls back to `invocation_outputs()` but flags
  the deficiency.
- Validating that a directive will resolve at render time. There is no
  pre-render simulation; correctness depends on labels matching exactly.
- Notebook / direct-context usage of directives (`history_dataset_id=`);
  acknowledged but not the target use case.
- Authoring or generating workflows; the skill consumes them.

## 11. Summary

`workflow-reports` is a **single-purpose, self-contained skill** that
produces Galaxy markdown report templates from a workflow definition. It:

- consumes a `.ga` file or `?style=editor` API response,
- extracts a stable set of fields (`step.label`, `workflow_outputs`,
  `annotation`, top-level metadata),
- selects a subset of outputs to feature using documented heuristics,
- maps each selected output to a directive by type,
- assembles a fixed-section skeleton with conditional, pre-run prose and
  block-syntax directives,
- writes the result into the workflow's `report.markdown` (or returns
  it for paste into the Workflow Editor),
- surfaces structural issues in the workflow (unmarked outputs, missing
  step labels) as actionable user instructions.

The skill is reference-heavy on **directive syntax** and procedure-light;
once the input is parsed and outputs are classified, template assembly
follows a deterministic skeleton.

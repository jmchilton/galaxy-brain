---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
status: draft
created: 2026-02-19
revised: 2026-02-19
revision: 1
ai_generated: true
component: Workflow Formats (native vs Format2)
galaxy_areas: [workflows]
---

# Galaxy Workflow Formats: gxformat2 vs Native (.ga)

A comparison of Galaxy's two workflow serialization formats — the native JSON format (`.ga`) and the Format2 YAML format (`.gxwf.yml`) — covering design philosophy, structural differences, and practical implications.

## Design Philosophy

**Native (.ga)** is the canonical internal format. It mirrors the database schema directly — steps keyed by numeric IDs, connections as step-ID references, tool state as double-encoded JSON strings. It was designed for machine consumption: lossless round-trips through Galaxy's ORM, every field present, nothing inferred.

**Format2 (.gxwf.yml)** was designed for human authorship. It borrows CWL conventions — labeled steps, `in`/`source` connection syntax, top-level `inputs`/`outputs` sections. It optimizes for readability by inferring defaults, using semantic labels instead of numeric IDs, and representing tool state as structured YAML instead of JSON strings. It is always converted to native format before Galaxy processes it.

## Structural Comparison

### Document Root

| Aspect | Native (.ga) | Format2 (.gxwf.yml) |
|---|---|---|
| Format marker | `"a_galaxy_workflow": "true"` | `class: GalaxyWorkflow` |
| Format version | `"format-version": "0.1"` (frozen since inception) | `format-version: v2.0` (optional) |
| Serialization | JSON | YAML |
| Workflow name | `"name"` | `label` (also accepts `name`) |
| Description | `"annotation"` | `doc` (also accepts `annotation`) |
| Inputs | Encoded as steps with `type: data_input` etc. | Top-level `inputs:` section |
| Outputs | `workflow_outputs` arrays embedded in steps | Top-level `outputs:` with `outputSource` |
| Steps | Dict keyed by string integers (`"0"`, `"1"`, ...) | Dict keyed by semantic labels |

Both formats share identical support for: `tags`, `uuid`, `license`, `release`, `creator`, `report`, `readme`, `help`, `logo_url`, `doi`, `source_metadata`.

### Inputs

**Native**: Inputs are steps. A dataset input is a step with `type: data_input` and relevant configuration in `tool_state`:

```json
{
  "0": {
    "id": 0,
    "type": "data_input",
    "label": "Input BAM file",
    "name": "Input dataset",
    "tool_state": "{\"optional\": false, \"format\": [\"bam\"], \"tag\": null}",
    "input_connections": {},
    "outputs": [],
    "workflow_outputs": []
  }
}
```

**Format2**: Inputs are first-class citizens with a dedicated section:

```yaml
inputs:
  input_bam:
    type: data
    doc: "Aligned reads in BAM format"
    format: bam
    optional: false
```

Format2 shorthand: `input_bam: data` — a single word declares a required dataset input.

**Key differences**:
- Format2 uses type aliases (`data` instead of `data_input`, `integer` instead of `parameter_input` with `parameter_type: integer`)
- Format2 flattens `tool_state` fields (`format`, `optional`, `collection_type`) to top-level input properties
- Format2 supports array type notation (`[string]` for multi-valued params)
- Native represents every input as a full step object with `position`, `uuid`, `errors`, `outputs` etc.

### Steps

**Native**: Steps are a dict keyed by string integers. Each step carries the full module state:

```json
{
  "1": {
    "id": 1,
    "type": "tool",
    "content_id": "toolshed.g2.bx.psu.edu/repos/iuc/featurecounts/featurecounts/2.1.1+galaxy0",
    "tool_id": "toolshed.g2.bx.psu.edu/repos/iuc/featurecounts/featurecounts/2.1.1+galaxy0",
    "tool_version": "2.1.1+galaxy0",
    "tool_shed_repository": {
      "changeset_revision": "...",
      "name": "featurecounts",
      "owner": "iuc",
      "tool_shed": "toolshed.g2.bx.psu.edu"
    },
    "tool_state": "{\"alignment\": {\"__class__\": \"ConnectedValue\"}, ...}",
    "input_connections": { ... },
    "outputs": [ ... ],
    "workflow_outputs": [ ... ],
    "post_job_actions": { ... },
    "position": {"left": 660, "top": 340},
    "annotation": "",
    "label": "Count features",
    "uuid": "...",
    "when": null,
    "errors": null
  }
}
```

**Format2**: Steps are a dict keyed by labels. Only non-default values need to be specified:

```yaml
steps:
  count_features:
    tool_id: toolshed.g2.bx.psu.edu/repos/iuc/featurecounts/featurecounts/2.1.1+galaxy0
    in:
      alignment: map_reads/mapped
      anno|reference_gene_sets: annotation
    state:
      anno:
        anno_select: history
        gff_feature_type: exon
    out:
      feature_counts:
        rename: "Gene Counts"
```

**Key differences**:
- Format2 steps are identified by label, native by numeric ID
- Format2 infers `type: tool` as default (explicit `type` only needed for `pause`)
- Format2 omits `content_id` (redundant with `tool_id`), `name`, `errors`, `outputs`, `id`
- Format2 omits `position` and `uuid` unless explicitly set
- `tool_state` becomes `state` — structured YAML, not a JSON string

### Connections

This is the most significant syntactic difference between the formats.

**Native**: Connections are in `input_connections`, referencing steps by numeric ID:

```json
"input_connections": {
  "library|input_1": {
    "id": 0,
    "output_name": "output"
  },
  "anno|reference_gene_sets": {
    "id": 4,
    "output_name": "output"
  }
}
```

**Format2**: Connections use CWL-style `in` with label-based references:

```yaml
in:
  library|input_1: raw_reads
  anno|reference_gene_sets: annotation_file
```

Or the expanded form:
```yaml
in:
  library|input_1:
    source: raw_reads/output
```

**Differences in detail**:

| Aspect | Native | Format2 |
|---|---|---|
| Step references | Numeric ID (`"id": 0`) | Label (`raw_reads`) |
| Output references | Always explicit (`"output_name": "output"`) | Implicit default or explicit (`step/output`) |
| Syntax | `input_connections` dict of `{id, output_name}` | `in` dict of strings or `{source}` objects |
| Multiple sources | Array of connection dicts | `source: [step1/out, step2/out]` |
| Defaults | Not in connections | `default: value` alongside `source` |
| Subworkflow routing | `input_subworkflow_step_id` | Implicit from subworkflow input labels |

Format2 also supports an alternative `connect` key (equivalent to `in`) and `$link` directives inside `state` for deeply nested parameter connections:

```yaml
state:
  nested_section:
    deep_param:
      $link: upstream_step/output
```

This has no native equivalent — in native format, any connected value is `{"__class__": "ConnectedValue"}` in `tool_state` and the actual connection source is in `input_connections`.

### Tool State

**Native**: A JSON-encoded string inside JSON. Double-encoded with special markers:

```json
"tool_state": "{\"alignment\": {\"__class__\": \"ConnectedValue\"}, \"anno\": {\"anno_select\": \"history\", \"__current_case__\": 2, \"reference_gene_sets\": {\"__class__\": \"ConnectedValue\"}, \"gff_feature_type\": \"exon\"}, \"__page__\": null, \"__rerun_remap_job_id__\": null}"
```

**Format2**: Structured YAML under `state`, only non-connected, non-default values:

```yaml
state:
  anno:
    anno_select: history
    gff_feature_type: exon
```

**What Format2 omits**:
- `{"__class__": "ConnectedValue"}` — replaced by `in` connections or `$link`
- `{"__class__": "RuntimeValue"}` — replaced by `runtime_inputs` list
- `__current_case__` — inferred from selector values during conversion
- `__page__`, `__rerun_remap_job_id__` — internal bookkeeping, always null/0

### Workflow Outputs

**Native**: Declared per-step in `workflow_outputs` arrays:

```json
{
  "1": {
    "workflow_outputs": [
      {
        "label": "Gene Counts",
        "output_name": "feature_counts",
        "uuid": "9bcb277a-..."
      }
    ]
  }
}
```

Steps with `workflow_outputs: []` have all outputs hidden.

**Format2**: Top-level `outputs` section with `outputSource`:

```yaml
outputs:
  gene_counts:
    outputSource: count_features/feature_counts
```

Format2 is more explicit — outputs are declared centrally rather than distributed across steps. The label (`gene_counts`) is separate from the step's output name (`feature_counts`).

### Post-Job Actions

**Native**: Verbose PJA objects keyed by `{action_type}{output_name}`:

```json
"post_job_actions": {
  "HideDatasetActionout_pairs": {
    "action_type": "HideDatasetAction",
    "output_name": "out_pairs",
    "action_arguments": {}
  },
  "RenameDatasetActionreport": {
    "action_type": "RenameDatasetAction",
    "output_name": "report",
    "action_arguments": {"newname": "Quality Report"}
  }
}
```

**Format2**: Concise `out` dict on the step:

```yaml
out:
  out_pairs:
    hide: true
  report:
    rename: "Quality Report"
```

The Format2 `out` dict merges output-level declarations (PJAs) with the workflow output designation. If a step output appears in both `out` and the top-level `outputs`, it's both a workflow output and has PJAs applied.

### Subworkflows

**Native**: Subworkflow is embedded as a full `.ga` document inside the step, with `input_subworkflow_step_id` routing:

```json
{
  "8": {
    "type": "subworkflow",
    "input_connections": {
      "PE fastq input": {
        "id": 0,
        "input_subworkflow_step_id": 0,
        "output_name": "output"
      }
    },
    "subworkflow": {
      "a_galaxy_workflow": "true",
      "format-version": "0.1",
      "steps": { ... }
    }
  }
}
```

**Format2**: Three mechanisms, all more concise:

```yaml
# 1. Inline
steps:
  nested:
    run:
      class: GalaxyWorkflow
      inputs: { inner_input: data }
      steps: { ... }
    in:
      inner_input: upstream/output

# 2. File import
steps:
  nested:
    run:
      "@import": ./subworkflow.gxwf.yml

# 3. $graph reference
$graph:
  - id: helper
    class: GalaxyWorkflow
    ...
  - id: main
    class: GalaxyWorkflow
    steps:
      nested:
        run: "#helper"
```

Format2 advantages:
- `@import` keeps workflows modular — no giant embedded documents
- `$graph` enables deduplication of shared subworkflows
- Connections are by label, not by `input_subworkflow_step_id`

### Conditional Execution

Both formats support `when` expressions. The syntax is nearly identical:

**Native**:
```json
{
  "when": "$(inputs.when)",
  "input_connections": {
    "when": {"id": 6, "output_name": "output"}
  }
}
```

**Format2**:
```yaml
when: "$(inputs.run_this != 'skip')"
in:
  run_this: boolean_input
```

Format2 can use more expressive `when` expressions directly referencing input names, while native format conventionally routes through a `when` pseudo-input.

### Comments (Editor Annotations)

**Native**: Full comment objects in a top-level `comments` array with position, size, color, type, data, and parent-child relationships (`child_steps`, `child_comments`).

**Format2**: No comment support. Comments are visual editor constructs and are lost during Format2 export. They only exist in native format.

## Information Preserved and Lost

### Native → Format2 (export via `from_galaxy_native()`)

**Preserved**: Workflow name, inputs, outputs, steps, connections, tool state values, PJAs, subworkflows, when expressions, annotations/doc, metadata (license, creator, tags, etc.), report.

**Lost or degraded**:
- Editor comments (text, markdown, frame, freehand) — no Format2 representation
- Step positions — preserved if present but not required
- Step UUIDs — preserved if present but not required
- `__current_case__` markers — inferred, not explicit
- `errors` field on steps — omitted
- `tool_shed_repository` — preserved but often omitted in hand-authored Format2
- Double-encoded tool_state internals (`__page__`, `__rerun_remap_job_id__`)
- Output type declarations on steps (`outputs` array)
- Step `name` field (the tool's display name)

### Format2 → Native (import via `python_to_workflow()`)

**Added/generated**:
- Numeric step IDs assigned in order
- `a_galaxy_workflow: "true"` and `format-version: "0.1"` markers
- `input_connections` from `in`/`connect`/`$link`
- `tool_state` (JSON-encoded) from `state`
- `__current_case__` computed from conditional selector values
- `__page__: null`, `__rerun_remap_job_id__: null`
- `ConnectedValue` markers for connected params
- `RuntimeValue` markers for `runtime_inputs` params
- `post_job_actions` from `out` specs
- `workflow_outputs` on steps from top-level `outputs`
- Input steps from `inputs:` section

**Lost**: Nothing — Format2 is a subset. All Format2 constructs have native equivalents. The conversion is lossless in the Format2→native direction.

## Size and Readability Comparison

A representative workflow (RNA-seq, 15 tool steps, 4 inputs, 6 outputs):

| Metric | Native (.ga) | Format2 (.gxwf.yml) |
|---|---|---|
| Approximate lines | ~800-1200 | ~100-180 |
| Size ratio | 1.0x | ~0.15x |
| Step definition overhead | ~30-50 lines/step | ~5-15 lines/step |
| Input declaration | ~15 lines/input | ~1-3 lines/input |

The 5-8x size reduction comes from:
- No double-encoded JSON strings
- No redundant fields (`content_id` = `tool_id`, `name`, `errors`, `outputs`)
- No numeric IDs (labels serve as keys)
- Structured state vs JSON-in-JSON
- Concise connection syntax
- Top-level inputs/outputs vs embedded-in-steps
- YAML's inherent conciseness vs JSON's verbosity

## Practical Implications

### When to Use Format2
- Hand-authoring workflows (IWC best practice)
- Version control (smaller diffs, meaningful labels)
- Documentation and sharing (human-readable)
- CI/CD pipelines for workflow testing (Planemo)
- Modular workflow composition (`@import`, `$graph`)

### When to Use Native (.ga)
- Galaxy UI export (default format)
- Preserving editor layout and comments
- Maximum fidelity round-trips through Galaxy
- Tooling that expects `.ga` format
- When exact tool_state reproduction matters

### Round-Trip Fidelity

```
Format2 → native → Format2
```

This round-trip is lossy: editor comments are lost, some formatting preferences may change, field ordering may differ. The gxformat2 test suite verifies that round-tripped workflows still lint clean, but byte-level equivalence is not guaranteed.

```
native → Format2 → native
```

This round-trip is also lossy in minor ways: `__current_case__` values may differ if the tool isn't available for validation, `errors` fields are dropped, step ordering may change within equivalence classes.

For practical purposes, both formats produce identical runtime behavior when imported into Galaxy — the same steps execute with the same parameters and connections. The differences are cosmetic and metadata-level.

## Version History

Native format has used `format-version: "0.1"` since its inception. New features are added without version bumps — the format version is effectively frozen.

Format2 uses `format-version: v2.0`. The schema is defined in schema-salad (v19.09 currently) and validated during linting. Format2 has evolved to add features like `when` expressions, `$graph` documents, and sample sheet collection types.

## File Extension Conventions

| Extension | Format | Context |
|---|---|---|
| `.ga` | Native JSON | Galaxy UI export, traditional |
| `.gxwf.yml` | Format2 YAML | Modern convention, IWC standard |
| `.gxwf.json` | Format2 as JSON | Rare, API responses with `style=format2` + JSON download |
| `.abstract.cwl` | CWL abstract | Non-executable CWL representation |
| `.yml` / `.yaml` | Format2 YAML | Also accepted, less specific |

---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/models
status: draft
created: 2026-02-19
revised: 2026-02-19
revision: 1
ai_generated: true
component: Workflow Format (.ga)
galaxy_areas: [workflows, models]
---

# Galaxy Workflow Native Format (.ga) Syntax Reference

The Galaxy native workflow format is a JSON document (conventionally with `.ga` extension) that fully describes a workflow's structure, tools, connections, metadata, and visual layout. It is the canonical serialization — Format2 YAML and CWL inputs are converted to this format before processing.

## Top-Level Structure

```json
{
  "a_galaxy_workflow": "true",
  "format-version": "0.1",
  "name": "My Workflow",
  "annotation": "Description of the workflow",
  "tags": ["tag1", "tag2"],
  "uuid": "xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx",
  "version": 3,
  "steps": { ... },
  "comments": [ ... ],
  "report": { ... },
  "creator": [ ... ],
  "license": "MIT",
  "release": "0.1.14",
  "source_metadata": { ... },
  "readme": "...",
  "help": "...",
  "logo_url": "...",
  "doi": ["10.xxxx/yyyy"]
}
```

### Required Keys

| Key | Type | Description |
|-----|------|-------------|
| `a_galaxy_workflow` | `"true"` | Format marker. Always the string `"true"`. |
| `format-version` | `"0.1"` | Format version. Always `"0.1"` currently. |
| `name` | string | Workflow display name. |
| `steps` | object | Step dictionary keyed by string step IDs (see below). |

### Optional Metadata Keys

| Key | Type | Description |
|-----|------|-------------|
| `annotation` | string | Human-readable workflow description. |
| `tags` | string[] | Classification tags. |
| `uuid` | string | UUIDv4 identifier. |
| `version` | int | Internal revision counter. |
| `license` | string | SPDX license identifier (e.g. `"MIT"`, `"CC-BY-4.0"`). |
| `release` | string | Semantic version for published workflows. |
| `creator` | object[] | Creator metadata (see below). |
| `report` | object | Workflow report template. |
| `readme` | string | Detailed description (markdown). |
| `help` | string | Help text (markdown). |
| `logo_url` | string | URL to workflow logo image. |
| `doi` | string[] | Associated DOIs, validated on import. |
| `source_metadata` | object | Provenance tracking for TRS/URL imports. |
| `comments` | object[] | Visual comments in the workflow editor. |
| `subworkflows` | object | Map of locally-defined subworkflow dicts (used during format conversion). |

### Creator Metadata

```json
"creator": [
  {
    "class": "Person",
    "name": "Jane Doe",
    "identifier": "https://orcid.org/0000-0001-2345-6789",
    "url": "https://example.com"
  },
  {
    "class": "Organization",
    "name": "Example Lab"
  }
]
```

`class` is `"Person"` or `"Organization"`. `identifier` is typically an ORCID URL.

### Report Template

```json
"report": {
  "markdown": "# Workflow Report\n\n```galaxy\nhistory_dataset_as_image(output=\"plot\")\n```\n"
}
```

The markdown supports Galaxy template directives:
- `history_dataset_embedded(output="...")` — inline dataset content
- `history_dataset_as_image(output="...")` — render image output
- `history_dataset_as_table(output="...")` — render tabular output
- `invocation_inputs()` — display workflow inputs

## Steps Dictionary

Steps are keyed by string integers. The keys serve as external IDs for connection wiring. Steps are iterated in sorted numeric order during import.

```json
"steps": {
  "0": { ... },
  "1": { ... },
  "2": { ... }
}
```

### Common Step Fields

Every step has these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Step ID (matches the dict key). |
| `type` | string | Step type (see Step Types below). |
| `annotation` | string | Step description. |
| `label` | string\|null | User-friendly step label. Must be unique within the workflow. |
| `name` | string | Display name. For tools this is the tool name; for inputs it's the generic type name. |
| `uuid` | string | UUIDv4 for this step. Must be unique within the workflow. |
| `position` | object | Visual position in the editor: `{"left": float, "top": float}`. |
| `when` | string\|null | Conditional execution expression (see Conditional Execution). |
| `input_connections` | object | Connections from other steps' outputs (see Connections). |
| `inputs` | object[] | Input parameter descriptions (metadata, not connections). |
| `outputs` | object[] | Output descriptions with names and types. |
| `workflow_outputs` | object[] | Outputs designated as workflow-level outputs. |
| `content_id` | string\|null | Tool ID or content identifier. Same as `tool_id` for tool steps. |
| `tool_id` | string\|null | Tool identifier, null for non-tool steps. |
| `tool_version` | string\|null | Tool version string. |
| `tool_state` | string | JSON-encoded tool configuration state (see Tool State). |
| `errors` | any | Error information from module creation. |

## Step Types

The `type` field determines how the step is parsed. Six types exist:

### `data_input` — Dataset Input

Declares a single dataset as workflow input.

```json
{
  "id": 0,
  "type": "data_input",
  "label": "Input BAM file",
  "name": "Input dataset",
  "content_id": null,
  "tool_id": null,
  "tool_version": null,
  "tool_state": "{\"optional\": false, \"format\": [\"bam\"], \"tag\": null}",
  "input_connections": {},
  "inputs": [
    {
      "description": "Aligned reads in BAM format",
      "name": "Input BAM file"
    }
  ],
  "outputs": [],
  "workflow_outputs": []
}
```

**Tool state fields:**
- `optional` (bool) — whether the input is required
- `format` (string[]) — allowed file format extensions (e.g. `["bam"]`, `["fastqsanger", "fastqillumina"]`)
- `tag` (string|null) — tag filter

### `data_collection_input` — Collection Input

Declares a dataset collection (list, paired, etc.) as workflow input.

```json
{
  "id": 0,
  "type": "data_collection_input",
  "label": "PE fastq input",
  "name": "Input dataset collection",
  "tool_state": "{\"optional\": false, \"tag\": \"\", \"collection_type\": \"list:paired\"}",
  "input_connections": {},
  "inputs": [
    {
      "description": "Should be a paired collection with Hi-C fastqs",
      "name": "PE fastq input"
    }
  ]
}
```

**Tool state fields:**
- `optional` (bool)
- `tag` (string|null)
- `collection_type` (string) — collection structure:
  - `"list"` — flat list
  - `"paired"` — forward/reverse pair
  - `"list:paired"` — list of paired datasets
  - `"list:list"` — nested lists

### `parameter_input` — Parameter Input

Declares a typed parameter as workflow input.

```json
{
  "id": 1,
  "type": "parameter_input",
  "label": "genome name",
  "name": "Input parameter",
  "tool_state": "{\"parameter_type\": \"text\", \"optional\": false}"
}
```

**Tool state fields:**
- `parameter_type` (string) — `"text"`, `"integer"`, `"float"`, `"boolean"`, `"color"`, `"directory_uri"`
- `optional` (bool)
- `default` (any) — default value for the parameter
- `restrictions` (string[]) — allowed values, creates a dropdown. Example from production:
  ```json
  {"restrictions": ["", "--cis-only", "--trans-only"], "parameter_type": "text", "optional": false}
  ```
- `suggestions` (string[]) — suggested values for text
- `validators` (object[]) — regex validation rules
- `min` / `max` (number) — bounds for integer/float
- `multiple` (bool) — allow multiple text selections
- `restrictOnConnections` (bool) — restrict choices based on connected tool's allowed values

### `tool` — Tool Execution Step

Invokes a Galaxy tool.

```json
{
  "id": 5,
  "type": "tool",
  "label": "Cutadapt (remove adapter + bad quality bases)",
  "name": "Cutadapt",
  "content_id": "toolshed.g2.bx.psu.edu/repos/lparsons/cutadapt/cutadapt/4.4+galaxy0",
  "tool_id": "toolshed.g2.bx.psu.edu/repos/lparsons/cutadapt/cutadapt/4.4+galaxy0",
  "tool_version": "4.4+galaxy0",
  "tool_shed_repository": {
    "changeset_revision": "8c0175e03cee",
    "name": "cutadapt",
    "owner": "lparsons",
    "tool_shed": "toolshed.g2.bx.psu.edu"
  },
  "tool_state": "{\"adapter_options\": {\"action\": \"trim\"}, ...}",
  "input_connections": {
    "library|input_1": {
      "id": 0,
      "output_name": "output"
    }
  },
  "outputs": [
    {"name": "out_pairs", "type": "input"},
    {"name": "report", "type": "txt"}
  ],
  "post_job_actions": { ... },
  "workflow_outputs": [
    {
      "label": "Trimmed reads",
      "output_name": "out_pairs",
      "uuid": "..."
    }
  ]
}
```

**Tool-specific fields:**
- `tool_shed_repository` — origin metadata for Tool Shed tools:
  - `changeset_revision` — specific revision hash
  - `name` — repository name
  - `owner` — repository owner
  - `tool_shed` — Tool Shed hostname (e.g. `"toolshed.g2.bx.psu.edu"`)
- `tool_uuid` — for dynamic (inline-defined) tools
- `tool_representation` — dynamic tool definition (admin only)
- `post_job_actions` — actions after tool execution (see Post-Job Actions)

**Built-in "tools"** use short `content_id` values:
- `"__APPLY_RULES__"` — collection rule application
- `"param_value_from_file"` — extract parameter from file
- `"cat1"` — concatenate datasets
- `"wig_to_bigWig"` — format conversion
- Various `__BUILD_LIST__`, `__FLATTEN__`, `__FILTER_FAILED_DATASETS__`, etc.

### `subworkflow` — Nested Workflow

Embeds or references another workflow.

```json
{
  "id": 8,
  "type": "subworkflow",
  "name": "Hi-C_fastqToPairs_hicup",
  "tool_id": null,
  "input_connections": {
    "PE fastq input": {
      "id": 0,
      "input_subworkflow_step_id": 0,
      "output_name": "output"
    },
    "genome name": {
      "id": 1,
      "input_subworkflow_step_id": 1,
      "output_name": "output"
    }
  },
  "subworkflow": {
    "a_galaxy_workflow": "true",
    "format-version": "0.1",
    "name": "Hi-C_fastqToPairs_hicup",
    "steps": { ... }
  }
}
```

**Resolution order during import:**
1. **Embedded** — `subworkflow` key contains a full workflow dict (recursively parsed)
2. **Local reference** — `content_id` references a key in the top-level `subworkflows` map
3. **Database reference** — `content_id` is an existing stored workflow ID

**Subworkflow connections** use `input_subworkflow_step_id` to map parent connections to the subworkflow's input steps by step ID.

### `pause` — Manual Intervention

Halts execution until a user resumes it.

```json
{
  "id": 3,
  "type": "pause",
  "label": "Review QC before continuing",
  "name": "Pause for manual review"
}
```

## Connections (`input_connections`)

The `input_connections` object maps each step input name to its data source.

### Basic Connection

```json
"input_connections": {
  "input1": {
    "id": 0,
    "output_name": "output"
  }
}
```

- Key is the **input parameter name** on this step
- `id` is the **step ID** of the source step
- `output_name` is the **output name** on the source step (typically `"output"` for input steps)

### Nested Parameter Connections

Tool parameters within conditionals or sections use pipe (`|`) notation:

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

The pipe separates nesting levels in the tool form hierarchy. For example, `"library|input_1"` means the `input_1` parameter inside the `library` conditional/section.

### Repeated/Array Inputs

Tools accepting multiple inputs at indexed positions:

```json
"input_connections": {
  "results_0|software_cond|output_0|input": {"id": 10, "output_name": "outfile"},
  "results_0|software_cond|output_1|input": {"id": 15, "output_name": "outfile"},
  "results_0|software_cond|output_2|input": {"id": 18, "output_name": "outfile"}
}
```

Numeric segments represent repeat element indices.

### Multiple Connections to Same Input

When an input accepts multiple values, the connection value can be a list:

```json
"input_connections": {
  "input1": [
    {"id": 0, "output_name": "output"},
    {"id": 1, "output_name": "output"}
  ]
}
```

Galaxy normalizes single connections (plain dict) and multi-connections (list of dicts) during import.

### Subworkflow Input Connections

For subworkflow steps, connections include `input_subworkflow_step_id` to route to the correct input step inside the subworkflow:

```json
"input_connections": {
  "PE fastq input": {
    "id": 0,
    "input_subworkflow_step_id": 0,
    "output_name": "output"
  }
}
```

The connection key matches the **label** of the subworkflow's input step, and `input_subworkflow_step_id` is the internal step ID within the subworkflow.

## Tool State (`tool_state`)

A JSON-encoded string containing the tool's parameter configuration. This is the serialized form of the tool's parameter tree.

### Structure

```json
"tool_state": "{\"param1\": \"value1\", \"conditional_param\": {\"selector\": \"option_a\", \"__current_case__\": 0, \"nested_param\": \"value\"}, \"__page__\": null, \"__rerun_remap_job_id__\": null}"
```

Note: The value is a **string** containing JSON, not a nested object. It must be JSON-decoded to access the parameters.

### Special Markers

| Marker | Meaning |
|--------|---------|
| `{"__class__": "ConnectedValue"}` | Value comes from an input connection (not literal). |
| `{"__class__": "RuntimeValue"}` | Value determined at runtime (user provides at invocation). |
| `"__current_case__"` | Index of the selected branch in a conditional parameter. |
| `"__page__"` | Pagination marker (legacy, usually `null` or `0`). |
| `"__rerun_remap_job_id__"` | For re-running jobs (usually `null`). |

### Example: Tool with Connected and Literal Values

```json
"tool_state": "{\"alignment\": {\"__class__\": \"ConnectedValue\"}, \"anno\": {\"anno_select\": \"history\", \"__current_case__\": 2, \"reference_gene_sets\": {\"__class__\": \"ConnectedValue\"}, \"gff_feature_type\": \"exon\"}, \"strand_specificity\": {\"__class__\": \"ConnectedValue\"}}"
```

- `alignment` — provided by a connection (not hardcoded)
- `anno.anno_select` — literal value `"history"`, selecting case 2 of a conditional
- `anno.reference_gene_sets` — connected input within the conditional
- `anno.gff_feature_type` — literal value `"exon"`

### Input Module Tool State

For non-tool steps, tool_state encodes input configuration:

```json
// data_input
"{\"optional\": false, \"format\": [\"bam\"], \"tag\": null}"

// data_collection_input
"{\"optional\": false, \"tag\": \"\", \"collection_type\": \"list:paired\"}"

// parameter_input (text with restrictions)
"{\"restrictions\": [\"\", \"--cis-only\", \"--trans-only\"], \"parameter_type\": \"text\", \"optional\": false}"

// parameter_input (boolean)
"{\"parameter_type\": \"boolean\", \"optional\": false}"

// parameter_input (integer)
"{\"parameter_type\": \"integer\", \"optional\": false}"
```

## Post-Job Actions

Actions applied to a tool step's outputs after execution. The key is `{action_type}{output_name}`.

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
    "action_arguments": {
      "newname": "Cutadapt Report"
    }
  }
}
```

### Action Types

| Action Type | Arguments | Description |
|-------------|-----------|-------------|
| `HideDatasetAction` | `{}` | Hide output from history view. |
| `RenameDatasetAction` | `{"newname": "..."}` | Rename output dataset. |
| `DeleteIntermediatesAction` | `{}` | Delete intermediate datasets when no longer needed. |
| `ChangeDatatypeAction` | `{"newtype": "tabular"}` | Change output datatype. |
| `TagDatasetAction` | `{"tags": "name:tag"}` | Apply tags to output. |
| `ColumnSetAction` | `{"chromCol": "1", ...}` | Set column metadata. |
| `EmailAction` | `{}` | Send email notification. |

## Workflow Outputs

Outputs are designated per-step in the `workflow_outputs` array. These become the workflow's public outputs when invoked.

```json
"workflow_outputs": [
  {
    "label": "Mapped Reads",
    "output_name": "mapped_reads",
    "uuid": "9bcb277a-bb4d-4629-8c71-4cac7cee4c63"
  }
]
```

- `label` — user-visible label for the output (must be unique across the workflow)
- `output_name` — name of the step's output to expose
- `uuid` — unique identifier for this workflow output

Steps with empty `workflow_outputs: []` have all their outputs hidden by default.

## Step Input Defaults (`in`)

The `in` dict provides default values for step inputs, independent of connections. Only present when defaults are set.

```json
{
  "id": 5,
  "type": "tool",
  "in": {
    "param_name": {
      "default": "some_value"
    }
  }
}
```

During import, `"default"` is a special input name that gets normalized to `"input"` for backward compatibility.

## Conditional Execution (`when`)

Steps can be conditionally executed based on a boolean parameter input.

### Pattern

1. Define a boolean parameter input:
```json
{
  "id": 6,
  "type": "parameter_input",
  "label": "Use featureCounts for generating count tables",
  "tool_state": "{\"parameter_type\": \"boolean\", \"optional\": false}"
}
```

2. Wire the boolean to the step's `when` input and set the expression:
```json
{
  "id": 19,
  "type": "tool",
  "tool_id": "toolshed.g2.bx.psu.edu/repos/iuc/featurecounts/featurecounts/2.1.1+galaxy0",
  "input_connections": {
    "alignment": {"id": 16, "output_name": "mapped_reads"},
    "when": {"id": 6, "output_name": "output"}
  },
  "when": "$(inputs.when)"
}
```

- The `"when"` key in `input_connections` connects a boolean source
- The `"when"` field on the step itself contains the expression `"$(inputs.when)"`
- When the boolean is false, the step (and downstream dependents) are skipped

This works for both tool steps and subworkflow steps. From a production RNA-seq workflow, multiple steps share the same boolean gate — featureCounts, StringTie, Cufflinks, and a MultiQC subworkflow are all conditionally executed based on user choices.

## Comments

Visual annotations in the workflow editor. Stored in the top-level `comments` array.

```json
"comments": [
  {
    "id": 0,
    "type": "text",
    "position": [100.0, 50.0],
    "size": [200.0, 100.0],
    "color": "none",
    "data": {
      "text": "This section handles QC",
      "bold": true,
      "italic": false,
      "size": 2
    }
  },
  {
    "id": 1,
    "type": "frame",
    "position": [80.0, 30.0],
    "size": [500.0, 400.0],
    "color": "blue",
    "data": {"title": "Quality Control"},
    "child_steps": [3, 4, 5],
    "child_comments": [0]
  }
]
```

### Comment Types

| Type | Data Fields | Description |
|------|-------------|-------------|
| `text` | `text`, `bold`, `italic`, `size` | Plain text annotation. |
| `markdown` | `text` | Markdown-rendered annotation. |
| `frame` | `title` | Visual grouping box. Has `child_steps` and `child_comments`. |
| `freehand` | `line` (coordinate list), `thickness` | Freehand drawing. |

## Output Type Declarations

Tool steps declare their possible outputs:

```json
"outputs": [
  {"name": "output_paired_coll", "type": "input"},
  {"name": "report_html", "type": "html"},
  {"name": "report_json", "type": "json"}
]
```

The `type` field is a Galaxy datatype extension. `"input"` means the format is determined at runtime from the input data.

Common types: `bam`, `vcf`, `fastqsanger`, `fasta`, `bed`, `tabular`, `txt`, `html`, `json`, `bigwig`, `bedgraph`, `png`, `expression.json`.

## Parsing Implementation

**Entry point:** `WorkflowContentsManager._workflow_from_raw_description()` in `lib/galaxy/managers/workflows.py`

### Import Phases

1. **Format detection** — `artifact_class()` in `lib/galaxy/managers/executables.py` identifies format by checking for `class: GalaxyWorkflow` (Format2), `$graph` (CWL), or `a_galaxy_workflow` (native)
2. **Format normalization** — Format2/CWL converted to native JSON via `gxformat2.python_to_workflow()`
3. **Workflow model creation** — `Workflow()` object populated with top-level metadata
4. **Subworkflow preloading** — Top-level `subworkflows` map recursively built first
5. **Pass 1: Subworkflow resolution** — `__load_subworkflows()` for each step
6. **Pass 2: Module + step creation** — `module_factory.from_dict()` dispatches to type-specific module class; module saves state to `WorkflowStep`
7. **Pass 3: Connection wiring** — `__connect_workflow_steps()` creates `WorkflowStepConnection` objects from `temp_input_connections`
8. **Comment processing** — `WorkflowComment` objects created with parent-child relationships
9. **Step ordering** — `attach_ordered_steps()` computes topological order, sets `has_cycles` flag

### Module Factory Dispatch

```python
module_types = {
    "data_input":            InputDataModule,
    "data_collection_input": InputDataCollectionModule,
    "parameter_input":       InputParameterModule,
    "pause":                 PauseModule,
    "tool":                  ToolModule,
    "subworkflow":           SubWorkflowModule,
}
```

Each module class implements `from_dict(trans, d, **kwargs)` and `save_to_step(step)`.

### Validation

- Step UUIDs must be valid and unique
- Step labels must be unique
- Workflow output labels must be unique
- Tool resolution: missing tools produce warnings, not errors (workflow imports anyway)
- Cycle detection after wiring; sets `workflow.has_cycles = True`
- DOIs validated on import

## Production Example Fragments

### Simple: Dataset Input → Tool → Output

From IWC Parallel Accession Download workflow:

```json
{
  "a_galaxy_workflow": "true",
  "format-version": "0.1",
  "name": "Parallel Accession Download",
  "steps": {
    "0": {
      "id": 0,
      "type": "data_input",
      "label": "Run accessions",
      "tool_state": "{\"optional\": false, \"format\": [\"txt\"], \"tag\": null}",
      "input_connections": {},
      "outputs": [],
      "workflow_outputs": []
    },
    "1": {
      "id": 1,
      "type": "tool",
      "content_id": "toolshed.g2.bx.psu.edu/repos/iuc/sra_tools/fasterq_dump/3.0.8+galaxy1",
      "tool_id": "toolshed.g2.bx.psu.edu/repos/iuc/sra_tools/fasterq_dump/3.0.8+galaxy1",
      "input_connections": {
        "input|file_list": {"id": 0, "output_name": "output"}
      },
      "tool_state": "{\"input\": {\"input_select\": \"file_list\", \"__current_case__\": 1, \"file_list\": {\"__class__\": \"ConnectedValue\"}}, ...}",
      "workflow_outputs": [
        {"label": "output_collection", "output_name": "output_collection", "uuid": "..."}
      ]
    }
  }
}
```

### Conditional Execution with Boolean Gate

From IWC RNA-seq SR workflow — a boolean parameter controls whether featureCounts runs:

```json
{
  "steps": {
    "6": {
      "id": 6,
      "type": "parameter_input",
      "label": "Use featureCounts for generating count tables",
      "tool_state": "{\"validators\": [], \"parameter_type\": \"boolean\", \"optional\": false}"
    },
    "19": {
      "id": 19,
      "type": "tool",
      "content_id": "toolshed.g2.bx.psu.edu/repos/iuc/featurecounts/featurecounts/2.1.1+galaxy0",
      "input_connections": {
        "alignment": {"id": 16, "output_name": "mapped_reads"},
        "anno|reference_gene_sets": {"id": 4, "output_name": "output"},
        "strand_specificity": {"id": 13, "output_name": "output_param_text"},
        "when": {"id": 6, "output_name": "output"}
      },
      "when": "$(inputs.when)"
    }
  }
}
```

### Embedded Subworkflow

From IWC Hi-C Processing workflow — a subworkflow embedded directly within a step:

```json
{
  "steps": {
    "8": {
      "id": 8,
      "type": "subworkflow",
      "name": "Hi-C_fastqToPairs_hicup",
      "input_connections": {
        "PE fastq input": {
          "id": 0,
          "input_subworkflow_step_id": 0,
          "output_name": "output"
        },
        "genome name": {
          "id": 1,
          "input_subworkflow_step_id": 1,
          "output_name": "output"
        },
        "Restriction enzyme": {
          "id": 2,
          "input_subworkflow_step_id": 2,
          "output_name": "output"
        }
      },
      "subworkflow": {
        "a_galaxy_workflow": "true",
        "format-version": "0.1",
        "name": "Hi-C_fastqToPairs_hicup",
        "steps": {
          "0": {
            "id": 0,
            "type": "data_collection_input",
            "label": "PE fastq input",
            "tool_state": "{\"optional\": false, \"tag\": null, \"collection_type\": \"list:paired\"}"
          },
          "1": {
            "id": 1,
            "type": "parameter_input",
            "label": "genome name",
            "tool_state": "{\"parameter_type\": \"text\", \"optional\": false}"
          }
        }
      }
    }
  }
}
```

### Parameter Input with Restrictions (Dropdown)

From IWC Hi-C workflow — a text parameter with restricted values creates a dropdown:

```json
{
  "id": 6,
  "type": "parameter_input",
  "label": "Interactions to consider to calculate weights in normalization step",
  "tool_state": "{\"restrictions\": [\"\", \"--cis-only\", \"--trans-only\"], \"parameter_type\": \"text\", \"optional\": false}"
}
```

### Post-Job Actions: Hide and Rename

From IWC ATAC-seq workflow:

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
    "action_arguments": {
      "newname": "Cutadapt Report"
    }
  }
}
```

## Key Files

| Component | File |
|-----------|------|
| Format detection | `lib/galaxy/managers/executables.py` |
| Import/export logic | `lib/galaxy/managers/workflows.py` (`WorkflowContentsManager`) |
| Module factory + types | `lib/galaxy/workflow/modules.py` |
| ORM models | `lib/galaxy/model/__init__.py` (`Workflow`, `WorkflowStep`, `WorkflowStepConnection`) |
| Comment schema | `lib/galaxy/schema/workflow/comments.py` |
| Workflow schemas | `lib/galaxy/schema/workflows.py` |
| Format2 conversion | `gxformat2` library (`python_to_workflow()`) |

## Notes

- **Format version is frozen.** `format-version` has been `"0.1"` for the entire history of the format. New features are added without version bumps.
- **Tool state is double-encoded.** The `tool_state` value is a JSON string inside the JSON document. This is historical — the serialization predates structured parameter handling.
- **Missing tools are non-fatal.** Workflows import successfully even when referenced tools aren't installed. Missing tools are tracked and optionally trigger Tool Shed installation (admin only).
- **Connection normalization.** Single connections (dict) and multiple connections (list of dicts) are both valid. Galaxy normalizes during import.
- **Step ordering is topological.** The numeric step IDs in the dict keys are for serialization; actual execution order is computed via `attach_ordered_steps()` from the connection graph.
- **Subworkflows create separate DB records.** Each embedded subworkflow becomes its own `StoredWorkflow` + `Workflow` pair with `hidden=True`.

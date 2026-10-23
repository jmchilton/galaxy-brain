# User-defined tools: `$(inputs.x.element_identifier)` is `null` when mapped over a list from the tool form or API

A user-defined tool's command line gets `null` for `$(inputs.x.element_identifier)` on every element when the tool is mapped over a list from the tool form or the API.

```yaml
class: GalaxyUserTool
# ...
shell_command: echo '$(inputs.input.element_identifier)' > output.fastq
```

| How the tool is mapped over a list (element `sample_a`) | Command line writes |
| --- | --- |
| Tool form batch / `POST /api/tools` `{"batch": true, "values": [{"src": "hdca", ...}]}` | `null` ❌ |
| `POST /api/jobs` `{"__class__": "Batch", ...}` | `null` ❌ |
| `/api/tools` batch, with an implicit conversion (csv list into a tabular-only tool) | `null` ❌ |
| Workflow step mapped over a list | `sample_a` ✅ |

Output labels of the same tool-form job do resolve `$(inputs.input.element_identifier)` to `sample_a` (`test_unprivileged_tools_labels.py::test_mapped_over_labels`), so the label and the command line disagree. A tool that writes sample names into its output (e.g. reports later aggregated by MultiQC) writes `null` for every sample, so per-sample results can't be told apart downstream.

<details><summary>Cause (code read on `dev` at 2527d009dfa)</summary>

- Tool-form/API map-over (`_collection_batch_values` in `tools/parameters/meta.py`, shared by `__expand_collection_parameter` and its `_async` variant) gives each job a bare HDA with a transient `element_identifier` attribute. The job's tool state records `{"src": "hda", "id": ...}`.
- `tools/actions/__init__.py` persists that identifier as the job parameter `<name>|__identifier__`. XML tools read it back through `ElementIdentifierMapper` (`tools/wrappers.py`), which is why `$input.element_identifier` works for them.
- `UserToolEvaluator.build_param_dict` (`tools/evaluation.py`) never reads it:
  - `/api/jobs` (`job.tool_state` set) goes through `runtimeify`. Its `adapt_dataset` (`tools/runtime.py`) sets `element_identifier` only for `src: dce` references.
  - `/api/tools` goes through the legacy `to_cwl` (`workflow/modules.py`). It only knows an identifier when handed a collection element, uses it only as a `basename` fallback, and never sets an `element_identifier` property.
- Workflows work because workflow map-over hands the step the collection element itself.
- With an implicit conversion (`process_dataset` in `tools/actions/__init__.py`), the job gets the converted HDA. That HDA lacks the transient attribute, so no `|__identifier__` is persisted at all.

</details>

## Context

Bug found while verifying user-defined tool authoring guidance for 🎯 galaxyproject/foundry#672. Red API tests and a fix are on 🌿 [`udt_element_identifier_api_test`](https://github.com/jmchilton/galaxy/tree/udt_element_identifier_api_test). A related job-cache problem is filed separately: #24411.

## Proposed Approach

Have the user-defined tool evaluator read the identifiers Galaxy already persists for each mapped-over input (`<name>|__identifier__`, the same source XML tools use) and set `element_identifier` on the CWL-style File object in both the `runtimeify` and `to_cwl` paths. Also copy the identifier onto implicitly converted HDAs in `process_dataset`, so it gets persisted.

<details><summary>Approach details</summary>

- New `ElementIdentifierMapper.identifiers_by_dataset_id` gives `{input dataset id: identifier}` from the persisted job parameters. It's passed to `setup_for_runtimeify` and `to_cwl`. `to_cwl` also sets `element_identifier` for collection-element Files. `basename` and `nameroot` are unchanged.
- API tests for `/api/tools`, `/api/jobs` and a converted (csv→tabular) map-over, all red on dev. Baseline tests for workflow map-over and for a plain dataset.
- Open: a plain (non-collection) dataset still renders `null`. Labels (`tools/expressions/labels.py`) and XML tools fall back to the dataset name. Should command lines too? The branch pins `null` with a baseline test.
- Open: XML tools with a converted mapped-over input still fall back to the dataset name for `$input.element_identifier`; `ElementIdentifierMapper` is keyed on the converted HDA but queried with the original. Not addressed here.
- Open: identifiers are keyed by dataset, not input. If one input maps over a list and another selects one of the same datasets directly, both see the identifier. XML tools behave the same way.
- Open: backport. The UDT runtime code on `release_26.1` (and `release_26.0`, which has no `runtimeify`) differs a lot from dev.

</details>

## Alternative Approaches

Batch expansion could record `{"src": "dce", ...}` in each job's tool state, so `runtimeify`'s existing collection-element branch would handle this with no new lookup. That's the cleaner model, but it changes tool state and job-cache matching for every mapped-over tool, XML tools included. Reading the identifier that's already persisted fixes user-defined tools without changing what any other tool sees.

<details><summary>Alternatives In Detail</summary>

### Alternative: Record DCE references in batch-expanded job state

<details><summary>Description</summary>

#### Details

In `tools/parameters/meta.py`, expand a mapped-over collection into `{"src": "dce", "id": ...}` references instead of bare HDAs, so `adapt_dataset` sets `element_identifier` from the element.

#### Why the proposed approach is preferred

It changes the recorded tool state and job-search inputs of every batch job, so the risk reaches far beyond user-defined tools. It also doesn't cover the legacy `/api/tools` `to_cwl` path on its own. It's worth doing as a separate cleanup.

</details>

</details>

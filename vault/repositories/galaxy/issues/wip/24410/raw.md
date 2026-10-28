# User-defined tools: `$(inputs.x.element_identifier)` is `null` when mapped over a list from the tool form/API

A YAML user-defined tool (`class: GalaxyUserTool`) with

```yaml
shell_command: echo '$(inputs.input.element_identifier)' > output.fastq
```

writes `null` for every element when it's run over a list collection from the tool form (batch mode) or the API. That covers `POST /api/tools` with `{"batch": true, "values": [{"src": "hdca", ...}]}` and `POST /api/jobs` with `{"__class__": "Batch", ...}`. The expected output is each element's identifier (`sample_a`, `sample_b`, ...).

Two other paths already get this right:
- The same tool in a workflow step mapped over a list gets the identifiers.
- Output labels on the same tool-form run resolve `$(inputs.input.element_identifier)` (`test_unprivileged_tools_labels.py::test_mapped_over_labels`).

So the label and the command line disagree for the same job.

## Cause (dev `51e0a80a0db`)

- Tool-form/API map-over (`tools/parameters/meta.py` `__expand_collection_parameter` and its `_async` variant) gives each job a bare HDA with a transient `element_identifier` attribute. The job's tool state records `{"src": "hda", "id": ...}`.
- `tools/actions/__init__.py` persists that identifier as the job parameter `<name>|__identifier__`. XML tools read it back through `ElementIdentifierMapper` (`tools/wrappers.py`), which is why `$input.element_identifier` works for them.
- `UserToolEvaluator.build_param_dict` (`tools/evaluation.py`) never reads it:
  - `/api/jobs` (`job.tool_state` set) goes through `runtimeify`. Its `adapt_dataset` (`tools/runtime.py`) sets `element_identifier` only for `src: dce` references.
  - `/api/tools` goes through the legacy `to_cwl` (`workflow/modules.py`). That uses the identifier only as a `basename` fallback and never sets an `element_identifier` property, even for a real collection element.
- Workflows work because workflow map-over hands the step the collection element itself.
- If the mapped-over input needs an implicit conversion (e.g. a csv list into a tabular-only tool), the job gets the converted HDA. That HDA lacks the transient attribute, so no `|__identifier__` is persisted at all.

## Fix (branch `jmchilton/udt_element_identifier_api_test`)

- The UDT evaluator gets `{input dataset id: identifier}` from the persisted parameters (new `ElementIdentifierMapper.identifiers_by_dataset_id`) and passes it to both `setup_for_runtimeify` and `to_cwl`. Both set `element_identifier` on the File object. `basename` and `nameroot` are unchanged.
- `process_dataset` (`tools/actions/__init__.py`) copies the identifier onto an implicitly converted HDA.
- Tests: API tests for `/api/tools`, `/api/jobs` and a converted (csv→tabular) map-over, all red before the fix. There are also baseline tests for workflow map-over and for a plain dataset.

Longer term, batch expansion could record `{"src": "dce"}` in the job tool state so that runtimeify's existing collection-element branch covers this. That would touch tool state and job-cache matching for every mapped-over tool, so it isn't done here.

## Related

- Job cache: a plain run can reuse a mapped-over job's output and get the element's identifier. This is pre-existing and reproduced with XML tools on dev. It's filed separately (`job_cache_ignores_element_identifier_for_plain_inputs`). This fix makes it easier to hit for UDTs, because a plain UDT run renders `null`.

## Open questions

- Plain (non-collection) dataset: UDTs still render `null`. Labels (`tools/expressions/labels.py`) and XML tools fall back to the dataset name. Should UDT command lines fall back the same way? The branch pins `null` with a baseline test.
- XML tools with converted mapped-over inputs: `$input.element_identifier` still falls back to the dataset name. `ElementIdentifierMapper` is keyed on the converted HDA but queried with the original. A follow-up could also key the parent dataset.
- Identifiers are keyed by dataset, not by input. If one input maps over a list and another input selects one of those same datasets directly, both see the element identifier. XML tools have the same behavior.
- Backport: the UDT runtime code on `release_26.1` (and on `release_26.0`, which has no runtimeify) differs a lot from dev, so the branch targets `dev`.

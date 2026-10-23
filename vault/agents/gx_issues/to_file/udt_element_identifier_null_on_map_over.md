# User-defined tools: `$(inputs.x.element_identifier)` is `null` when mapped over a list from the tool form/API

A YAML user-defined tool (`class: GalaxyUserTool`) with

```yaml
shell_command: echo '$(inputs.input.element_identifier)' > output.fastq
```

writes `null` for every element when it's run over a list collection (batch mode in the tool form, `POST /api/tools` with `{"batch": true, "values": [{"src": "hdca", ...}]}`, or `POST /api/jobs` with `{"__class__": "Batch", ...}`). The expected output is each element's identifier (`sample_a`, `sample_b`, ...).

The same tool in a workflow step mapped over a list does get the identifiers. Output labels on the same tool-form run resolve `$(inputs.input.element_identifier)` correctly too (`test_unprivileged_tools_labels.py::test_mapped_over_labels`). So the label and the command line give different answers for the same job.

## Cause (dev `51e0a80a0db`)

- Tool-form/API map-over (`lib/galaxy/tools/parameters/meta.py` `__expand_collection_parameter` / `_async`) gives each job a bare HDA with a transient `element_identifier` attribute. The job's tool state records it as `{"src": "hda", "id": ...}`.
- `lib/galaxy/tools/actions/__init__.py` (~line 558) persists the identifier as job parameter `<name>|__identifier__`. XML/Cheetah tools read it back through `ElementIdentifierMapper` (`tools/wrappers.py`), which is why `$input.element_identifier` works for them.
- `UserToolEvaluator.build_param_dict` (`lib/galaxy/tools/evaluation.py`) never reads it:
  - `/api/jobs` (has `job.tool_state`) → `runtimeify` → `setup_for_runtimeify.adapt_dataset` (`tools/runtime.py`) only sets `element_identifier` on the `src: dce` branch.
  - `/api/tools` (no `job.tool_state`) → legacy `to_cwl` (`workflow/modules.py`) uses the identifier only as a `basename` fallback and never sets an `element_identifier` property, even for a real DCE.
- Workflows work because workflow map-over hands the step a DCE.

## Fix (branch `jmchilton/udt_element_identifier_api_test`)

- The UDT evaluator builds `{input dataset id: identifier}` from the persisted `<name>|__identifier__` params (via a new `ElementIdentifierMapper.identifiers_by_dataset_id`) and passes it to both `setup_for_runtimeify` and `to_cwl`, which set `element_identifier` on the File object. `basename`/`nameroot` are unchanged.
- When a mapped-over input needs an implicit conversion, `process_dataset` (`actions/__init__.py`) copies the identifier onto the converted HDA. Otherwise `|__identifier__` was never persisted for that job.
- Tests: API tests for `/api/tools`, `/api/jobs` and a converted (csv→tabular) map-over, all red before the fix, plus workflow map-over and plain-dataset baselines.

Longer term, it may be cleaner for batch expansion to record `{"src": "dce"}` in the job tool state so that runtimeify's existing DCE branch covers this. That would touch tool state and job-cache matching for every mapped-over tool, so it isn't done here.

## Open questions

- Job cache: `JobSearch._build_stmt_for_hda` (`managers/jobs.py`) checks `|__identifier__` only when the request has an identifier. With `use_cached_job`, a plain run on dataset D can reuse an earlier job that mapped over D as `sample_a` and return `sample_a` instead of `null`. Reproduced on the branch: map over a one-element list, then run the tool directly on the element dataset with `use_cached_job=True`. The job comes back with `copied_from_job_id` set and output `sample_a\n`. Before the fix both rendered `null`, so the reuse was harmless. XML tools have the same hole, mostly hidden by their name fallback. Possible guard: for identifier-less requests, reject cached jobs that recorded `{k}|__identifier__`. That only adds cache misses, never wrong hits.

- With a plain (non-collection) dataset, `$(inputs.x.element_identifier)` is still `null`. The label renderer (`tools/expressions/labels.py`) and Cheetah fall back to the HDA name. Should UDT command lines fall back the same way? The branch pins `null` with a baseline test.
- Implicitly converted mapped-over inputs (e.g. a csv list into a tabular-only tool): the branch now copies the transient identifier onto the converted HDA (`actions/__init__.py` `process_dataset`), which fixes UDTs. Cheetah `$input.element_identifier` still falls back to the dataset name there: `ElementIdentifierMapper` is keyed on the converted HDA but queried with the original. A follow-up could key the parents as well.
- Identifiers are keyed by dataset, not input. If one input maps over a list and another input directly selects one of the same HDAs, both see the element identifier. Cheetah's `ElementIdentifierMapper` has the same collapse.
- Backport: the UDT runtime code on `release_26.1` (and `release_26.0`, which has no runtimeify) differs a lot from dev, so the branch targets `dev`.

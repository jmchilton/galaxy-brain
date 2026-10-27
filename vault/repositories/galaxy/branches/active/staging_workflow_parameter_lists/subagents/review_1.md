# Review 1 — staging_workflow_parameter_lists

Reviewed `ee5d92e9` (on `dev` `fd43a3c6`). No bugs found; core change is correct and minimal. Acted on two P3s (typing, staging test red-for-wrong-reason) as `d1592a31` and `2d859bda`, pushed to `jmchilton`. Didn't act on the `populators.py` `cwl_style` adoption (P3) or naming nit.

Not acted on:
- P3 3 `cwl_style` adoption in `WorkflowPopulator.run_workflow`: worth doing as a follow-up, but it needs a framework workflow test run (`multiple_text`) to verify. Sketch below.
- Nit: name `parameter_input_keys`. Semantics are "pass through untouched" (`passthrough_keys` would say so), but the current name reads fine for workflows and tool params, and the planemo plan already uses it. Kept.
- Characterization test `..._stages_scalar_list_as_collection_by_default`: pins current behavior. Fine to keep.

<details><summary>Full review</summary>

## Verdict

Mergeable as-is after the two fixes. 4 files, a 2-line behavior change. The guard sits at the only top-level dispatch (`for key, value in job.items()`), so skipped keys keep their original value in the mutated `job`, in both tool and workflow mode. Default `None` doesn't change behavior. `InteractorStaging.stage(*args, **kwds)` is the only override and it forwards; planemo's `PlanemoStagingInterface` doesn't override `stage`.

## Findings

### P3 1: `Collection[str]` accepts a bare `str` (fixed, `d1592a31`)

`parameter_input_keys="texts"` type-checked, and `key in "texts"` then does a substring test, so a key `"ext"` would be silently skipped. Changed both signatures to `collections.abc.Set[str]`. mypy now rejects a `str` (`expected "AbstractSet[str] | None"`). `set(...)` and `dict.keys()` still fit. mypy on both source files shows only the existing errors, none on the touched lines.

### P3 2: staging test was red by `KeyError`, not by assertion (fixed, `2d859bda`)

`_CapturingStagingInterface._post` returned `{"outputs": ...}` for every path, so without the kwarg collection creation crashed on `collection["id"]`. It now returns `{"id": "hdca1"}` for `dataset_collections`, as `_RecordingInteractor` already does. The test also stages a `class: File` under another key and asserts it becomes an `hda` with exactly one payload, which proves the kwarg is forwarded and other inputs are still staged. This strengthens the test; nothing was removed. Red verified by dropping the forwarding line in `staging.py`: `{'texts': {'src': 'hdca', 'id': 'hdca1'}} != {'texts': ['a', 'b']}`. Green: 27 passed across both files. ruff, black and isort are clean.

### P3 3: `populators.py` `cwl_style` could be the in-tree consumer (not acted on)

The debrief says adopting the API would need workflow input types. That isn't required. The `cwl_style` branches already compute the key set from value shapes, and the pop/`del`/`staged_job.update(raw_params)` mechanics only emulate "leave untouched". Sketch:
- Add `parameter_input_keys` to `stage_inputs` (populators.py ~4467) and forward it to `InteractorStaging.stage`.
- In `run_workflow`, unwrap `type: raw` in place (`job_copy[k] = v["value"]`), collect the scalar and scalar-list keys into a set instead of deleting them, and pass the set through. Drop `raw_params` and the `update`.

The keys stay type-blind, but the new API gets an in-tree caller instead of accreting. Verify with one framework workflow test at a time (`multiple_text`, `multiple_integer_into_data_column`).

## Other focus areas

- Deriving keys in staging: agree it shouldn't. Staging never sees the workflow, and `lib/galaxy/tool_util` has no typed-workflow-inputs helper (no `gxformat2`/`inputs_normalized` use) to reuse. Planemo's `parameter_input_labels` is the right home for now.
- Nested/subworkflow inputs: top-level only is correct. Workflow invocation inputs are keyed by top-level labels, and subworkflow inputs aren't supplied through the job. In tool mode, flat `cond|param` keys work. Values nested in a record dict still stage as record collections, which is out of scope.
- Tool mode: the name covers tool params too. `stage_data_in_history` (verify/interactor.py) only stages data, so it has no reason to adopt the API.
- Typing: see P3 1. `Literal`/`Callable` usage matches the surrounding code.

</details>

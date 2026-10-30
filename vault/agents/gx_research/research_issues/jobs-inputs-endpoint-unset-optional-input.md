# GET /api/jobs/{id}/inputs fails validation on an unset optional data input

- Area: lib/galaxy/webapps/galaxy/services/jobs.py, lib/galaxy/webapps/galaxy/api/jobs.py
- Found while: [[Component - Jobs API and Job Cache]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

An optional `data` input left empty is stored in `inp_data` as `None`. `_collect_input_datasets` does `input_datasets[prefixed_name] = process_dataset(value)`, and `process_dataset` returns `None` for empty values (`tools/actions/__init__.py:198-199, 294`). `_record_input_datasets` then calls `job.add_input_dataset(name, dataset=None)` for it (`:1128-1131`), creating a `JobToInputDatasetAssociation` with a NULL `dataset_id` (nullable, `model/__init__.py:2813`).

Other readers expect this: `Job.to_dict("element")` skips `i.dataset is None` (`model/__init__.py:2421`), `common_problems` skips it (`api/jobs.py:343`), and `execute` skips falsy `inp_data` values (`tools/actions/__init__.py:545-547`).

`JobsService.__dictify_association` (`services/jobs.py:225-232`) doesn't: it leaves `dataset_dict = None` and returns `JobAssociation(name=..., dataset=None)`. `JobAssociation.dataset` is a required `EncodedDataItemSourceId` (`schema/jobs.py:57`). Pydantic raises `ValidationError: Input should be a valid dictionary or instance of EncodedDataItemSourceId`, so the endpoint returns a 500.

`/api/jobs/{id}/resume` uses the same helper on output associations, which always have a dataset.

## Evidence / repro

- Traced in code. The `JobAssociation(name="x", dataset=None)` validation error was reproduced directly.
- The only `/inputs` API test (`lib/galaxy_test/api/test_jobs.py:1394`) uses a job with all inputs set.

## Suggested fix

Skip associations with no dataset in `__dictify_association` callers, or make `JobAssociation.dataset` optional and return `null`. Add an API test that runs a tool with an optional data input left empty and calls `/inputs`.

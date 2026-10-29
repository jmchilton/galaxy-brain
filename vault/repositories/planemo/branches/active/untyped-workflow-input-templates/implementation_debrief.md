# Implementation debrief

Run via claude-opus-5-5.

- Bug: format2 input declared without a type (`a: {}`) normalizes to `{'id': 'a'}`; `job_template` and `_build_template_and_metadata_from_inputs` indexed `step["type"]`, so `workflow_test_init` and `workflow_job_init` failed with `KeyError: 'type'`. Reproduced on `origin/master` `2a815808` with gxformat2 0.29.1.
- Right repo: gxformat2 keeps `type` optional and itself converts a missing type as data (`normalized/_conversion.py`), so consumers apply the default. `File`, `data_input`, `data_collection` already normalize.
- Fix: `normalized_input_type(input_step)` beside `input_label`, used at both sites.
- Tests: fixture `tests/data/wf_untyped_input.gxwf.yml`; `test_untyped_input` in `test_cmd_workflow_job_init.py` and `test_cmd_workflow_test_init.py`. Red on base (KeyError), green after. Template, workflow utils and lint tests pass (27); `make lint` OK.
- Review: [subagents/review_1.md](subagents/review_1.md) — approved, no changes.

```
created .../differential-review/snapshots/20261029T161627Z-implementation-fcf41a605d2e.json
  implementation @ fcf41a605d2e vs origin/master (merge-base 2a8158086c42)
  first snapshot: 1 commit, 4 files, 6 hunks
```

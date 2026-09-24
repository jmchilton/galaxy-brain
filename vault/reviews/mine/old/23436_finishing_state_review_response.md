# PR #23436 review response draft

Prepared 2026-09-14. Nothing below has been posted or pushed.

## Marius: skip dataset-state propagation

Threads:

- https://github.com/galaxyproject/galaxy/pull/23436#discussion_r3925890585
- https://github.com/galaxyproject/galaxy/pull/23436#discussion_r3991941489

Marius is right that the `FINISHING` transition does not need to call
`Job.update_output_states()`. The mapping from the job-only `finishing` state to
the dataset `setting_metadata` state was compensating for that propagation
rather than addressing its cost and race surface.

Local response patch in `22087-finishing-state-fixes`:

- Add an `update_output_states` switch to `MinimalJobWrapper.change_state()`,
  defaulting to the existing behavior.
- Set `FINISHING` with `update_output_states=False`.
- Remove `Job.output_dataset_states` and its model tests.
- Keep outputs in their existing non-ready state while metadata is processed.
- Update the restart/recovery integration test to assert the output remains
  `running`.
- Add focused unit coverage proving the FINISHING transition requests no output
  propagation.

The generated `JobState` schema member and client graph handling should remain.
They describe the job state exposed through the API, not a dataset state, and
the client must handle a job observed during the finishing window.

Validation completed locally:

- 5 focused runner unit tests passed.
- The Pulsar restart/recovery integration test passed.
- `isort`, Black, and `git diff --check` passed.

Draft reply:

> 	Yes, skipping the output update is cleaner. `change_state()` was propagating
> 	every transition, and the `FINISHING -> SETTING_METADATA` mapping was only
> 	compensating for that. I have a local follow-up that makes this transition
> 	job-only, removes the mapping and its model tests, and verifies that the
> 	output remains `running` while recovery still works. The focused unit tests
> 	and restart integration test pass.
>	
> 	I kept the generated `JobState` member and graph handling because the job
> 	itself can still be observed as `finishing`; those additions no longer imply
> 	any dataset or implicit-output update.

## Other tracked review threads

PR #23433 has two older unresolved Marius threads:

- https://github.com/galaxyproject/galaxy/pull/23433#discussion_r3925815391
- https://github.com/galaxyproject/galaxy/pull/23433#discussion_r3925952295

The second already has a detailed response. The first was addressed in commit
`1ec7fb00f3`: a failed data input is preserved through `pick_value`, and an
integration test demonstrates that a downstream `__FILTER_FAILED_DATASETS__`
step can remove it without failing workflow scheduling.

Draft reply for the first thread:

> Yes. I changed this after your comment: a failed data input is no longer
> treated as a scheduling failure. `pick_value` preserves the failed dataset,
> and the new test sends it through `__FILTER_FAILED_DATASETS__` to demonstrate
> that scheduling continues and the successful element remains. That is in
> `1ec7fb00f3`.


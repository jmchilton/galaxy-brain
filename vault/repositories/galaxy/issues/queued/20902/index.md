# galaxy#20902 — Detect Common Error false positive message for ``multiple="true"`` data inputs

[Issue](https://github.com/galaxyproject/galaxy/issues/20902)

Detect-common-error reports a false positive for a single-item collection consumed by a `multiple="true"` input, because `job_to_input_dataset` records the dataset under several names (mvdbeek); next: red test for the false positive.

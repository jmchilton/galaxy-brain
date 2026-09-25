Fixes #1668.

`planemo run --no_wait` already supported Galaxy workflows, but the equivalent tool path submitted the job and then failed with `UnboundLocalError`. The tool response arguments were only initialized after waiting for the submitted job, leaving them undefined when waiting was disabled.

This initializes the tool run response immediately after Galaxy accepts the submission. Normal runs still wait for completion and populate the detailed job information; `--no_wait` returns a successful response with no job details, allowing the existing CLI success message and structured reporting path to complete.

The regression test verifies that a no-wait tool run:

- returns a successful `GalaxyToolRunResponse`;
- preserves Galaxy's submission response;
- does not poll the job or fetch final job details; and
- can be converted to Planemo's structured report data.

## Testing

```console
pytest -q tests/test_galaxy_activity.py
```

All six tests pass. Black, isort, and Ruff also pass for the changed files.

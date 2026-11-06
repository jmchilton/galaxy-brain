`planemo test` reports a job rejected during preparation with no reason.

```text
$ planemo test --test_output_json out.json wf.gxwf.yml
❌ Failed job b9dfa20d5f37c5fa:
   Tool ID: toolshed.g2.bx.psu.edu/repos/devteam/fasta_compute_length/fasta_compute_length/1.0.4
wf.gxwf.yml_0: failed
```

The reason is `Parameter 'index': requires a value, but no legal values defined`. It appears once in the run's output, as a Galaxy server log line among hundreds. `out.json` and `out.html` don't contain it. The job record in `out.json` has `command_line: null`, empty `stderr` and `stdout`, and `job_messages: null`, so a reader of the structured report sees an errored job and nothing else.

Galaxy does record the reason. `JobWrapper.fail()` sets `dataset.info = message` on each output, which the API serves as `misc_info`.

Reproduced on planemo 0.75.47 with a managed Galaxy `release_26.1`, using a workflow whose select reads a data table with no row, so a missing data table is the easy way to hit this. Any `ParameterValueError` during job preparation should behave the same.

## Context

Bug discovered while working on galaxyproject/foundry#749. Related to #1764, which covers the discovery that leads here, not the report.

## Proposed Approach

Fetch `misc_info` for an errored job's outputs and carry it into the test report and the failed-job console output. `summarize_history` in `planemo/galaxy/api.py` already prints `misc_info`, though this run's output didn't include it.

## Alternative Approaches

Have Galaxy add `job.info` to the job API response. That would help every API client, but only reaches runs against a new enough Galaxy.

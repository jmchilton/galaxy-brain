Targets `release_26.1` — this is a bug fix, not new behaviour. `release_26.0`
carries the same two raises (at `extract.py:138` and `:187`) if a backport is
wanted; the surrounding file has diverged enough that it would not cherry-pick
clean.

## What

Fixes #22451 — the Sentry issue is literally `Exception: Failed to extract job.`
with no job, no tool and no output name in it.

This does not claim to fix the underlying condition. Both failure paths in
`extract_steps` raised an untyped exception and put the whole diagnostic in a
`log.warning` the user never sees, so a failed workflow extraction is an opaque
500 and the Sentry report carries nothing to triage from. This makes both
exceptions self-describing, and keeps the report firing.

## The two paths

**1. A requested `job_id` isn't in the summary.**

```python
raise AssertionError("Attempt to create workflow with job not connected to current history")
```

The message asserts a cause it hasn't checked. A job drops out of
`job_id2representative_job` whenever summarization skipped its outputs — and the
commonest reason for that is `_check_state`, which skips any output still `new`,
`queued` or `running` and records `WARNING_SOME_DATASETS_NOT_READY`. So the
likeliest real cause is "you extracted while a job was still running", reported
as an `AssertionError` blaming the history.

Now a `RequestParameterInvalidException` (400) naming the job, and appending the
not-ready explanation when that warning is actually set — the summary already
knows, it just never reached the message. The id is encoded, since that is the
form the client sent and the only form the user can match against anything.

**2. A map-over job output matches no implicit collection.**

```python
message = template % (job.id, jobs[job], assoc_name)
log.warning(message)
raise Exception("Failed to extract job.")
```

Everything useful went to the log; the exception got none of it. Now
`InconsistentApplicationState` (500) naming the job id, the tool, the output
that could not be placed, and the output collections that *were* found for that
job. Kept at 500 rather than reclassified as a client error: this is Galaxy's
state not lining up and the user has nothing to correct.

**Sentry**: this had to be handled explicitly rather than assumed. Galaxy
captures through `LoggingIntegration(event_level=ERROR)` —
`add_sentry_middleware` is defined in `webapps/base/api.py` but never called, so
logging is the only capture route. The old bare `Exception` produced an event
because it went unhandled and was logged at ERROR. A `MessageException` is
handled (`api.py` `message_exception_middleware`, or `decorators.py` for the
legacy path) and logged at INFO or not at all, so a naive conversion would have
silently closed #22451 rather than improving it. The retained log record beside
the raise is therefore `log.error` with lazy `%s` args: the event still fires,
groups on the format string, and carries the raw pairs — hids and collection
ids that belong in the report but not in a user-facing message.

## How

The map-over lookup moves into `_implicit_map_output_hid()` next to the other
shared extraction helpers. One deletion inside it: the

```python
assoc_name.startswith(f"__new_primary_file_{query_assoc_name}|")
```

alternative is dead code. `_skip_output_assoc_name()` returns `True` for any
name starting with `__new_primary_file`, and the caller `continue`s on it one
line earlier. It has in fact been unreachable since it was written — before that
helper was factored out, the same `continue` sat directly above the loop
(`424f70391ec^`).

## Testing

One API test, `TestWorkflowExtractionApi::test_extract_job_without_summarized_output_rejected`
— run a tool in history A, extract from history B passing A's job id, assert a
400 whose message carries the encoded job id. Verified red first against the
unmodified `extract.py`, where it reproduces #22451 exactly:

```
Request status code (500) was not expected value 400.
Body was {'err_msg': 'Uncaught exception in exposed API method:', 'err_code': 0}
```

The map-over path (2) has no test. It is the unreproduced condition this PR
exists to diagnose — there is no known API-level recipe for it, which is the
whole point of putting the job, tool and output names into the exception. The
not-ready suffix on path 1 is likewise untested: getting an output to sit in
`queued`/`running` at extraction time is a race in an API test.

| Check | Result |
|---|---|
| `test_workflow_extraction.py` (API) | 48 passed, 1 skipped |
| `test/unit/workflows/` | 108 passed, 1 skipped |
| `make mypy` (`cd lib && mypy . ../test`) | 19 errors, same 19 as the unmodified base |
| pre-commit (black, ruff, flake8, prettier, repo checks) | clean |

## Noticed, not fixed here

- **The root cause is still open.** Candidates for how a mapped job's output
  ends up with no collection in the summary: `__summarize_dataset_collection`
  picks `creating_job_associations[0]` as the representative job independently
  per collection, so a multi-output mapped tool whose two collections disagree
  on that first association leaves `job_id2representative_job` pointing at a job
  whose `jobs[...]` list holds only one of them; and a mapped tool with a
  *collection* output registers the inner per-element HDCA first and never lands
  in `implicit_map_jobs`, so the outer implicit collection is appended but the
  wiring takes the hidden inner one. Neither is confirmed against a real
  history — they are the shapes worth reproducing next, and they belong to the
  extraction overhaul in #22709.
- **Graceful degradation is a live alternative.** An unplaceable output only
  costs the connections that would have consumed it; extraction could warn and
  carry on rather than discarding the whole workflow. That is a behaviour
  change, not error handling, so it is deliberately not in this PR — but for the
  "output still running" case it is probably the better answer.
- **The not-ready case may want its own class.** "Wait and extract again" is a
  retry condition rather than an invalid parameter, and
  `ToolInputsNotReadyException` plus the `retry_after` support already in
  `get_error_response_for_request` is the shape that fits. Left as one 400 here
  because splitting it means deciding what extraction should promise about
  retries.
- `extract_steps_by_ids` (the newer ID-based path) cannot hit either failure: it
  drives from the ICJ's own `output_dataset_collection_instances` rather than
  matching a job's output names against a history summary.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

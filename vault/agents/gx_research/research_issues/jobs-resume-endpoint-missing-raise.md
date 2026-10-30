# PUT /api/jobs/{id}/resume builds an exception for a non-paused job but never raises it

- Area: lib/galaxy/webapps/galaxy/api/jobs.py
- Found while: [[Component - Jobs API and Job Cache]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`FastAPIJobs.resume` (`api/jobs.py:362-378`):

```python
if job.state == job.states.PAUSED:
    job.resume()
else:
    exceptions.RequestParameterInvalidException(f"Job with id '{job.tool_id}' is not paused")
```

The `else` branch creates an exception object and discards it. Resuming a job that isn't paused returns 200 with the output associations, as if it worked. The message would also print the tool id where it says "Job with id".

The preceding `if not job: raise ObjectNotFound` is dead too: `JobsService.get_job` raises instead of returning `None`.

## Evidence / repro

- Read in code. The only API test, `test_resume_job` (`lib/galaxy_test/api/test_jobs.py:802`), resumes a paused job; none resumes a non-paused one.

## Suggested fix

`raise exceptions.RequestParameterInvalidException(f"Job {job_id} is not paused")`, plus an API test. Check client callers first, since some may rely on the silent 200.

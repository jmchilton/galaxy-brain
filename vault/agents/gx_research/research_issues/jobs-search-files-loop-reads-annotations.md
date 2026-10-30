# POST /api/jobs/search multipart-file loop iterates class annotations, not extras

- Area: lib/galaxy/webapps/galaxy/api/jobs.py
- Found while: [[Component - Jobs API and Job Cache]]
- Galaxy SHA: 65e6daff
- Severity: low (dead code)

## Problem

`FastAPIJobs.search` (`api/jobs.py:579-583`) means to fold multipart `files_*` / `__files_*` fields into `inputs`:

```python
for k, v in payload.__annotations__.items():
    if k.startswith("files_") or k.startswith("__files_"):
        inputs[k] = v
```

`payload.__annotations__` is the class's annotation dict (`tool_id`, `inputs`, `state`, `history_id`). The extra fields that `SearchJobsPayload`'s `extra="allow"` collects (`schema/jobs.py:132`) live in `payload.model_extra`. The loop never matches, and if it did it would insert type objects, not values. This looks like a leftover from the legacy controller's `**kwd` handling.

## Evidence / repro

- Read in code.

## Suggested fix

Delete the loop. If file-backed search is still wanted, iterate `payload.model_extra` instead and add a test.

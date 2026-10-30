# Job API response models silently drop tool_version (and other to_dict keys)

- Area: lib/galaxy/schema/schema.py, lib/galaxy/schema/jobs.py, lib/galaxy/model/__init__.py (Job.to_dict)
- Found while: [[Component - Jobs API and Job Cache]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`Job.dict_collection_visible_keys` and `dict_element_visible_keys` both include `tool_version` (`model/__init__.py:1786-1811`), and admin `system_details` adds `traceback` (`:2403-2408`). The Pydantic response models don't declare these keys: `JobBaseModel` (`schema/schema.py:2510`), `JobSummary` (`:2571`), `EncodedJobDetails` (`schema/jobs.py:173`) and `ShowFullJobResponse` (`api/jobs.py:222`). `Model` uses the default `extra="ignore"` (`schema/schema.py:345-348`), so these keys are dropped from `GET /api/jobs` and `GET /api/jobs/{id}`.

The client works around it: `client/src/components/JobInformation/JobInformation.vue:93-97` reads `tool_version` through an `"tool_version" in job.value` cast, with a comment asking why. The cast always yields `null`, so the job information page can't show the tool version.

`copied_from_job_id` has a related split: it is serialized on show/search (`EncodedJobDetails`) but not in index rows (not in `dict_collection_visible_keys` or `JobSummary`).

`JobDetails` and `JobFullDetails` (`schema/schema.py:2645, 2727`) have no Python references at this SHA. They look like dead models from before `EncodedJobDetails`.

## Evidence / repro

- Read in code. `compare_runs` plan test B1 (`vault/repositories/galaxy/branches/active/compare_runs/implementation_plan.md`) expects `tool_version` absent from both index and show on dev.

## Suggested fix

Add `tool_version: str | None` to `JobBaseModel`, and remove the client cast. Decide whether `traceback` belongs in an admin model. Consider adding `copied_from_job_id` to `JobSummary` plus `dict_collection_visible_keys`. Delete `JobDetails`/`JobFullDetails` or wire them up. The `compare_runs` branch proposes the first and third (D14).

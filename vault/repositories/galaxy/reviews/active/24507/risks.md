Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 7c7538edb16

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Client-only change (admin Jobs list + `client/src/api/jobs.ts`); no API, schema, or tool/workflow behavior changes. Reverting is a single client revert.
- Quiet behavior change: `deleteJob` previously passed the stop message as `data:` (ignored by openapi-fetch), so it never reached the server; it now sends it as `body`. Admin stop messages will start appearing on stopped jobs, and every other `deleteJob` caller now sends its message too.
- New exported `stopJobs` helper (bounded concurrency 4, retry via existing `simple-error` backoff utilities) becomes a reusable client contract, but is internal and easy to change.
- UI semantics shift slightly: failed jobs stay selected and the stop message is retained for resubmit; notifications now go only to owners of successfully stopped jobs.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the `data:` to `body:` fix is intended and that the server-side `DELETE /api/jobs/{job_id}` message handling is acceptable now that it is actually exercised, including for other `deleteJob` callers. Otherwise review is about UX of the retained-selection/error messaging rather than durable risk.

</details>

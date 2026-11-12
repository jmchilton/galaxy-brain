# Test challenges review — PR #24835

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: f207f12dd5e528573a50cabca345d31fac34f76e

Overall: test layering is good — real end-to-end integration tests plus mock-free unit tests against an in-memory model for the settle matrix and commit ordering. Nothing to drop. Gaps are in new code paths the tests don't reach. Details: [test_challenges_debrief.md](test_challenges_debrief.md).

## P2 1 — Invocation report link for mapped-over jobs untested
`EmailAction._send` now uses `job.effective_workflow_invocation_step` so mapped-over jobs get the "Workflow Invocation Report" link, but no test runs a workflow. Add an integration test in `test_job_completion_emails.py`: mapped-over one-step workflow with an `EmailAction` PJA (WorkflowPopulator), assert one email whose body contains `workflows/invocations/report?id=`. Also exercises PJAs attached by workflows, not just the tool form flag.

## P3 1 — Job-cache copy path untested
The `copy_from_job` branch in `MinimalJobWrapper` now queues and runs after-commit actions after its own commit. Add an integration test re-running cat1 with `use_cached_job: True` and `send_email_notification: True`, asserting the cached job emails once (enable job cache in config).

## P3 2 — No end-to-end mixed-outcome map-over
Optional: integration case where one element fails, asserting a single summary with `1 error`. Unit matrix covers counting; this would cover `fail()` + summary together.

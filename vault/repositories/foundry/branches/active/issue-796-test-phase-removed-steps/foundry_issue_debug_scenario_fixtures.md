Draft, not filed. Target: galaxyproject/foundry, labels `work/ready-implement`.

---

**Title:** Bind fixtures to debug-galaxy-workflow-output's abstract scenarios

`content/molds/debug-galaxy-workflow-output/scenarios.md` has four cases that describe a run instead of naming one: "job failure reference capture", "invocation failure reference capture", "collection output mismatch capture" and "reference gap discovery". Each needs a committed fixture, for example a `workflow-test-result.json` plus the Planemo report and the job or invocation API response it cites, under `content/molds/debug-galaxy-workflow-output/examples/`, and an `expect:` that names the concrete classification and evidence fields.

Real runs are preferred to synthetic ones. Candidate sources: failed `run-workflow-test` handoffs in pipeline-test run directories, IWC test failures. A case with no fixture after this pass comes out of `scenarios.md`.

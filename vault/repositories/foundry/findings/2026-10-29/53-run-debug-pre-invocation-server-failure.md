# run-workflow-test and debug-galaxy-workflow-output have no case for a managed Galaxy that dies (or is killed) before an invocation exists

- Target: galaxyproject/foundry (`content/molds/run-workflow-test/index.md` steps 0, 5-6; `content/molds/debug-galaxy-workflow-output` sequence step 1). Planemo and Galaxy behave as documented; the Galaxy-side cost is finding [51](51-run-form-scaling-and-planemo-precheck.md). Foundry tracking needed: no (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31, phase 10 attempts 2 and 8, phase 11 on attempt 2, Foundry worktree `pipeline-run-chipseq` (run-workflow-test rev 8), 2026-11-01. Ledger `run-workflow-test-silent-on-server-death-before-invocation` (minor), `debug-workflow-output-no-surface-for-pre-invocation-server-failure` (minor).
- Existing issues/PRs: none. Related: finding [37](37-planemo-early-stop-coverage-frontier.md) (coverage frontier), finding [05](05-debug-mold-green-handoff.md), Foundry #662.

## Symptom
Attempt 2: both workflows imported, 14 uploads ok, then the gunicorn worker was SIGKILLed twice on the run-form request and the host memory guard killed planemo; 0 `workflow_invocation` rows, no test-output.json. The run phase classified it `not-run` by judgement; the debug phase fit it to none of its five surfaces and needed Galaxy source outside the bundle.

## Root cause
- run-workflow-test step 0 defines `not-run` as a test that "cannot be executed" (static validate-tests failure, missing data, unavailable Galaxy, uninstallable tool, a timeout, untrusted checkout), decided before running. It doesn't say that a run which starts and then loses its Galaxy, or is killed externally, before any invocation id exists is also `not-run`, nor which evidence to keep. Step 5's modalities (assertion, job, invocation, missing output, upload/staging) all assume an invocation or a staging error.
- debug-galaxy-workflow-output step 1 offers five failure surfaces, all after invocation creation. No surface names `planemo.log` server lines (WORKER TIMEOUT, bioblend RemoteDisconnected), host memory samples, worker RSS, or the kept database's invocation count.
- The driver's claim that run-workflow-test step 3 conflicts with the harness is not right: step 3 says to leave `--galaxy_branch` off "unless the user or the harness supplied a specific branch", which the harness does (TEST_PIPELINE.md requires `--galaxy_branch release_26.1`). The friction is only that a Mold-reading child probe once ran planemo without it (driver L90); that is a driver-brief matter.

## Evidence
`planemo/attempt2/notes.md` (timeline, DB counts, no kernel OOM); `workflow-debug-report.md` §1-2; Mold text at the step numbers above.

## Proposed fix
1. run-workflow-test step 0/6: a run that loses its Galaxy, or is killed externally, before an invocation exists is `not-run` with `not_run_reason: server-failure` (or `external-kill`) and evidence: server log lines, DB invocation/job counts, memory samples. Never `fail` (no failure modality).
2. debug-galaxy-workflow-output step 1: a sixth surface "pre-invocation server/API failure (resource or timeout)" whose follow-up is to measure the request (worker RSS, py-spy), run one workflow per Galaxy, or raise resources; route to the reference-gap step when the bundle can't explain it.
3. Optional: a planemo-workflow-test-architecture paragraph on planemo-managed Galaxy limits (single gunicorn worker, `--timeout 300`, sqlite).

## Draft issue
**Title:** run-workflow-test / debug-galaxy-workflow-output: classify a managed Galaxy that dies before an invocation exists

In the nf-core/viralrecon wb2g build (2026-11-01) the planemo-managed Galaxy's web worker was killed twice on the run-form request for a 385-step workflow, then the host memory guard killed planemo: no invocation, no test output. run-workflow-test's `not-run` reasons are all decided before running and its modalities all assume an invocation; the debug Mold's five surfaces likewise. Proposal: `not-run` with a server-failure/external-kill reason and named evidence (server log lines, DB counts, memory samples), and a sixth debug surface for pre-invocation server/API failures.

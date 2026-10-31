# planemo ignores a workflow test's `expect_failure`, and `workflow_lint` fails a case with no outputs; Foundry notes present it as usable

- Target: galaxyproject/planemo (`planemo/runnable.py`, `planemo/workflow_lint.py`). Galaxy's tests schema and Galaxy's own workflow test framework already honour the key. galaxyproject/foundry for the two notes that present it as a working pattern. Foundry tracking needed: yes, label `upstream/planemo`; the same Foundry issue carries the notes half.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31, phase 8 (implement-galaxy-workflow-test) and phase 10 attempt 5, case `spikein_failfast`, planemo master 2a815808, Galaxy release_26.1, 2026-10-31. Ledger `planemo-workflow-expect-failure-unimplemented` (major).
- Existing issues/PRs: none for workflow tests (searched planemo issues/PRs "expect_failure", "expect failure workflow"). planemo #1319 and #1229 (closed) are about tool tests. Foundry: none; #670 mentions the key only in passing.

## Symptom
`spikein_failfast` (`expect_failure: true`, `outputs: {}`) is meant to fail at the `pick_value first_or_error` step when Spikein mode has no spike-in FASTA. It did fail exactly there ("No non-null values"), and planemo reported it as an error, so a correct run reads red. `planemo workflow_lint` on the same tests file exits 1 with "Found no valid test expectations for workflow test". `gxwf validate-tests` accepts the file. The run kept the case in its own tests file and verified it by reading the invocation.

## Root cause
Confirmed in source.
1. planemo builds workflow test cases from `job`, `doc` and `outputs` only (`definition_to_test_case`, `planemo/runnable.py:272-311` @ 2a815808); `expect_failure` is never read. `structured_data` (`:606-621`) sets `status = "error"` whenever the run was not successful. `git grep expect_failure 2a815808 -- planemo` matches nothing.
2. `workflow_lint` (`planemo/workflow_lint.py:317-333`) warns and marks the test invalid when no output expectation is found, without looking at `expect_failure`.
3. The key is part of the format: Galaxy's `TestJob` model has `expect_failure: bool | None` ("the workflow is expected to produce an error", `lib/galaxy/tool_util_models/_models.py:1105-1111` on dev @ 65e6daff), which is where Foundry's vendored tests-format schema gets it. Galaxy's own framework applies it (`lib/galaxy_test/workflow/test_framework_workflows.py:81-85`, used by `default_values.gxwf-tests.yml`).
4. Foundry: `content/research/planemo-asserts-idioms/index.md:77` says a workflow-level `expect_failure:` case "is useful when the workflow itself promises to reject an invalid input", and `iwc-shortcuts-anti-patterns/index.md:50` cites it as part of Planemo's format. Neither says planemo ignores it.

## Evidence
Ledger entry above; run-summary attempt 5; `galaxy-workflow-failfast.gxwf-tests.yml`. Related: `element_count: 0` on an empty collection is the other test-language gap in this run, already covered by finding [14](14-collection-assertion-idioms.md) (planemo #1705) and galaxy #24485.

## Proposed fix
1. planemo: carry `expect_failure` on `TestCase`; in `structured_data`, a failed invocation with `expect_failure: true` is `success` (still checking any listed outputs), a successful one is `failure` ("expected workflow test to fail"). Mirror Galaxy's framework.
2. planemo `workflow_lint`: don't require output expectations when `expect_failure: true`.
3. Foundry idioms §5 and anti-patterns note: say planemo (≤ master 2a815808) ignores workflow `expect_failure`; such a case reads red, fails `workflow_lint`, belongs in its own tests file, and is verified by the invocation (failed at the intended step). Revisit once planemo ships the fix.

## Draft issue
**planemo — Title:** Workflow tests ignore `expect_failure`; `workflow_lint` rejects a failure case with no outputs

Galaxy's workflow test format has `expect_failure: true` (`TestJob` in `galaxy.tool_util_models`), and Galaxy's own workflow test framework passes such a case when the invocation fails (`lib/galaxy_test/workflow/test_framework_workflows.py`). Planemo builds workflow test cases from `job`, `doc` and `outputs` only (`definition_to_test_case` in `planemo/runnable.py`), so a case that fails as intended is reported as an error. `planemo workflow_lint` also warns "Found no valid test expectations for workflow test" and fails a case with `outputs: {}`.

Reproduce (master 2a815808, Galaxy release_26.1): a workflow whose only step is `pick_value` with `style: first_or_error` over an optional input; test with that input unset, `expect_failure: true`, `outputs: {}`. Expected: test passes, lint passes. Actual: error; lint exit 1.

Suggested fix: read `expect_failure` into `TestCase`, invert the invocation outcome in `structured_data` as Galaxy's framework does, and skip the "no valid test expectations" check in `workflow_lint` for such cases.

**Foundry tracking comment (label `upstream/planemo`):**
> planemo master ignores workflow-level `expect_failure` (upstream: <link>), and `workflow_lint` fails a case with no outputs. planemo-asserts-idioms §5 and iwc-shortcuts-anti-patterns present the key as usable; they should say a failure case reads red under planemo, fails lint, lives in its own tests file, and is checked by reading the invocation. Seen in the nf-core/cutandrun wb2g run, 2026-10-31 (`spikein_failfast`).

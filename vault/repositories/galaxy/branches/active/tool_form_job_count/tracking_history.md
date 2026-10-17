# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `tool_form_job_count` (`5d2684ace76`, off dev `4fe00d9e7ab`; independent of `issue_20657_input_processing_mode`, merges cleanly with it) — Description: Previews job count before Run via new `/api/tools/{id}/build` `job_expansion` (single COUNT query, access-checked) and "This will run N jobs." with empty/mismatch/remap warnings; refactors `meta.py` expansion classifiers (sync/async/count shared; unknown ids 404 not 500); blockers: fork CI on `5d2684ace76` has a relevant red — mypy `test/unit/app/tools/test_meta_expansion.py:140,220` (`Item "None" of ...`); Client Unit red is the known `focusOrder`/`GPopover` base red, packages social-auth; Playwright/Integration still running, rest cache-evicted; [debrief](implementation_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_form_job_count?expand=1).

## Status logs moved from index.md during polish (2026-10-17)

### TICK — 2026-10-11

Current-head Python lint still reports relevant nullable union accesses in test_meta_expansion.py:140,220. Client-unit base failure and browser cache misses remain separate; no promotion.

### TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521), [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610), [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

### GOOD_MORNING — 2026-10-13

Current fork head `5d2684ace7691912634cca7cf90a33538173daef` conflicts with `origin/dev` in 1 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `lib/galaxy/util/permutations.py`

### GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521). All requests accepted; reruns are pending, not passing coverage.

### TICK — 2026-10-13 evening

Requested failed-job reruns for recorded unrelated failures: [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488), [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654). All requests accepted. These reruns are pending coverage, not passing results; branch classification is unchanged.

### TICK reruns — 2026-10-15

Requested failed-job reruns for recorded unrelated failures: [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521), [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654), [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488). Requests accepted; reruns are pending evidence, not green results. Existing classification and review holds remain.

### Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `5d2684ace7691912634cca7cf90a33538173daef` found overlapping changes in 1 paths (`lib/galaxy/util/permutations.py`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.

Requested failed-job reruns for diagnosed unrelated failures: [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488), [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

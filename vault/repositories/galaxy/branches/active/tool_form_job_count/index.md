# tool_form_job_count

Status: `branches_implemented_needs_ci`. Base: `dev`.

Previews tool job counts before Run, with expansion and mismatch warnings; Run disabled on mismatch / multi-job remap.

[Implementation](implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Alt: original scope](alts/original_scope.md) · [Tracking history](tracking_history.md)

## Re-harden — 2026-10-17

The branch was rebased onto `origin/dev` `5ff1e46b8c3`, which resolved the `permutations.py` conflict. It was then re-scoped (Run is blocked on a mismatch or a remap with more than one job; batch labels are qualified) and hardened twice. The new head is `18d4e13b4eb`, force-pushed to `jmchilton`. The pre-rescope version is `tool_form_job_count_alt_original_scope`. CI has not been seen on the new head, so the fork-CI notes below refer to the old head `5d2684ace76`. STATUS READY; see [debrief](implementation_debrief.md).

## TICK — 2026-10-11

Current-head Python lint still reports relevant nullable union accesses in test_meta_expansion.py:140,220. Client-unit base failure and browser cache misses remain separate; no promotion.

## TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521), [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610), [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## GOOD_MORNING — 2026-10-13

Current fork head `5d2684ace7691912634cca7cf90a33538173daef` conflicts with `origin/dev` in 1 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `lib/galaxy/util/permutations.py`

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521). All requests accepted; reruns are pending, not passing coverage.

## TICK — 2026-10-13 evening

Requested failed-job reruns for recorded unrelated failures: [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488), [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654). All requests accepted. These reruns are pending coverage, not passing results; branch classification is unchanged.

## TICK reruns — 2026-10-15

Requested failed-job reruns for recorded unrelated failures: [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521), [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654), [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488). Requests accepted; reruns are pending evidence, not green results. Existing classification and review holds remain.

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `5d2684ace7691912634cca7cf90a33538173daef` found overlapping changes in 1 paths (`lib/galaxy/util/permutations.py`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.

Requested failed-job reruns for diagnosed unrelated failures: [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711), [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775), [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574), [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521), [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654), [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649), [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488), [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

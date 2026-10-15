# Polish debrief

Polished 2026-10-15. Head went from `27d72f8b62d` to `ba66af56c5c`: one new commit, then a rebase onto current `release_26.2` (clean, `navigation.yml` hunks unrelated). Also merges cleanly into `dev` (`git merge-tree`).

## CI

- Both reds on `3498376357c` were unrelated; see [index](index.md#ci). The packages mypy red (`ssh_util.py` `publickey`) is fixed on base by `c4a38b08eae` (#24136), so the rebase clears it.
- The force-push cancelled the in-progress Playwright and Integration Selenium runs on `27d72f8b62d`. Fresh fork CI on `ba66af56c5c` is the evidence to read before approval; the new E2E has only local runs so far.

## Checklist

[Checklist evaluation](checklist_evaluation.md): GENERAL + WORKFLOW_RELATED, no failures. Human-read item left for John. It surfaced a real edge case, fixed below.

## Strengthening

One round. Tasks applied:
- **Dropped poll during a failing input fetch.** `rerunWhileBusy` drops a pending rerun when the run rejects, and a failing input made every pass reject. A poll landing during that fetch was never applied; if it was the last poll before terminal, a header stayed stale with no error. Fixed in the composable, not the helper: `updateSteps` returns the input error, `refreshSteps` throws it after the run. Red→green test "applies a jobs summary that arrives while an input fetch is failing" (red at `27d72f8b62d` with `running` ≠ `ok`, both modes). Helper contract and its tests unchanged.
- **`refreshSteps` docstring** "latest inputs" → "latest polled data" (read as workflow inputs).
- Related vitest (14 files, 101 tests) green, eslint/prettier/vue-tsc clean, node 22.20.0.

Description fixes from the same round:
- Dropped the claim that Feedback follows the poll: the Debug tab only mounts once the invocation is terminal, so it only reuses the lookup.
- "touched files identical on dev" was false (`navigation.yml`); now "merges cleanly into `dev`".
- The Overview screenshots show it still updates, not a before/after; reworded.
- Added bold-italic answers for "new requests?", "why the new helper?" and "why release_26.2?".

## Left for John

- `InvocationGraph.test.ts:54` counts calls on a mock; the next assertion (alert gone) already proves the retry. Replace or drop it?
- Fix the dropped rerun in `rerunWhileBusy` itself instead (rerun after rejection when a call is pending)? It'd flip a `sharedPromise.test.ts` assertion. The composable fix was taken instead.
- Carried from earlier notes: remove the dead `invocationAndJobTerminal` Overview prop; keep both the Steps component test and the E2E; `release_26.2` vs `release_26.1`; ping ahmedhamidawan (#22745 assignee).
- Out of scope: zoom/pan profile, retry in the composable for Steps/Debug, per-step polling fan-out.

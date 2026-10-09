# Debrief: workflow refactor redundant builds

Source: `to_file/workflow_refactor_redundant_builds.md`, a follow-up to dannon's "about three builds and exports … not a blocker, just curious if you looked at it" on #23799. #23799 is still open as a draft.

## Outcome: measured; recommend not filing

The source's first step was "benchmark; if the overhead is small next to the total request, close this as not worth it". I ran that benchmark before writing a proposal, and the overhead is small. No proposal was written or reviewed.

## Benchmark

- **Setup:**
  - A throwaway API test timed `PUT /api/workflows/{id}/refactor`: 5 repeats after one warm-up, median wall time.
  - The workflow was nested: N subworkflows chained, each a chain of M `cat1` steps.
  - Each side ran one at a time:
    - **dev:** `3b53c556928`, the merge-base of #23799.
    - **branch:** `722d8f2d09f`, the #23799 head.
- **Cases:**
  - Dry-run no-op `update_name`.
  - Real no-op `update_name`. dev saves a new version here; the branch skips the save.
  - Real rename, with a new name each repeat.

| Workflow | Case | dev | #23799 | Δ |
|---|---|---|---|---|
| 10 × 20 = 200 tool steps | dry-run no-op | 0.193 s | 0.216 s | +0.02 s |
| | real no-op | 0.300 s | 0.214 s | −0.09 s (skips save) |
| | real rename | 0.278 s | 0.380 s | +0.10 s |
| 20 × 50 = 1000 tool steps | dry-run no-op | 0.923 s | 0.889 s | ≈ 0 |
| | real no-op | 1.326 s | 0.908 s | −0.42 s (skips save) |
| | real rename | 1.351 s | 1.443 s | +0.09 s (+7%) |

- The real-save overhead is about 0.1 s and doesn't grow from 200 to 1000 steps, so it isn't per-build cost scaling with size. Dry runs show no measurable difference at 1000 steps.
- No-op refactors, the case #23799 targets and that `planemo autoupdate` loops hit, are faster on the branch because they skip the save. That more than pays for the extra builds.
- Raw timings are in the scratchpad (`bench_*.json`), along with the throwaway test `test_zz_refactor_bench.py`. The copies in the branch worktree and the dev checkout were deleted.

## Caveats

- `cat1` has trivial tool state. IWC tools with deep conditional/repeat trees make each build's tool-state recompute heavier, so the real-save delta could be larger there. Nothing in the numbers suggests it would matter, but it is untested.
- This is a single-machine local sqlite run.

## Left over

- Dannon asked directly whether this was looked at. The useful output is probably a short reply on #23799 with the table, not an issue. Not posted.
- mvdbeek's "separate construction from persistence" suggestion has a correctness motivation (the expunge list, transient PJAs), not a performance one. If it's pursued, it should be filed on those grounds.

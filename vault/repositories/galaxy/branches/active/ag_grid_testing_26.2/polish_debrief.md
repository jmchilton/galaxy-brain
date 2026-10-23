# Polish debrief — ag_grid_testing_26.2

Polished without hardening at John's request (commits hardened as part of [ag_grid_36](../ag_grid_36/index.md)). Head `71bfc69c498` on `release_26.2` (`d2d1dcd883c`).

## Branch

- Cherry-picked from `ag_grid_36`: `7c0c4dbcb69` (`ag_grid_edit_cell` helper), `fcf7d23eae6` (data landing E2E), `30f3031f7a6` (paired builder assertions). Cleanup commit `0dc06dc46d2` left on `ag_grid_36`.
- `71bfc69c498` drops the paired builder swap step and `swap_button` selector: the `title="Swap forward and reverse"` button is dev-only (`121add23394`), and 26.2's bare swap icon may not fire clicks without `1ad7732ee8d`. Kept as a separate commit because amending was blocked; squash into `30f3031f7a6` if wanted.

## Checklist (GENERAL.md)

All pass or N/A; human-read item left for John. Subagent found the swap blocker above; fixed.

## Strengthening (one round)

Applied: forward/reverse assertion relabelled a baseline pairing check (no edit touches it); "two tables" reworded since sample sheet and rule grids already have E2E; "test code + two hooks" moved into the bold scope sentence; challenge line narrowed to edit assertions.

Question for John (not done, widens scope): sample sheet / rule grid edit E2E on 26.2. Scope evaluation judged it low value.

## Open

- Fork CI queued on `71bfc69c498`. The description's "tests pass on 31.3.4" claim rests on its Playwright run; Tests details hold a PENDING line to fill in. Nothing run locally.
- After this merges, rebase `ag_grid_36`: its copies of these commits become redundant except the swap step.

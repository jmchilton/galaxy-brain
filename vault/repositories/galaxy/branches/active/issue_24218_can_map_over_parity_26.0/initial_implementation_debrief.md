# Initial implementation debrief

- Branch `issue_24218_can_map_over_parity_26.0` off `origin/release_26.0` (`a6544be047d`), pushed to `jmchilton`.
- `3e3b6d75e8b` Baseline tests: new `client/.../modules/collectionTypeDescription.test.ts` pinning `canMapOver` cases client + server already agree on (passes on base).
- `0e9a619bda4` Fix: `canMapOver` source hunk from `00e2bf07047` applied verbatim (clean apply); rule order now mirrors Python `has_subcollections_of_type` (self → `:other` suffix → `paired_or_unpaired` → `X:paired_or_unpaired` with extra higher ranks). Dropped `rank <= other.rank` branch. Fresh commit message (original wrongly claimed `paired_or_unpaired` mapped over itself on the client; real self case is `list:paired_or_unpaired`).
- Red-to-green: 5 unit asserts (`paired`, `paired_or_unpaired`, `list` over `list:p_o_u`; `list`, `list:list` over `list:list:p_o_u`) + self case + 2 `terminals.test.ts` cases (`paired` / `paired_or_unpaired` → `list:paired_or_unpaired collection input` rejected). All 4 tests red on base, green after fix.
- `vitest run src/components/Workflow/Editor` under node 22.20.0: 17 files, 149 tests pass. eslint/prettier via pre-commit pass.
- `list` → `list:list:paired_or_unpaired` 💥 row: unit-only; no fixture for that input in `parameter_steps.json`, didn't add one.
- Not done: Python side untouched (already correct on 26.0); shared parity table left as follow-up per issue.

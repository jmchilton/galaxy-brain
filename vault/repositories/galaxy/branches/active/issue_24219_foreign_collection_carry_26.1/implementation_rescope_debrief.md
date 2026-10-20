# Implementation re-scope debrief

John asked (2026-10-19) to bring the broader 26.2 fix rather than the narrow other-history carry. Original scope kept as alt [original_scope](alts/original_scope.md) (`3147227b128`).

## What changed

Branch rebuilt on `release_26.1` (`dbe4f2f7e41`):

1. `3311cf2dd1f` - cherry-pick `-x` of `ee476eb5a3b` (#23865): collection select lists visible HDCAs only; `_carry_selected_hdca` carries hidden, deleted or other-history selections. Conflicts: kept 26.1 `Optional[...]` typing and untyped `trans`; dropped 26.1's `match_collections` / `match_multirun_collections` (no callers).
2. `62058ed38ed` - cherry-pick `-x` of `a48832e3b04` (rest of #23865).
3. `7bee3166e32` - other-history carry tests from the alt (build + rerun).
4. `fd4963c2021` - carry classifies via `_classify_hdca` so map-over-only selections keep `map_over_type`; red-to-green tests for other-history and hidden.
5. `c5f2b4503bd` - review follow-up: hidden test sends no `map_over_type`, proving the server derives it.

## Review

Normal review flagged only the already-known cross-user carry exposure (private note; no review debrief per policy). Acted on: test derivation tweak. Not acted on:
- Stable-branch behavior change (hidden collections leave collection selects on 26.1) - PR description must state it; alt is the fallback.
- Carry picks the direct match when a multi-type param matches both ways - one-`keep`-per-id client contract; 26.2 same.
- `_history_query` built twice, `(deleted)` label unreachable - kept identical to 26.2 for merge-up.

## Tests

`test_tools.py -k build_` 20 passed + known pre-existing failure `test_build_does_not_leak_hda_from_user_bundle`; `test_tools.py -k carries_` 3 passed; `test_jobs.py -k rerun` 8 passed; parameter unit tests 212 passed; mypy no new errors; pre-commit clean.

## Not done

Force-push of the rebuilt branch to `jmchilton` was blocked by the permission classifier; remote still at `3147227b128` (same as alt). Needs John's OK.

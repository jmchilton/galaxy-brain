# Stale `__current_case__` references in `workflow_state._walker`

## Summary

`_walker.py`'s `walk_native_state` docstring claims it uses `__current_case__` as a fallback for conditional branch selection, but the implementation (`_select_which_when_native`) never reads `__current_case__` from state. Branch selection uses only the test parameter's value + discriminator matching + default-when fallback. The docstring is vestigial from an earlier implementation.

## What to clean up

### `_walker.py`

1. **Line 95** — docstring says `"Handles: conditional branch selection (with __current_case__ fallback)"`. Remove the parenthetical; the function does test-value matching with default-when fallback, not `__current_case__` index lookup.

2. **Line 72** — `__current_case__` in `_NATIVE_BOOKKEEPING_KEYS`. This is still correct to keep — the key does appear in native `tool_state` dicts written by the Galaxy server runtime (`galaxy.tools.parameters.grouping` populates it). The walker needs to tolerate it as a known bookkeeping key when `check_unknown_keys=True`. The issue is only with the docstring claiming it's used for branch selection.

### Other files (no code changes needed, docstring/comment only)

- `clean.py:106` — docstring mentions `__current_case__` as example bookkeeping key. Accurate, keep.
- `stale_keys.py:4` — module docstring lists it as BOOKKEEPING category. Accurate, keep.
- `roundtrip.py:300` — `SKIP_KEYS` set includes it for comparison skipping. Correct behavior, keep.

## Context

The Galaxy server runtime (`galaxy.tools.parameters.__init__`, `grouping.py`, `evaluation.py`, etc.) actively writes and reads `__current_case__` as an integer index into `conditional.cases[]`. This is a server-side implementation detail — the `workflow_state` validation module correctly avoids depending on it, selecting branches via the test parameter value and discriminator matching instead. The only issue is the stale docstring implying the old behavior persists.

## Scope

Single docstring fix in `_walker.py` line 95. No behavioral changes.

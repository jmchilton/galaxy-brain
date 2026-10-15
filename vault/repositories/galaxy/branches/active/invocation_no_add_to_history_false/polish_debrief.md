# Polish debrief — invocation_no_add_to_history_false

Polished 2026-10-15. Retargeted from `dev` to `release_26.2` at John's request before polishing.

## Rebase

Single commit, replayed cleanly onto `release_26.2` at `082605cade0` (`f9e6dde20fa` → `de958171049`). Force-pushed with lease to the `jmchilton` fork.

## CI

Fork CI on the old `dev`-based head `f9e6dde20fa`: all green except Test Galaxy packages (3.10, 3.14). Both fail on one mypy `no-untyped-call` at `galaxy/security/ssh_util.py:18` (pycryptodome `publickey`), a file this branch doesn't touch, so it's unrelated. CI on the `release_26.2` heads was queued when polishing ended.

## Checklist

GENERAL + WORKFLOW_RELATED (the branch touches invocations). [Evaluation](checklist_evaluation.md): PASS. Human-read item left for John. Re-run after the test change.

Who hits this: no in-tree caller, BioBlend (sends only `True`) or Planemo sends explicit `false`. The exposure is typed callers. The published `@galaxyproject/galaxy-api-client` 26.1.1 (and `release_26.2`'s `schema.ts:18398`) declares `no_add_to_history: boolean | null` as non-optional. Recorded honestly; no concrete affected user is known.

## Strengthening round

Tasks applied:
- Added an explicit-`null` case to `test_run_no_add_to_history` (parametrized `["omitted", None, False, True]`). Amended into the single commit → `e6121407400`, pushed.
- Red on `release_26.2`'s `run_request.py` without `-x`: omitted PASS, null FAIL (`AssertionError: []`), false FAIL (`AssertionError: []`), true PASS, which demonstrates every "before" table row. Green with the fix: 4 passed in 41.43s.
- Description: corrected the claim that library/HDCA paths were untouched (they now follow the value too), added the history (presence check predates 2014's d5916381a8c; schema `default=False` from 222f3649d1b, 2024-02), and highlighted answers to the misreadings: the release-branch API change, BioBlend, the misleading schema description, and omission being unchanged.

Verified the subagent's factual claims directly before using them: library paths `:426`/`:441`, commit dates, npm version, `release_26.1` TS type, the list of required TS fields (it missed `ds_map` and `parameters`; added).

## Left for John

- The schema's `no_add_to_history` description ("should not be added to the history") is misleading. Fixing it regenerates `schema.ts`, so it's probably `dev`-only follow-up work.
- Defaulted request fields being required in the generated TS type is the client-side root cause. Separate, `dev`-only.
- No library-dataset test case. The description says library inputs follow the flag (verified in code, not by a test). Scope evaluation had rejected widening the matrix.

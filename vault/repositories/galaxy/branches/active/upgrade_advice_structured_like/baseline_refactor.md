Split out one behavior-preserving refactor commit on `origin/dev`: move linter input-reference walker to `linters/_util.py` (public `InputReferences`/`InputReference`, new `legacy()` lookup); feature commits rebased on top.

## Refactor commit

- `eeb25a148c7` Move linter input reference walker to linters/_util
  - `_InputReferences`/`_InputReference`/`_param_name` moved from `linters/output.py` to `linters/_util.py`, de-underscored.
  - Added `InputReferences.legacy()`; output linters' two inline `r.legacy == ...` comprehensions now call it.
  - No behavior change; linter + upgrade tests pass (160).

## Feature commits (rebased, content unchanged)

- `ee302365607` Move structured_like upgrade advice to profile 26.0 (now only upgrade/__init__.py, codes json, tests)
- `e77599bfd46` Flag partially qualified structured_like in 26.0 advice
- `fd124f4219e` Don't advise structured_like paths inside repeats

Final tree identical to old tip `87a7b89abe7` (kept as local branch `upgrade_advice_structured_like_pre_baseline_refactor`); tests pass at tip (164). Not pushed - remote `jmchilton/upgrade_advice_structured_like` still at old tip, needs force push.

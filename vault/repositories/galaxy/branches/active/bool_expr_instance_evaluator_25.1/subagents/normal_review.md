Run via Claude Opus 5.5 at low effort.

**Verdict: approve as is.** Fix is correct, minimal, and verified red-to-green; no bugs found. Expect one small forward-merge conflict.

Findings:

- No bugs.
- Forward-merge (expected, not a defect): `release_26.0`, `release_26.1` and `dev` renamed `setParseAction(action)` to `set_parse_action(action)` and `infixNotation(` to `infix_notation(`. I simulated the merge into 26.0 with `git merge-file`, and one conflict region covers both lines. The import block merges cleanly to `infix_notation`, so taking "ours" for the whole region leaves an `infixNotation` NameError.
  - Resolve the region to `boolOperand.set_parse_action(lambda token: BoolOperand(token, evaluator))` **and** `self.boolExpr: ParserElement = infix_notation(`.
  - The removal of `action = BoolOperand` / `action.evaluator` and the `BoolOperand.__init__` change merge cleanly.
  - Switching 25.1 to snake_case now would not avoid the conflict, since both sides still change the same lines.
- One finding reported to coordinator separately.
- Nits: none worth acting on.

<details>
<summary>Full review</summary>

### Scope

One commit, `93ef0d45a71`, on `origin/release_25.1`. It changes `lib/galaxy/util/bool_expressions.py` by 2 lines added and 6 removed, and adds 13 lines to `test/unit/util/test_bool_expressions.py`. The commit message is accurate and terse.

### Correctness

- `BoolOperand` no longer has the class attribute `evaluator`. The evaluator now reaches each instance through a closure in the parse action, which `BooleanExpressionEvaluator.__init__` builds per instance. The module has no other class-level mutable state: `BoolBinaryOperation.reprsymbol`/`evalop` are constants.
- Nothing else constructs `BoolOperand` or reads `BoolOperand.evaluator`. A grep across `lib/`, `packages/` and `test/` finds only `lib/galaxy/files/sources/__init__.py`, which uses `BooleanExpressionEvaluator(...)`, `.evaluate_expression` and `is_valid_expression`, plus the unit test. No subclasses either.
- The file-source caller builds a fresh evaluator and evaluates right away. Two evaluators therefore only interleave in production when calls overlap: another construction, or `is_valid_expression()` during configuration validation, landing between construct and evaluate. The regression tests model that interleaving deterministically.

### pyparsing arity (verified)

- 25.1 pins `pyparsing==3.2.5`, and that is the version in the test venv. The 1-arg lambda goes through `_trim_arity`, as the class passed before did. All 44 tests pass.
- `packages/util/setup.cfg` lists `pyparsing` with no version floor. `setParseAction` and arity trimming have both been around since 2.x, so this adds no new constraint.
- I also forward-ported the fix onto the `origin/dev` module and ran it under pyparsing 3.3.3 with `-W error::DeprecationWarning`. Same results, no warnings.

### Packrat cache (verified)

- In 3.2.5 and 3.3.3 the cache key is `(self, instring, loc, callPreParse, do_actions)`, with elements hashed by identity. Each instance builds its own `MatchFirst`, `Word` and `infixNotation` tree, so one instance's cached `BoolOperand` results can't be looked up through another instance's elements.
- Instances do share the leaves `TRUE`, `FALSE`, `QUOTED_STRING`, `NOT_OP`, `AND_OP` and `OR_OP`. After building several evaluators, all six still have `parseAction == []`, so their cached entries are raw tokens that are the same for every instance.
- Stress run: 8 threads, two token sets, 3000 evaluations each. Base had 4 mismatched threads under both 3.2.5 and 3.3.3. The branch had 0 under 3.2.5, and the dev port had 0 under 3.3.3.

### Tests

- Red on base, checked by running the base module: `test_evaluators_resolve_tokens_independently` gives `(True, True)` against the expected `(False, True)`, and `test_is_valid_expression_leaves_other_evaluators_unchanged` gives `(True, True)` against the expected `(True, False)`. Both are green on the branch.
- Neither test is trivial. Each one asserts the specific cross-instance effect, and the assert order (older instance evaluated after the newer one is built) is what makes it fail on base. The names are clear and match the file's `test_<behavior>` style. No existing tests were changed.
- This is a pure-unit concern, so integration tests wouldn't add anything.

### Lint/type

`mypy`, `ruff`, `black` and `isort` are clean on both files, using the 25.1 venv pins.

### Abstractions/reuse

This is the natural fix: it drops shared state rather than adding a mechanism. `functools.partial` would also work, but the lambda is clearer. The PR adds no new abstraction and needs none.

### Target

The class-level assignment has been there since the module was added (`03795b766e7`, 2021) and is also on `release_25.0`. Targeting 25.1 is fine if 25.0 is outside the support window.

</details>

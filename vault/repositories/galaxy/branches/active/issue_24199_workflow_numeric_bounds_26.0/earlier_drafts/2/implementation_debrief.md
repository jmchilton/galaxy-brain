# Implementation debrief

**STATUS: BLOCKED — scope decision for John.** Second scope evaluation recommends one more small item; per process, parked rather than re-scoping twice.

## Decision needed

[Scope evaluation](scope_evaluation.md) recommends adding an `InputParameterModule.get_errors()` override (K1, ~5 lines + 1 unit test) that reports saved `min > max` as a step error in the editor (node error on load; "validation errors" warning on save/import; warning only, blocks nothing). Today the editor accepts inverted bounds silently and the run form returns a 400. Options:

1. **Add K1** (recommended by evaluator), then short re-check: normal review + unit tests; other reviews still apply.
2. **Ship as is**; K1 becomes top follow-up.
3. **Ship original scope** — alt `issue_24199_workflow_numeric_bounds_26.0_alt_original_scope` (`bfe5dc0e49f`, run-form fix only; see [alts/original_scope.md](alts/original_scope.md)).

## What the branch does

Base `release_26.0` (`a6544be047d`), head `564b40c3839`:

- Run form: integer/float workflow inputs send their editor bounds as `min`/`max` (slider + range warning); the parameter rebuilds the same range validator, so server validation/messages are unchanged.
- Editor: Default Value field gets the same bounds (shared `split_numeric_bounds` / `numeric_bounds_inverted` in `workflow_parameter_input_definitions.py`).
- Inverted saved bounds: run form → `RequestParameterInvalidException` naming the input (was `AssertionError` / 500); editor Default field left unbounded.
- `FormNumber.vue`: min-only fields corrected to the min (was `null`); empty optional bounded fields no longer warn/snap.

## Behavior change John should know

Two existing Selenium tests (`test_int_parameter_minimum_validation`, `test_float_parameter_maximum_validation`) asserted the server run error for out-of-range values. With bounds on the run form, FormNumber now clamps on blur, so the run succeeds instead. Tests updated to assert the client alert + clamped value. Verified locally: base versions fail against the fix (time out waiting for run error); new versions pass on Selenium; a probe confirmed the clamped run submits and the invocation completes. Exact server messages still pinned by unit tests. **This modifies existing test assertions — needs your OK.**

## Validation

- Unit: `test/unit/workflows/` 111 passed, 1 skipped. Vitest `src/components/Form/` 116 passed.
- API (run locally, one at a time): `test_numeric_input_bounds_reach_run_form`, `test_numeric_input_inverted_bounds_rejected_on_run_form` — 2 passed.
- Selenium: two updated editor tests — 2 passed (Selenium-only; Playwright skips them).
- Dev forward-merge: issue repro incl. multiple-integer passes on `origin/dev` with run-form fix applied (checked on original scope). Conflicts trivial.

## Reviews (all still apply to current head except where noted)

Normal review + rescope review ([subagents/](subagents/)), [test challenges](test_challenges_debrief.md), [E2E polish](polish_e2e_tests_debrief.md), [Codex](codex_review.md) (no findings), [thermo-nuclear](thermo_nuclear_review.md), [refactor baseline](baseline_refactor.md). Pre-rescope versions in [earlier_drafts/1/](earlier_drafts/1/).

## Remaining

- Screenshots process (`GX_PROCESS_SCREENSHOTS.md`) not run — hardening stops at a scope recommendation. E2E polish produced local captures of the run-form alert only.
- If K1 is taken: implement, normal review, rerun unit tests, then screenshots.
- CI not yet run.

## Follow-ups

- `%s` left in validator messages for a rejected `0` (shared `tool_util_models`; own PR).
- `step_state_to_tool_state` collapses persisted `in_range` validators (drops `negate`/`exclude_*`/`message`; last wins).
- Bounds round-trip min/max → `in_range` → min/max (export contract).

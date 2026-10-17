Split the `download_workflow_raw` populator extraction into its own behavior-preserving commit ahead of the fix; folded the editor-test helper cleanup into the "Baseline tests" commit. FormNumber helper commit from the earlier run kept.

## New history (on `release_26.0` @ `a6544be047d`)

1. `ff63ec6ce77` Baseline tests for workflow numeric parameter ranges — now includes the `__case` helper (was `ac2955ddb08`, last commit), so `__editor_default_parameter` picks conditional cases by value from the start instead of being rewritten at the end. Passes on base.
2. `19ffa880ed9` Extract FormNumber range bound helpers — unchanged.
3. `953013e8e60` Add download_workflow_raw populator helper — new. `populators.py` only: `download_workflow` now wraps `download_workflow_raw`; no behavior change. Was bundled in the API tests commit.
4. `eb562100425` Send workflow numeric input bounds to the run form.
5. `41c2102e77a` Let optional bounded number fields be cleared.
6. `90a99a6dab4` Bound workflow Default Value field; reject inverted bounds clearly.
7. `36c1dbb589a` Test Default Value bounds through the editor's build order.
8. `3b928742223` API tests for workflow numeric input bounds on run form — now only `test_workflows.py`; message drops the helper line.
9. `85302c1d457` Update editor bounds E2E tests for run form range warning.
10. `564b40c3839` Share run-form bounds E2E helper; drop sleep, add screenshots.

Final tree identical to old head `ac2955ddb08` (`git diff` empty); local backup branch `issue_24199_workflow_numeric_bounds_26.0_pre_refactor2`. Pushed to `jmchilton` with `--force-with-lease`.

## Considered, not split

- `split_numeric_bounds` / `numeric_bounds_inverted`: stripping the `in_range` validator changes base behavior; no behavior-preserving form on base. Inline-then-extract churn between commits 4 and 6 left as is (each commit reads cleanly on its own).
- Selenium `_workflow_run_assert_number_clamped`: the two base tests share a flow, but the helper's assertions are the new behavior (client clamp, not server error). Extracting it on base would only be rewritten later.
- `data-description="form number alert"` + `simplified_input_alert` selector: additive, but no consumer on base; stays with the E2E commit.
- `parameter_kwds: dict[str, Any]` widening: only needed for new `min`/`max`; stays with the fix.

## Verification

- Commit 1 (against base code): `test/unit/workflows/` 101 passed, 1 skipped; `src/components/Form/` vitest 115 passed.
- Commit 3: `test/unit/workflows/` 101 passed; `galaxy_test.base.populators` imports.
- Head: `test/unit/workflows/` 111 passed, 1 skipped.
- API test file content unchanged, but `populators.py` now lands in a separate commit; API/Selenium tests not rerun here.

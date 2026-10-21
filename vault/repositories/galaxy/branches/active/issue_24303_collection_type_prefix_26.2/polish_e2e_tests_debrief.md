Trimmed `test_type_prefix_output_indicator` to assert each output once and use `screenshot_if`, and confirmed that it fails against the pre-fix editor and passes with the fix.

## Changes (amended into `9416b0483e6`, still at HEAD)

- Removed 3 duplicate pre-layout assertions. Every output was asserted twice: once while connecting, then again after auto-layout with a screenshot. The test still asserts `nest#output` right after the first connect. That check guards the red case. Before the fix, `nest#output` is not `list:list:paired`, so the later drag onto `paired#f1` would be invalid. Without the early assert, a red run would not fail at a clear type assertion.
- In `assert_node_output_is`, replaced `if screenshot_name: self.screenshot(...)` with the existing `self.screenshot_if(screenshot_name)`.
- Commented the `sleep_for(UX_RENDER)` after auto-layout: the layout animates node positions and leaves no DOM state to wait on. The same click + sleep pair already appears 5 times in the file. I did not refactor the other tests.
- No raw CSS/DOM selectors in the new test, so no `navigation.yml` work. Screenshots were already captured.
- Kept the test. The vitest cases in `terminals.test.ts` cover the type computation. This test is the only browser evidence that the drag-connect into a `paired` input is accepted and that the tooltips render.

## Red / green (Playwright, headless; Galaxy 8737 with `config/galaxy_8737.yml`, Vite 5737)

- Green after trim: PASSED.
- Red: reverted `terminals.ts` and `workflowStepStore.ts` to `95de0d86251`. The test failed at its own first assertion: `assert 'output is dataset collection with 3 levels of nesting' in 'output is list of pairs dataset collection'`. Before the fix the editor shows the raw `type_source` type (`list:paired`) and ignores the prefix.
- Restored both files with `git checkout --` (tree clean) and reran: PASSED. The 4 screenshots were regenerated and look correct.
- No flaky failures, so no Selenium cross-check was needed.

Both servers were stopped after the runs.

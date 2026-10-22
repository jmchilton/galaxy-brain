Split branch into baseline tests -> behavior-preserving `replacementParameterNames` refactor -> fix (+3 red-on-base tests) -> E2E; final tree identical to pre-restructure HEAD `c2d059975ca`.

## New history (on base `0073b5e9224`)

1. `ab51b21a059` Baseline tests for editor untyped workflow parameter lint
   - `test_fixtures.ts` `createTestStep` extension (type, label, configForm, postJobActions; returns `Step`).
   - `parameters.test.ts` with only the 2 controls that pass on dev: undeclared rename flagged; tool state `${sample}` flagged even with matching parameter input label.
2. `c10a9a88099` Extract replacement parameter names with one capture-group helper
   - `replacementParameterNames` + `REPLACEMENT_PARAMETER_RE`, drops `getParameterFromMatch`, flattens PJA loop (`?? {}`).
   - Restored to base behavior: no parameter-input label skip, still scans every string PJA action argument.
3. `91ac72393ce` Don't flag rename parameters backed by a parameter input in editor lint
   - Original fix message kept. Adds label skip + RenameDatasetAction-`newname`-only scan, and the 3 tests (declared label, mixed rename, tag action).
4. `3d381403e21` Add E2E test that extracting an untyped rename parameter clears lint
   - Folds original E2E commit and load-wait commit; message merges both.

Previously `c2d059975ca` (refactor) sat on top of the fix; it now precedes it.

## Verification

- vitest (`src/components/Workflow/Editor src/stores/workflowStepStore.test.ts`, node 22.20.0): commit 1 379 pass, commit 2 379 pass, commit 3 382 pass.
- Full `parameters.test.ts` at commit 2: exactly the 3 expected tests red, 2 controls green.
- `vue-tsc --noEmit` clean at commit 2 and tip. eslint on touched files at tip: 0 errors (3 pre-existing `any` warnings).
- `git diff c2d059975ca HEAD` empty. E2E not rerun (content unchanged).
- Backup ref `untyped_param_lint_declared_labels_pre_baseline` -> `c2d059975ca` left in place. Not pushed.

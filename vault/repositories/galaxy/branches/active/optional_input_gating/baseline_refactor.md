Split the single commit `1d69a689cdf` into four: a behavior-preserving helper refactor, a standalone fix for a bug reachable on dev, baseline framework-workflow tests, then the feature. The final tree is identical to `1d69a689cdf` (tree `8de447d4a69`). HEAD is `0bd89181eb3`, force-pushed to `jmchilton/optional_input_gating`.

## Commits (on `origin/dev` `a9a68082414`)

1. `208b8ffae50` Extract shared step output helpers in the workflow editor (refactor, no behavior change).
   - Adds five helpers to `workflowStepStore.ts`:
     - `normalizeConnectionOutputLinks`
     - `stepOutputCanBeAbsent`
     - `effectiveOutputExtensions`
     - `isParameterOutput`
     - `isCollectionOutput`
   - Rewires dev code to use them:
     - `stepToConnections` uses the normalizer.
     - `terminals.ts` `getConnectedTerminals` uses `effectiveOutputExtensions` in place of the inline ChangeDatatype override.
     - `terminalFactory` uses the two exported guards in place of dev's private `isOutputParameterArg`/`isOutputCollectionArg`.
     - `SVGConnection.vue` `outputIsOptional` uses `stepOutputCanBeAbsent`.
   - Equivalence checks:
     - The guards drop dev's `"name" in arg` check. That's safe, because they only run inside `terminalFactory`'s `else if (terminalSource.name)` branch.
     - `effectiveOutputExtensions` now always copies `extensions`. `?? []` is a no-op for the typed `DataOutput`/`CollectionOutput` shapes.
   - Not moved here:
     - `refreshStepExtraInputs` / two-arg `findStepExtraInputs` exist only for gate ports, so they stay with the feature.
     - No dev docstrings were trimmed. The `whenExpression.ts` header edit describes the feature, so it stays there too.
2. `ad56e6175c8` Drop the orphaned `when` connection when a step condition is cleared (fix).
   - The bug, on dev: unchecking "Conditionally skip step?" clears `when` but leaves the `when` link in `input_connections` and in the connection store. The gate port disappears, so nothing can disconnect the link, and it gets saved.
   - What this commit adds:
     - `UpdateStepConnectionsAction` and the `"input_connections" in toPartial` dispatch in `useStepActions.updateStep`. Both are taken verbatim from the feature.
     - The `actions.test.ts` undo/redo test.
     - A minimal change to dev's `FormConditional.onSkipBoolean(false)`, which now drops the `when` key when it is present.
     - A small new `FormConditional.test.ts` covering that path.
   - Both tests were confirmed red on commit 1 and green after.
   - Dev's checkbox-on path, which already emitted `input_connections: {…, when: undefined}`, now goes through the new action. It drops nothing, because no `when` connection exists in that state.
   - Why it's a separate commit: the bug is reachable on dev and independent of gating. The feature's boolean→presence/none transitions reuse the same action, so it lands first and the feature commit only extends the form.
3. `1806356a0ef` Add framework workflow tests for steps gated on optional input presence (baseline tests).
   - The four `lib/galaxy_test/workflow/optional_input_gating*.gxwf*.yml` files.
   - The branch changes no server code, so these document the existing runtime contract and pass on dev. Verified: 4 passed at this commit.
4. `0bd89181eb3` Let workflow steps run only when an optional input is provided (feature; original subject).
   - The rest of the branch.
   - The feature's `FormConditional.vue` and `FormConditional.test.ts` replace the fix commit's minimal versions.

## Verification

- Tree equality: `git diff 1d69a689cdf 0bd89181eb3` is empty and the tree hashes match.
- Commit 1: vue-tsc clean; eslint and prettier clean (only pre-existing `no-explicit-any` warnings); vitest `src/stores src/components/Workflow/Editor` 73 files / 756 passed.
- Commit 2: vue-tsc clean; vitest `src/stores src/components/Workflow/Editor src/components/Form` 111 files / 1063 passed.
- Commit 3: framework workflow pytest `-k optional_input_gating`: 4 passed.
- HEAD:
  - vitest `src/stores src/components/Workflow/Editor src/components/Form`: 112 files / 1140 passed.
  - vue-tsc clean.
  - framework workflow pytest: 4 passed.
- E2E: not run.

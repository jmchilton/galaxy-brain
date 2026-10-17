Second pass, after the re-scope: two generic pieces from the re-scope and review rounds now land on dev ahead of the feature, behind a new "Baseline tests" commit. The first is the `Form/utilities.js` change, with `visitInputs` passing parents, `findInputPathByDottedName`, and `repeatTitle` shared with `FormRepeat`. The second is the `NavigatesGalaxy.tool_form_select_collection` E2E helper. The first pass's server baseline, refactor and fix commits stay first. The final tree equals the pre-rewrite tree except for the added tests in `Form/utilities.test.js` and the new `Form/FormRepeat.test.ts`.

## New history (`git log origin/dev..HEAD`, oldest first)

1. `a79cf7072d3` **Baseline tests for meta parameter batch expansion.** First-pass commit, unchanged.
2. `4e4b90a51e6` **Baseline tests for dotted-name input lookup and repeat block titles.** New. Passes on dev.
   - `utilities.test.js`: `findInputByDottedName` finds data inputs inside sections, repeat blocks and active conditional cases. It returns `null` for non-data inputs, for inputs in inactive cases, and for unknown names. Dev had no direct test of it, and the refactor rewires it.
   - New `FormRepeat.test.ts`: block titles render as `1: Dataset`, `2: Dataset`. FormRepeat had no test, and the refactor routes its titles through `repeatTitle`.
3. `501bc7938ef` **Share meta classifier and collection loading across expansion paths.** First-pass commit, unchanged.
4. `a7fd0b8e4e7` **Raise ObjectNotFound for unknown batch collection ids.** First-pass commit, unchanged.
5. `a413d66c35c` **Pass enclosing containers to visitInputs callbacks.** New. It holds the final `Form/utilities.js` plus the `repeatTitle` call in `FormRepeat.vue` and `FormInputNode.title` in `useFormState.ts`. `utilities.js` gains:
   - `visitInputs`'s `parents` arg
   - `findInputPathByDottedName` with its JSDoc `EnclosingInput` typedef
   - `findInputByDottedName` delegating to it
   - `repeatTitle`

   It also carries the existing visitInputs parents test, plus a new `findInputPathByDottedName` test. Both tests are red on commit 4 and green here. These pieces came out of `ebd4fd8` (parents, repeatTitle), `049f8c1` (path lookup) and `d075335` (JSDoc types).
6. `d0cb34f6d44` **Share tool form collection-select helper in NavigatesGalaxy.** New. It adds `tool_form_select_collection` and the `parameter_data_input_collection_pressed` selector, and switches `test_rerun_dataset_collection_element` to the helper, replacing a sleep. These came out of `d4eeabe` and `497a612`. `g-pressed` already exists on dev.
7. Feature commits replayed. Each commit's tree is its old tree with the moved files at their final content. The E2E tests use the helper from the start.
   - `3ac60b5743e` Preview job count in tool build response
   - `b0ebcff7ddf` Check collection access in job-count preview
   - `b925adb9b9e` Show job count before running a batched tool
   - `f10d5a4e39d` Refine job count notices
   - `0be563c681b` Tighten job count client tests
   - `ede8f2a2291` Split job expansion API test, use populator helpers
   - `0da631ac2cd` E2E test for tool form job count over a collection
   - `b2eea968529` Count shared child collections once per reference in job preview
   - `38ef4e6e2b8` Disable Run when job preview says request can't run; qualify batch labels. The message drops its visitInputs/repeatTitle sentence.
   - `eba69f35d91` E2E test: Run disabled for empty collection batch
   - `5c508ee832f` Drop job preview when a form update fails
   - `e6b95101422` Reuse dotted-name lookup for batch input labels. Now jobCount-only, with a reworded message.
   - `6e290c5cc5d` Keep Run enabled for empty batches
   - `ee25925dfd3` Tighten job count client tests. The repeatTitle-test and parents-test notes were dropped from the message because neither test changes here any more.
   - `97f9aef5e10` E2E test: Run disabled for mismatched batch collections. It uses the shared helper, so there's no private `_select_batch_collection`.
   - `940a08472d3` E2E test: check Run tooltip via assert_data_value. This is the remainder of `d4eeabe`.
   - `2487611dd74` Drop job preview when a non-refreshing edit changes a batched input
   - `208f912d556` Move job preview state out of ToolForm into useJobExpansion. The message was reworded, since the JSDoc typing moved to commit 5.
   - `d5948da2ef8` Fold batch detection into summarize_meta_expansion

   `497a6122fa5` (wait on collection mode) was dropped as empty: its selector and wait are now in commit 6. The intermediate trivial `repeatTitle` unit test (added in `ebd4fd8`, removed in `804fdb5`) no longer appears in the history.

## Not moved to the base

- **Server `summarize_meta_expansion` / `3abe2da` "fold batch detection".** Feature-only: `summarize_meta_expansion` has no dev consumer. The generic `meta.py` restructuring was already moved by the first pass.
- **`ToolForm.vue` changes.** These are the `buildRequestId` stale-response guard, the loading guard in `onUpdate`, and the footer Run button removal. They are interleaved with `setJobExpansion` wiring, and the stale guard is motivated by the preview going stale. The first pass made the same call.
- **`DatasetCollection.element_count_at_depth`, `split_count`, `count_combos`.** No dev consumer (unchanged from the first pass).

## Verification

- Invariant: `git diff tool_form_job_count_pre_baseline_2 HEAD --stat` shows only `client/src/components/Form/FormRepeat.test.ts` (new, 21 lines) and `client/src/components/Form/utilities.test.js` (+51/-1: import list plus the two new tests). All other files are byte-identical, so the earlier end-state API, E2E and client results still apply.
- Python, `test_meta_expansion.py` + `test/unit/data/model/db/test_misc.py`: commit 1 (on dev) 45 passed, commit 3 45 passed, commit 4 47 passed, HEAD 53 passed.
- Client vitest: Form `utilities` + `FormRepeat`, Workflow `WorkflowRunDefaultStep`/`WorkflowRunForm`, Tool `ToolForm` + `jobCount` where present.
  - dev: 69 passed
  - commit 2: 71 passed
  - commit 5: 73 passed
  - `38ef4e6`: 92 passed
  - `e6b9510`: 93 passed
  - `208f912`: 94 passed
  - HEAD: 94 passed
- Red check: commit 5's `utilities.test.js` run against commit 2's code fails exactly the 2 new parents/path tests.
- `vue-tsc --noEmit` is clean at commit 5, `38ef4e6` (jobCount still uses `visitInputs` with a local `EnclosingInput`), `e6b9510` (cast over the typed lookup) and HEAD.
- Lint: eslint on the changed Form files, and ruff + black on `test_tool_form.py`/`navigates_galaxy.py` at commit 6 and at each rewritten E2E commit (`0da631a`, `eba69f3`, `97f9aef`): clean.
- Not run: the E2E `test_rerun_dataset_collection_element` at commit 6. Its code is byte-identical to the end state, which passed under both Playwright and Selenium (`polish_e2e_tests_debrief.md`). The dev UI it exercises (FormData `g-pressed` toggle) is unchanged by the feature.
- Backups: `tool_form_job_count_pre_baseline_2` (pre-rewrite HEAD `3abe2da81cb`) and `tool_form_job_count_pre_baseline` (first pass). Nothing was pushed.

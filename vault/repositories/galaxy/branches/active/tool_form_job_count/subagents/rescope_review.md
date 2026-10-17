# tool_form_job_count — re-scope review

**Coordinator follow-up:** acted on the empty-batch recommendation in `d6f798bfb59`. Run stays enabled for empty batches; the warning stays. Only mismatch and remap > 1 block. That branch's own unmerged tests were reshaped to match: the `runBlockedReason` empty case now expects no block, the ToolForm blocking-preview test uses a mismatch preview, and the E2E test is now `test_run_enabled_for_empty_batch`. The reason: dev supports this request (`test_map_over_empty_collection`), and the scope evaluation assumed the server rejects it, which was wrong. vitest: 21 files, 162 tests pass.

Acted on two things. First, a stale blocking preview: when a form update failed, the previous `job_expansion` stayed in `formConfig`, so an empty or mismatch preview could keep Run disabled for inputs it no longer described. Fixed red-to-green in `728a8ee8d57`. Second, `batchInputLabel` re-implemented the `findInputByDottedName` traversal. It now reuses a new `findInputPathByDottedName` (node + enclosing containers), and the remap notice no longer says the request "will be rejected" now that Run is disabled (`049f8c1e501`). Did **not** change the empty-batch block. It is a product decision for John (see below). No security findings.

## Not acted on

- **Empty batch blocks Run (decision for John).** On dev, an empty collection batch is a supported request: 0 jobs plus an empty implicit output collection, guarded by `test_map_over_empty_collection` and the `structured_like` precreate regression test. The re-scope blocks it from the tool form, and the user has no override. `scope_evaluation.md` claimed "the server already refuses these requests". That holds for mismatch and remap, but not for the empty case. **Recommendation: make empty a warning, not a block.** Keep the warning notice, leave Run enabled, and keep blocking on mismatch and remap. If John agrees, the changes are: drop the `jobCount === 0` branch from `runBlockedReason`, update the related vitest cases, and flip `test_run_disabled_for_empty_batch` to assert that Run stays enabled with the empty notice visible. That would be renaming or reshaping a test, so it needs his OK.
- **Hand-written `ToolFormJobExpansion` type** in `api/tools.ts`, not generated from the schema. The build endpoint is untyped on dev, so this follows the existing `ToolFormConfig` pattern. Out of scope.
- **Duplicated wording** between the remap notice and the Run tooltip. They are the same message on purpose, one visible and one on hover. Left as is.
- **3 vitest failures** (FormBoolean, FormCheck, FormOptionalText). Confirmed they are pre-existing: they fail the same way at merge-base `5ff1e46b8c3` in a temp worktree that shares the branch's `node_modules`. Not related to this branch.

## Details

### Scope 2 changes (`ebd4fd8ec97`, `7b3ff91ff32`)

**`visitInputs` signature** (`Form/utilities.js`). The new 5th positional `parents` param defaults to `[]`, and callbacks get a 4th argument. All callers in `client/src` checked:
- `FormGeneric.vue:146`
- `useFormState.ts:102`
- `WorkflowRunDefaultStep.vue:120,141`
- `Workflow/Run/model.js:55,141,196` (uses the 3rd `context` arg, unchanged)
- `findInputByDottedName`
- the tests

All of them call with two arguments and ignore extra callback args. None is affected. The Form, Tool and Workflow/Run vitest suites pass.

**`repeatTitle`**. Extracting it from `FormRepeat.getTitle` is a good small reuse, and it keeps the notice labels in sync with the form's headings.

**`batchInputLabel`**. The original visited all inputs with last-match-wins and duplicated the data/data_collection filter from `findInputByDottedName`. It now reuses `findInputPathByDottedName`, which returns first-match `{ node, parents }`, and `findInputByDottedName` delegates to it. Conditionals contribute no title, which is correct: the form shows no conditional heading. A section without a title falls back to its name.

**`runBlockedReason`**:
- Blocks only on definite reasons (`job_count === 0`, `batch_mismatch`, remap with >1 job).
- `unknown` and `inputs_not_ready` never block. Good.
- It is computed from `jobExpansion`, which already suppresses a server mismatch that client validation flags, so there is no double gating.
- Tooltip precedence: immutable history > validation errors > credentials > executing > blocked. Sensible.

**Stale preview (fixed)**. `onUpdate` leaves `formConfig` alone on error, so `job_expansion` described the previous inputs. Before the re-scope this only left a stale notice. Once the preview gates Run, it could keep Run disabled after the user had fixed the input. Now the catch clears `job_expansion` (`{ ...formConfig, job_expansion: undefined }`). Test: `ToolForm.test.ts` "drops a blocking preview once a later update fails". It was red before the fix and green after.

A brief window remains between a change and its build response, during which Run reflects the previous preview. That window is pre-existing: `disabled` is true while the update is in flight, so Run can't be pressed anyway.

**Remap**. `_ensure_expansion_is_valid` rejects remap with more than one job, so this block loses no valid submission.

**Empty batch.** See "Not acted on". More detail:
- Real-world uses of an empty map-over from the tool form:
  - keeping a hand-run pipeline's structure when an upstream filter produced an empty collection;
  - producing the empty output collection that a later workflow input expects.

  These are uncommon but legitimate, and the server deliberately supports them, as the recent regression fix for `structured_like` precreation shows.
- Blocking has no escape hatch in the tool form. The API still works.
- A warning keeps the UX benefit: "No jobs will run because a batch input is empty: X" is already shown as an alert.
- `job_count === 0` can also come from a dataset batch with `values: []`. For a required input, that is already caught by client validation. For an optional one, a block is arguably right, but a warning is still the conservative choice.

**E2E `test_run_disabled_for_empty_batch`**:
- It uses `aria-disabled` and `data-title` on the existing `tool_form.execute` component. That is consistent with how the vitest tests check Run.
- It runs to completion and captures a screenshot. It would need flipping if empty becomes a warning.

### Whole-branch notes

The server side (`meta.py` refactor, `summarize_meta_expansion`, `count_combos`, `split_count`, access check) was covered by the earlier codex and thermo-nuclear reviews and was not re-reviewed in depth here. Spot check: `summarize_meta_expansion` mirrors `expand_meta_parameters` through the shared classifier, and only walks structures when there are two or more linked collections.

### Test results

- vitest: `src/components/Tool`, `src/components/Form/utilities.test.js` and `src/components/Workflow/Run` all pass (47 files, 282 tests). The full `src/components/Form` + `Tool` run shows only the 3 pre-existing failures.
- `vue-tsc --noEmit`: clean. eslint: warnings only, none of them new.
- Playwright E2E (`test_tool_form.py -k "empty_batch or job_count"`): 2 passed. The run used its own Galaxy on 8127 and Vite on 5227, both stopped afterwards.

### Commits

- `728a8ee8d57` Drop job preview when a form update fails
- `049f8c1e501` Reuse dotted-name lookup for batch input labels

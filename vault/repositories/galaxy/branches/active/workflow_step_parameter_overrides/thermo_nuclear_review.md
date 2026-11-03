Run via Claude Opus at high effort.

# Thermo-nuclear code quality review: workflow_step_parameter_overrides

I reviewed `46db8f9d5b6..HEAD` with [the thermo-nuclear prompt](../../../../../agents/_shared/prompts/thermo-nuclear-code-quality-review.md), looking hardest at the places the brief named. The branch has no file-size violations: no file crosses 1,000 lines because of it, and `WorkflowRunFormSimple.vue` grows by only 17 lines (805 to 822). It also has no spaghetti growth in shared flows. I found three structural problems and fixed all of them, each squashed into the commit it belongs to:

1. **Two separate nested-to-flat translations had to agree** (API commit 1). The tool state walker built its flat `a|b` names while it walked. It also changed the request's deep copy in place to add case defaults. Then `/request` flattened the recorded copy again with `flatten_tool_state` to subtract it. The walker now returns the normalized overrides without changing its input, and `flatten_tool_state` of that result is what gets merged. One function now produces both the merged values and the subtracted ones.
2. **The run form's card state was split across five containers** (client commit 4). These were `leaves`, a non-reactive `cardInputs` map, an append-only `cardKeyByName` reverse map, `cardValues` and `presets`, and every add or remove had to update them in step. There is now one reactive list of cards, each `{leaf, inputs, value}`.
3. **The picker's tree node type was a bag of optional fields** (client commit 4, one line in commit 5). On top of that, a leaf's `key` always equalled its `id`. Nodes are now a discriminated union (group, conditional, leaf), and a leaf's `id` is its key.

I declined to restructure the `/request` subtraction, the server-side overridable-type list and the top-level invocation check. The reasons are below. The extraction branch was re-synced and nothing is security-sensitive.

## Not acted on

- **Pure-data `/request` subtraction instead of detached ORM row copies.** With #24178, `/request` keys a subworkflow step's parameters as `"<inner order_index>|name"`, and every step's overrides flatten to that same form with `flatten_tool_state`. Done after re-keying, the subtraction would shrink to a few lines of dict filtering. It would also delete `stored_step_parameter_overrides`, `_without_overrides` and the `set_committed_value` copy. But `dev` still keys those rows by inner step id, so the API series would need different subtraction code on `dev` and on the stack. That breaks the "extractable onto `dev`" rule. Phase B's review reached the same conclusion. It's worth doing as a follow-up once #24178 and the API PR have both landed.
- **Recording overrides only in the meta row, not merging them into step rows.** This would remove the need for any subtraction. But scheduling, child invocations and the #24177 expanded-form rerun seeding all read the step rows. Each of them would need its own merge, which spreads the feature across more readers than the one subtraction does now.
- **Replacing the walker with `populate_state` or `visit_input_values`.** Both walk every input of the tool state, fill defaults and ignore unknown keys. The overrides walker only walks the keys the request sends and rejects unknown ones (an unknown name, an inactive case, a missing repeat instance), with a path in each error. `params_to_incoming` is the right flattener for complete saved state, but it needs `__index__` and `__current_case__`, which partial overrides don't have. `_with_defaults` uses the parameters' own `get_initial_value`. It only adds the rules the generic helpers don't know: skip data and connected inputs and repeats, and respect `parameters`.
- **Dropping `OVERRIDABLE_PARAMETER_TYPES` from `managers/jobs.py`.** The list duplicates the client's `EXPOSABLE_TYPES`, and it puts feature knowledge into the job parameter display. Without it, though, every row would offer "Rerun with this changed", including parameters the picker then drops with a warning, because display rows carry no type the client could check. A shared contract between the two languages isn't worth it for six strings.
- **Telling subworkflow invocations apart in the client, without the `/api/invocations?job_id=` lookup.** `WorkflowInvocationState` has an `isSubworkflow` prop, but a subworkflow invocation opened by its own URL doesn't set it, and the invocation response has no parent field. The cached lookup stays.
- **The two `any`s in `buildStepParameterOverrides`.** These are eslint warnings, not errors. Typing a container that can be an object or an array by turns adds casts without making the code clearer.
- **Building the tree only once.** `simpleFormDisabledReason`, the step parameter section and the expanded form's link warning each call `buildStepParameterTree`. It's cheap, and sharing it would mean threading the tree through `WorkflowRun`.

## What changed

| Commit | Change |
|---|---|
| API 1 | `_ToolStateWalker.visit` returns the normalized overrides, and `_fill_defaults` becomes `_with_defaults`, which also returns its result instead of changing its input. `_apply` builds the recorded overrides from what the walker returns, merges `flatten_tool_state` of each tool step's part, and no longer deep-copies. An empty repeat list is dropped from the record: it changes nothing, and it would have flattened to a stray `"name": []`. The unit tests check both the record and its flattening, and that the request's own object is left unchanged. |
| Client 4 | `WorkflowRunStepParameters.vue` keeps one `cards` list. `showStepParameters(keys)` resolves a set of keys, in workflow order, and keeps existing cards (and anything typed in them), so Apply, rerun and link loading all go through it. `diffKeys` is deleted. Each card's `FormDisplay` gets a per-card change handler, so the reverse name map is gone. `StepParameterNode` is now `StepParameterGroup \| StepParameterConditional \| StepParameterLeaf`, and leaves have no `key` field. `StepParameterTreeNode.vue` narrows to a `row` for leaves and conditionals instead of reading optional fields. New `WorkflowRunStepParameters.test.ts` (7 tests). I wrote it and ran it against the old component before the refactor, and it passed there too. |
| Client 5 | `stepParameterGraph.ts` counts picked leaves by `leaf.id`. |

Line counts: `step_parameter_overrides.py` went from 396 to 416 lines, because passing results back takes more lines than changing the input in place. `WorkflowRunStepParameters.vue` went from 233 to 216, and `stepParameterTree.ts` from 388 to 398. The tree file grew because of the type union's doc comments.

### SHAs

| Branch | Commits, bottom to top |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `541cd7dcb8e` (API 1), `de9b2fe90f8` (API 2), `748182d6a91` (API 3), `b75e329b87f`, `1da552b093e`, `66513c98868`, `061694e7edb` |
| `workflow_step_parameter_overrides_api` over `origin/dev` `38dc259318c` | `b29bc2adaac`, `4e337463e15`, `2578e77912d` |

The rebased tree is byte-identical to the pre-rebase tree with the fixups. On the extraction branch, `step_parameter_overrides.py` and its unit test are identical to the main branch's. `git range-diff` still shows only the dev-only lines in commit 1 and diff context in commit 3.

## Tests

- **Unit**: `test/unit/workflows/`: 203 passed, 1 skipped. That includes `test_step_parameter_overrides.py` (3) and the module doctest (1).
- **API, main branch**:
  - `test_workflow_step_parameter_overrides.py` + `test_jobs.py -k parameters_display` + `test_workflows.py -k step_parameter`: 17 passed.
  - The existing step-parameter selection (`test_workflows.py -k "step_param or request or run_form or rerun or subworkflow_param or runtime_param or parameters_normalized or test_parameters_display"`): 27 passed.
- **Extraction branch**:
  - The new API file + `parameters_display`: 13 passed.
  - `test_step_parameter_overrides.py` + `test_run_parameters.py`: 12 passed.
  - I didn't rerun the 6 known gxformat2-pin failures.
- **Vitest**: the brief's suites (`Workflow/Run`, `Workflow/Editor/Node*`, `Editor/Index`, `JobParameters`, `WorkflowInvocationState`, `JobInformation`, `Workflow/Invocation`, `useInvocationGraph`, `canvasDraw`): 39 files, 249 tests passed. That is 7 more than before, from the new file.
  - Client commit 4 checked out on its own: `Workflow/Run` 14 files, 104 tests passed, and vue-tsc clean.
- **Lint and types**:
  - vue-tsc is clean, and so is prettier.
  - eslint reports 0 errors. Its 2 warnings are the existing `any`s in `buildStepParameterOverrides`.
  - ruff, black and isort are clean.
  - mypy from `lib/` reports only the known `notification.py:862` error.
- **E2E**: `test_workflow_run_step_parameter_overrides.py` 9/9 passed. Playwright ran against a `static/dist` rebuilt from the final tree, on a single Galaxy at :8091, which is now stopped.

<details>
<summary>Full review</summary>

## Server

### 1. The walker produced two outputs, and `/request` depended on them agreeing (fixed)

`_ToolStateWalker` validated the request's nested overrides and produced two results. `self.flat` held the `a|b` names merged into the parameter map. The request's deep copy was changed in place by `_fill_defaults`, and it became the recorded overrides. `/request` then removed the recorded overrides from the step rows by flattening them again with `flatten_tool_state`.

That meant two translations from nested to flat, one tied to the tool and one generic, and the subtraction was only correct if they matched. The docstring claimed they did ("the copy flattens to exactly the merged values"), but nothing enforced it. They already disagreed on an empty repeat list: the walker produced nothing, and `flatten_tool_state` produced `"name": []`.

The fix makes the walker a pure function, from overrides to the validated and normalized overrides. The merge uses `flatten_tool_state` of that result, so the merge and the subtraction share one translation. The `self.flat` accumulator, the `copy.deepcopy` and the in-place `setdefault` mutation are gone.

### 2. `/request` subtraction through detached ORM copies (declined, see above)

`request_parameters_without_step_parameter_overrides` builds `WorkflowRequestInputParameter` copies. It sets their invocation with `set_committed_value`, so the backref doesn't add them to the session, and only then can the service loop call #24178's `resolve_step_parameters()` on them. This is the most magical part of the branch.

The cleaner design subtracts in request form after re-keying, where every step type flattens the same way. But it only works on top of #24178. Phase B checked the copies against a real session and found them safe. Until both PRs land, they are the price of a series that extracts cleanly onto `dev`.

### 3. Overlap with `galaxy.tools.parameters` (no change)

- `visit_input_values`: walks every input of the saved state, with callbacks. It can't report an unknown key, because it never looks at keys the inputs don't have.
- `populate_state` (`21.01`): builds complete state from partial input and ignores unknown keys. Using it would mean diffing the populated state against the saved state to find what the request actually set. That's more code, and the per-key error paths would be lost.
- `params_to_incoming`: flattens complete state and reads `__index__` and `__current_case__`. Overrides are partial.
- `_case_for` reuses `Conditional.get_current_case` and `from_json`. `_default` reuses `get_initial_value` and `value_to_basic`.

The walker is sparse and strict, and no existing helper is. At 416 lines, split into validation (`_apply` and the walker) and recording (`recorded_…`, `request_parameters_without_…`, `flatten_tool_state`), the module is cohesive.

### 4. `OVERRIDABLE_PARAMETER_TYPES` in `summarize_job_parameters` (declined, see above)

A feature-specific gate inside a general-purpose display, and it mirrors the client's type list. It's a contained gate that needs no new branching. The alternative would give the client UI links that lead nowhere.

### 5. `_subworkflow_run_steps` and `_tool_step_run_model` (no change)

The extraction of `_tool_step_run_model` is a straight move. The per-request cache is a plain dict passed down the recursion. No issues.

## Client

### 6. Card state in `WorkflowRunStepParameters.vue` (fixed)

Before, each card's state lived in five places:

- `leaves`, a ref;
- `cardInputs`, a `Map` that wasn't reactive;
- `cardKeyByName`, an append-only `Map` from form input names to keys;
- `cardValues`, a ref keyed by key;
- `presets`.

The `overrides` computed read the non-reactive `cardInputs` and worked only because `leaves` always changed in the same tick. Every add and remove had to touch three of them. The picker's apply had to compute added and removed keys (`diffKeys`), and then go through two code paths.

Now there is one reactive list of cards:

- `showStepParameters(keys)` resolves the wanted set and reuses existing card objects, so a kept card's typed value and its `FormDisplay` inputs keep their identity.
- `removeStepParameter(card)` filters that list.
- `FormDisplay`'s change event goes to a handler bound to its card.
- The inputs array is `markRaw`, as it was when it lived in the plain `Map`.

There was no component test before, so I wrote `WorkflowRunStepParameters.test.ts` against the old component first:

- picking and removing cards;
- typed values;
- keeping a typed value while other cards change;
- rerun presets and hints;
- link presets with `null` values;
- dropped keys and link parse errors.

All 7 passed before the refactor and pass after it.

### 7. `StepParameterNode` (fixed)

Before, the node type had one `kind` and nine optional fields, and `StepParameterLeaf` was recovered with `Required<Pick<...>>`. Leaf `key` was always equal to `id`, because ids are built from the same path segments, so `StepParameterTreeNode.vue` read `node.key ?? node.id` and `node.key || ""`.

Now it is a union:

- groups (step, subworkflow, section, repeat, instance) have only an id, a label and children;
- conditionals carry a required `disabledReason`;
- leaves carry their paths and input.

The template narrows once to `row`. `filterTree` uses `flatMap` instead of `filter(Boolean) as ...` casts.

### 8. Smaller items checked

- `stepParameterGraph.ts`: a small pure function, with tests.
- `StepParameterWorkflowView.vue`: owns its own store scope, and uses the cached full workflow it shares with `useWorkflowRunGraph`.
- `NodeInvocationText.vue`: the one-line `nodeText` branch is generic, and the invocation graph sets no `nodeText` for non-input steps.
- `JobStep.vue`'s watch:
  - its sources are primitives, so polling doesn't refetch;
  - it handles staleness;
  - its result is cached per invocation in `api/invocations.ts`.

  This is acceptable without a parent marker in the API.
- `WorkflowRunForm.vue`'s linked-parameters warning: 25 lines, and the right layer for an expanded-form-only message.
- `simpleFormDisabledReason.ts`: the new reason is one more entry in the existing typed reason list, not a new branch.

</details>

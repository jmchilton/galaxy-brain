# Scope evaluation

**Recommendation: expand the scope modestly. (1) Fold in the `replacement_dict` fix (issue footnote ¹).** In `WorkflowRunFormSimple.vue` `onExecute`, rename the key to `replacement_params`, which is the key the expanded form already sends. Without it, this branch's simple-form workflow-parameter prefill has no effect, and every simple-form and landing run silently ignores workflow parameters. **(2) Move `withRerunValues` into `model.js` and use it from both forms.** In the same change, merge the two `mountRerun` helpers in `WorkflowRun.test.js`. Item 2 edits #24176's code (`WorkflowRunForm.vue` and its test), so the coordinator must approve it; the fix itself is mechanical. Item 1 touches no sibling. Everything else stays out: the object-store work and the "step params lost" notice (which belongs to #24175 and needs it in the stack) become follow-ups.

Evaluated `d10e8cfbf41..7f57142acd3`, the branch's single commit on the #24176 tip. The implementation debrief's `8141bfccf87..1d8829ef22d` is the same patch before the stack repair.

## 1. As implemented

When the rerun request export has non-empty `parameters`, the rerun opens the expanded form. It shows a reason alert and hides the Simple Form toggle, and the reason comes from `simpleFormDisabledReason()`. When the simple form is used for a rerun, it prefills the object stores and `replacement_params` from the export.

| Pros | Cons |
| --- | --- |
| Covers everything the issue's proposed approach asks for. | The simple form's workflow-parameter prefill fills a field the form then fails to submit (footnote ¹), so the code ships with no effect. |
| Client only; no sibling overlap. | A UI-origin run never records `replacement_params`, so the prefill is reachable only for API-origin runs. |
| Reviewed, test-challenged and mutation-checked. | Leaves the 3-line `withRerunValues` duplicate, which three reviewers flagged. |

## 2. Recommended: as implemented, plus the `replacement_dict` fix and the shared `withRerunValues`

Change `replacement_dict: replacementParams` to `replacement_params: replacementParams` in the simple form's `onExecute`. Move `withRerunValues` next to `rerunInputValue` in `model.js`, and call it from both forms. Merge the two `mountRerun` helpers in the tests.

| Pros | Cons |
| --- | --- |
| Makes this branch's prefill live. A simple-form run with `${name}` renames then records `replacement_params`, and its rerun round-trips them. The issue's "workflow parameters once it actually submits them" is then delivered, not deferred. | Changes behavior for every simple-form run and for workflow landing runs, which mount `WorkflowRun` with `prefer-simple-form`: renames now apply. The PR description must say so. |
| A general fix for a bug that has been silent since 2020 (`4626f714bb2`, the commit that added the simplified form). The file is one this branch already edits. | A small, backportable fix now waits behind #24178 and #24176. |
| It is a key rename to match the expanded form (`WorkflowRunForm.vue` sends `replacement_params: wpData`), not new server behavior. Nothing in `lib/galaxy` reads `replacement_dict` from an invoke payload. | The `withRerunValues` move edits #24176 code (`WorkflowRunForm.vue`, plus its `mountRerun` test), so it is coordinator-gated. |
| Resolves the only reviewer should-fix still open, and it lands here because this branch adds the helper's second caller. | |

<details><summary>Tests and placement</summary>

- **Unit test, red to green.** Extend `WorkflowRunFormSimple.test.ts` "prefills workflow parameters from the original run" so it also submits. Assert that `request.replacement_params` is `{sample: "s1"}` and that `replacement_dict` is absent. This fails on the current tip.
- **E2E: one test, no more.** The best option is a rerun test in `test_workflow_rerun.py`:
  1. Run `WORKFLOW_RENAME_ON_REPLACEMENT_PARAM` from the simple form with `replaceme=moocow`, and assert the output name `moocow suffix`.
  2. Rerun. Assert that the simple form shows `moocow`, submit, and assert the second output's name.

  That one test proves both the fix and this branch's prefill. If it costs too much, use a simple-form twin of `test_workflow_run.py::test_replacement_parameters` that skips `workflow_run_ensure_expanded()`. Every existing `test_replacement_parameters*` test calls it, which is why the bug went unnoticed.
- **Why not a standalone branch off `dev`.** That would ship and backport sooner. But it leaves this branch's prefill dead in its own PR, and the process doc says to fold related bugs in touched code. If John wants the fix released independently, split it into its own branch off `dev`, and this branch's unit assertion moves with it.
- **File the footnote ¹ issue anyway** (it is still unfiled) so the PR can reference it, or describe it in the PR body.

</details>

## 3. Contraction: drop the dead workflow-parameter prefill

Remove the `replacement_params` seeding from the simple form, and keep only the object-store prefill and the forced expanded form.

| Pros | Cons |
| --- | --- |
| No code that has no effect. | Contradicts the issue's approach. Fixing the underlying bug (scope 2) is strictly better. |

## 4. Fold `requestState` / `simpleFormUseJobCache` into `rerunRequest`

Read `rerunRequest?.inputs ?? requestState` and `rerunRequest?.use_cached_job` inside the simple form, and drop the duplicate bindings from `WorkflowRerun`.

| Pros | Cons |
| --- | --- |
| One source of rerun state. It mirrors #24176's expanded form, which already reads `rerunRequest.use_cached_job`. | `WorkflowRun`'s props must stay for Landing, Home and the router, so the gain is only internal precedence logic. No bug is fixed. |
| | Reviewers rated it a nit or a follow-up. |

Not recommended. It can ride along in scope 2 if it turns out to be a few lines.

## 5. Narrow the predicate to tool-step rows only

| Pros | Cons |
| --- | --- |
| The alert's "tool step parameters" wording would match exactly. | The simple form drops subworkflow-step rows too, and #24176 seeds them into the expanded form. Narrowing would bring back silent loss for nested workflows. |

Not recommended. The current predicate is correct.

## 6. Object stores in the forced expanded form

There are two options. (a) Add object store controls to the expanded form. (b) Add a smaller line to the reason alert when the export has object store preferences, saying they are not kept.

| Pros | Cons |
| --- | --- |
| Closes the issue's "known gap". | (a) is a feature of its own, and the issue explicitly excludes it. |
| (b) costs about one span and one computed. | Both are reachable only for API-origin runs: the expanded form never records object stores, and the simple form never records `parameters`. |

Not recommended here. Track (a) as a follow-up issue.

## 7. "Step params lost" notice

The server would mark a request export whose step rows were skipped (#24175's legacy-archive path), and the rerun page would show a non-blocking notice.

| Pros | Cons |
| --- | --- |
| Makes #24175's silent skip honest. | The signal comes from #24175's server code. This branch stacks on #24176, not #24175, so landing the notice here would mean restacking. |
| | It is a niche path: imported pre-fix archives only. |

Not recommended here. It is a cross-branch follow-up, with the server half in #24175's area and the client half after both land.

## 8. Other noted items (out)

- **`param_map` keyed-by-id bug** (`workflow_run_config_to_request`): server code this branch never touches. File it on its own or take it with #24175.
- **Simple-form object-store screenshot or E2E:** needs a multi-object-store integration-selenium config, which is out of proportion here. The vitest payload tests cover it.
- **Shared `DisableSimpleFormReason` type and a typed `WorkflowRunForm` prop:** cheap type hygiene on a chain this branch extends. It is optional and can ride along with scope 2.
- **Shared Selenium submit/rerun helper** (from the E2E polish): this is test-file hygiene across tests that existed before this branch. Do it as a follow-up.

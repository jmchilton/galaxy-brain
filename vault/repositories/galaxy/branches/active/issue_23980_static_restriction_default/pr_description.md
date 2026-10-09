Fix 🎯 #23980 - the workflow run form ignores the default of a text input restricted to a static list of values and preselects the first allowed value instead.

| Workflow input | Default | Run form on `dev` | This PR |
| --- | --- | --- | --- |
| `restrictions: [a, b, c]` | `b` | `a` ❌ | `b` ✅ |
| `restrictions: [a, b, c]`, `multiple: true` | `[b, c]` | nothing selected, form fills `a` ❌ | `b`, `c` ✅ |
| `restrictions: [{value: --ex1, label: Ex1}, {value: ex2, label: Ex2}, …]` | `ex2` | `Ex1` ❌ | `Ex2` ✅ |
| `restrictions: [{value: a, label: A}, {value: "", label: Empty}]` | `""` | `A` ❌ | `Empty`, and it submits ✅ |

![Run form with static restrictions Ex1/Ex2/Ex3 and default ex2, showing Ex2 preselected](screenshots/workflow_run_text_static_restrictions_default.png)

A user who accepts the run form as shown runs the workflow with the first allowed value, not the author's default. The Selenium test for row 3 fails on `dev` with `assert 'Ex1' == 'Ex2'`. An API run that omits the input already used the stored default, so the same workflow gave different results depending on how it was launched.

***API runs and workflow execution are untouched. The run form now shows and submits what an API run with no value supplied already used.*** UI-run results change for these workflows, and that change is the fix.

***This is not #13293 again.*** That PR fixed the same symptom for "Attempt restrictions based on connections" (`restrictOnConnections`). The static `restrictions` path built its options without any `selected` flags. It passed the default as a top-level `selected` keyword that the dict input source never reads, and that keyword has had no effect since #13293 added it in 2022.

***#23992 doesn't fix this.*** It changes only the `restrictOnConnections` block. The two PRs share one API test and have a small conflict there (see Risk Review Advice).

<details><summary>What changed</summary>

- **`_is_default_option(value, default)`** in `lib/galaxy/workflow/modules.py` is one matcher for both paths. A list default selects each entry it contains, and a scalar default selects the equal option. It compares against `None`, not truthiness, so an empty-string default can be selected. An absent default arrives as `None`.
- **`_parameter_def_list_to_options`** moves out of `get_runtime_inputs` to module level, returns `OptionDict`s and marks `selected` against the default. Suggestions still call it without a default.
- **`restrict_options` (`restrictOnConnections`)** uses the same matcher. ***That path changes too: a list default on a `multiple` input now selects every entry instead of none, and an allowed `""` default is now preselected.***
- The dead top-level `selected` keyword is gone.
- **Client (`client/src/components/Form/utilities.js`).** The simple run form rejects `""` for required inputs (`rejectEmptyRequiredInputs`). That blocked the `Empty` option even though the workflow explicitly allows it. `validateInputs` now accepts `""` for a select that lists `""` among its options. Only the workflow run form and config-template instance forms set `rejectEmptyRequiredInputs`, and no shipped template has a `""` select option.

</details>

***Workflows without a default, and workflows whose default isn't among the restrictions, behave as on `dev`.*** The form falls back to the first option.

## Risks

Risks are minimal. This is a two-way door: it changes which value the run form preselects for existing workflows, toward what their authors declared, and it adds no API or workflow format surface.

<details><summary>Risk Details</summary>

- UI runs of workflows with a statically restricted text input and a default now submit the default instead of the first allowed value. A user who relied on the old preselection would get a different result.
- The `restrictOnConnections` path changes too, for list defaults on `multiple` inputs and for `""` defaults.
- The workflow run form and config-template instance forms now let a required select submit `""` when `""` is one of its options. The server accepts that value anyway. Selects without a `""` option are rejected as before. A connected tool select with a `""` placeholder option can now be submitted as `""` from the run form, where before Run stayed disabled.
- A list default on a `multiple: false` input marks several options selected, and the form shows the first of them. That isn't a regression. #23992 adds save-time validation for it.

</details>

<details><summary>Risk Review Advice</summary>

Check `_is_default_option` and its two call sites in `restrict_options`. The old guard there, `bool(default_value and value == default_value)`, never matched a list default or a `""` default. #23992 adds `test_value_restriction_selects_multiple_text_list_default` too, along with its own `default_values` block in `restrict_options`. Whichever PR lands second should keep `_is_default_option` and drop the duplicate test. Keeping #23992's block would bring back the truthiness guard and undo the `""` fix.

</details>

## Context

Bug found while working on 🔀 #23992 (multiple text workflow parameters, 🎯 #21015). There's no user report. It was found by reading code, then reproduced through the run payload and in the browser. It's the static-restriction twin of 🎯 #13242, which 🔀 #13293 fixed for the `restrictOnConnections` path.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope as implemented, as its own small PR off <code>dev</code>.</summary>

- The branch does what #23980 proposes: per-option `selected` on the static path, one shared matcher for both paths, and the dead keyword removed.
- Rejected:
  - static-path-only with a separate matcher (two matchers would drift);
  - folding into or stacking on #23992 (resets review on a large feature PR and blocks a separate backport of a 2022 bug fix);
  - fixing the editor's `_parameter_option_def_to_tool_form_str` crash on label-less or non-string restrictions (a different code path, better as its own issue);
  - save-time validation of list defaults (#23992 already adds it).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Dropped a unit test that re-derived its expectations; moved its unique case to the API test and added an E2E test.</summary>

- The unit test recomputed its expected `selected` flags with a comprehension, which came close to re-implementing the code under test. Its only unique case (dict `{value, label}` restrictions) moved to the API test, which checks the `download?style=run` payload the client reads.
- Added a Selenium test, because the issue had only inferred the UI effect from client code.
- No E2E test for the `multiple` case. Multiselect chip text is unpredictable, and the API test covers that payload.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding: an empty-string default never preselected. Fixed, with a test.</summary>

- The original guard `bool(default_value and ...)` meant a `""` default showed and submitted the first option.
- The matcher now compares against `None`, and the API test's `empty_text` input covers it (red before: `'a' == ''`).
- No other findings.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The run form preselects the author's default. If the default isn't among the allowed values, the form falls back to the first option with no warning, as on `dev`. A required select with no `""` option still blocks Run with "Please provide a value for this option."
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The API tests hard-code `value` and the per-option flags in the run payload. The `validateInputs` test checks accept and reject outcomes for selects with and without a `""` option. The E2E tests drive the form and check what was submitted.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Workflows with statically restricted text inputs that have a default. The run form now preselects and submits the default. On the `restrictOnConnections` path, list and `""` defaults change the same way. A required restricted input that lists `""` among its options can now be submitted as `""`.
- [x] Who hits this in practice and what is the evidence? Anyone who runs such a workflow from the UI and accepts the form. The evidence is a reproduction and a browser test that fails on `dev`, not a user report. The same symptom on the `restrictOnConnections` path was reported in #13242.
- [x] Were simpler or existing approaches considered? Yes. The issue's alternatives were to make the dict input source honor a top-level `selected` (which changes a shared parser for one caller) or to pass the default as `value` (`SelectToolParameter` derives its value from per-option flags). This PR reuses the per-option `selected` mechanism `restrict_options` already uses.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- **API `test_value_restriction_static_default_selected`** covers a scalar, a list on `[text]`, `{value, label}` dicts and a `""` default. It checks `value` and every option's `selected` flag in the `style=run` payload. On `dev`'s `modules.py` it fails at `assert 'a' == 'b'`.
- **API `test_value_restriction_selects_multiple_text_list_default`** covers a list default on the `restrictOnConnections` path. It's the same test as in #23992.
- **Selenium `test_execution_with_text_default_value_and_static_restrictions`** checks that the run form shows `Ex2` for `default: ex2`, then submits and checks that the output is `ex2`. On `dev`'s `modules.py` it fails at `assert 'Ex1' == 'Ex2'`.
- **Selenium `test_execution_with_empty_text_default_among_static_restrictions`** checks that a `""` default shows `Empty`. It then switches to `A` and back to `Empty`, submits, and checks that the invocation received `""`. With `dev`'s `utilities.js`, Run stays disabled after the switch.
- **Vitest `utilities.test.js`** checks that a required select accepts `""` only when `""` is one of its options, and that a required text input still rejects it. It fails on `dev`'s `validateInputs`.
- Locally:
  - both new restriction E2E tests pass, along with the existing `restrictOnConnections` one;
  - `utilities.test.js` and `useFormState.test.js` pass (60 tests).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

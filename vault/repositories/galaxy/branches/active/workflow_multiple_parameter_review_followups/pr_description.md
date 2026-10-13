Follow-up to 🔀 #23992 — let workflow authors configure multiple float inputs and decimal list defaults in the editor.

A workflow input with decimal values such as `0.5` and `1.5` should keep those values as separate default rows after saving and reopening. Float inputs now offer the existing **Allow multiple values** control, and their default field uses the same list handling as integer inputs.

***For workflow authors connecting float inputs to tool parameters that accept multiple values, this adds decimal-list editor controls and reuses the existing float-list invocation contract.***

| Author action | Result |
| --- | --- |
| Enable multiple values for a float input | Configure separate decimal default rows. |
| Save and reopen with defaults `0.5`, `1.5` and bounds `0.25`–`2.5` | Preserve the list defaults and range settings. |
| Open the workflow run form | Show separate default rows `0.5` and `1.5`. |
| Submit `["0.5", 1]` through the invocation API | Store `[0.5, 1.0]` as floats. |
| Submit `[0.5, "half"]` | Return HTTP 400 identifying the input: `values: a float is required`. |

***Default-only invocation/subworkflow normalization and text restriction edge cases remain separate work.*** ***The browser regression verifies saved bounds; it does not establish runtime rejection of out-of-range values.***

<details><summary>Regression coverage</summary>

The API test checks float-list run-form metadata, explicit-list conversion and the malformed-entry error. A shared integer/float browser flow checks persisted multiplicity, bounds and defaults, editor reopening, and runtime rows. It retains the existing integer case and replaces three render sleeps with control/validation waits.

</details>

## Risks

Saving workflows with multiple float inputs establishes a list-default artifact contract that older editors may not preserve (a one-way compatibility risk).

<details><summary>Risk Details</summary>

- Float inputs gain the existing numeric multiplicity control and list-aware default field.
- Existing scalar float and integer configuration paths retain their behavior; the integer browser case remains covered.
- Existing runtime/default normalization limitations remain outside this change.

</details>

<details><summary>Risk Review Advice</summary>

Review the saved float input state and default-field construction, especially reopening list defaults and compatibility with older Galaxy editors. The decimal browser case and explicit-list API test cover different boundaries; neither proves omitted-default or nested invocation behavior.

</details>

## Context

Builds on merged 🔀 #23992. The user-approved split placed text corrections in that PR and retained this four-file float follow-up. Existing integer controls and numeric parameter handling supply the mechanism; shared runtime normalization and static text-default selection have independent work.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The float-only change preserves the approved text/float review boundary.</summary>

The scope review considered recombining the branches, expanding runtime normalization or text-option handling, and removing regression coverage. It retained the focused float editor support and API/browser tests.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The change reuses existing numeric controls and default construction.</summary>

The quality review reported no required structural changes. Float bounds stay type-specific and the shared browser helper preserves integer coverage.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>API and browser regressions cover distinct observable workflow behavior.</summary>

The API test verifies conversion and invalid entries; the browser test verifies configuration, persistence and reopened/run-form rows. Text regression coverage belongs to #23992.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Invalid explicit float-list entries return an input-specific HTTP 400 error.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? API/browser tests assert public behavior; no unit tests change.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Multiple-float inputs gain editor controls and list-aware defaults.
- [x] Who hits this in practice and what is the evidence? Workflow authors configuring decimal lists; the API and editor regressions exercise concrete examples.
- [x] Were simpler or existing approaches considered? Reuses integer controls and existing list-default construction; broader normalization stays separate.

## How to test the changes?

- [x] Instructions for manual testing are as follows:

<details><summary>Configure and reopen a decimal-list input.</summary>

Create a float workflow input, enable multiple values and a default, set bounds to `0.25` and `2.5`, and add default values `0.5` and `1.5`. Save and reopen the editor, then open the run form. Confirm both default rows persist and the editor retains the bounds.

</details>

- [x] This PR adds or updates automated tests.

<details><summary>Focused API and numeric editor regressions.</summary>

Run `TestWorkflowsApi.test_run_with_multiple_float_parameter` and the workflow editor tests `test_multiple_integer_parameter_with_range` and `test_multiple_float_parameter_with_range`.

</details>

## License

- [x] I agree to license my contributions under the MIT license (see LICENSE file).
